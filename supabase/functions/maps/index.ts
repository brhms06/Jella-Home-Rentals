import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Map helpers behind one endpoint so the app never talks to map providers directly (swap providers here).
// ponytail: free OpenStreetMap services (FOSSGIS OSRM routing + Photon/Nominatim geocoding). Both are rate-limited and meant for
// light use; move to a paid/self-hosted provider (Google, Mapbox, own OSRM) before a public launch.
const OSRM = "https://routing.openstreetmap.de";
const NOMINATIM = "https://nominatim.openstreetmap.org";
const PHOTON = "https://photon.komoot.io";
const UA = "JellaRentals/1.0 (rental listings app)";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const isLat = (v: unknown) => typeof v === "number" && v >= -90 && v <= 90;
const isLng = (v: unknown) => typeof v === "number" && v >= -180 && v <= 180;

type OsrmStep = { distance: number; name: string; maneuver: { type: string; modifier?: string; location: [number, number] } };

function instruction(s: OsrmStep) {
  const road = s.name ? ` onto ${s.name}` : "";
  const m = s.maneuver;
  switch (m.type) {
    case "depart": return `Head out${s.name ? ` on ${s.name}` : ""}`;
    case "arrive": return "You have arrived";
    case "roundabout":
    case "rotary": return `Take the roundabout${road}`;
    default:
      if (!m.modifier || m.modifier === "straight") return `Continue${road}`;
      if (m.modifier === "uturn") return "Make a U-turn";
      return `${m.modifier.startsWith("slight") ? "Bear" : "Turn"} ${m.modifier.replace("slight ", "").replace("sharp ", "")}${road}`;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ message: "invalid JSON" }, 400);
  }

  if (body.action === "route") {
    const { from, to, mode } = body as { from: number[]; to: number[]; mode: string };
    if (!Array.isArray(from) || !Array.isArray(to) || !isLat(from[0]) || !isLng(from[1]) || !isLat(to[0]) || !isLng(to[1])) {
      return json({ message: "from/to must be [lat, lng]" }, 400);
    }
    const profile = mode === "car" ? "routed-car" : "routed-foot";
    const url = `${OSRM}/${profile}/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson&steps=true`;
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (!res.ok) return json({ message: "routing service unavailable" }, 502);
    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return json({ message: "no route found" }, 404);
    const steps = (route.legs?.[0]?.steps ?? []) as OsrmStep[];
    return json({
      distance: route.distance, // metres
      duration: route.duration, // seconds
      coordinates: (route.geometry.coordinates as [number, number][]).map(([lng, lat]) => [lat, lng]),
      steps: steps.map((s) => ({ instruction: instruction(s), distance: s.distance, location: [s.maneuver.location[1], s.maneuver.location[0]] })),
    });
  }

  if (body.action === "reverse") {
    const { lat, lng } = body as { lat: number; lng: number };
    if (!isLat(lat) || !isLng(lng)) return json({ message: "lat/lng required" }, 400);
    // Photon (komoot) first: Nominatim often refuses requests from cloud/edge IPs.
    const photon = await fetch(`${PHOTON}/reverse?lat=${lat}&lon=${lng}&lang=en`, { headers: { "User-Agent": UA } }).catch(() => null);
    if (photon?.ok) {
      const p = (await photon.json()).features?.[0]?.properties;
      if (p) {
        const street = [p.housenumber, p.street].filter(Boolean).join(" ");
        return json({
          address: [street || p.name, p.district ?? p.locality].filter(Boolean).join(", ") || null,
          city: p.city ?? p.town ?? p.village ?? p.county ?? null,
        });
      }
    }
    const res = await fetch(`${NOMINATIM}/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
      headers: { "User-Agent": UA, "Accept-Language": "en" },
    });
    if (!res.ok) return json({ message: "geocoding service unavailable" }, 502);
    const d = await res.json();
    const a = d.address ?? {};
    const street = [a.house_number, a.road].filter(Boolean).join(" ");
    return json({
      address: [street, a.neighbourhood ?? a.suburb ?? a.quarter].filter(Boolean).join(", ") || d.display_name || null,
      city: a.city ?? a.town ?? a.village ?? a.county ?? null,
    });
  }

  return json({ message: "unknown action" }, 400);
});
