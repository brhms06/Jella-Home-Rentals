import { TAB_BAR_SPACE } from "@/components/ui/floating-tab-bar";
import { useCallback, useState, useMemo } from "react";
import { View, Text, FlatList, Pressable, RefreshControl, Platform, useWindowDimensions, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import Animated, { useSharedValue, useAnimatedScrollHandler, useAnimatedStyle, interpolate, Extrapolation, withSpring } from "react-native-reanimated";
import { Link, type Href, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fetchListings, type PublicListing, type ListingFilters, type SortOption, type PropertyType, type UnitType } from "@/lib/listings";
import { fetchFavoriteIds, addFavorite, removeFavorite } from "@/lib/favorites";
import { radius, spacing, cardShadow } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { ListingCard } from "@/components/listing-card";
import { BrowseTopBar, type Category } from "@/components/browse-top-bar";
import { HomeFeed } from "@/components/home-feed";
import { SearchModal } from "@/components/search-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonList } from "@/components/ui/skeleton";
import { ExploreMap } from "@/components/explore-map";

const GRID_GAP = spacing.lg;
const DESKTOP_BREAKPOINT = 900;

export function ListingBrowseList({ getHref, deviceId }: { getHref: (id: string) => Href; deviceId: string }) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= DESKTOP_BREAKPOINT;

  const [listings, setListings] = useState<PublicListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [city, setCity] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minBedrooms, setMinBedrooms] = useState("");
  const [minBathrooms, setMinBathrooms] = useState("");
  const [unitType, setUnitType] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [sort, setSort] = useState<SortOption>("newest");
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [viewAll, setViewAll] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const [headerH, setHeaderH] = useState(0);

  const scrolled = useSharedValue(0);
  const scrolledTarget = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    const y = event.contentOffset.y;
    // desktop header collapses after 40px; the mobile search pill collapses on first scroll and only
    // expands again once back at the very top (small dead zone avoids flicker)
    const next = isDesktop ? (y > 40 ? 1 : 0) : y <= 2 ? 0 : y > 8 ? 1 : scrolledTarget.value;
    if (scrolledTarget.value !== next) {
      scrolledTarget.value = next;
      scrolled.value = withSpring(next, { damping: 18, stiffness: 160 });
    }
  });

  const pillStyle = useAnimatedStyle(() => ({
    width: interpolate(scrolled.value, [0, 1], [width - spacing.lg * 2, 132], Extrapolation.CLAMP),
  }));
  const fullTextStyle = useAnimatedStyle(() => ({ opacity: 1 - scrolled.value }));
  const shortTextStyle = useAnimatedStyle(() => ({ opacity: scrolled.value }));

  const filters: ListingFilters = {
    city: city.trim() || undefined,
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    minBedrooms: minBedrooms ? Number(minBedrooms) : undefined,
    minBathrooms: minBathrooms ? Number(minBathrooms) : undefined,
    propertyType: category === "all" ? undefined : (category as PropertyType),
    unitType: category === "home" && unitType ? (unitType as UnitType) : undefined,
    sort,
  };
  const filterKey = JSON.stringify(filters);
  const hasActiveFilters =
    !!city.trim() || !!minPrice || !!maxPrice || !!minBedrooms || !!minBathrooms || !!unitType || category !== "all";
  const showFeed = !hasActiveFilters && !viewAll;
  const listPlaceholder = loading ? (
    <SkeletonList />
  ) : failed ? (
    <ErrorState onRetry={() => setRetryKey((k) => k + 1)} />
  ) : (
    <EmptyState icon="search-outline" message="No listings match your search." />
  );

  function handleSectionPress({ city: sectionCity, propertyType }: { city?: string; propertyType?: PropertyType }) {
    setCity(sectionCity ?? "");
    setCategory(propertyType ?? "all");
    setUnitType("");
    setMinPrice("");
    setMaxPrice("");
    setMinBedrooms("");
    setMinBathrooms("");
    setViewAll(!sectionCity && !propertyType);
  }

  function goHome() {
    setCity("");
    setMinPrice("");
    setMaxPrice("");
    setMinBedrooms("");
    setMinBathrooms("");
    setUnitType("");
    setCategory("all");
    setViewAll(false);
  }

  useFocusEffect(
    useCallback(() => {
      if (showFeed) {
        setListings([]);
        setLoading(false);
        return;
      }
      let cancelled = false;
      setLoading(true);
      fetchListings(filters)
        .then((data) => {
          if (cancelled) return;
          setFailed(false);
          setListings(data);
        })
        .catch((err) => {
          console.error("fetchListings failed:", err);
          if (!cancelled) setFailed(true);
        })
        .finally(() => !cancelled && setLoading(false));
      return () => {
        cancelled = true;
      };
      // filterKey captures the same values as `filters`; re-running on it (not the fresh object) avoids refetching every render
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterKey, showFeed, retryKey])
  );

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      fetchFavoriteIds(deviceId).then((ids) => !cancelled && setFavoriteIds(ids));
      return () => {
        cancelled = true;
      };
    }, [deviceId])
  );

  async function handleRefresh() {
    setRefreshing(true);
    try {
      setListings(await fetchListings(filters));
    } finally {
      setRefreshing(false);
    }
  }

  const handleToggleFavorite = useCallback(
    async (listingId: string) => {
      let wasFavorite = false;
      setFavoriteIds((prev) => {
        wasFavorite = prev.has(listingId);
        const next = new Set(prev);
        if (wasFavorite) next.delete(listingId);
        else next.add(listingId);
        return next;
      });
      try {
        if (wasFavorite) await removeFavorite(deviceId, listingId);
        else await addFavorite(deviceId, listingId);
      } catch {
        // revert on failure
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (wasFavorite) next.add(listingId);
          else next.delete(listingId);
          return next;
        });
      }
    },
    [deviceId]
  );

  const renderMobileItem = useCallback(
    ({ item }: { item: PublicListing }) => (
      <View>
        <Link href={getHref(item.id)} asChild>
          <Pressable>
            <ListingCard listing={item} variant="feed" isFavorite={favoriteIds.has(item.id)} onToggleFavorite={handleToggleFavorite} />
          </Pressable>
        </Link>
      </View>
    ),
    [getHref, favoriteIds, handleToggleFavorite]
  );

  if (isDesktop) {
    return (
      <View style={styles.container}>
        <BrowseTopBar
          city={city}
          setCity={setCity}
          minPrice={minPrice}
          setMinPrice={setMinPrice}
          maxPrice={maxPrice}
          setMaxPrice={setMaxPrice}
          minBedrooms={minBedrooms}
          setMinBedrooms={setMinBedrooms}
          minBathrooms={minBathrooms}
          setMinBathrooms={setMinBathrooms}
          unitType={unitType}
          setUnitType={setUnitType}
          category={category}
          setCategory={setCategory}
          scrolled={scrolled}
          onLogoPress={goHome}
        />

        {/* ponytail: plain flex-wrap grid, not a virtualized FlatList — fine at test-catalog size; revisit if the
            listing count grows large enough for windowing to matter (a FlatList numColumns remount was also the
            cause of the scroll freeze/flicker bug this replaced) */}
        <Animated.ScrollView
          style={styles.desktopBody}
          contentContainerStyle={styles.desktopBodyContent}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          {showFeed ? (
            <View style={styles.listHeader}>
              <HomeFeed getHref={getHref} onSectionPress={handleSectionPress} />
            </View>
          ) : (
            <>
              {listings.length === 0 && listPlaceholder}
              <View style={styles.grid}>
                {listings.map((item) => (
                  <Link key={item.id} href={getHref(item.id)} asChild>
                    <Pressable>
                      <ListingCard
                        listing={item}
                        variant="grid"
                        isFavorite={favoriteIds.has(item.id)}
                        onToggleFavorite={handleToggleFavorite}
                      />
                    </Pressable>
                  </Link>
                ))}
              </View>
            </>
          )}
        </Animated.ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ponytail: transparent overlay (not in the layout flow) so listings scroll visibly behind the pill */}
      <View
        pointerEvents="box-none"
        style={[styles.overlay, { paddingTop: insets.top }]}
        onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}
      >
      <View style={styles.searchWrap}>
        <Animated.View style={[styles.searchBar, pillStyle]}>
          <BlurView intensity={40} tint={theme.dark ? "dark" : "light"} style={StyleSheet.absoluteFill} />
          <Pressable style={styles.searchPress} onPress={() => setSearchOpen(true)}>
            <Ionicons name="search" size={18} color={colors.text} />
            <View style={styles.searchTextBox}>
              <Animated.Text style={[styles.searchBarText, fullTextStyle]} numberOfLines={1}>
                {city.trim() || "Start your search"}
              </Animated.Text>
              <Animated.Text style={[styles.searchBarText, styles.searchShort, shortTextStyle]}>Search</Animated.Text>
            </View>
          </Pressable>
        </Animated.View>
      </View>

      {!showFeed && (
        <Pressable style={styles.backRow} onPress={goHome}>
          <Ionicons name="arrow-back" size={18} color={colors.text} />
          <Text style={styles.backText}>Back to Explore</Text>
        </Pressable>
      )}
      </View>

      <SearchModal
        visible={searchOpen}
        onClose={() => setSearchOpen(false)}
        city={city}
        setCity={setCity}
        minPrice={minPrice}
        setMinPrice={setMinPrice}
        maxPrice={maxPrice}
        setMaxPrice={setMaxPrice}
        minBedrooms={minBedrooms}
        setMinBedrooms={setMinBedrooms}
        minBathrooms={minBathrooms}
        setMinBathrooms={setMinBathrooms}
        unitType={unitType}
        setUnitType={setUnitType}
        category={category}
        setCategory={setCategory}
        sort={sort}
        setSort={setSort}
      />

      <Animated.FlatList
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        data={showFeed ? [] : listings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, { paddingTop: headerH + spacing.md }]}
        ListEmptyComponent={
          !showFeed ? listPlaceholder : undefined
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        renderItem={renderMobileItem}
        ListHeaderComponent={showFeed ? <HomeFeed getHref={getHref} onSectionPress={handleSectionPress} /> : undefined}
        ListHeaderComponentStyle={styles.listHeaderMobile}
      />

      {mapOpen && (
        <View style={[StyleSheet.absoluteFill, { zIndex: 5 }]}>
          <ExploreMap filters={filters} bottomInset={TAB_BAR_SPACE + 64} />
        </View>
      )}

      <Pressable style={[styles.mapToggle, { bottom: TAB_BAR_SPACE + spacing.sm }]} onPress={() => setMapOpen((v) => !v)} accessibilityRole="button">
        <Ionicons name={mapOpen ? "list" : "map"} size={16} color={colors.background} />
        <Text style={styles.mapToggleText}>{mapOpen ? "List" : "Map"}</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = ({ colors, typography, dark }: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  overlay: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 },
  mapToggle: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.text,
    ...cardShadow,
  },
  mapToggleText: { color: colors.background, fontWeight: "700", fontSize: 14 },
  searchWrap: { alignItems: "center", marginTop: spacing.md },
  searchBar: {
    overflow: "hidden",
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    // translucent tint over the blur = glass, listings show through
    backgroundColor: dark ? "rgba(23,23,23,0.55)" : "rgba(245,245,245,0.55)",
    ...cardShadow,
  },
  searchPress: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  searchTextBox: { flex: 1 },
  searchShort: { position: "absolute", left: 0 },
  searchBarText: { fontSize: 15, fontWeight: "600", color: colors.text },
  backRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  backText: { fontSize: 14, fontWeight: "600", color: colors.text },
  empty: { ...typography.body, textAlign: "center", color: colors.textMuted, marginTop: 40 },
  list: { padding: spacing.lg, paddingBottom: TAB_BAR_SPACE, gap: spacing.xl },
  listHeaderMobile: { marginBottom: spacing.md },

  desktopBody: { flex: 1 },
  desktopBodyContent: { width: "100%", maxWidth: 1400, alignSelf: "center", paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xl },
  listHeader: { marginBottom: spacing.xl },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GRID_GAP },
});
