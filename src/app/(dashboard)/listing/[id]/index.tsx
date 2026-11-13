import { useCallback, useState, useMemo } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, Modal, Share } from "react-native";
import * as ExpoLinking from "expo-linking";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { fetchMyListing, deleteListing, updateListingStatus, createListing, updateListingAvailability, availabilityText, type Listing } from "@/lib/listings";
import { useAuth } from "@/lib/auth-context";
import { spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { Badge } from "@/components/ui/badge";
import { BoostListing } from "@/components/boost-listing";
import { Neighbourhood } from "@/components/neighbourhood";
import { LocationPreview } from "@/components/listing-location";
import { ListingScene, type SceneTile } from "@/components/listing-scene";

export default function ListingDetail() {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [boostOpen, setBoostOpen] = useState(false);

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
    try {
      const updated = await updateListingStatus(listing.id, next);
      setListing(updated);
    } catch (err) {
      console.error("status update failed", err);
      const e = err as { message?: string; code?: string; details?: string } | undefined;
      Alert.alert("Couldn't update status", [e?.code, e?.message, e?.details].filter(Boolean).join("\n") || "Unknown error.");
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
      // the pin is kept: a duplicate is usually another unit in the same building
      const { id: _id, owner_id: _o, status: _s, verification_status: _v, created_at: _c, updated_at: _u, boosted_until: _b, previous_price: _pp, price_dropped_at: _pd, ...rest } = listing;
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

  const boostable = listing.status === "active" && listing.verification_status === "verified";
  const unitLabel = (listing.unit_type ?? listing.property_type).replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
  const facts = `${listing.bedrooms ?? "—"} ${listing.bedrooms === 1 ? "Bed" : "Beds"} · ${listing.bathrooms ?? "—"} ${listing.bathrooms === 1 ? "Bath" : "Baths"} · ${unitLabel}`;
  const verification =
    listing.verification_status === "verified"
      ? null
      : listing.verification_status === "rejected"
        ? "Rejected"
        : listing.verification_status === "suspended"
          ? "Suspended"
          : "Pending review";

  const tiles: SceneTile[] = [
    { icon: "share-social-outline", label: "Share", onPress: () => Share.share({ message: `${listing.title} on Jella`, url: ExpoLinking.createURL(`/listing/${listing.id}`) }).catch(() => {}) },
    { icon: "copy-outline", label: "Duplicate", onPress: handleDuplicate },
    { icon: listing.status === "active" ? "pause-circle-outline" : "play-circle-outline", label: listing.status === "active" ? "Pause" : "Activate", onPress: handleToggleStatus },
    { icon: listing.availability === "occupied" ? "checkmark-circle-outline" : "key-outline", label: listing.availability === "occupied" ? "Available" : "Occupied", onPress: handleToggleAvailability },
    { icon: "trash-outline", label: "Delete", onPress: handleDelete },
  ];

  return (
    <>
      <ListingScene
        photos={listing.photos}
        title={listing.title}
        price={listing.price}
        facts={facts}
        location={[listing.address, listing.city].filter(Boolean).join(", ") || "No address"}
        badges={
          <>
            <Badge label={listing.status === "active" ? "Active" : "Paused"} tone={listing.status === "active" ? "success" : "muted"} />
            <Badge label={availabilityText(listing) ?? "Available"} tone={listing.availability === "occupied" ? "muted" : "success"} />
            {verification && <Badge label={verification} tone="muted" />}
          </>
        }
        tiles={tiles}
        description={listing.description}
        amenities={listing.amenities}
        secondary={{ label: "Edit listing", onPress: () => router.push(`/(dashboard)/listing/${listing.id}/edit`) }}
        primary={{ label: "Boost", onPress: () => (boostable ? setBoostOpen(true) : Alert.alert("Boost unavailable", "Only active, verified listings can be boosted.")) }}
        onBack={() => (router.canGoBack() ? router.back() : router.replace("/(dashboard)/(tabs)"))}
      >
        <LocationPreview
          approx={null}
          exact={listing.lat != null && listing.lng != null ? { latitude: listing.lat, longitude: listing.lng } : null}
          accessMode={listing.access_mode ?? "foot"}
        />
        {listing.lat == null && <Text style={styles.noPin}>No map pin yet. Edit the listing to add its location.</Text>}
        <Neighbourhood nearby={listing.nearby ?? []} note={listing.neighbourhood_note} />
      </ListingScene>

      <Modal visible={boostOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setBoostOpen(false)}>
        <SafeAreaProvider>
          <SafeAreaView style={styles.sheetSafe}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Boost listing</Text>
              <Pressable onPress={() => setBoostOpen(false)} hitSlop={8} accessibilityLabel="Close">
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled">
              <BoostListing listing={listing} onBoosted={setListing} />
            </ScrollView>
          </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </>
  );
}

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  sheetSafe: { flex: 1, backgroundColor: colors.background },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.lg },
  sheetTitle: { ...typography.heading },
  sheetBody: { padding: spacing.lg },
  noPin: { ...typography.caption, color: colors.danger },
});
