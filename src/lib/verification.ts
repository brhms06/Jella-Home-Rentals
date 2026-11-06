import * as ImagePicker from "expo-image-picker";
import { Linking } from "react-native";
import { supabase } from "./supabase";

export type IdStatus = "none" | "pending" | "verified" | "rejected";

export const ID_STATUS_LABEL: Record<IdStatus, string> = {
  none: "Not verified",
  pending: "Under review",
  verified: "Verified",
  rejected: "Rejected - tap to resubmit",
};

// Landlord: pick a photo of an ID, upload it to the private bucket, then submit it for admin review.
// Returns false if the picker was cancelled.
export async function uploadIdDocument(userId: string) {
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
  if (result.canceled) return false;

  const asset = result.assets[0];
  const ext = asset.uri.split(".").pop() ?? "jpg";
  const path = `${userId}/${Date.now()}.${ext}`;
  const arrayBuffer = await (await fetch(asset.uri)).arrayBuffer();

  const { error } = await supabase.storage
    .from("id-documents")
    .upload(path, arrayBuffer, { contentType: asset.mimeType ?? "image/jpeg" });
  if (error) throw error;

  const { error: rpcError } = await supabase.rpc("submit_id_verification", { p_path: path });
  if (rpcError) throw rpcError;
  return true;
}

// Admin: open a landlord's ID photo via a short-lived signed URL.
export async function openIdDocument(path: string) {
  const { data, error } = await supabase.storage.from("id-documents").createSignedUrl(path, 300);
  if (error) throw error;
  await Linking.openURL(data.signedUrl);
}

// Admin: approve or reject (allowed by the superadmin profile policy + migration_024 trigger).
export async function setIdStatus(landlordId: string, status: "verified" | "rejected") {
  const { error } = await supabase.from("profiles").update({ id_status: status }).eq("id", landlordId);
  if (error) throw error;
}
