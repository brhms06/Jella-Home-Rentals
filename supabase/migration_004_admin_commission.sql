-- Run this once in the Supabase SQL editor, after migration_003_roles_bookings.sql.

alter table listings add column commission_paid boolean not null default false;

-- Single hardcoded admin account (the app owner) can see every leased listing
-- across all landlords/realtors and toggle whether the commission was paid.
-- ponytail: this is a full-row admin bypass, not column-scoped — fine for one
-- trusted operator account; revisit with a real admin role/table if that changes.
create policy "admin can select all listings" on listings
  for select using (auth.jwt() ->> 'email' = 'broomuhams@gmail.com');

create policy "admin can update listings" on listings
  for update using (auth.jwt() ->> 'email' = 'broomuhams@gmail.com');
