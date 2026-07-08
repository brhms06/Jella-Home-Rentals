import { supabase } from "./supabase";

export type Profile = {
  id: string;
  full_name: string | null;
  whatsapp_number: string | null;
  created_at: string;
};

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) throw error;
  return data as Profile;
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<Profile, "full_name" | "whatsapp_number">>
) {
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}
