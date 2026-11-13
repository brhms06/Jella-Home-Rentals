import { supabase } from "./supabase";

export type Review = { id: string; rating: number; comment: string | null; created_at: string };

export async function fetchReviews(listingId: string) {
  const [list, summary] = await Promise.all([
    supabase.rpc("listing_reviews", { p_listing_id: listingId }),
    supabase.rpc("listing_review_summary", { p_listing_id: listingId }).single(),
  ]);
  if (list.error) throw list.error;
  if (summary.error) throw summary.error;
  const s = summary.data as { average: number | string; total: number | string };
  return { reviews: list.data as Review[], average: Number(s.average), total: Number(s.total) };
}

export async function canReview(listingId: string, deviceId: string) {
  const { data, error } = await supabase.rpc("can_review_listing", { p_listing_id: listingId, p_device_id: deviceId });
  if (error) throw error;
  return data as boolean;
}

export async function submitReview(listingId: string, deviceId: string, rating: number, comment: string) {
  const { error } = await supabase.rpc("submit_review", {
    p_listing_id: listingId,
    p_device_id: deviceId,
    p_rating: rating,
    p_comment: comment || null,
  });
  if (error) throw error;
}

// ---- admin moderation (RLS: superadmin only) ----
export type AdminReview = Review & { hidden: boolean; listing_id: string; listings: { title: string } | null };

export async function fetchReviewsForAdmin() {
  const { data, error } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, hidden, listing_id, listings(title)")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data as unknown as AdminReview[];
}

export async function setReviewHidden(id: string, hidden: boolean) {
  const { error } = await supabase.from("reviews").update({ hidden }).eq("id", id);
  if (error) throw error;
}
