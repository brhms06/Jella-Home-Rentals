import { useEffect, useState, useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fetchListings, DEFAULT_CITY, type PropertyType } from "@/lib/listings";
import { spacing, radius } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { ListingRow } from "@/components/listing-row";
import { RecentlyViewedRow } from "@/components/recently-viewed-row";

// ponytail: "nearby" = another city that already has listings, picked from
// the newest batch — real proximity needs device geolocation + lat/lng on
// the public RPC, neither of which exist yet.
function useNearbyCity() {
  const [nearbyCity, setNearbyCity] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchListings({ sort: "newest" }).then((data) => {
      if (cancelled) return;
      const other = data.find((l) => l.city && l.city.toLowerCase() !== DEFAULT_CITY.toLowerCase());
      setNearbyCity(other?.city ?? null);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return { nearbyCity, loaded };
}

type SectionFilter = { city?: string; propertyType?: PropertyType };

export function HomeFeed({
  getHref,
  onSectionPress,
}: {
  getHref: (id: string) => Href;
  onSectionPress: (filter: SectionFilter) => void;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { nearbyCity, loaded } = useNearbyCity();

  return (
    <View style={styles.feed}>
      <Pressable style={styles.discover} onPress={() => router.push("/(browse)/discover")} accessibilityRole="button">
        <View style={styles.discoverIcon}>
          <Ionicons name="layers-outline" size={22} color={theme.colors.onPrimary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.discoverTitle}>Discover homes</Text>
          <Text style={styles.discoverSub}>Swipe right to save, left to skip</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.colors.textMuted} />
      </Pressable>
      <RecentlyViewedRow getHref={getHref} />
      <ListingRow
        getHref={getHref}
        city={DEFAULT_CITY}
        title={`Popular homes in ${DEFAULT_CITY}`}
        onHeaderPress={() => onSectionPress({ city: DEFAULT_CITY })}
      />
      <ListingRow
        getHref={getHref}
        city={DEFAULT_CITY}
        propertyType="guest_house"
        title="Available guest houses"
        onHeaderPress={() => onSectionPress({ city: DEFAULT_CITY, propertyType: "guest_house" })}
      />
      {loaded && (
        <>
          <ListingRow
            getHref={getHref}
            city={nearbyCity ?? undefined}
            propertyType="hotel"
            title="Nearby hotels"
            onHeaderPress={() => onSectionPress({ city: nearbyCity ?? undefined, propertyType: "hotel" })}
          />
          <ListingRow
            getHref={getHref}
            city={nearbyCity ?? undefined}
            title="Nearby locations"
            onHeaderPress={() => onSectionPress({ city: nearbyCity ?? undefined })}
          />
          <ListingRow
            getHref={getHref}
            city={nearbyCity ?? undefined}
            propertyType="guest_house"
            title="Nearby guest houses"
            onHeaderPress={() => onSectionPress({ city: nearbyCity ?? undefined, propertyType: "guest_house" })}
          />
        </>
      )}
      <ListingRow getHref={getHref} title="Newly added listings" onHeaderPress={() => onSectionPress({})} />
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  feed: { gap: spacing.xl },
  discover: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  discoverIcon: { width: 44, height: 44, borderRadius: radius.pill, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  discoverTitle: { ...typography.subheading },
  discoverSub: { ...typography.caption },
});
