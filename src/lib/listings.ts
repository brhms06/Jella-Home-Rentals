import * as ImagePicker from "expo-image-picker";
import { supabase } from "./supabase";

export type Listing = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  address: string | null;
  city: string | null;
  price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  amenities: string[];
  photos: string[];
  status: string;
  created_at: string;
  updated_at: string;
};

export type ListingInput = {
  title: string;
  description: string;
  address: string;
  city: string;
  price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  amenities: string[];
  photos: string[];
};

export async function fetchListings() {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Listing[];
}

export async function fetchListing(id: string) {
  const { data, error } = await supabase.from("listings").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Listing;
}

export async function createListing(input: ListingInput, ownerId: string) {
  const { data, error } = await supabase
    .from("listings")
    .insert({ ...input, owner_id: ownerId })
    .select()
    .single();
  if (error) throw error;
  return data as Listing;
}

export async function updateListing(id: string, input: ListingInput) {
  const { error } = await supabase.from("listings").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteListing(id: string) {
  const { error } = await supabase.from("listings").delete().eq("id", id);
  if (error) throw error;
}

export async function pickAndUploadPhoto(ownerId: string) {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.7,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  const ext = asset.uri.split(".").pop() ?? "jpg";
  const path = `${ownerId}/${Date.now()}.${ext}`;
  const response = await fetch(asset.uri);
  const arrayBuffer = await response.arrayBuffer();

  const { error } = await supabase.storage.from("listing-photos").upload(path, arrayBuffer, {
    contentType: asset.mimeType ?? "image/jpeg",
  });
  if (error) throw error;

  const { data } = supabase.storage.from("listing-photos").getPublicUrl(path);
  return data.publicUrl;
}
