-- Run after migration_011_listing_unlocks_and_public_rpcs.sql.
-- New listings publish immediately; admin can still Suspend/Reject after the
-- fact via the existing Admin tab. Re-tighten later by reverting the default
-- to 'pending' if mandatory pre-approval is wanted again.

alter table listings alter column verification_status set default 'verified';

-- Also unblock any listing already stuck pending from testing.
update listings set verification_status = 'verified' where verification_status = 'pending';
