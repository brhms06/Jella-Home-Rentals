-- Run once in the Supabase SQL editor, after migration_027_owner_contact_events.sql.
-- Price-drop alerts: when a landlord LOWERS a listing's price we remember the old price and when it happened,
-- so renters who saved the listing see "Price dropped" (in the Wishlists tab and on the listing).

alter table listings
  add column previous_price numeric,
  add column price_dropped_at timestamptz;

-- Landlords can write any column of their own row, so this trigger owns these two columns: they change only
-- as a side effect of a real price change (lower = record the drop, higher = clear it), never by direct edit.
create or replace function public.track_price_drop()
returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.previous_price := null;
    new.price_dropped_at := null;
  elsif new.price < old.price then
    new.previous_price := old.price;
    new.price_dropped_at := now();
  elsif new.price > old.price then
    new.previous_price := null;
    new.price_dropped_at := null;
  else
    new.previous_price := old.previous_price;
    new.price_dropped_at := old.price_dropped_at;
  end if;
  return new;
end;
$$;
create trigger listings_track_price_drop
  before insert or update on listings
  for each row execute procedure public.track_price_drop();

-- Recent price drops (last 14 days) among the given listings. Public: it only exposes prices that are
-- already public in the browse list.
create or replace function public.price_drops(p_ids uuid[])
returns table (listing_id uuid, previous_price numeric, price numeric, dropped_at timestamptz)
language sql security definer set search_path = public stable as $$
  select l.id, l.previous_price, l.price, l.price_dropped_at
  from listings l
  where l.id = any(p_ids)
    and l.status = 'active' and l.verification_status = 'verified'
    and l.previous_price is not null
    and l.price_dropped_at > now() - interval '14 days';
$$;
grant execute on function public.price_drops to anon, authenticated;
