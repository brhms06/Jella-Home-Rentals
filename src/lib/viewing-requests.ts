import { supabase } from "./supabase";

export type Slot = "morning" | "afternoon" | "evening";
export type RequestStatus = "pending" | "accepted" | "declined" | "cancelled";

export const SLOT_LABEL: Record<Slot, string> = {
  morning: "Morning (9-12)",
  afternoon: "Afternoon (12-4)",
  evening: "Evening (4-7)",
};

export type OwnerRequest = {
  id: string;
  listing_id: string;
  listing_title: string;
  renter_name: string;
  preferred_date: string;
  preferred_slot: Slot;
  note: string | null;
  status: RequestStatus;
  created_at: string;
};

export type MyRequest = {
  id: string;
  listing_id: string;
  listing_title: string;
  preferred_date: string;
  preferred_slot: Slot;
  status: RequestStatus;
  created_at: string;
};

export async function createViewingRequest(input: {
  listingId: string;
  deviceId: string;
  name: string;
  date: string; // YYYY-MM-DD
  slot: Slot;
  note?: string;
}) {
  const { error } = await supabase.rpc("create_viewing_request", {
    p_listing_id: input.listingId,
    p_device_id: input.deviceId,
    p_name: input.name,
    p_date: input.date,
    p_slot: input.slot,
    p_note: input.note ?? null,
  });
  if (error) throw error;
}

export async function fetchMyRequests(deviceId: string) {
  const { data, error } = await supabase.rpc("my_viewing_requests", { p_device_id: deviceId });
  if (error) throw error;
  return data as MyRequest[];
}

export async function cancelViewingRequest(id: string, deviceId: string) {
  const { error } = await supabase.rpc("cancel_viewing_request", { p_id: id, p_device_id: deviceId });
  if (error) throw error;
}

export async function fetchOwnerRequests() {
  const { data, error } = await supabase.rpc("owner_viewing_requests");
  if (error) throw error;
  return data as OwnerRequest[];
}

export async function respondToRequest(id: string, status: "accepted" | "declined") {
  const { error } = await supabase.rpc("respond_viewing_request", { p_id: id, p_status: status });
  if (error) throw error;
}

// next n calendar days as YYYY-MM-DD (local time)
export function nextDays(n = 7) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { iso, label: i === 0 ? "Today" : d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }) };
  });
}
