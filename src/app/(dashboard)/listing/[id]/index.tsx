import { useCallback, useState } from "react";
import { View, Text, Image, Pressable, ScrollView, StyleSheet, Alert } from "react-native";
import { Link, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { fetchListing, deleteListing, type Listing } from "@/lib/listings";

export default function ListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      fetchListing(id).then((data) => !cancelled && setListing(data));
      return () => {
        cancelled = true;
      };
    }, [id])
  );

  function handleDelete() {
    Alert.alert("Delete listing", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteListing(id);
          router.replace("/(dashboard)");
        },
      },
    ]);
  }

  if (!listing) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScrollView horizontal style={styles.photoRow}>
        {listing.photos.map((url) => (
          <Image key={url} source={{ uri: url }} style={styles.photo} />
        ))}
      </ScrollView>

      <Text style={styles.title}>{listing.title}</Text>
      <Text style={styles.price}>${listing.price}/mo</Text>
      <Text style={styles.subtitle}>
        {listing.address ? `${listing.address}, ` : ""}
        {listing.city}
      </Text>
      <Text style={styles.meta}>
        {listing.bedrooms ?? "—"} bed · {listing.bathrooms ?? "—"} bath
      </Text>
      {listing.amenities.length > 0 && (
        <Text style={styles.meta}>{listing.amenities.join(", ")}</Text>
      )}
      {listing.description && <Text style={styles.description}>{listing.description}</Text>}

      <Link href={`/(dashboard)/listing/${listing.id}/edit`} style={styles.editButton}>
        Edit listing
      </Link>
      <Pressable onPress={handleDelete}>
        <Text style={styles.deleteButton}>Delete listing</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 8 },
  photoRow: { marginBottom: 12 },
  photo: { width: 200, height: 150, borderRadius: 10, marginRight: 8 },
  title: { fontSize: 24, fontWeight: "700" },
  price: { fontSize: 18, color: "#208AEF", fontWeight: "600" },
  subtitle: { color: "#666" },
  meta: { color: "#444" },
  description: { marginTop: 8, lineHeight: 20 },
  editButton: { color: "#208AEF", fontWeight: "600", fontSize: 16, marginTop: 20, textAlign: "center" },
  deleteButton: { color: "#d33", fontSize: 16, marginTop: 16, textAlign: "center" },
});
