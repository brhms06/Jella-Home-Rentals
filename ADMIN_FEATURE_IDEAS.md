# Admin feature ideas

Current admin: one screen (`admin.tsx`), 3 tabs — Listings / Reports / Landlords. No audit log, no analytics.

| Feature | Why | UI |
|---|---|---|
| Report → listing link | Reports show raw `listing_id`, can't jump to the listing | tweak existing screen (link) |
| Report reason/category | `createReport` has no reason field — can't tell spam vs fraud vs duplicate | tweak existing form + column |
| Role promote/demote (landlord ↔ superadmin) | No UI, only fixable via SQL | pop-up on Landlords tab row |
| `commission_paid` toggle | Column exists (migration_004), unused, no UI | toggle on listing row |
| Bookings visibility | `bookings` table exists, zero admin UI | screen — only if table actually has rows, check first |
| Listing unlock/payment activity | `listing_unlocks` table has no admin visibility | skip unless support needs it |

Skipped on purpose: audit log, analytics dashboard, verification queue polish (verification is auto-bypassed since migration_012 — building UI for a disabled queue solves a turned-off problem).
