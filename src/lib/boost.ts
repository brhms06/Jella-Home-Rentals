import { supabase } from "./supabase";

export async function createBoost(listingId: string, phone: string) {
  const { data, error } = await supabase.functions.invoke("create-boost", { body: { listing_id: listingId, phone } });
  if (error) throw error;
  return data as { transId: string; amount: number; days: number };
}

export const isBoosted = (boostedUntil: string | null) => !!boostedUntil && new Date(boostedUntil) > new Date();
