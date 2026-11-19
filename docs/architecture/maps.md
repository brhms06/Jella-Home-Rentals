# Maps and location privacy

> Verified against code at commit `4d56316`. Files: `src/lib/maps.ts`, `src/components/map/map.tsx` + `map.web.tsx`, `explore-map.tsx`, `location-picker.tsx`, `listing-location.tsx`, `supabase/functions/maps/index.ts`, `supabase/migration_031_maps.sql`.

## Principle
A renter must not learn the exact spot without paying. The public RPCs return **approximate** coordinates; exact `lat`/`lng` come back only for an unlocked, unconsumed listing.

## How approximate pins work
- SQL `fuzz_offset(listing_id, byte)` hashes the listing id with a secret salt (`private_settings.geo_salt`, not readable by clients) into a stable value in [-1, 1]. The public RPCs add `offset × 0.0031°` to lat and lng (lng scaled by `1/cos(lat)`), so the pin is offset by up to ~490 m and is **the same every time** (no averaging out by refetching).
- The client draws a circle of `APPROX_RADIUS_M = 600` around the approximate pin (`maps.ts`) so the true spot is always inside it.
- `fuzz_offset` has execute revoked from anon/authenticated; only the security-definer public RPCs use it.

## Screens
- **Explore map** (`explore-map.tsx`): price bubbles at approximate positions, tap for a preview card. Toggled from the Explore list.
- **Listing location block** (`listing-location.tsx`): circle before unlock; after unlock the exact pin plus **in-app turn-by-turn** (walking or driving per `access_mode`). Within `ARRIVE_M = 60` m it offers "I've arrived", which logs an `arrived` event (landlord sees it in Inbox). Opening Google Maps externally is also available.
- **Landlord location picker** (`location-picker.tsx`): "Use my location" while standing at the property, drag the pin to adjust; reverse-geocodes an address/city. `access_mode` (`foot` = footpath only, `car` = motorable road) decides walking vs driving directions; it is **set by the superadmin** (Admin → Listings → "Access: …" toggle via `setAccessMode`), not by the landlord form.
- Listings without lat/lng simply have no pin. Only the "WDC hotel" real listing and the 8 demo listings (`seed_demo_listings.sql`) had coordinates at last check; the other real listings need pins set.

## Platform split
`react-native-maps` is native-only: `map.tsx` (Apple Maps on iOS, Google on Android; **works in Expo Go without an API key**) vs `map.web.tsx`, a placeholder ("Maps are available in the mobile app") with no-op `MapView/Marker/Polyline/Circle`. A real web map (e.g. Leaflet) is not built.

## `maps` edge function
One endpoint so the app never talks to map providers directly. JWT required. Actions: `route` (`from`/`to` as `[lat,lng]`, `mode` `foot|car` → OSRM at routing.openstreetmap.de, returns distance, duration, GeoJSON line and simple instruction steps) and `reverse` (lat/lng → address/city via Photon, fallback Nominatim). `ponytail:` these are free, rate-limited OSM services; move to a paid or self-hosted provider before a public launch. The client wrapper is `fetchRoute` / `reverseGeocode` in `maps.ts`.

## Not built
Reach/isochrone circles ("how far in 10 minutes"), a web map, offline maps.
