# Jella: overview

> Verified against code at commit `4d56316` (branch `feature/redesign-and-landlord-features`).
> To check what changed since: `git diff 4d56316..HEAD -- <area>`. Topic docs are in `docs/architecture/`; the reasons behind choices are in `docs/DECISIONS.md`.

Jella is a rental marketplace for Cameroon (default city **Buea**, prices in **XAF**). Renters browse for free and pay a small fee (500 XAF) to unlock a listing's exact address and the landlord's contact. Landlords list properties and can pay to boost them.

## Who uses it (important, it shapes everything)
- **Renters have no accounts.** They are identified only by a random **device id** (`src/lib/device.ts`, AsyncStorage key `jella_device_id`). Favorites, unlocks, reviews, viewing requests, chat and push tokens are all keyed by it. Losing the app data loses them.
- **Landlords** have Supabase Auth accounts (email/password or Google). Sign-up is landlord-only.
- **Superadmin** is a role on `profiles.role` (not an email allowlist). Sees an Admin tab and can also open the browse screens.

## Stack
Expo SDK 58, React Native 0.88, React 19, expo-router 58 (file-based, typed routes on), Supabase (Postgres, Auth, Storage, Edge Functions), react-native-reanimated 4, react-native-maps, Fapshi mobile money (currently the **sandbox**), Expo push. Tests: jest-expo. Runs on iOS/Android (tested via Expo Go) and web (a preview with limitations, see Gotchas).

## Repo map
```
src/app/                 expo-router routes (see Routes)
src/components/          screens' building blocks; ui/ = small shared primitives
src/lib/                 data access (one file per domain), contexts, helpers; __tests__/ = jest
src/constants/theme.ts   colors, spacing, radius, typography; countries.ts
src/hooks/use-desktop.ts desktop-web breakpoint (900px)
supabase/migration*.sql  numbered, run in order (header says "after migration_NNN"); the DB is the source of truth for rules
supabase/functions/      Deno edge functions: create-payment, create-boost, fapshi-webhook, maps
supabase/seed_demo_listings.sql  8 demo listings with coordinates (removal command in its header)
docs/                    these docs
rive/, tools/, design-refs/  parked Rive experiments, phone-frame tooling, design inspiration images (not app code)
ADMIN_FEATURE_IDEAS.md   old admin backlog (partly done)
```

## Routes (`src/app`)
- `_layout.tsx`: providers (Theme, Auth), splash → onboarding → navigator, push-tap handler, root `ErrorBoundary`. `Stack.Protected`: **landlord/superadmin → `(dashboard)`; signed-out or superadmin → `(browse)` and `(auth)`**. A signed-in landlord cannot open `(browse)`.
- `(browse)/(tabs)`: `index` (Explore: home feed, search/filters, map toggle), `favorites` (Wishlists), `messages`, `profile`. Stack screens: `listing/[id]`, `chat/[listingId]`, `discover` (swipe deck).
- `(dashboard)/(tabs)`: `index` (landlord Home), `requests` (Inbox: chats, viewing requests, WhatsApp contacts), `admin` (superadmin only), `profile`. Stack: `listing/new`, `listing/[id]` (+`/edit`), `chat/[id]`.
- `(auth)`: `welcome`, `login`, `signup`. `+not-found.tsx`: unknown-route screen.
- Navigate with explicit group paths, e.g. `router.push({ pathname: "/(browse)/chat/[listingId]", params })`, because `(browse)` and `(dashboard)` both have `listing/[id]` and `chat/…`.

## Core flows (details in architecture docs)
1. **Browse → unlock → reveal → message.** `listings-and-unlocks.md`
2. **Chat + push.** `chat-and-push.md`
3. **Maps and privacy-safe pins.** `maps.md`
4. **Auth, roles, admin, verification.** `auth-and-roles.md`
5. **Database objects.** `database.md`
6. **UI conventions, loading/error patterns.** `ui-system.md`

