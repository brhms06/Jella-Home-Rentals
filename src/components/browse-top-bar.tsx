import { useState, useMemo } from "react";
import { View, Text, TextInput, Pressable, Modal, Platform, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, interpolate, Extrapolation, type SharedValue } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { radius, spacing, cardShadow } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import type { PropertyType } from "@/lib/listings";
import { NavMenu } from "@/components/nav-menu";

const BAR_WIDTH_EXPANDED = 420;
const BAR_WIDTH_COMPACT = 240;

const TOP_ROW_HEIGHT = 64;
const CATEGORIES_HEIGHT = 48;
const CATEGORIES_OVERLAP = 32; // pulls the categories up beside the logo
// lift row2 so the compact search bar lands inline with the logo row
const ROW2_LIFT = TOP_ROW_HEIGHT - CATEGORIES_OVERLAP;

const NUMBER_OPTIONS = [
  { value: "", label: "Any" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4+" },
];

const UNIT_TYPE_OPTIONS = [
  { value: "", label: "Any" },
  { value: "single_room", label: "Single room" },
  { value: "studio", label: "Studio" },
  { value: "apartment", label: "Apartment" },
];

type SubPanel = "bedrooms" | "price" | "toilets" | "property" | null;

export type Category = "all" | PropertyType;

export const CATEGORIES: { value: Category; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "all", label: "All", icon: "grid-outline" },
  { value: "home", label: "Homes", icon: "home-outline" },
  { value: "guest_house", label: "Guest House", icon: "bed-outline" },
  { value: "hotel", label: "Hotels", icon: "business-outline" },
];

function optionLabel(options: { value: string; label: string }[], value: string) {
  return options.find((o) => o.value === value)?.label ?? "Any";
}

type Props = {
  city: string;
  setCity: (v: string) => void;
  minPrice: string;
  setMinPrice: (v: string) => void;
  maxPrice: string;
  setMaxPrice: (v: string) => void;
  minBedrooms: string;
  setMinBedrooms: (v: string) => void;
  minBathrooms: string;
  setMinBathrooms: (v: string) => void;
  unitType: string;
  setUnitType: (v: string) => void;
  category: Category;
  setCategory: (v: Category) => void;
  scrolled: SharedValue<number>;
  onLogoPress?: () => void;
};

