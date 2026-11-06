-- Run this once in the Supabase SQL editor, after migration_007_renter_booked_listing_visibility.sql.
-- Removes: realtor role, property_owners, tour bookings, leased listing state.

drop policy if exists "renter can view listings they booked" on listings;

drop trigger if exists bookings_set_updated_at on bookings;
drop table if exists bookings;

alter table listings drop column if exists property_owner_id;
drop table if exists property_owners;

update listings set status = 'active' where status = 'leased';
alter table listings drop constraint if exists listings_status_check;
alter table listings drop column if exists leased_at;
alter table listings drop column if exists leased_price;
alter table listings add constraint listings_status_check check (status in ('active', 'paused'));

update profiles set role = 'landlord' where role = 'realtor';
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('landlord', 'renter'));

alter table listings drop column if exists commission_paid;
