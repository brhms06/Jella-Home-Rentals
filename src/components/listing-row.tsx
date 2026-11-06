import { useEffect, useState, useMemo } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { Link, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fetchListings, type PublicListing, type PropertyType } from "@/lib/listings";
import { radius, spacing, cardShadow } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { ListingCard } from "@/components/listing-card";

// ponytail: "popular"/"newest" just means newest-first — real ranking
// (views/bookings) comes once that feature is designed.
type Props = {
  getHref: (id: string) => Href;
  title: string;
  city?: string;
  propertyType?: PropertyType;
  excludeId?: string;
  onHeaderPress?: () => void;
};

export function ListingRow({ getHref, title, city, propertyType, excludeId, onHeaderPress }: Props) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [listings, setListings] = useState<PublicListing[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchListings({ city, propertyType, sort: "newest" }).then((data) => {
      if (!cancelled) setListings(data.filter((l) => l.id !== excludeId).slice(0, 8));
    });
    return () => {
      cancelled = true;
    };
  }, [city, propertyType, excludeId]);

  if (listings.length === 0) return null;

  return (
    <View style={styles.section}>
      <Pressable style={styles.header} onPress={onHeaderPress} disabled={!onHeaderPress}>
        <Text style={styles.heading}>{title}</Text>
        <View style={styles.arrowButton}>
          <Ionicons name="arrow-forward" size={16} color={colors.text} />
        </View>
      </Pressable>

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

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  section: { gap: spacing.md },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  heading: { ...typography.heading, fontSize: 20 },
  arrowButton: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    ...cardShadow,
  },
  row: { gap: spacing.lg },
});
