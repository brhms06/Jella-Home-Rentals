import { useMemo, useState, type ReactNode } from "react";
import { View, Text, Image, Pressable, StyleSheet, useWindowDimensions } from "react-native";
import Animated, { useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, interpolate, Extrapolation, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { radius, spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";

export const AMENITY_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  wifi: "wifi-outline",
  parking: "car-outline",
  laundry: "shirt-outline",
  furnished: "cube-outline",
  pets_allowed: "paw-outline",
};
export const amenityLabel = (a: string) => a.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export type SceneTile = { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; active?: boolean };
export type SceneAction = { label: string; onPress: () => void };

type Props = {
  photos: string[];
  title: string;
  price: number;
  facts: string;
  location: string;
  badges?: ReactNode;
  tiles: SceneTile[];
  description?: string | null;
  amenities: string[];
  children?: ReactNode;
  secondary?: SceneAction;
  primary?: SceneAction;
  onBack: () => void;
};

const BAR_COMPACT_WIDTH = 250;

// Shared mobile listing page (renter, landlord and admin views): full-bleed photo, overlapping sheet with
// quick-action tiles, and two pinned buttons that shrink once the reader reaches the end of the page.
export function ListingScene({ photos, title, price, facts, location, badges, tiles, description, amenities, children, secondary, primary, onBack }: Props) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);

  const heroH = Math.round(Math.min(width * 1.02, height * 0.52));

  const compact = useSharedValue(0);
  const target = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    const max = e.contentSize.height - e.layoutMeasurement.height;
    const y = e.contentOffset.y;
    // shrink only at the very end of the content; grow back once the reader scrolls up a bit (hysteresis)
    const next = max > 0 && y >= max - 24 ? 1 : y < max - 90 ? 0 : target.value;
    if (target.value !== next) {
      target.value = next;
      compact.value = withSpring(next, { damping: 18, stiffness: 160 });
    }
  });

  const barStyle = useAnimatedStyle(() => ({
    width: interpolate(compact.value, [0, 1], [width - spacing.lg * 2, BAR_COMPACT_WIDTH], Extrapolation.CLAMP),
  }));
  const btnStyle = useAnimatedStyle(() => ({ height: interpolate(compact.value, [0, 1], [56, 42], Extrapolation.CLAMP) }));
  const labelStyle = useAnimatedStyle(() => ({ fontSize: interpolate(compact.value, [0, 1], [16, 13], Extrapolation.CLAMP) }));

  const hasBar = !!(secondary || primary);

  return (
    <View style={styles.root}>
      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: hasBar ? 130 + insets.bottom : spacing.xxl }}
      >
        <View style={{ height: heroH, backgroundColor: colors.surfaceMuted }}>
          <Animated.ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
          >
            {photos.map((url) => (
              <Image key={url} source={{ uri: url }} style={{ width, height: heroH }} />
            ))}
          </Animated.ScrollView>
          {photos.length > 1 && (
            <View style={styles.dots} pointerEvents="none">
              {photos.map((_, i) => (
                <View key={i} style={[styles.dot, i === page && styles.dotOn]} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.sheet}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={2}>{title}</Text>
            <Text style={styles.price}>
              ${price}
              <Text style={styles.priceUnit}>/month</Text>
            </Text>
          </View>
          <Text style={styles.facts}>{facts}</Text>
          {badges ? <View style={styles.badges}>{badges}</View> : null}
          <View style={styles.locationRow}>
            <Ionicons name="location-outline" size={15} color={colors.textMuted} />
            <Text style={styles.location} numberOfLines={2}>{location}</Text>
          </View>

          <View style={styles.tileRow}>
            {tiles.map((t) => (
              <Pressable key={t.label} style={styles.tileWrap} onPress={t.onPress} accessibilityRole="button" accessibilityLabel={t.label}>
                <View style={styles.tile}>
                  <Ionicons name={t.icon} size={24} color={t.active ? colors.primary : colors.background} />
                </View>
                <Text style={styles.tileLabel} numberOfLines={1}>{t.label}</Text>
              </Pressable>
            ))}
          </View>

          {description ? (
            <View style={styles.section}>
              <Text style={styles.heading}>Details</Text>
              <Text style={styles.body}>{description}</Text>
            </View>
          ) : null}

          {amenities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.heading}>What this place offers</Text>
              <View style={styles.chipWrap}>
                {amenities.map((a) => (
                  <View key={a} style={styles.chip}>
                    <Ionicons name={AMENITY_ICONS[a] ?? "checkmark-circle-outline"} size={16} color={colors.text} />
                    <Text style={styles.chipText}>{amenityLabel(a)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {children}
        </View>
      </Animated.ScrollView>

      <Pressable onPress={onBack} style={[styles.back, { top: insets.top + spacing.sm }]} accessibilityLabel="Back" hitSlop={8}>
        <Ionicons name="chevron-back" size={22} color="#171717" />
      </Pressable>

      {hasBar && (
        <View style={[styles.barWrap, { bottom: insets.bottom + spacing.md }]} pointerEvents="box-none">
          <Animated.View style={[styles.bar, barStyle]}>
            {secondary && (
              <Pressable style={styles.barItem} onPress={secondary.onPress}>
                <Animated.View style={[styles.btn, styles.btnOutline, btnStyle]}>
                  <Animated.Text style={[styles.btnLabel, { color: colors.text }, labelStyle]} numberOfLines={1}>{secondary.label}</Animated.Text>
                </Animated.View>
              </Pressable>
            )}
            {primary && (
              <Pressable style={styles.barItem} onPress={primary.onPress}>
                <Animated.View style={[styles.btn, styles.btnFilled, btnStyle]}>
                  <Animated.Text style={[styles.btnLabel, { color: colors.onPrimary }, labelStyle]} numberOfLines={1}>{primary.label}</Animated.Text>
                </Animated.View>
              </Pressable>
            )}
          </Animated.View>
        </View>
      )}
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  back: {
    position: "absolute",
    left: spacing.lg,
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  dots: { position: "absolute", bottom: 40, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.55)" },
  dotOn: { backgroundColor: "#fff", width: 18 },
  sheet: {
    marginTop: -28,
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: spacing.xl,
    gap: spacing.md,
  },
  titleRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: spacing.md },
  title: { ...typography.heading, flex: 1 },
  price: { fontSize: 20, fontWeight: "700", color: colors.text },
  priceUnit: { fontSize: 13, fontWeight: "500", color: colors.textMuted },
  facts: { ...typography.caption },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, alignItems: "center" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  location: { ...typography.caption, flex: 1 },
  tileRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  tileWrap: { flex: 1, alignItems: "center", gap: 6 },
  tile: { width: "100%", aspectRatio: 1, borderRadius: 18, backgroundColor: colors.text, alignItems: "center", justifyContent: "center" },
  tileLabel: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
  section: { gap: spacing.sm, marginTop: spacing.sm },
  heading: { ...typography.heading },
  body: { ...typography.body, lineHeight: 22 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: 8, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipText: { fontSize: 14, color: colors.text },
  barWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  bar: { flexDirection: "row", gap: spacing.md },
  barItem: { flex: 1 },
  btn: {
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  btnOutline: { backgroundColor: colors.background, borderWidth: 2, borderColor: colors.text },
  btnFilled: { backgroundColor: colors.primary },
  btnLabel: { fontWeight: "700" },
});
