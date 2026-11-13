import * as ImagePicker from "expo-image-picker";
import { supabase } from "./supabase";

export type PropertyType = "home" | "guest_house" | "hotel";
export type UnitType = "single_room" | "studio" | "apartment";

// ponytail: "popular"/"nearby" rows key off this instead of real geolocation —
// no lat/lng reaches the client and no expo-location dependency exists yet.
export const DEFAULT_CITY = "Buea";

export type Listing = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  address: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  amenities: string[];
  photos: string[];
  property_type: PropertyType;
  unit_type: UnitType | null;
  status: string;
  verification_status: string;
  availability: "available" | "occupied";
  available_from: string | null; // YYYY-MM-DD
  boosted_until: string | null;
  previous_price: number | null;
  price_dropped_at: string | null;
  nearby: string[];
  neighbourhood_note: string | null;
  created_at: string;
  updated_at: string;
};

export type ListingSummary = Pick<
  Listing,
  "id" | "title" | "city" | "price" | "photos" | "status" | "verification_status"
> & { availability?: Listing["availability"]; is_boosted?: boolean };

export type PublicListing = Omit<Listing, "owner_id" | "address" | "lat" | "lng" | "boosted_until" | "previous_price" | "price_dropped_at" | "nearby" | "neighbourhood_note"> & { owner_verified?: boolean; is_boosted?: boolean };

export type PublicListingDetail = Omit<Listing, "owner_id" | "address" | "lat" | "lng" | "boosted_until" | "previous_price" | "price_dropped_at"> & {
  address: string | null;
  lat: number | null;
  lng: number | null;
  owner_full_name: string | null;
  owner_whatsapp_number: string | null;
  owner_verified?: boolean;
  unlocked: boolean;
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
  property_type: PropertyType;
  unit_type: UnitType | null;
  nearby: string[];
  neighbourhood_note: string | null;
};

export type SortOption = "newest" | "price_asc" | "price_desc";

export type ListingFilters = {
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  minBathrooms?: number;
  propertyType?: PropertyType;
  unitType?: UnitType;
  sort?: SortOption;
};

function sortColumn(sort?: SortOption): [string, boolean] {
  if (sort === "price_asc") return ["price", true];
  if (sort === "price_desc") return ["price", false];
  return ["created_at", false];
}

// Public/anonymous reads go through security-definer RPCs, not the raw
// table — listings.address/lat/lng and the landlord's contact info are
// masked unless the caller's device has a successful listing_unlocks row.
export async function fetchListings(filters?: ListingFilters) {
  const { data, error } = await supabase.rpc("public_listings", {
    p_city: filters?.city ?? null,
    p_min_price: filters?.minPrice ?? null,
    p_max_price: filters?.maxPrice ?? null,
    p_min_bedrooms: filters?.minBedrooms ?? null,
    p_property_type: filters?.propertyType ?? null,
    p_sort: filters?.sort ?? "newest",
    p_min_bathrooms: filters?.minBathrooms ?? null,
    p_unit_type: filters?.unitType ?? null,
  });
  if (error) throw error;
  return data as PublicListing[];
}

export async function fetchListing(id: string, deviceId: string) {
  const { data, error } = await supabase.rpc("public_listing", { p_id: id, p_device_id: deviceId }).single();
  if (error) throw error;
  return data as PublicListingDetail;
}

// Marks a paid unlock as used so it won't unmask the listing again — called
// once, right when the details are first revealed after payment.
export async function consumeListingUnlock(listingId: string, deviceId: string) {
  const { error } = await supabase.rpc("consume_listing_unlock", { p_listing_id: listingId, p_device_id: deviceId });
  if (error) throw error;
}

// Owner-scoped queries for the landlord dashboard — hit the raw table
// directly under the "select own listings" RLS policy, always full data.
export async function fetchMyListings(ownerId: string, sort?: SortOption) {
  const [column, ascending] = sortColumn(sort);
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("owner_id", ownerId)
    .order(column, { ascending });
  if (error) throw error;
  return data as Listing[];
}

export async function fetchMyListing(id: string, ownerId: string) {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .eq("owner_id", ownerId)
    .single();
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

export async function updateListingStatus(id: string, status: string) {
  const { data, error } = await supabase
    .from("listings")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Listing;
}

export async function updateListingAvailability(id: string, availability: Listing["availability"], availableFrom: string | null = null) {
  const { data, error } = await supabase
    .from("listings")
    .update({ availability, available_from: availability === "occupied" ? availableFrom : null })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as Listing;
}

// "Occupied" / "Occupied · available 12 Mar" — null when the listing is available
export function availabilityText(l: { availability?: string; available_from?: string | null }) {
  if (l.availability !== "occupied") return null;
  if (!l.available_from) return "Occupied";
  return `Occupied · free ${new Date(l.available_from + "T00:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" })}`;
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
