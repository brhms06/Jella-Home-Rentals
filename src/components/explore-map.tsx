import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { fetchListings, xaf, type ListingFilters, type PublicListing } from "@/lib/listings";
import { BUEA, shortPrice } from "@/lib/maps";
import { radius, spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { MapView, Marker, type MapRef } from "@/components/map/map";

type Pinned = PublicListing & { approx_lat: number; approx_lng: number };

// Full-screen Explore map: price bubbles at each listing's approximate spot, tap one for a preview card.
export function ExploreMap({ filters, bottomInset }: { filters: ListingFilters; bottomInset: number }) {
  const theme = useTheme();
  const { colors, dark } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const mapRef = useRef<MapRef | null>(null);
  const [listings, setListings] = useState<Pinned[]>([]);
  const [selected, setSelected] = useState<Pinned | null>(null);
  const [locationOn, setLocationOn] = useState(false);
  const filterKey = JSON.stringify(filters);

  useEffect(() => {
    Location.requestForegroundPermissionsAsync()
      .then((r) => setLocationOn(r.granted))
      .catch(() => {});
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchListings(filters)
      .then((all) => {
        if (cancelled) return;
        const pinned = all.filter((l): l is Pinned => l.approx_lat != null && l.approx_lng != null);
        setListings(pinned);
        setSelected(null);
        if (pinned.length > 0) {
          mapRef.current?.fitToCoordinates(
            pinned.map((l) => ({ latitude: l.approx_lat, longitude: l.approx_lng })),
            { edgePadding: { top: 160, right: 60, bottom: 220, left: 60 }, animated: true }
          );
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // filterKey captures the same values as `filters`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterKey]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{ ...BUEA, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
        showsUserLocation={locationOn}
        showsMyLocationButton={false}
        userInterfaceStyle={dark ? "dark" : "light"}
        onPress={() => setSelected(null)}
      >
        {listings.map((l) => {
          const active = selected?.id === l.id;
          return (
            <Marker
              key={l.id}
              coordinate={{ latitude: l.approx_lat, longitude: l.approx_lng }}
              onPress={(e: { stopPropagation?: () => void }) => {
                e.stopPropagation?.();
                setSelected(l);
              }}
              zIndex={active ? 3 : l.is_boosted ? 2 : 1}
            >
              <View style={[styles.bubble, l.is_boosted && styles.bubbleBoosted, active && styles.bubbleActive]}>
                {l.is_boosted && <Ionicons name="flash" size={11} color={active ? colors.onPrimary : colors.primary} />}
                <Text style={[styles.bubbleText, active && styles.bubbleTextActive]}>{shortPrice(l.price)}</Text>
              </View>
            </Marker>
          );
        })}
      </MapView>

      {selected && (
        <Pressable
          style={[styles.card, { bottom: bottomInset }]}
          onPress={() => router.push({ pathname: "/(browse)/listing/[id]", params: { id: selected.id } })}
        >
          {selected.photos[0] ? <Image source={{ uri: selected.photos[0] }} style={styles.cardPhoto} /> : <View style={styles.cardPhoto} />}
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle} numberOfLines={1}>{selected.title}</Text>
            <Text style={styles.cardMeta} numberOfLines={1}>
              {selected.city ?? "—"} · {selected.bedrooms ?? "—"} bed · {selected.access_mode === "car" ? "Car access" : "On foot"}
            </Text>
            <Text style={styles.cardPrice}>
              {xaf(selected.price)}
              <Text style={styles.cardMeta}>/month</Text>
            </Text>
            <Text style={styles.cardNote}>Approximate area · exact spot after unlock</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </Pressable>
      )}
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  bubbleBoosted: { borderColor: colors.primary, borderWidth: 2, paddingVertical: 7, paddingHorizontal: 12 },
  bubbleActive: { backgroundColor: colors.text, borderColor: colors.text, transform: [{ scale: 1.12 }] },
  bubbleText: { fontSize: 13, fontWeight: "800", color: colors.text },
  bubbleTextActive: { color: colors.background },
  card: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: 22,
    backgroundColor: colors.background,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  cardPhoto: { width: 88, height: 88, borderRadius: 16, backgroundColor: colors.surfaceMuted },
  cardBody: { flex: 1, gap: 2 },
  cardTitle: { ...typography.subheading },
  cardMeta: { ...typography.caption },
  cardPrice: { fontSize: 16, fontWeight: "700", color: colors.text },
  cardNote: { fontSize: 11, color: colors.textMuted },
});
