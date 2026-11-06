import { useCallback, useState, useMemo } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { Link, useFocusEffect, type Href } from "expo-router";
import { fetchListings, type PublicListing } from "@/lib/listings";
import { getRecentIds } from "@/lib/recent";
import { spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { ListingCard } from "@/components/listing-card";

// ponytail: fetches the public list and filters by stored ids — fine at current catalog size,
// swap for an ids-in query when the list grows.
export function RecentlyViewedRow({ getHref }: { getHref: (id: string) => Href }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [listings, setListings] = useState<PublicListing[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([getRecentIds(), fetchListings({ sort: "newest" })]).then(([ids, all]) => {
        if (cancelled) return;
        const byId = new Map(all.map((l) => [l.id, l]));
        setListings(ids.map((id) => byId.get(id)).filter((l): l is PublicListing => !!l));
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  if (listings.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Recently viewed</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {listings.map((listing) => (
          <Link key={listing.id} href={getHref(listing.id)} asChild>
            <Pressable>
              <ListingCard listing={listing} variant="grid" />
            </Pressable>
          </Link>
        ))}
      </ScrollView>
    </View>
  );
}

const makeStyles = ({ typography }: Theme) => StyleSheet.create({
  section: { gap: spacing.md },
  heading: { ...typography.heading, fontSize: 20 },
  row: { gap: spacing.md },
});
