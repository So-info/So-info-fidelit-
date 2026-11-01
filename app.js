
'use strict';

const SUPABASE_URL = 'https://vmenybnuyiwtxazstydk.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_c2fj1vnsKwhxVY2IHI0RuA_J_jefH6G';

const db = window.supabase.createClient(SUPABASE_URL, PUBLISHABLE_KEY);
const el = id => document.getElementById(id);

let clients = [];
let selected = null;
let busy = false;

function notice(text) {
  el('message').textContent = text;
}

function draw(points = 0) {
  el('count').textContent = points;
  el('status').textContent = points >= 10
    ? 'Récompense disponible !'
    : `Encore ${10 - points} passage(s) !`;

  el('stamps').replaceChildren();

  for (let i = 0; i < 10; i++) {
    const d = document.createElement('div');
    d.className = 'stamp' + (i < points ? ' done' : '');
    d.textContent = i < points ? '★' : '☆';
    el('stamps').append(d);
  }

  el('reward').hidden = points < 10;
  el('add').disabled = !selected || points >= 10 || busy;
  el('reset').disabled = !selected || points < 10 || busy;
}

function showAuth(loggedIn) {
  el('loginPanel').hidden = loggedIn;
  el('workspace').hidden = !loggedIn;
}

async function checkAdmin() {
  const { data: { user }, error } = await db.auth.getUser();
  if (error || !user) return false;

  const { data, error: e } = await db
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (e) throw e;
  return !!data;
}

async function refreshClients(chooseId) {
  const { data, error } = await db
    .from('customers')
    .select('id,first_name,last_name,phone,email,loyalty_cards(id,points,reward_unlocked)')
    .order('last_name');

  if (error) throw error;

  clients = data || [];
  fillClients();

  if (chooseId) {
    el('clientList').value = chooseId;
    await selectClient(chooseId);
  }
}

function fillClients() {
  const q = el('search').value.toLocaleLowerCase('fr').trim();
  const old = el('clientList').value;

  el('clientList').replaceChildren(
    new Option('Sélectionner un client', '')
  );

  for (const c of clients) {
    const label = `${c.first_name} ${c.last_name}`;

    if (`${label} ${c.phone || ''}`.toLocaleLowerCase('fr').includes(q)) {
      el('clientList').add(new Option(label, c.id));
    }
  }

  if ([...el('clientList').options].some(o => o.value === old)) {
    el('clientList').value = old;
  }
}

// Fonction corrigée : accepte une relation Supabase sous forme
// de tableau ou d'objet.
async function selectClient(id) {
  const c = clients.find(x => x.id === id);

  const card = Array.isArray(c?.loyalty_cards)
    ? c.loyalty_cards[0]
    : c?.loyalty_cards;

  selected = c && card ? { client: c, card } : null;

  el('selectedName').textContent = c
    ? `${c.first_name} ${c.last_name}`
    : 'Sélectionne un client.';

  draw(selected?.card.points || 0);
  el('history').replaceChildren();

  if (!selected) return;

  const { data, error } = await db
    .from('stamp_events')
    .select('action,created_at')
    .eq('card_id', selected.card.id)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) throw error;

  for (const event of data || []) {
    const li = document.createElement('li');
    li.textContent =
      `${new Date(event.created_at).toLocaleString('fr-FR')} — ` +
      (event.action === 'stamp'
        ? 'Tampon ajouté'
        : 'Cadeau remis, carte remise à zéro');

    el('history').append(li);
  }
}

async function guard(action) {
  if (busy) return;

  busy = true;
  draw(selected?.card.points || 0);

  try {
    await action();
  } catch (e) {
    notice('Erreur : ' + (e.message || String(e)));
  } finally {
    busy = false;
    draw(selected?.card.points || 0);
  }
}

el('loginForm').addEventListener('submit', e => {
  e.preventDefault();

  guard(async () => {
    const { error } = await db.auth.signInWithPassword({
      email: el('email').value.trim(),
      password: el('password').value
    });

    if (error) throw error;

    if (!await checkAdmin()) {
      await db.auth.signOut();
      throw Error('Ce compte n’est pas administrateur.');
    }

    el('password').value = '';
    showAuth(true);
    await refreshClients();
    notice('Connecté.');
  });
});

el('logout').addEventListener('click', () =>
  guard(async () => {
    await db.auth.signOut();
    selected = null;
    clients = [];
    showAuth(false);
    draw();
    notice('Déconnecté.');
  })
);

el('search').addEventListener('input', fillClients);

el('clientList').addEventListener('change', () =>
  guard(async () => selectClient(el('clientList').value))
);

el('createForm').addEventListener('submit', e => {
  e.preventDefault();

  guard(async () => {
    const first_name = el('firstName').value.trim();
    const last_name = el('lastName').value.trim();

    if (!first_name || !last_name) {
      throw Error('Prénom et nom obligatoires.');
    }

    const { data: c, error } = await db
      .from('customers')
      .insert({
        first_name,
        last_name,
        phone: el('phone').value.trim() || null,
        email: el('clientEmail').value.trim() || null
      })
      .select('id')
      .single();

    if (error) throw error;

    const { error: cardError } = await db
      .from('loyalty_cards')
      .insert({ customer_id: c.id });

    if (cardError) throw cardError;

    el('createForm').reset();
    await refreshClients(c.id);
    notice('Client et carte créés.');
  });
});

el('add').addEventListener('click', () =>
  guard(async () => {
    if (!selected) return;

    const id = selected.client.id;

    const { error } = await db.rpc('add_stamp', {
      p_card_id: selected.card.id
    });

    if (error) throw error;

    await refreshClients(id);
    notice('Tampon ajouté avec succès.');
  })
);

el('reset').addEventListener('click', () => {
  if (!selected || !confirm('Le cadeau a-t-il bien été remis au client ?')) {
    return;
  }

  guard(async () => {
    const id = selected.client.id;

    const { error } = await db.rpc('redeem_reward', {
      p_card_id: selected.card.id
    });

    if (error) throw error;

    await refreshClients(id);
    notice('Cadeau remis : carte remise à zéro.');
  });
});

(async () => {
  draw();

  try {
    const admin = await checkAdmin();
    showAuth(admin);

    if (admin) await refreshClients();
  } catch (e) {
    showAuth(false);
    notice('Erreur de connexion : ' + e.message);
  }
})();
