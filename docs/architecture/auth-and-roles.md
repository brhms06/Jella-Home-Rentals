# Auth, roles, admin, verification

> Verified against code at commit `4d56316`. Files: `src/lib/auth-context.tsx`, `profile.ts`, `oauth.ts`, `admin.ts`, `verification.ts`, `src/app/_layout.tsx`, `src/app/(auth)/*`, `src/app/(dashboard)/(tabs)/admin.tsx`, migrations 001, 003, 010, 012, 013, 014, 020, 024.

## Identity model
| Who | Identity | Where it lives |
|---|---|---|
| Renter | none; random **device id** | AsyncStorage `jella_device_id` (`device.ts`) |
| Landlord | Supabase Auth user + `profiles` row (`role = 'landlord'`) | Supabase |
| Superadmin | same, `role = 'superadmin'` | `profiles.role` (replaced an email allowlist in migration 013) |

Sign-up is **landlord-only** (migration 010). `handle_new_user` trigger creates the `profiles` row. Auth uses email/password and Google OAuth (`oauth.ts`, PKCE + `expo-web-browser`); the Supabase client persists the session in AsyncStorage (`supabase.ts`).

## Session + routing
`AuthProvider` exposes `{ session, profile, loading, refreshProfile }`. The root navigator (`_layout.tsx`) holds the splash until session and profile are loaded, then uses `Stack.Protected`:
- `(dashboard)` only for a signed-in `landlord` or `superadmin`;
- `(browse)` and `(auth)` only when signed out, or for `superadmin`.
So **a signed-in landlord cannot reach renter screens** (use a separate browser/profile or device to test as a renter).

## Profile fields
`full_name`, `whatsapp_number` (the number renters get after unlocking), `avatar_url` (`avatar-photos` bucket), `country`, `role`, `suspended`, `id_status` (`none|pending|verified|rejected`), `id_document_path`.

## RLS shape (summary)
- Landlords: select/insert/update/delete **own** listings (`owner_id = auth.uid()`); a `suspended` landlord cannot create/edit listings (migration 013).
- Superadmin: select/update on all profiles, listings, reports via `is_superadmin()` (a security-definer function, introduced in 014 to avoid "infinite recursion in policy for profiles").
- Renter-facing data is reached through RPCs, see `database.md`.

## Verification (two separate things)
1. **Listing verification** (`listings.verification_status`: `pending|verified|rejected|suspended`): the browse RPCs only return `active` + `verified`. Since migration 012 the default is `'verified'`, so the gate is effectively off; superadmin can still Suspend/Reject afterwards.
2. **Landlord ID verification** (`profiles.id_status`): landlord uploads an ID photo to the **private** `id-documents` bucket (`uploadIdDocument`), superadmin views it via a signed URL (`openIdDocument`) and sets verified/rejected (`submit_id_verification`, `protect_id_verification` trigger). Verified landlords get the "Verified landlord" badge (`owner_verified` on public listings = `id_status = 'verified'`).

## Admin tab (superadmin only)
Views: Listings, Reports, Landlords, Reviews, Activity. Features: approve/suspend/reject listings, set access mode, review reports, suspend landlords, verify IDs, hide reviews, revenue stats (unlocks + boosts), top listings, moderation history (`moderation_log`, written by the `listings_log_moderation` trigger). `ADMIN_FEATURE_IDEAS.md` is an older backlog, partly done.

## Notes
- Chat/push identity follows the same split: renters by device id, landlords by `auth.uid()` (see `chat-and-push.md`). Logging out must go through `signOut()` in `src/lib/push.ts`.
- There is no password-reset or email-verification documentation here; check Supabase Auth settings in the dashboard if that matters.
