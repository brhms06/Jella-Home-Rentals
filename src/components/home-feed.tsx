import { useEffect, useState, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { type Href } from "expo-router";
import { fetchListings, DEFAULT_CITY, type PropertyType } from "@/lib/listings";
import { spacing } from "@/constants/theme";
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

const makeStyles = ({  }: Theme) => StyleSheet.create({
  feed: { gap: spacing.xl },
});
