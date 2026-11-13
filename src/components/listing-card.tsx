import { memo, useCallback, useMemo, useState } from "react";
import { xaf } from "@/lib/listings";
import { View, Text, Image, Pressable, ScrollView, StyleSheet, type GestureResponderEvent, type NativeSyntheticEvent, type NativeScrollEvent } from "react-native";
import { radius, spacing, cardShadow } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { Badge } from "@/components/ui/badge";
import { AnimatedHeart } from "@/components/ui/animated-heart";
import { availabilityText, type ListingSummary } from "@/lib/listings";

type Props = {
  listing: ListingSummary;
  showStatus?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  variant?: "row" | "grid" | "feed";
};

export const ListingCard = memo(function ListingCard({ listing, showStatus, isFavorite, onToggleFavorite, variant = "row" }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const listingId = listing.id;
  const handleFavoritePress = useCallback(
    (e: GestureResponderEvent) => {
      // the card itself is wrapped in a Link — without this, tapping the heart also navigates to the listing
      e.stopPropagation?.();
      onToggleFavorite?.(listingId);
    },
    [onToggleFavorite, listingId]
  );
  const source = useMemo(() => (listing.photos[0] ? { uri: listing.photos[0] } : null), [listing.photos[0]]);

  if (variant === "grid") return <GridCard {...{ listing, showStatus, isFavorite, onToggleFavorite: onToggleFavorite && handleFavoritePress }} />;
  if (variant === "feed") return <FeedCard {...{ listing, showStatus, isFavorite, onToggleFavorite: onToggleFavorite && handleFavoritePress }} />;

  return (
    <View style={styles.card}>
      {source ? (
        <Image source={source} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]} />
      )}
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {listing.title}
          </Text>
          {showStatus && listing.status !== "active" && <Badge label="Paused" tone="muted" />}
          {showStatus && listing.verification_status !== "verified" && (
            <Badge label={listing.verification_status === "rejected" ? "Rejected" : listing.verification_status === "suspended" ? "Suspended" : "Pending review"} tone="muted" />
          )}
        </View>
        <Text style={styles.subtitle}>
          {listing.city ?? "—"} · {xaf(listing.price)}/mo{availabilityText(listing) ? ` · ${availabilityText(listing)}` : ""}
        </Text>
      </View>
      {onToggleFavorite && (
        <Pressable onPress={handleFavoritePress} hitSlop={8} style={styles.favoriteButton}>
          <Text style={[styles.favoriteIcon, isFavorite && styles.favoriteIconActive]}>{isFavorite ? "♥" : "♡"}</Text>
        </Pressable>
      )}
    </View>
  );
});

const GridCard = memo(function GridCard({ listing, isFavorite, onToggleFavorite }: Omit<Props, "variant" | "onToggleFavorite"> & { onToggleFavorite?: (e: GestureResponderEvent) => void }) {
  const theme = useTheme();
  const { colors } = theme;
  const gridStyles = useMemo(() => makeGridStyles(theme), [theme]);
  const source = useMemo(() => (listing.photos[0] ? { uri: listing.photos[0] } : null), [listing.photos[0]]);

  return (
    <View style={gridStyles.card}>
      <View style={gridStyles.imageWrap}>
        {source ? (
          <Image source={source} style={gridStyles.image} />
        ) : (
          <View style={[gridStyles.image, gridStyles.imagePlaceholder]} />
        )}
        {listing.verification_status === "verified" && (
          <View style={gridStyles.verifiedBadge}>
            <Text style={gridStyles.verifiedBadgeText}>{listing.is_boosted ? "Featured" : "Verified"}</Text>
          </View>
        )}
        {onToggleFavorite && (
          <Pressable onPress={onToggleFavorite} hitSlop={8} style={gridStyles.favoriteButton}>
            <AnimatedHeart active={isFavorite} size={22} activeColor={colors.primary} />
          </Pressable>
        )}
      </View>
      <Text style={gridStyles.title} numberOfLines={1}>
        {listing.title}
      </Text>
      <Text style={gridStyles.subtitle} numberOfLines={1}>
        {listing.city ?? "—"} · {xaf(listing.price)}/mo{availabilityText(listing) ? ` · ${availabilityText(listing)}` : ""}
      </Text>
    </View>
  );
});

// landlord-only: what needs attention on this listing, if anything
function statusLabel(l: ListingSummary) {
  if (l.status !== "active") return "Paused";
  if (l.verification_status === "rejected") return "Rejected";
  if (l.verification_status === "suspended") return "Suspended";
  if (l.verification_status !== "verified") return "Pending review";
  return null;
}

