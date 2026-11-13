import { supabase } from "./supabase";
import type { Listing } from "./listings";
import type { Profile } from "./profile";

export async function fetchLandlords() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "landlord")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Profile[];
}

export async function setLandlordSuspended(id: string, suspended: boolean) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ suspended })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function fetchListingsForAdmin(status?: string) {
  let query = supabase.from("listings").select("*").order("created_at", { ascending: false });
  if (status) query = query.eq("verification_status", status);
  const { data, error } = await query;
  if (error) throw error;
  return data as Listing[];
}

export async function updateVerificationStatus(id: string, status: string) {
  const { data, error } = await supabase
    .from("listings")
    .update({ verification_status: status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Listing;
}

export type AdminStats = {
  pendingListingsCount: number;
  openReportsCount: number;
  landlordsCount: number;
  verifiedListingsCount: number;
  totalListingsCount: number;
  totalRevenue: number;
  monthRevenue: number;
  successfulUnlocksCount: number;
  revenueSeries: { month: string; value: number }[];
};

async function countRows(table: string, filters: Record<string, string> = {}) {
  let query = supabase.from(table).select("*", { count: "exact", head: true });
  for (const [k, v] of Object.entries(filters)) query = query.eq(k, v);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function fetchAdminStats(): Promise<AdminStats> {
  const [pending, open, landlords, verified, total, revenue] = await Promise.all([
    countRows("listings", { verification_status: "pending" }),
    countRows("reports", { status: "open" }),
    countRows("profiles", { role: "landlord" }),
    countRows("listings", { verification_status: "verified" }),
    countRows("listings"),
    supabase.rpc("admin_revenue_stats"),
  ]);
  if (revenue.error) throw revenue.error;
  const rows = (revenue.data ?? []) as {
    total_revenue: number;
    month_revenue: number;
    successful_unlocks_count: number;
    month_label: string;
    month_revenue_series: number;
  }[];
  return {
    pendingListingsCount: pending,
    openReportsCount: open,
    landlordsCount: landlords,
    verifiedListingsCount: verified,
    totalListingsCount: total,
    totalRevenue: rows[0]?.total_revenue ?? 0,
    monthRevenue: rows[0]?.month_revenue ?? 0,
    successfulUnlocksCount: rows[0]?.successful_unlocks_count ?? 0,
    revenueSeries: rows.map((r) => ({ month: r.month_label, value: r.month_revenue_series })),
  };
}

export type BoostStats = { totalRevenue: number; monthRevenue: number; successfulCount: number; activeCount: number };
export type TopListing = { listing_id: string; title: string; city: string | null; views: number; contacts: number; favorites: number };
export type ModerationEntry = { id: string; action: string; detail: string | null; actor_name: string | null; created_at: string };

export async function fetchBoostStats(): Promise<BoostStats> {
  const { data, error } = await supabase.rpc("admin_boost_stats").single();
  if (error) throw error;
  const r = data as { total_revenue: number; month_revenue: number; successful_count: number; active_count: number };
  return { totalRevenue: Number(r.total_revenue), monthRevenue: Number(r.month_revenue), successfulCount: Number(r.successful_count), activeCount: Number(r.active_count) };
}

export async function fetchTopListings(days = 30): Promise<TopListing[]> {
  const { data, error } = await supabase.rpc("admin_top_listings", { p_days: days });
  if (error) throw error;
  return (data as TopListing[]).map((r) => ({ ...r, views: Number(r.views), contacts: Number(r.contacts), favorites: Number(r.favorites) }));
}

export async function fetchModerationLog(): Promise<ModerationEntry[]> {
  const { data, error } = await supabase.rpc("admin_moderation_log", { p_limit: 40 });
  if (error) throw error;
  return data as ModerationEntry[];
}

export const MODERATION_LABEL: Record<string, string> = {
  listing_verified: "Verified a listing",
  listing_rejected: "Rejected a listing",
  listing_suspended: "Suspended a listing",
  listing_pending: "Reset a listing to pending",
  report_reviewed: "Marked a report reviewed",
  report_dismissed: "Dismissed a report",
  review_hidden: "Hid a review",
  review_unhidden: "Unhid a review",
  landlord_suspended: "Suspended a landlord",
  landlord_unsuspended: "Unsuspended a landlord",
  id_verified: "Approved a landlord ID",
  id_rejected: "Rejected a landlord ID",
};
