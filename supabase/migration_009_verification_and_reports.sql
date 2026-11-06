-- Run this once in the Supabase SQL editor, after migration_008_remove_realtor_bookings_leasing.sql.

alter table listings
  add column verification_status text not null default 'pending'
  check (verification_status in ('pending', 'verified', 'rejected', 'suspended'));

drop policy if exists "public can view active listings" on listings;
create policy "public can view active listings" on listings
  for select using (status = 'active' and verification_status = 'verified');

create table reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at timestamptz not null default now()
);

alter table reports enable row level security;

create policy "insert own reports" on reports
  for insert with check (auth.uid() = reporter_id);

create policy "select own reports" on reports
  for select using (auth.uid() = reporter_id);

create policy "admin can select all reports" on reports
  for select using (auth.jwt() ->> 'email' in ('broomuhams@gmail.com', 'anyangwagodwill10@gmail.com'));

create policy "admin can update reports" on reports
  for update using (auth.jwt() ->> 'email' in ('broomuhams@gmail.com', 'anyangwagodwill10@gmail.com'));
