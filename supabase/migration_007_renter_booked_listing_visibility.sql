-- Run this once in the Supabase SQL editor, after migration_006_favorites.sql.

-- A renter who booked a tour should still be able to see that listing's basic
-- info even after it's paused or leased (no longer covered by the public
-- "active" policy) and they aren't the owner. Additive, doesn't affect anyone
-- else's visibility.
create policy "renter can view listings they booked" on listings
  for select using (
    exists (select 1 from bookings b where b.listing_id = listings.id and b.renter_id = auth.uid())
  );
