-- Run this once in the Supabase SQL editor, after migration_005_second_admin.sql.

create table favorites (
  id uuid primary key default gen_random_uuid(),
  renter_id uuid not null references auth.users on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (renter_id, listing_id)
);

alter table favorites enable row level security;

create policy "renter selects own favorites" on favorites
  for select using (auth.uid() = renter_id);

create policy "renter inserts own favorites" on favorites
  for insert with check (auth.uid() = renter_id);

create policy "renter deletes own favorites" on favorites
  for delete using (auth.uid() = renter_id);
