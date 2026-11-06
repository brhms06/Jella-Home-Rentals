import { useCallback, useState, useMemo } from "react";
import { View, Text, Image, ScrollView, StyleSheet, Alert } from "react-native";
import { Link, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { fetchMyListing, deleteListing, updateListingStatus, createListing, updateListingAvailability, availabilityText, type Listing } from "@/lib/listings";
import { useAuth } from "@/lib/auth-context";
import { radius, spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ListingDetail() {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      let cancelled = false;
      fetchMyListing(id, session.user.id).then((data) => !cancelled && setListing(data));
      return () => {
        cancelled = true;
      };
    }, [id, session])
  );

  async function handleToggleStatus() {
    if (!listing) return;
    const next = listing.status === "active" ? "paused" : "active";
    setTogglingStatus(true);
    try {
      const updated = await updateListingStatus(listing.id, next);
      setListing(updated);
    } catch (err) {
      console.error("status update failed", err);
      const e = err as { message?: string; code?: string; details?: string } | undefined;
      Alert.alert("Couldn't update status", [e?.code, e?.message, e?.details].filter(Boolean).join("\n") || "Unknown error.");
    } finally {
      setTogglingStatus(false);
    }
  }

  async function handleToggleAvailability() {
    if (!listing) return;
    try {
      setListing(await updateListingAvailability(listing.id, listing.availability === "occupied" ? "available" : "occupied"));
    } catch (err) {
      Alert.alert("Couldn't update", (err as { message?: string })?.message ?? "Unknown error.");
    }
  }

  async function handleDuplicate() {
    if (!listing || !session) return;
    try {
      const { id: _id, owner_id: _o, lat: _la, lng: _ln, status: _s, verification_status: _v, created_at: _c, updated_at: _u, ...rest } = listing;
      const copy = await createListing(
        { ...rest, title: `Copy of ${listing.title}`, description: rest.description ?? "", address: rest.address ?? "", city: rest.city ?? "" },
        session.user.id
      );
      router.push(`/(dashboard)/listing/${copy.id}/edit`);
    } catch (err) {
      Alert.alert("Couldn't duplicate", (err as { message?: string })?.message ?? "Unknown error.");
    }
  }

  function handleDelete() {
    Alert.alert("Delete listing", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteListing(id);
          router.replace("/(dashboard)/(tabs)");
        },
      },
    ]);
  }

  if (!listing) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScrollView horizontal style={styles.photoRow} showsHorizontalScrollIndicator={false}>
        {listing.photos.map((url) => (
          <Image key={url} source={{ uri: url }} style={styles.photo} />
        ))}
      </ScrollView>

      <View style={styles.statusRow}>
        <Badge
          label={listing.status === "active" ? "Active" : "Paused"}
          tone={listing.status === "active" ? "success" : "muted"}
        />
        <Button
          label={listing.status === "active" ? "Pause listing" : "Activate listing"}
          loading={togglingStatus}
          loadingLabel="Updating..."
          variant="text"
          onPress={handleToggleStatus}
        />
      </View>
      <View style={styles.statusRow}>
        <Badge label={availabilityText(listing) ?? "Available"} tone={listing.availability === "occupied" ? "muted" : "success"} />
        <Button
          label={listing.availability === "occupied" ? "Mark available" : "Mark occupied"}
          variant="text"
          onPress={handleToggleAvailability}
        />
      </View>
      {listing.verification_status !== "verified" && (
        <Badge
          label={
            listing.verification_status === "rejected"
              ? "Rejected"
              : listing.verification_status === "suspended"
                ? "Suspended"
                : "Pending review"
          }
          tone="muted"
        />
      )}

      <Text style={styles.title}>{listing.title}</Text>
      <Text style={styles.price}>${listing.price}/mo</Text>
      <Text style={styles.subtitle}>
        {listing.address ? `${listing.address}, ` : ""}
        {listing.city}
      </Text>
      <Text style={styles.meta}>
        {listing.bedrooms ?? "—"} bed · {listing.bathrooms ?? "—"} bath
      </Text>
      {listing.amenities.length > 0 && <Text style={styles.meta}>{listing.amenities.join(", ")}</Text>}
      {listing.description && <Text style={styles.description}>{listing.description}</Text>}

      <Link href={`/(dashboard)/listing/${listing.id}/edit`} style={styles.editButton}>
        Edit listing
      </Link>
      <Button label="Duplicate listing" variant="text" onPress={handleDuplicate} style={styles.deleteButton} />
      <Button label="Delete listing" variant="text" color={colors.danger} onPress={handleDelete} style={styles.deleteButton} />
    </ScrollView>
  );
}

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  container: { padding: spacing.xl, gap: spacing.sm },
  photoRow: { marginBottom: spacing.md },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { ...typography.title },
  price: { fontSize: 18, color: colors.primary, fontWeight: "600" },
  subtitle: { ...typography.caption },
  meta: { color: colors.textMuted },
  description: { marginTop: spacing.sm, lineHeight: 20, ...typography.body },
  photo: { width: 200, height: 150, borderRadius: radius.lg, marginRight: spacing.sm },
  editButton: { color: colors.primary, fontWeight: "600", fontSize: 16, marginTop: spacing.xl, textAlign: "center" },
  deleteButton: { marginTop: spacing.md, alignItems: "center" },
});
