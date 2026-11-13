-- Run once in the Supabase SQL editor, after migration_030_neighbourhood_info.sql.
-- Maps: approximate (privacy-safe) coordinates for public map pins, how a property is reached (on foot / by car),
-- and an "arrived" event when a renter who paid for directions reaches the property.

-- 1. How renters reach the property. 'foot' = the last stretch is a footpath; 'car' = a motorable road reaches it.
alter table listings add column access_mode text not null default 'foot' check (access_mode in ('foot', 'car'));

-- 2. Approximate coordinates. Each listing gets a fixed offset of up to ~490 m, derived from its id and a SECRET
--    salt (generated here, never stored in the repo), so the circle never moves between visits and can't be
--    reversed or averaged out. The exact lat/lng still only leave the database after a paid unlock.
create table private_settings (key text primary key, value text not null);
alter table private_settings enable row level security; -- no policies: unreadable from the client
insert into private_settings (key, value) values ('geo_salt', gen_random_uuid()::text);

create or replace function public.fuzz_offset(p_id uuid, p_byte int)
returns double precision
language sql stable security definer set search_path = public as $$
  select (get_byte(decode(md5(p_id::text || (select value from private_settings where key = 'geo_salt')), 'hex'), p_byte) / 255.0 - 0.5) * 2;
$$;
revoke execute on function public.fuzz_offset(uuid, int) from public, anon, authenticated;

-- 3. "Arrived" events (only from a device that paid to unlock that listing).
alter table listing_events drop constraint listing_events_event_check;
alter table listing_events add constraint listing_events_event_check check (event in ('view', 'contact', 'arrived'));

create or replace function public.log_listing_event(p_listing_id uuid, p_device_id text, p_event text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_event not in ('view', 'contact', 'arrived') or coalesce(p_device_id, '') = '' then
    return;
  end if;
  if not exists (select 1 from listings where id = p_listing_id and status = 'active') then
    return;
  end if;
  if p_event = 'view' and exists (
    select 1 from listing_events
    where listing_id = p_listing_id and device_id = p_device_id and event = 'view'
      and created_at > now() - interval '1 hour'
  ) then
    return;
  end if;
  if p_event = 'arrived' and not exists (
    select 1 from listing_unlocks where listing_id = p_listing_id and device_id = p_device_id and status = 'successful'
  ) then
    return;
  end if;
  insert into listing_events (listing_id, device_id, event) values (p_listing_id, p_device_id, p_event);
end;
$$;
grant execute on function public.log_listing_event to anon, authenticated;

-- Landlord inbox now also shows arrivals (supersedes migration_027's version).
drop function if exists public.owner_contact_events(int);
create or replace function public.owner_contact_events(p_limit int default 50)
returns table (id uuid, listing_id uuid, listing_title text, event text, created_at timestamptz)
language sql security definer set search_path = public stable as $$
  select e.id, e.listing_id, l.title, e.event, e.created_at
  from listing_events e
  join listings l on l.id = e.listing_id
  where l.owner_id = auth.uid() and e.event in ('contact', 'arrived')
  order by e.created_at desc
  limit p_limit;
$$;
grant execute on function public.owner_contact_events to authenticated;

-- 4. Public RPCs gain approx_lat / approx_lng / access_mode (supersede migrations 026 and 030).
drop function if exists public_listings(text, numeric, numeric, int, text, text, numeric, text);
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
  availability text, available_from date, owner_verified boolean, is_boosted boolean,
  approx_lat double precision, approx_lng double precision, access_mode text
)
language sql security definer set search_path = public as $$
  select l.id, l.title, l.description, l.city, l.price, l.bedrooms, l.bathrooms,
         l.amenities, l.photos, l.property_type, l.unit_type, l.status, l.verification_status, l.created_at,
         l.availability, l.available_from, (p.id_status = 'verified'),
         (l.boosted_until is not null and l.boosted_until > now()),
         l.lat + public.fuzz_offset(l.id, 0) * 0.0031,
         l.lng + public.fuzz_offset(l.id, 1) * 0.0031 / cos(radians(l.lat)),
         l.access_mode
  from listings l
  left join profiles p on p.id = l.owner_id
  where l.status = 'active' and l.verification_status = 'verified'
    and (p_city is null or l.city ilike '%' || p_city || '%')
    and (p_min_price is null or l.price >= p_min_price)
    and (p_max_price is null or l.price <= p_max_price)
    and (p_min_bedrooms is null or l.bedrooms >= p_min_bedrooms)
    and (p_property_type is null or l.property_type = p_property_type)
    and (p_min_bathrooms is null or l.bathrooms >= p_min_bathrooms)
    and (p_unit_type is null or l.unit_type = p_unit_type)
  order by
    case when p_sort = 'newest' and l.boosted_until > now() then 0 else 1 end,
    case p_sort when 'price_asc' then l.price when 'price_desc' then -l.price else null end asc nulls last,
    l.created_at desc;
$$;
grant execute on function public_listings to anon, authenticated;

drop function if exists public_listing(uuid, text);
create or replace function public_listing(p_id uuid, p_device_id text default null)
returns table (
  id uuid, title text, description text, address text, city text,
  lat double precision, lng double precision, price numeric,
  bedrooms int, bathrooms numeric, amenities text[], photos jsonb,
  property_type text, unit_type text, status text, verification_status text, created_at timestamptz,
  owner_full_name text, owner_whatsapp_number text, unlocked boolean,
  availability text, available_from date, owner_verified boolean,
  nearby text[], neighbourhood_note text,
  approx_lat double precision, approx_lng double precision, access_mode text
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
    l.nearby, l.neighbourhood_note,
    l.lat + public.fuzz_offset(l.id, 0) * 0.0031,
    l.lng + public.fuzz_offset(l.id, 1) * 0.0031 / cos(radians(l.lat)),
    l.access_mode
  from listings l
  left join profiles p on p.id = l.owner_id
  left join listing_unlocks u
    on u.listing_id = l.id and u.device_id = p_device_id and u.status = 'successful' and not u.consumed
  where l.id = p_id and l.status = 'active' and l.verification_status = 'verified';
$$;
grant execute on function public_listing to anon, authenticated;
