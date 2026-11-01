-- Exécuter dans Supabase > SQL Editor avant de publier les nouveaux fichiers.
create or replace function public.redeem_reward(p_card_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_points integer;
begin
  if not exists (select 1 from public.admin_users where user_id = auth.uid()) then
    raise exception 'Acces administrateur refuse';
  end if;
  select points into v_points from public.loyalty_cards where id = p_card_id for update;
  if not found then raise exception 'Carte introuvable'; end if;
  if v_points <> 10 then raise exception 'La carte doit avoir 10 tampons'; end if;
  update public.loyalty_cards set points=0,reward_unlocked=false where id=p_card_id;
  insert into public.stamp_events(card_id,admin_id,action) values(p_card_id,auth.uid(),'reward_reset');
  return 0;
end;
$$;
revoke all on function public.redeem_reward(uuid) from public;
grant execute on function public.redeem_reward(uuid) to authenticated;
