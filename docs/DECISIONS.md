# Decisions log

> Why things are the way they are. Newest first. "Source" says whether the reason came from the owner (stated in conversation) or was recovered from code/migration comments. Add an entry whenever a choice would surprise a future reader.

## 2026-11 · Docs live in the repo (`docs/`), loaded via `CLAUDE.md`
`OVERVIEW.md` is imported into every session; topic docs are read on demand. Each doc carries a "verified against commit" stamp so staleness can be checked with `git diff`. Rule: update the matching doc in the same commit as a behavior change. *Source: owner.*

## 2026-11 · Chat is anonymous and device-based, gated by the unlock
Renters chat without an account (same device-id model as favorites/unlocks). The first message requires a successful unlock so chat can't be used to skip the paywall; after that the thread stays open. The renter's name is asked once and stored on the device. WhatsApp stays as a secondary "also on WhatsApp" option so someone mid-conversation can switch. Revisit if renters need cross-device history (would need accounts). *Source: owner.*

## 2026-11 · Chat refreshes by polling (4 s), not Realtime
Anonymous renters have no auth identity, so Postgres-changes Realtime (RLS-based) does not work for them without Broadcast channels or policies. Push notifications cover the "app closed" case. Upgrade path is Supabase Broadcast. *Source: engineering call, marked `ponytail:` in `chat-thread.tsx`.*

## 2026-11 · Push is sent from a Postgres trigger straight to Expo (no edge function)
`messages` insert → `notify_chat_message()` → `pg_net` POST to `exp.host`. Fewer moving parts and nothing to deploy. Trade-offs: no receipt handling (stale tokens linger), message text (first 120 chars) transits Expo's servers, and Expo "enhanced security" would need a header added. *Source: engineering call.*

## 2026-11 · Biometric/passcode confirmation before any payment
Added before the unlock and boost payments. It intentionally **skips** on web and on phones with no lock configured (nothing to check against) rather than blocking payment. Cancelling aborts the payment. *Source: owner request; skip rule is an engineering call.*

## 2026-11 · Test with renter on laptop, landlord on phone
Push only reaches native devices, so the supported test direction is renter (web) → landlord (phone). *Source: owner.*

## Earlier · Prices in XAF; Cameroon/Buea defaults
Currency is Central African CFA franc, default city Buea, payments via Fapshi mobile money (sandbox until launch). *Source: owner.*

## Maps: privacy-first pins, provider behind an edge function
Public listings show a stable approximate pin (salted hash offset up to ~490 m, 600 m circle); exact location only after unlock. Map providers are reached only through the `maps` edge function so they can be swapped; currently free OSM services (not for scale). Native maps need no API key in Expo Go. A real web map was deferred. *Source: owner approved the approach; implementation notes recovered from `migration_031` and `maps/index.ts`.*

## Single-use unlocks (migration 015)
An unlock is consumed the moment the details are revealed, so the paywall returns on the next visit. Screenshots and app-switcher previews are blocked on the revealed screen (native). Reviews, chat start, arrival events and directions all hinge on having paid. *Source: migration comments.*

## No phone number collected for viewing requests (migration 022)
The landlord's contact stays behind the paid unlock, so viewing requests carry only a date, slot and optional note. *Source: migration comment.*

## Listing verification gate disabled (migration 012)
Listings publish immediately (`verification_status` defaults to `verified`); the admin can still suspend/reject afterwards. The queue UI was deliberately not polished because the gate is off. *Source: migration comment + `ADMIN_FEATURE_IDEAS.md`.*

## Superadmin is a role, not an email allowlist (migration 013)
Stored on `profiles.role` and enforced by RLS via `is_superadmin()`. *Source: migration comment.*

## Renters have no accounts; landlord-only sign-up (migration 010)
Low friction for browsing/renting; accounts exist only for people who list. Everything renter-side is keyed by device id and reached through security-definer RPCs. Consequence: reinstalling loses favorites, unlocks (and therefore chat access to new listings), reviews and conversations. *Source: migration comment.*

## `// ponytail:` convention
The codebase marks deliberate simplifications with `ponytail:` comments naming the ceiling and the upgrade path. Grep for them before assuming a shortcut is a bug. *Source: project convention.*
