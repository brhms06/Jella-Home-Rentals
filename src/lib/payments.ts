import { supabase } from "./supabase";

export async function createPayment(listingId: string, deviceId: string, phone: string) {
  const { data, error } = await supabase.functions.invoke("create-payment", {
    body: { listing_id: listingId, device_id: deviceId, phone },
  });
  if (error) throw error;
  return data as { transId: string };
}