## Conventions
- **Data access**: all server calls live in `src/lib/<domain>.ts`; screens import from there. Almost every renter-facing call is a **security-definer RPC taking `p_device_id`**; most tables (unlocks, events, viewing requests, chat, push tokens…) have RLS on with **no policies** (default-deny) and are reached only through RPCs/edge functions. Exceptions: `favorites` and `reports` have open anon policies (migration 010), see `database.md`. Landlord reads/writes use RLS (`owner_id = auth.uid()`) or `owner_*` RPCs.
- **Styling**: `const theme = useTheme(); const styles = useMemo(() => makeStyles(theme), [theme])` with `StyleSheet.create`. Tokens in `src/constants/theme.ts`. Light/dark supported; never hardcode colors.
- **Imports**: `@/` → `src/`.
- **Platform splits**: `foo.web.tsx` replaces `foo.tsx` on web (maps do this).
- **`// ponytail:` comments** mark a deliberate simplification and name its ceiling/upgrade path. `grep -rn "ponytail:" src supabase` lists the known shortcuts.
- **Migrations**: new file `supabase/migration_NNN_name.sql` with a header "Run once…, after migration_NNN-1". Keep security-definer functions `set search_path = public`. Applied to the live project via the Supabase MCP `apply_migration` (project ref `niqewfrpyfbckguchdln`); 032/033 were applied that way (migration names `chat_conversations`, `push_notifications`).
- **Money is XAF**, formatted by `xaf()` in `src/lib/listings.ts`.

## Commands
- Phone via Expo Go (works off-LAN): `npx expo start --tunnel` (needs `@expo/ngrok`, a dev dependency). Web: `npx expo start --web`.
- Checks: `npx tsc --noEmit`, `npx jest`, `npx expo lint <paths>`.
- Env: `.env` (git-ignored) must define `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Edge-function secrets live in Supabase, not the repo: `FAPSHI_API_USER`, `FAPSHI_API_KEY`, `FAPSHI_WEBHOOK_SECRET` (plus the built-in Supabase vars).

## Gotchas that have already cost time
1. **Leave-page guard**: `usePreventRemove` callbacks must call `repeat()`; re-dispatching `data.action` re-triggers the guard forever. `Alert.alert` does nothing on web, so use `window.confirm` there (other screens such as boost still use `Alert.alert`, which silently fails on web).
2. **Prices are duplicated** between client and server: the unlock fee is `UNLOCK_AMOUNT = 500` in `create-payment` and `UNLOCK_PRICE_LABEL = "500 XAF"` in `listing-detail.tsx`; the boost fee/duration (1000 XAF, 7 days) is in `create-boost` and in text in `boost-listing.tsx`. Change both sides.
3. **Fapshi is the sandbox**: `FAPSHI_BASE_URL = "https://sandbox.fapshi.com"` is hard-coded in `create-payment` and `create-boost`. Switch + live credentials before launch. Where the `fapshi-webhook` URL is registered with Fapshi is not recorded in this repo (it is deployed with `verify_jwt: false` and checks an `x-wh-secret` header instead).
4. **Unlocks are single-use** and `listings.boosted_until` can only be changed by the payment webhook (trigger blocks direct writes). See `listings-and-unlocks.md`.
5. **Price-drop trigger** ignores `previous_price` on INSERT; it records a drop only when an UPDATE lowers `price`. (The demo seed does two real edits to fake it.)
6. **Verification gate is off**: listings default to `verification_status = 'verified'` (migration 012); the admin queue exists but nothing flows into it.
7. **Expo Go limits**: Android Expo Go has no remote push (SDK 53+); iOS Expo Go may not show Face ID (falls back to passcode). Real behavior needs an EAS dev build.
8. `DEFAULT_CITY` in `listings.ts` has a stale comment claiming there is no lat/lng or expo-location; both exist now (maps).
9. **Lint baseline is not clean**: older files carry react-hooks compiler errors (about 33 at last full run). Lint only what you touched.

## Status of recent work (read before trusting it)
Built and typechecked, tests pass (5 suites, 28 tests, none cover chat/push), **not yet exercised on a real device or in the browser**: payment biometrics, leave-page fix, chat, push notifications, loading/error screens, haptics. Update this when verified.

## Known gaps / not built
Realtime chat (uses 4s polling), push receipt handling (stale tokens linger), offline banner, error state on the Explore home sections, staggered list animations, real web map, reach/isochrone circles, Rive onboarding (parked), EAS build config (`eas build:configure` not run), real Fapshi go-live.

## Keeping these docs true
When a task changes behavior, update the matching doc in the same commit and refresh its "verified against" commit. Prefer pointing at files over pasting code. Record the *why* in `DECISIONS.md`.
