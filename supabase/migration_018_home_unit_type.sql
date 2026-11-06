-- Run after migration_017_bathrooms_filter.sql.
-- Adds a "Property" sub-type filter (Single room / Studio / Apartment),
-- shown in the browse UI only for the "Homes" category.

alter table listings
  add column unit_type text
  check (unit_type in ('single_room', 'studio', 'apartment'));

-- Return columns change (new unit_type column), so the old overload must be
-- dropped explicitly first — CREATE OR REPLACE only works for identical
-- signature/return type.
drop function if exists public_listings(text, numeric, numeric, int, text, text, numeric);

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
  property_type text, unit_type text, status text, verification_status text, created_at timestamptz
)
language sql security definer set search_path = public as $$
  select l.id, l.title, l.description, l.city, l.price, l.bedrooms, l.bathrooms,
         l.amenities, l.photos, l.property_type, l.unit_type, l.status, l.verification_status, l.created_at
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
