-- Run this once in the Supabase SQL editor, after migration_012_disable_verification_gate.sql.
-- Replaces the ADMIN_EMAILS allowlist with a real 'superadmin' role on profiles,
-- enforced via RLS, plus a landlord 'suspended' flag.

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('landlord', 'superadmin'));
alter table profiles add column suspended boolean not null default false;

-- Backfill the two hardcoded admin emails to the new role.
update profiles set role = 'superadmin'
where id in (select id from auth.users where email in ('broomuhams@gmail.com', 'anyangwagodwill10@gmail.com'));

-- Superadmin can see/manage every landlord profile.
create policy "superadmin can select all profiles" on profiles
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'superadmin')
  );

create policy "superadmin can update all profiles" on profiles
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'superadmin')
  );

-- Replace email-based admin policies on listings (migration_004/005) with role-based ones.
drop policy if exists "admin can select all listings" on listings;
drop policy if exists "admin can update listings" on listings;

create policy "superadmin can select all listings" on listings
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'superadmin')
  );

create policy "superadmin can update listings" on listings
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'superadmin')
  );

-- Replace email-based admin policies on reports (migration_009) with role-based ones.
drop policy if exists "admin can select all reports" on reports;
drop policy if exists "admin can update reports" on reports;

create policy "superadmin can select all reports" on reports
  for select using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'superadmin')
  );

create policy "superadmin can update reports" on reports
  for update using (
    exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'superadmin')
  );

-- A suspended landlord can no longer create or edit listings.
drop policy if exists "insert own listings" on listings;
create policy "insert own listings" on listings
  for insert with check (
    auth.uid() = owner_id
    and not exists (select 1 from profiles p where p.id = auth.uid() and p.suspended)
  );

drop policy if exists "update own listings" on listings;
create policy "update own listings" on listings
  for update using (
    auth.uid() = owner_id
    and not exists (select 1 from profiles p where p.id = auth.uid() and p.suspended)
  )
  with check (
    auth.uid() = owner_id
    and not exists (select 1 from profiles p where p.id = auth.uid() and p.suspended)
  );

-- Hide suspended landlords' listings from the public browse RPCs.
create or replace function public_listings(
  p_city text default null,
  p_min_price numeric default null,
  p_max_price numeric default null,
  p_min_bedrooms int default null,
  p_sort text default 'newest'
)
returns table (
  id uuid, title text, description text, city text, price numeric,
  bedrooms int, bathrooms numeric, amenities text[], photos jsonb,
  status text, verification_status text, created_at timestamptz
)
language sql security definer set search_path = public as $$
  select l.id, l.title, l.description, l.city, l.price, l.bedrooms, l.bathrooms,
         l.amenities, l.photos, l.status, l.verification_status, l.created_at
  from listings l
  join profiles p on p.id = l.owner_id
  where l.status = 'active' and l.verification_status = 'verified' and not p.suspended
    and (p_city is null or l.city ilike '%' || p_city || '%')
    and (p_min_price is null or l.price >= p_min_price)
    and (p_max_price is null or l.price <= p_max_price)
    and (p_min_bedrooms is null or l.bedrooms >= p_min_bedrooms)
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
  join profiles p on p.id = l.owner_id
  left join listing_unlocks u
    on u.listing_id = l.id and u.device_id = p_device_id and u.status = 'successful'
  where l.id = p_id and l.status = 'active' and l.verification_status = 'verified' and not p.suspended;
$$;
grant execute on function public_listing to anon, authenticated;
