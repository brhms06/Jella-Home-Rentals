import { supabase } from "./supabase";

export type Report = {
  id: string;
  device_id: string;
  listing_id: string;
  reason: string;
  contact: string | null;
  status: string;
  created_at: string;
};

export async function createReport(deviceId: string, listingId: string, reason: string, contact?: string) {
  const { error } = await supabase
    .from("reports")
    .insert({ device_id: deviceId, listing_id: listingId, reason, contact: contact || null });
  if (error) throw error;
}

export async function fetchReports(status?: string) {
  let query = supabase.from("reports").select("*").order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return data as Report[];
}

export async function updateReportStatus(id: string, status: string) {
  const { error } = await supabase.from("reports").update({ status }).eq("id", id);
  if (error) throw error;
}
