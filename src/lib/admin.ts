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
