-- Run this once in the Supabase SQL editor, after migration_014_fix_superadmin_recursion.sql.
-- Makes a listing unlock single-use: once the paywall clears and details are
-- shown, the client consumes the unlock, so the next fetch (next app launch,
-- navigating back to this listing later) masks it again and requires a fresh payment.

alter table listing_unlocks add column consumed boolean not null default false;

create or replace function public_listing(p_id uuid, p_device_id text default null)
returns table (
  id uuid, title text, description text, address text, city text,
  lat double precision, lng double precision, price numeric,
  bedrooms int, bathrooms numeric, amenities text[], photos jsonb,
  status text, verification_status text, created_at timestamptz,
  owner_full_name text, owner_whatsapp_number text, unlocked boolean
)
language sql security definer set search_path = public as $$
  select
    l.id, l.title, l.description,
    case when u.id is not null then l.address else null end,
    l.city,
    case when u.id is not null then l.lat else null end,
    case when u.id is not null then l.lng else null end,
    l.price, l.bedrooms, l.bathrooms, l.amenities, l.photos,
    l.status, l.verification_status, l.created_at,
    case when u.id is not null then p.full_name else null end,
    case when u.id is not null then p.whatsapp_number else null end,
    (u.id is not null) as unlocked
  from listings l
  left join profiles p on p.id = l.owner_id
  left join listing_unlocks u
    on u.listing_id = l.id and u.device_id = p_device_id and u.status = 'successful' and not u.consumed
  where l.id = p_id and l.status = 'active' and l.verification_status = 'verified';
$$;
grant execute on function public_listing to anon, authenticated;

create or replace function consume_listing_unlock(p_listing_id uuid, p_device_id text)
returns void language sql security definer set search_path = public as $$
  update listing_unlocks set consumed = true
  where listing_id = p_listing_id and device_id = p_device_id and status = 'successful';
$$;
grant execute on function consume_listing_unlock to anon, authenticated;
