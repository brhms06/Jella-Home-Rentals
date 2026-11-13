import { supabase } from "./supabase";

export type ListingStats = { listing_id: string; views: number; contacts: number; favorites: number };
export type DayViews = { day: string; views: number };

// Fire-and-forget: analytics must never break the screen that calls it.
export async function logListingEvent(listingId: string, deviceId: string, event: "view" | "contact" | "arrived") {
  try {
    await supabase.rpc("log_listing_event", { p_listing_id: listingId, p_device_id: deviceId, p_event: event });
  } catch {}
}

export async function fetchOwnerStats(days = 7) {
  const { data, error } = await supabase.rpc("owner_listing_stats", { p_days: days });
  if (error) throw error;
  return (data as ListingStats[]).map((r) => ({
    listing_id: r.listing_id,
    views: Number(r.views),
    contacts: Number(r.contacts),
    favorites: Number(r.favorites),
  }));
}

export async function fetchOwnerViewsByDay(days = 7) {
  const { data, error } = await supabase.rpc("owner_views_by_day", { p_days: days });
  if (error) throw error;
  return (data as DayViews[]).map((r) => ({ day: r.day, views: Number(r.views) }));
}
