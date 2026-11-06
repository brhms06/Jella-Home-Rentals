import { useEffect, useState, useMemo } from "react";
import { View, Text, TextInput, Pressable, Modal, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView, SafeAreaProvider } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { fetchListings, type SortOption } from "@/lib/listings";
import { radius, spacing, cardShadow } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { CATEGORIES, type Category } from "@/components/browse-top-bar";
import { SortControl } from "@/components/ui/sort-control";

type Props = {
  visible: boolean;
  onClose: () => void;
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
  sort: SortOption;
  setSort: (v: SortOption) => void;
};

// ponytail: no curated-destinations content or geolocation exist in this app —
// suggestions are just the real cities already present in the catalog.
function useSuggestedDestinations() {
  const [destinations, setDestinations] = useState<{ city: string; count: number }[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchListings({ sort: "newest" }).then((data) => {
      if (cancelled) return;
      const counts = new Map<string, number>();
      for (const l of data) {
        if (!l.city) continue;
        counts.set(l.city, (counts.get(l.city) ?? 0) + 1);
      }
      const ranked = Array.from(counts, ([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count);
      setDestinations(ranked.slice(0, 6));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return destinations;
}

export function SearchModal({
  visible,
  onClose,
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
  sort,
  setSort,
}: Props) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const destinations = useSuggestedDestinations();

  function selectDestination(destinationCity: string) {
    setCity(destinationCity);
    onClose();
  }

  function clearAll() {
    setCity("");
    setMinPrice("");
    setMaxPrice("");
    setMinBedrooms("");
    setMinBathrooms("");
    setUnitType("");
    setCategory("all");
  }

  function clearFilters() {
    setMinPrice("");
    setMaxPrice("");
    setMinBedrooms("");
    setMinBathrooms("");
    setUnitType("");
    setCategory("all");
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={8} style={styles.closeButton}>
            <Ionicons name="close" size={20} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Where to?</Text>

          <View style={styles.searchRow}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search city or area"
              placeholderTextColor={colors.textMuted}
              value={city}
              onChangeText={setCity}
              returnKeyType="search"
              onSubmitEditing={onClose}
            />
            {city.length > 0 && (
              <Pressable onPress={() => setCity("")} hitSlop={8}>
                <Ionicons name="close-circle" size={18} color={colors.textMuted} />
              </Pressable>
            )}
            <View style={styles.searchDivider} />
            <Pressable onPress={() => setFiltersOpen(true)} hitSlop={8} accessibilityLabel="Filters">
              <Ionicons name="options-outline" size={20} color={colors.text} />
            </Pressable>
          </View>

          {destinations.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Suggested destinations</Text>
              {destinations.map((d) => (
                <Pressable key={d.city} style={styles.destinationRow} onPress={() => selectDestination(d.city)}>
                  <View style={styles.destinationIcon}>
                    <Ionicons name="location-outline" size={20} color={colors.text} />
                  </View>
                  <View style={styles.destinationText}>
                    <Text style={styles.destinationCity}>{d.city}</Text>
                    <Text style={styles.destinationCaption}>
                      {d.count} {d.count === 1 ? "home" : "homes"}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable onPress={clearAll} hitSlop={8}>
            <Text style={styles.clearText}>Clear all</Text>
          </Pressable>
          <Pressable style={styles.searchButton} onPress={onClose}>
            <Ionicons name="search" size={16} color={colors.onPrimary} />
            <Text style={styles.searchButtonText}>Search</Text>
          </Pressable>
        </View>
      </SafeAreaView>
      </SafeAreaProvider>

      <Modal visible={filtersOpen} animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
        <SafeAreaProvider>
        <SafeAreaView style={styles.safe}>
          <View style={styles.header}>
            <Pressable onPress={() => setFiltersOpen(false)} hitSlop={8}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </Pressable>
            <Text style={styles.filtersTitle}>Filters</Text>
            <View style={{ width: 22 }} />
          </View>

          <View style={styles.body}>
            <View style={styles.filterRow}>
              <TextInput
                style={[styles.fieldInput, styles.filterHalf]}
                placeholder="Min $"
                placeholderTextColor={colors.textMuted}
                value={minPrice}
                onChangeText={setMinPrice}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.fieldInput, styles.filterHalf]}
                placeholder="Max $"
                placeholderTextColor={colors.textMuted}
                value={maxPrice}
                onChangeText={setMaxPrice}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.filterRow}>
              <TextInput
                style={[styles.fieldInput, styles.filterHalf]}
                placeholder="Min beds"
                placeholderTextColor={colors.textMuted}
                value={minBedrooms}
                onChangeText={setMinBedrooms}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.fieldInput, styles.filterHalf]}
                placeholder="Min toilets"
                placeholderTextColor={colors.textMuted}
                value={minBathrooms}
                onChangeText={setMinBathrooms}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.categoryPills}>
              {CATEGORIES.map((c) => (
                <Pressable
                  key={c.value}
                  style={[styles.categoryPill, category === c.value && styles.categoryPillActive]}
                  onPress={() => {
                    setCategory(c.value);
                    if (c.value !== "home") setUnitType("");
                  }}
                >
                  <Text style={[styles.categoryPillText, category === c.value && styles.categoryPillTextActive]}>{c.label}</Text>
                </Pressable>
              ))}
            </View>
            <SortControl value={sort} onChange={setSort} />
          </View>

          <View style={styles.footer}>
            <Pressable onPress={clearFilters} hitSlop={8}>
              <Text style={styles.clearText}>Clear all</Text>
            </Pressable>
            <Pressable style={styles.searchButton} onPress={() => setFiltersOpen(false)}>
              <Text style={styles.searchButtonText}>Done</Text>
            </Pressable>
          </View>
        </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </Modal>
  );
}

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  filtersTitle: { ...typography.subheading },
  bodyScroll: { flex: 1 },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xl, gap: spacing.lg },
  title: { ...typography.title, fontSize: 30 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.pill,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.text, padding: 0 },
  searchDivider: { width: 1, height: 20, backgroundColor: colors.border },
  sectionLabel: { ...typography.caption, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginTop: spacing.xs, marginBottom: -spacing.xs },
  destinationRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.xs },
  destinationIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  destinationText: { flex: 1, gap: 2 },
  destinationCity: { ...typography.subheading },
  destinationCaption: { ...typography.caption },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  clearText: { fontSize: 15, fontWeight: "700", color: colors.text, textDecorationLine: "underline" },
  searchButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    ...cardShadow,
  },
  searchButtonText: { fontSize: 15, fontWeight: "700", color: colors.onPrimary },

  filterRow: { flexDirection: "row", gap: spacing.sm },
  filterHalf: { flex: 1 },
  fieldInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text,
  },
  categoryPills: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  categoryPill: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  categoryPillActive: { backgroundColor: colors.text, borderColor: colors.text },
  categoryPillText: { fontSize: 13, fontWeight: "600", color: colors.text },
  categoryPillTextActive: { color: colors.background },
});
