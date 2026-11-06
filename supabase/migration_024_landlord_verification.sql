-- Run once in the Supabase SQL editor, after migration_023_listing_availability.sql.
-- Landlord ID verification: a landlord uploads an ID photo to a PRIVATE bucket, a superadmin reviews it,
-- and verified landlords get a "Verified landlord" mark on their listings.

alter table profiles
  add column id_status text not null default 'none'
    check (id_status in ('none', 'pending', 'verified', 'rejected')),
  add column id_document_path text;

-- Private bucket: only the owner (own folder) and superadmins can read; only the owner can upload.
insert into storage.buckets (id, name, public)
values ('id-documents', 'id-documents', false);

create policy "owners upload their id documents" on storage.objects
  for insert with check (
    bucket_id = 'id-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "owners read their id documents" on storage.objects
  for select using (
    bucket_id = 'id-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "superadmin reads all id documents" on storage.objects
  for select using (bucket_id = 'id-documents' and public.is_superadmin());

-- The existing "update own profile" policy lets a landlord edit ANY column of their own row. That means
-- today a landlord could set role = 'superadmin', clear `suspended`, or mark their own ID verified.
-- This trigger closes all three: only superadmins may change role/suspended/id fields; the one exception
-- is submit_id_verification below, which flips a session flag to move id_status to 'pending'.
create or replace function public.protect_id_verification()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_superadmin() then
    return new;
  end if;
  if new.role is distinct from old.role or new.suspended is distinct from old.suspended then
    raise exception 'role and suspended can only be changed by an admin';
  end if;
  if (new.id_status is distinct from old.id_status or new.id_document_path is distinct from old.id_document_path)
     and coalesce(current_setting('jella.allow_id_change', true), '') <> 'on' then
    raise exception 'id verification fields can only be changed by an admin';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_id_verification
  before update on profiles
  for each row execute procedure public.protect_id_verification();

-- Landlord: submit (or re-submit after a rejection) an uploaded document for review.
create or replace function public.submit_id_verification(p_path text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if split_part(p_path, '/', 1) <> auth.uid()::text then
    raise exception 'invalid document path';
  end if;
  perform set_config('jella.allow_id_change', 'on', true);
  update profiles
     set id_status = 'pending', id_document_path = p_path
   where id = auth.uid() and id_status in ('none', 'rejected');
end;
$$;
grant execute on function public.submit_id_verification to authenticated;
-- Admin approval/rejection is a plain `update profiles set id_status = ...` under the existing
-- "superadmin can update all profiles" policy; the trigger above lets superadmins through.

-- Public RPCs now also return whether the landlord is ID-verified (supersedes migration_023's versions).
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
  availability text, available_from date, owner_verified boolean
)
language sql security definer set search_path = public as $$
  select l.id, l.title, l.description, l.city, l.price, l.bedrooms, l.bathrooms,
         l.amenities, l.photos, l.property_type, l.unit_type, l.status, l.verification_status, l.created_at,
         l.availability, l.available_from, (p.id_status = 'verified')
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
  availability text, available_from date, owner_verified boolean
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
    l.availability, l.available_from, (p.id_status = 'verified')
  from listings l
  left join profiles p on p.id = l.owner_id
  left join listing_unlocks u
    on u.listing_id = l.id and u.device_id = p_device_id and u.status = 'successful' and not u.consumed
  where l.id = p_id and l.status = 'active' and l.verification_status = 'verified';
$$;
grant execute on function public_listing to anon, authenticated;
