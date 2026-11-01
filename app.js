
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
