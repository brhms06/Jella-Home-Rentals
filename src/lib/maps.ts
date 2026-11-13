import { supabase } from "./supabase";

export type LatLng = { latitude: number; longitude: number };
export type TravelMode = "foot" | "car";
export type RouteStep = { instruction: string; distance: number; location: LatLng };
export type Route = { distance: number; duration: number; coordinates: LatLng[]; steps: RouteStep[] };

// Default view when nothing else is known.
export const BUEA: LatLng = { latitude: 4.1527, longitude: 9.241 };
// Public pins are offset by up to ~490 m server-side; this circle always contains the real spot.
export const APPROX_RADIUS_M = 600;

const toLL = ([latitude, longitude]: number[]): LatLng => ({ latitude, longitude });

export async function fetchRoute(from: LatLng, to: LatLng, mode: TravelMode): Promise<Route> {
  const { data, error } = await supabase.functions.invoke("maps", {
    body: { action: "route", mode, from: [from.latitude, from.longitude], to: [to.latitude, to.longitude] },
  });
  if (error) throw error;
  return {
    distance: data.distance,
    duration: data.duration,
    coordinates: (data.coordinates as number[][]).map(toLL),
    steps: (data.steps as { instruction: string; distance: number; location: number[] }[]).map((s) => ({ ...s, location: toLL(s.location) })),
  };
}

export async function reverseGeocode(p: LatLng): Promise<{ address: string | null; city: string | null }> {
  const { data, error } = await supabase.functions.invoke("maps", { body: { action: "reverse", lat: p.latitude, lng: p.longitude } });
  if (error) throw error;
  return data;
}

// Great-circle distance in metres.
export function distanceM(a: LatLng, b: LatLng) {
  const R = 6371000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ponytail: nearest route VERTEX, not nearest segment — fine for OSRM's dense geometry.
export function distanceToRoute(p: LatLng, line: LatLng[]) {
  let best = Infinity;
  for (const q of line) best = Math.min(best, distanceM(p, q));
  return best;
}

export const formatDistance = (m: number) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`);
export function formatDuration(s: number) {
  const min = Math.max(1, Math.round(s / 60));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`;
}

// "150k" style label for map price bubbles.
export const shortPrice = (n: number) => (n >= 1_000_000 ? `${+(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
