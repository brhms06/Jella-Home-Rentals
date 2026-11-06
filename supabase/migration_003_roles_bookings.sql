-- Run this once in the Supabase SQL editor, after migration_002_public_browse.sql.

-- roles ---------------------------------------------------------------
alter table profiles
  add column role text not null default 'renter'
  check (role in ('landlord', 'realtor', 'renter'));

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.raw_user_meta_data ->> 'role', 'renter')
  );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- After running this, backfill your own existing landlord account(s), e.g.:
--   update profiles set role = 'landlord' where id = '<your-user-id>';

-- property owners (realtor-managed, not necessarily an app user) ------
create table property_owners (
  id uuid primary key default gen_random_uuid(),
  managed_by uuid not null references auth.users on delete cascade,
  full_name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now()
);

alter table property_owners enable row level security;

create policy "select own property owners" on property_owners
  for select using (auth.uid() = managed_by);

create policy "insert own property owners" on property_owners
  for insert with check (auth.uid() = managed_by);

create policy "update own property owners" on property_owners
  for update using (auth.uid() = managed_by);

create policy "delete own property owners" on property_owners
  for delete using (auth.uid() = managed_by);

-- listings: property owner ref + leased tracking -----------------------
alter table listings
  add column property_owner_id uuid references property_owners(id) on delete set null,
  add column leased_at timestamptz,
  add column leased_price numeric;

alter table listings
  add constraint listings_status_check check (status in ('active', 'paused', 'leased'));

-- bookings (tour requests) ---------------------------------------------
create table bookings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  renter_id uuid not null references auth.users on delete cascade,
  requested_at timestamptz not null,
  message text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table bookings enable row level security;

create policy "renter selects own bookings" on bookings
  for select using (auth.uid() = renter_id);

create policy "renter inserts own bookings" on bookings
  for insert with check (auth.uid() = renter_id);

create policy "owner selects bookings on own listings" on bookings
  for select using (
    exists (select 1 from listings l where l.id = bookings.listing_id and l.owner_id = auth.uid())
  );

create policy "owner updates bookings on own listings" on bookings
  for update using (
    exists (select 1 from listings l where l.id = bookings.listing_id and l.owner_id = auth.uid())
  );

create trigger bookings_set_updated_at
  before update on bookings
  for each row execute procedure public.set_updated_at();