export function BrowseTopBar({
  city,
  setCity,
  minPrice,
  setMinPrice,
  maxPrice,
  setMaxPrice,
  minBedrooms,
  setMinBedrooms,
  minBathrooms,
  setMinBathrooms,
  unitType,
  setUnitType,
  category,
  setCategory,
  scrolled,
  onLogoPress,
}: Props) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [hovered, setHovered] = useState(false);
  const [open, setOpen] = useState(false);
  const [subPanel, setSubPanel] = useState<SubPanel>(null);
  const [navHeight, setNavHeight] = useState(148);
  const popoverTop = navHeight + spacing.sm;

  function closeAll() {
    setOpen(false);
    setSubPanel(null);
  }

  // clamped: the spring is underdamped and overshoots past 1, which would
  // otherwise drive height negative and lift row2 past the logo row
  const categoriesStyle = useAnimatedStyle(() => ({
    height: interpolate(scrolled.value, [0, 1], [CATEGORIES_HEIGHT, 0], Extrapolation.CLAMP),
    opacity: interpolate(scrolled.value, [0, 1], [1, 0], Extrapolation.CLAMP),
  }));
  const searchBarStyle = useAnimatedStyle(() => ({
    width: interpolate(scrolled.value, [0, 1], [BAR_WIDTH_EXPANDED, BAR_WIDTH_COMPACT], Extrapolation.CLAMP),
  }));
  const row2Style = useAnimatedStyle(() => {
    // paddingTop/Bottom, not paddingVertical: reanimated writes animated props straight
    // to the DOM on web, where the RN shorthand isn't a real CSS property and is dropped
    const pad = interpolate(scrolled.value, [0, 1], [spacing.sm, 6], Extrapolation.CLAMP);
    return {
      marginTop: interpolate(scrolled.value, [0, 1], [0, -ROW2_LIFT], Extrapolation.CLAMP),
      paddingTop: pad,
      paddingBottom: pad,
      opacity: interpolate(scrolled.value, [0, 0.5, 1], [1, 0.35, 1], Extrapolation.CLAMP),
    };
  });

  const priceLabel = minPrice || maxPrice ? `$${minPrice || "0"} – $${maxPrice || "∞"}` : "Any";

  return (
    <View style={styles.nav} onLayout={(e) => setNavHeight(e.nativeEvent.layout.height)}>
      <View style={styles.topRow}>
        <Pressable onPress={onLogoPress} disabled={!onLogoPress}>
          <Text style={styles.logo}>jella</Text>
        </Pressable>
        <NavMenu />
      </View>

      <Animated.View style={[styles.categoriesRow, categoriesStyle, styles.row1Clip]}>
        {CATEGORIES.map((c) => {
          const active = c.value === category;
          return (
            <Pressable
              key={c.value}
              style={styles.categoryTab}
              onPress={() => {
                setCategory(c.value);
                if (c.value !== "home") setUnitType("");
              }}
            >
              <Ionicons name={c.icon} size={26} color={active ? colors.text : colors.textMuted} />
              <Text style={[styles.categoryLabel, active && styles.categoryLabelActive]}>{c.label}</Text>
              {active && <View style={styles.categoryUnderline} />}
            </Pressable>
          );
        })}
      </Animated.View>

      <Animated.View style={[styles.row2, row2Style]}>
        <Animated.View style={[styles.searchBar, searchBarStyle]}>
          <Pressable
            style={[styles.searchBarInner, hovered && styles.searchBarHovered]}
            onHoverIn={() => setHovered(true)}
            onHoverOut={() => setHovered(false)}
            onPress={() => setOpen((v) => !v)}
          >
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <Text style={styles.searchBarText}>Search</Text>
          </Pressable>
        </Animated.View>

        <Modal transparent visible={open} animationType="none" onRequestClose={closeAll}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeAll} />

          <View style={[styles.filterPanel, { top: popoverTop }]}>
            <View style={styles.filterRow}>
              <Text style={styles.filterRowLabel}>Location</Text>
              <TextInput
                style={styles.filterRowInput}
                placeholder="Search city"
                placeholderTextColor={colors.textMuted}
                value={city}
                onChangeText={setCity}
              />
            </View>
            <FilterRow label="Bedrooms" value={optionLabel(NUMBER_OPTIONS, minBedrooms)} onPress={() => setSubPanel("bedrooms")} />
            <FilterRow label="Price" value={priceLabel} onPress={() => setSubPanel("price")} />
            <FilterRow label="Toilets" value={optionLabel(NUMBER_OPTIONS, minBathrooms)} onPress={() => setSubPanel("toilets")} />
            {category === "home" && (
              <FilterRow label="Property" value={optionLabel(UNIT_TYPE_OPTIONS, unitType)} onPress={() => setSubPanel("property")} />
            )}
          </View>

          {subPanel === "bedrooms" && (
            <NumberPanel top={popoverTop} options={NUMBER_OPTIONS} value={minBedrooms} onSelect={(v) => { setMinBedrooms(v); setSubPanel(null); }} />
          )}
          {subPanel === "toilets" && (
            <NumberPanel top={popoverTop} options={NUMBER_OPTIONS} value={minBathrooms} onSelect={(v) => { setMinBathrooms(v); setSubPanel(null); }} />
          )}
          {subPanel === "property" && (
            <NumberPanel top={popoverTop} options={UNIT_TYPE_OPTIONS} value={unitType} onSelect={(v) => { setUnitType(v); setSubPanel(null); }} />
          )}
          {subPanel === "price" && (
            <View style={[styles.subPanel, { top: popoverTop }]}>
              <View style={styles.priceField}>
                <Text style={styles.priceFieldLabel}>Min</Text>
                <TextInput
                  style={styles.priceFieldInput}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  value={minPrice}
                  onChangeText={setMinPrice}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.priceField}>
                <Text style={styles.priceFieldLabel}>Max</Text>
                <TextInput
                  style={styles.priceFieldInput}
                  placeholder="Any"
                  placeholderTextColor={colors.textMuted}
                  value={maxPrice}
                  onChangeText={setMaxPrice}
                  keyboardType="numeric"
                />
              </View>
            </View>
          )}
        </Modal>
      </Animated.View>
    </View>
  );
}

