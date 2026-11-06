import { supabase } from "./supabase";
import { fetchListings, type PublicListing } from "./listings";

export async function fetchFavoriteIds(deviceId: string) {
  const { data, error } = await supabase.from("favorites").select("listing_id").eq("device_id", deviceId);
  if (error) throw error;
  return new Set((data ?? []).map((f) => f.listing_id as string));
}

// ponytail: O(n) client-side join against the full public catalog; fine at
// this table size, move to a paginated RPC filtered by listing_id[] if the
// catalog grows large.
export async function fetchMyFavoriteListings(deviceId: string) {
  const { data, error } = await supabase
    .from("favorites")
    .select("listing_id")
    .eq("device_id", deviceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const ids = (data ?? []).map((f) => f.listing_id as string);
  if (ids.length === 0) return [];
  const listings = await fetchListings();
  const byId = new Map(listings.map((l) => [l.id, l]));
  return ids.map((id) => byId.get(id)).filter((l): l is PublicListing => !!l);
}

export async function addFavorite(deviceId: string, listingId: string) {
  const { error } = await supabase.from("favorites").insert({ device_id: deviceId, listing_id: listingId });
  if (error) throw error;
}

export async function removeFavorite(deviceId: string, listingId: string) {
  const { error } = await supabase.from("favorites").delete().eq("device_id", deviceId).eq("listing_id", listingId);
  if (error) throw error;
}
