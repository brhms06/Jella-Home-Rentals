-- Run after migration_009_verification_and_reports.sql.

-- Landlord-only signup.
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role = 'landlord');
alter table profiles alter column role set default 'landlord';

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data ->> 'full_name', 'landlord');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- favorites: device-based, no auth.users tie.
drop policy if exists "renter selects own favorites" on favorites;
drop policy if exists "renter inserts own favorites" on favorites;
drop policy if exists "renter deletes own favorites" on favorites;
drop table favorites;

create table favorites (
  id uuid primary key default gen_random_uuid(),
  device_id text not null,
  listing_id uuid not null references listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (device_id, listing_id)
);
alter table favorites enable row level security;
-- ponytail: device_id is self-reported, not a credential — same trust model
-- as listing_unlocks/reports. Blast radius of spoofing is "see someone
-- else's favorites list", not sensitive.
create policy "anyone can select favorites by device" on favorites for select using (true);
create policy "anyone can insert favorites" on favorites for insert with check (true);
create policy "anyone can delete favorites by device" on favorites for delete using (true);

-- reports: device-based, optional contact field, drop "select own" (no account to look up).
drop policy if exists "select own reports" on reports;
drop policy if exists "insert own reports" on reports;
alter table reports drop column reporter_id;
alter table reports add column device_id text not null default '';
alter table reports alter column device_id drop default;
alter table reports add column contact text;
create policy "anyone can insert reports" on reports for insert with check (true);
-- "admin can select/update all reports" from migration_009 are untouched.

-- Drop the blanket public-read policies — superseded by the RPCs in migration_011.
drop policy if exists "public can view active listings" on listings;
drop policy if exists "public can view profile whatsapp info" on profiles;