function FilterRow({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Pressable style={styles.filterRow} onPress={onPress}>
      <Text style={styles.filterRowLabel}>{label}</Text>
      <Text style={styles.filterRowValue} numberOfLines={1}>{value}</Text>
      <Ionicons name="arrow-up-outline" size={14} color={colors.textMuted} style={styles.filterRowArrow} />
    </Pressable>
  );
}

function NumberPanel({
  options,
  value,
  onSelect,
  top,
}: {
  options: { value: string; label: string }[];
  value: string;
  onSelect: (v: string) => void;
  top: number;
}) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={[styles.subPanel, { top }]}>
      {options.map((o) => (
        <Pressable
          key={o.value}
          style={[styles.numberRow, o.value === value && styles.numberRowActive]}
          onPress={() => onSelect(o.value)}
        >
          <Text style={styles.numberRowText}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const makeStyles = ({ colors }: Theme) => StyleSheet.create({
  nav: { borderBottomWidth: 1, borderBottomColor: colors.border },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: TOP_ROW_HEIGHT,
    paddingHorizontal: spacing.xl,
  },
  row1Clip: { overflow: "hidden" },
  logo: { fontSize: 22, fontWeight: "700", color: colors.primary, letterSpacing: -0.5 },

  categoriesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: CATEGORIES_HEIGHT,
    marginTop: -CATEGORIES_OVERLAP,
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  categoryTab: { alignItems: "center", justifyContent: "center", height: "100%", gap: 4 },
  categoryLabel: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  categoryLabelActive: { color: colors.text },
  categoryUnderline: { position: "absolute", bottom: 0, left: 0, right: 0, height: 2, backgroundColor: colors.text },

  // paddingVertical is supplied by row2Style (animated) — a static one here would be overridden
  row2: { alignItems: "center" },
  searchBar: { height: 52, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: "hidden", ...cardShadow },
  searchBarInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
  },
  searchBarHovered: { backgroundColor: colors.surfaceMuted },
  searchBarText: { fontSize: 14, fontWeight: "500", color: colors.textMuted },

  filterPanel: {
    position: "absolute",
    left: "50%",
    transform: [{ translateX: -170 }],
    width: 340,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    ...cardShadow,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  filterRowLabel: { fontSize: 14, fontWeight: "600", color: colors.text, width: 80 },
  filterRowValue: { flex: 1, fontSize: 14, color: colors.textMuted, textAlign: "right" },
  filterRowArrow: { transform: [{ rotate: "45deg" }] },
  filterRowInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    textAlign: "right",
    padding: 0,
    ...(Platform.OS === "web" ? { outlineStyle: "none" } : {}),
  } as object,

  subPanel: {
    position: "absolute",
    left: "50%",
    transform: [{ translateX: 180 }],
    width: 180,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    ...cardShadow,
  },
  numberRow: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, borderRadius: radius.sm },
  numberRowActive: { backgroundColor: colors.surfaceMuted },
  numberRowText: { fontSize: 14, color: colors.text },
  priceField: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg, gap: 2 },
  priceFieldLabel: { fontSize: 11, fontWeight: "700", color: colors.text },
  priceFieldInput: {
    fontSize: 14,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    ...(Platform.OS === "web" ? { outlineStyle: "none" } : {}),
  } as object,
});
