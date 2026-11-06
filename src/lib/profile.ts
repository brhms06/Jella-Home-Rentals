import * as ImagePicker from "expo-image-picker";
import { supabase } from "./supabase";

export type Role = "landlord" | "superadmin";

export type Profile = {
  id: string;
  full_name: string | null;
  whatsapp_number: string | null;
  avatar_url: string | null;
  country: string | null;
  role: Role;
  suspended: boolean;
  id_status: "none" | "pending" | "verified" | "rejected";
  id_document_path: string | null;
  created_at: string;
};

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error) throw error;
  return data as Profile;
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<Profile, "full_name" | "whatsapp_number" | "avatar_url" | "country">>
) {
  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) throw error;
}

export async function changePassword(email: string, currentPassword: string, newPassword: string) {
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (signInError) throw new Error("Current password is incorrect.");
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function uploadAvatarPhoto(userId: string) {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.7,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  const ext = asset.uri.split(".").pop() ?? "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;
  const response = await fetch(asset.uri);
  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage.from("avatar-photos").upload(path, arrayBuffer, {
    contentType: asset.mimeType ?? "image/jpeg",
  });
  if (error) throw error;

  const { data } = supabase.storage.from("avatar-photos").getPublicUrl(path);
  return data.publicUrl;
}
