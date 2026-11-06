-- Run once in the Supabase SQL editor, after migration_022_viewing_requests.sql.
-- Availability: landlords mark a listing as available or occupied (optionally "available from" a date).
-- Occupied listings stay visible (with a badge) so renters can plan ahead.

alter table listings
  add column availability text not null default 'available'
  check (availability in ('available', 'occupied')),
  add column available_from date;

-- Return columns change, so the old overloads are dropped explicitly first.
drop function if exists public_listings(text, numeric, numeric, int, text, text, numeric, text);
drop function if exists public_listing(uuid, text);

create or replace function public_listings(
  p_city text default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_min_bedrooms int default null,
  p_property_type text default null,
  p_sort text default 'newest',
  p_min_bathrooms numeric default null,
  p_unit_type text default null
)
returns table (
  id uuid, title text, description text, city text, price numeric,
  bedrooms int, bathrooms numeric, amenities text[], photos jsonb,
  property_type text, unit_type text, status text, verification_status text, created_at timestamptz,
  availability text, available_from date
)
language sql security definer set search_path = public as $$
  select l.id, l.title, l.description, l.city, l.price, l.bedrooms, l.bathrooms,
         l.amenities, l.photos, l.property_type, l.unit_type, l.status, l.verification_status, l.created_at,
         l.availability, l.available_from
  from listings l
  where l.status = 'active' and l.verification_status = 'verified'
    and (p_city is null or l.city ilike '%' || p_city || '%')
    and (p_min_price is null or l.price >= p_min_price)
    and (p_max_price is null or l.price <= p_max_price)
    and (p_min_bedrooms is null or l.bedrooms >= p_min_bedrooms)
    and (p_property_type is null or l.property_type = p_property_type)
    and (p_min_bathrooms is null or l.bathrooms >= p_min_bathrooms)
    and (p_unit_type is null or l.unit_type = p_unit_type)
  order by
    case p_sort when 'price_asc' then l.price when 'price_desc' then -l.price else null end asc nulls last,
    l.created_at desc;
$$;
grant execute on function public_listings to anon, authenticated;

create or replace function public_listing(p_id uuid, p_device_id text default null)
returns table (
  id uuid, title text, description text, address text, city text,
  lat double precision, lng double precision, price numeric,
  bedrooms int, bathrooms numeric, amenities text[], photos jsonb,
  property_type text, unit_type text, status text, verification_status text, created_at timestamptz,
  owner_full_name text, owner_whatsapp_number text, unlocked boolean,
  availability text, available_from date
)
language sql security definer set search_path = public as $$
  select
    l.id, l.title, l.description,
    case when u.id is not null then l.address else null end,
    l.city,
    case when u.id is not null then l.lat else null end,
    case when u.id is not null then l.lng else null end,
    l.price, l.bedrooms, l.bathrooms, l.amenities, l.photos,
    l.property_type, l.unit_type, l.status, l.verification_status, l.created_at,
    case when u.id is not null then p.full_name else null end,
    case when u.id is not null then p.whatsapp_number else null end,
    (u.id is not null) as unlocked,
    l.availability, l.available_from
  from listings l
  left join profiles p on p.id = l.owner_id
  left join listing_unlocks u
    on u.listing_id = l.id and u.device_id = p_device_id and u.status = 'successful' and not u.consumed
  where l.id = p_id and l.status = 'active' and l.verification_status = 'verified';
$$;
grant execute on function public_listing to anon, authenticated;
