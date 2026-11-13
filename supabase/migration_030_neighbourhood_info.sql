-- Run once in the Supabase SQL editor, after migration_029_admin_insights.sql.
-- Neighbourhood info: the landlord ticks what is nearby (school, market, ...) and may add a short note.
-- Shown to renters on the listing page. Supersedes migration_024's public_listing().

alter table listings
  add column nearby text[] not null default '{}',
  add column neighbourhood_note text check (neighbourhood_note is null or char_length(neighbourhood_note) <= 200);

drop function if exists public_listing(uuid, text);

create or replace function public_listing(p_id uuid, p_device_id text default null)
returns table (
  id uuid, title text, description text, address text, city text,
  lat double precision, lng double precision, price numeric,
  bedrooms int, bathrooms numeric, amenities text[], photos jsonb,
  property_type text, unit_type text, status text, verification_status text, created_at timestamptz,
  owner_full_name text, owner_whatsapp_number text, unlocked boolean,
  availability text, available_from date, owner_verified boolean,
  nearby text[], neighbourhood_note text
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
    l.availability, l.available_from, (p.id_status = 'verified'),
    l.nearby, l.neighbourhood_note
  from listings l
  left join profiles p on p.id = l.owner_id
  left join listing_unlocks u
    on u.listing_id = l.id and u.device_id = p_device_id and u.status = 'successful' and not u.consumed
  where l.id = p_id and l.status = 'active' and l.verification_status = 'verified';
$$;
grant execute on function public_listing to anon, authenticated;