const FeedCard = memo(function FeedCard({ listing, showStatus, isFavorite, onToggleFavorite }: Omit<Props, "variant" | "onToggleFavorite"> & { onToggleFavorite?: (e: GestureResponderEvent) => void }) {
  const theme = useTheme();
  const { colors } = theme;
  const feedStyles = useMemo(() => makeFeedStyles(theme), [theme]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [imageWidth, setImageWidth] = useState(0);
  const photos = listing.photos;

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (imageWidth > 0) setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / imageWidth));
    },
    [imageWidth]
  );

  return (
    <View style={feedStyles.card}>
      <View style={feedStyles.imageWrap} onLayout={(e) => setImageWidth(e.nativeEvent.layout.width)}>
        {photos.length > 0 ? (
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={32}
          >
            {photos.map((uri, i) => (
              <Image key={i} source={{ uri }} style={[feedStyles.image, imageWidth > 0 && { width: imageWidth }]} />
            ))}
          </ScrollView>
        ) : (
          <View style={[feedStyles.image, feedStyles.imagePlaceholder]} />
        )}

        {(showStatus ? statusLabel(listing) ?? "Verified" : listing.verification_status === "verified" && "Verified") && (
          <View style={feedStyles.verifiedBadge}>
            <Text style={feedStyles.verifiedBadgeText}>{showStatus ? statusLabel(listing) ?? "Verified" : listing.is_boosted ? "Featured" : "Verified"}</Text>
          </View>
        )}
        {onToggleFavorite && (
          <Pressable onPress={onToggleFavorite} hitSlop={8} style={feedStyles.favoriteButton}>
            <AnimatedHeart active={isFavorite} size={24} activeColor={colors.primary} />
          </Pressable>
        )}
        {photos.length > 1 && (
          <View style={feedStyles.dots}>
            {photos.map((_, i) => (
              <View key={i} style={[feedStyles.dot, i === activeIndex && feedStyles.dotActive]} />
            ))}
          </View>
        )}
      </View>

      <Text style={feedStyles.title} numberOfLines={1}>
        {listing.title}
      </Text>
      <Text style={feedStyles.subtitle} numberOfLines={1}>
        {listing.city ?? "—"}{availabilityText(listing) ? ` · ${availabilityText(listing)}` : ""}
      </Text>
      <Text style={feedStyles.price}>{xaf(listing.price)}/mo</Text>
    </View>
  );
});

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.sm,
    ...cardShadow,
  },
  thumb: { width: 72, height: 72, borderRadius: radius.md },
  thumbPlaceholder: { backgroundColor: colors.surfaceMuted },
  info: { flex: 1, justifyContent: "center", gap: 4 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { ...typography.subheading, flexShrink: 1 },
  subtitle: { ...typography.caption },
  favoriteButton: { padding: spacing.xs },
  favoriteIcon: { fontSize: 22, color: colors.textMuted },
  favoriteIconActive: { color: colors.primary },
});

const makeGridStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  card: { width: 240 },
  imageWrap: { position: "relative" },
  image: { width: "100%", aspectRatio: 1, borderRadius: radius.lg },
  imagePlaceholder: { backgroundColor: colors.surfaceMuted },
  verifiedBadge: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
    ...cardShadow,
  },
  verifiedBadgeText: { fontSize: 12, fontWeight: "700", color: colors.text },
  favoriteButton: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  title: { ...typography.subheading, marginTop: spacing.sm },
  subtitle: { ...typography.caption, marginTop: 2 },
});

const makeFeedStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  card: { width: "100%" },
  imageWrap: { position: "relative", borderRadius: radius.lg, overflow: "hidden" },
  image: { width: "100%", aspectRatio: 1.2 },
  imagePlaceholder: { backgroundColor: colors.surfaceMuted },
  verifiedBadge: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: 4,
    paddingHorizontal: 10,
    ...cardShadow,
  },
  verifiedBadgeText: { fontSize: 12, fontWeight: "700", color: colors.text },
  favoriteButton: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  dots: {
    position: "absolute",
    bottom: spacing.sm,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.6)" },
  dotActive: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: colors.surface },
  title: { ...typography.subheading, marginTop: spacing.sm },
  subtitle: { ...typography.caption, marginTop: 2 },
  price: { fontSize: 15, fontWeight: "700", color: colors.text, marginTop: 2 },
});
