# Listings, unlocks, boosts, price drops

> Verified against code at commit `4d56316`. Files: `src/lib/listings.ts`, `payments.ts`, `boost.ts`, `price-drops.ts`, `src/components/listing-detail.tsx`, `boost-listing.tsx`, `supabase/functions/create-payment|create-boost|fapshi-webhook`, migrations 011, 015, 026, 028, 030, 031.

## Listing model
`Listing` (in `listings.ts`) mirrors the `listings` table: title, description, `address`, `city`, `lat`/`lng` (exact), `price` (XAF), bedrooms, bathrooms, `amenities[]`, `photos[]` (public `listing-photos` bucket), `property_type` (`home|guest_house|hotel`), `unit_type` (`single_room|studio|apartment`, homes only), `status`, `verification_status`, `availability` (`available|occupied`) + `available_from`, `boosted_until`, `previous_price`/`price_dropped_at`, `nearby[]` + `neighbourhood_note`, `access_mode` (`foot|car`).
Three shapes exist on purpose: `Listing` (owner sees everything), `PublicListing` (browse list: **no address/exact coords/owner id**, has `approx_lat/lng`), `PublicListingDetail` (detail: address/lat/lng/owner name/WhatsApp are **null until unlocked**).

## Masking: how privacy is enforced
Renters never read `listings` directly. They call RPCs:
- `public_listings(filters…)` returns active+verified listings, masked, boosted first when sort is `newest`.
- `public_listing(p_id, p_device_id)` returns the detail; address, exact coords, owner name and WhatsApp are returned only if a `listing_unlocks` row exists for that device with `status='successful'` **and `consumed = false`**.
Changing what a renter can see means changing these SQL functions (the latest definitions are in migration 031; 030 superseded 024's). Dropping/recreating is needed when the return shape changes (earlier migrations do `drop function if exists`).

## Unlock (paywall) flow
1. Renter enters a mobile-money number and taps Unlock. **Biometric/passcode check first** (`src/lib/biometric.ts`; skipped on web and phones with no lock).
2. `createPayment()` → edge function `create-payment` upserts `listing_unlocks` (`pending`, amount 500, `consumed:false`) and calls Fapshi `direct-pay` (externalId = unlock id).
3. Renter approves on their phone. Fapshi calls `fapshi-webhook`, which maps Fapshi status to `pending|successful|failed|expired` and updates the row (matched on `fapshi_trans_id`); it also calls `apply_boost_status` for boosts.
4. The client polls `fetchListing` every 3 s (up to 10 tries) after submit, on app foreground, and via an "I've paid — check again" button.
5. When `unlocked` flips true the screen shows "Payment successful" → **Continue** sets `revealed`. The moment it is revealed the client calls `consume_listing_unlock` (single-use). Later fetches mask again, so the listing re-locks on the next visit; the browse detail route deliberately **keeps the already-revealed data** in state so background refetches don't re-mask it mid-session (`app/(browse)/listing/[id].tsx`).
6. While revealed (native only): screen capture is blocked, app-switcher protection is on, a screenshot triggers an alert, and leaving the page asks for confirmation (`usePreventRemove` + `repeat()`).
7. A new payment on the same listing/device resets the row to `pending, consumed:false`.

Things unlocked rows also gate: first chat message (`renter_send_message` requires a `successful` unlock, consumed or not), reviews (`can_review_listing`), "arrived" events and in-app directions.

## Boosts (landlord)
`BoostListing` → `createBoost()` → edge function `create-boost` (JWT required; verifies the caller owns an **active, verified** listing) → inserts `listing_boosts` (1000 XAF, 7 days) → Fapshi → same webhook → `apply_boost_status` extends `listings.boosted_until`. The `listings_protect_boosted_until` trigger blocks any other write to `boosted_until`, so **boosting can only be tested through the payment flow** (or the webhook path). `isBoosted()` = `boosted_until` in the future. Browse sorts boosted first and shows a Featured badge; Discover (swipe deck) re-shows boosted listings sooner (`BOOSTED_RESHOW_DAYS = 3` vs `SKIP_RESHOW_DAYS = 60`).

## Price drops
Trigger `listings_track_price_drop`: on UPDATE where the new price is lower, stores `previous_price` and `price_dropped_at`; ignores `previous_price` supplied on INSERT. `fetchPriceDrops(ids)` feeds the Wishlists tab, the tab badge (`useUnseenDropCount`) and the listing page.

## Other listing features
- **Viewing requests** (`viewing-requests.ts`, `request-viewing.tsx`): renter proposes a date + slot (`morning|afternoon|evening`), max 3 pending per listing per device; landlord accepts/declines in Inbox. No phone number is shared.
- **Reviews** (`reviews.ts`): 1-5 stars, only from a device that paid to unlock, one per device per listing; admin can hide.
- **Availability**: landlord toggles available/occupied (+ "available from"); occupied listings stay visible with a badge.
- **Reports** (`reports.ts`): renter flags a listing; admin reviews.
- **Neighbourhood**: landlord ticks nearby places + a note (`neighbourhood.tsx`).
- **Analytics**: `log_listing_event` records `view | contact | arrived` per device; landlords read counts via `owner_listing_stats` / `owner_views_by_day`.
- **Client-only**: saved searches, recently viewed, skipped Discover cards, price-drop "seen" marker all live in AsyncStorage (`saved-searches.ts`, `recent.ts`, `swipes.ts`).

## Open questions / known issues
- Prices duplicated client vs server (see OVERVIEW gotcha 2).
- Sandbox Fapshi only; no refund or failure-recovery UI beyond "check again".
