import { TAB_BAR_SPACE } from "@/components/ui/floating-tab-bar";
import { xaf } from "@/lib/listings";
import { useCallback, useEffect, useState, useMemo } from "react";
import { View, Text, FlatList, Pressable, RefreshControl, StyleSheet } from "react-native";
import { Link, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { fetchMyFavoriteListings, removeFavorite } from "@/lib/favorites";
import { getDeviceId } from "@/lib/device";
import { fetchPriceDrops, markDropsSeen, type PriceDrop } from "@/lib/price-drops";
import type { PublicListing } from "@/lib/listings";
import { spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { ListingCard } from "@/components/listing-card";
import { CompareModal } from "@/components/compare-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { SkeletonList } from "@/components/ui/skeleton";

const MAX_COMPARE = 3;

export default function Favorites() {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [listings, setListings] = useState<PublicListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [drops, setDrops] = useState<Map<string, PriceDrop>>(new Map());

  useEffect(() => {
    getDeviceId().then(setDeviceId);
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!deviceId) return;
      let cancelled = false;
      setLoading(true);
      fetchMyFavoriteListings(deviceId)
        .then(async (data) => {
          if (cancelled) return;
          setFailed(false);
          setListings(data);
          const d = await fetchPriceDrops(data.map((l) => l.id)).catch(() => new Map<string, PriceDrop>());
          if (cancelled) return;
          setDrops(d);
          markDropsSeen(d); // opening the tab counts as seeing them; the labels stay visible below
        })
        .catch(() => !cancelled && setFailed(true))
        .finally(() => !cancelled && setLoading(false));
      return () => {
        cancelled = true;
      };
    }, [deviceId, retryKey])
  );

  async function handleRefresh() {
    if (!deviceId) return;
    setRefreshing(true);
    try {
      setListings(await fetchMyFavoriteListings(deviceId));
    } finally {
      setRefreshing(false);
    }
  }

  async function handleRemove(listingId: string) {
    if (!deviceId) return;
    setListings((prev) => prev.filter((l) => l.id !== listingId));
    try {
      await removeFavorite(deviceId, listingId);
    } catch {
      setListings(await fetchMyFavoriteListings(deviceId));
    }
  }

  const togglePick = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < MAX_COMPARE ? [...p, id] : p));
  const stopComparing = () => {
    setComparing(false);
    setPicked([]);
  };

  return (
    <View style={styles.container}>
      {listings.length >= 2 && (
        <View style={styles.compareBar}>
          {comparing ? (
            <>
              <Text style={styles.compareHint}>Pick 2 or {MAX_COMPARE} to compare ({picked.length})</Text>
              <Pressable onPress={stopComparing}>
                <Text style={styles.compareLink}>Cancel</Text>
              </Pressable>
              <Pressable
                disabled={picked.length < 2}
                onPress={() => setShowCompare(true)}
                style={[styles.compareGo, picked.length < 2 && { opacity: 0.4 }]}
              >
                <Text style={styles.compareGoText}>Compare</Text>
              </Pressable>
            </>
          ) : (
            <Pressable style={styles.compareStart} onPress={() => setComparing(true)}>
              <Ionicons name="git-compare-outline" size={16} color={colors.primary} />
              <Text style={styles.compareLink}>Compare</Text>
            </Pressable>
          )}
        </View>
      )}
      {showCompare && (
        <CompareModal listings={listings.filter((l) => picked.includes(l.id))} onClose={() => setShowCompare(false)} />
      )}
      {loading && listings.length === 0 && <View style={{ padding: spacing.lg }}><SkeletonList /></View>}
      {!loading && failed && listings.length === 0 && <ErrorState onRetry={() => setRetryKey((k) => k + 1)} />}
      {!loading && !failed && listings.length === 0 && <EmptyState icon="heart-outline" message="No favorites yet. Tap the heart on a listing to save it." />}
      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        renderItem={({ item }) =>
          comparing ? (
            <Pressable onPress={() => togglePick(item.id)} style={picked.includes(item.id) && styles.picked}>
              <ListingCard listing={item} isFavorite onToggleFavorite={() => togglePick(item.id)} />
            </Pressable>
          ) : (
            <View>
              {drops.has(item.id) && (
                <View style={styles.drop}>
                  <Ionicons name="trending-down" size={14} color={colors.success} />
                  <Text style={styles.dropText}>
                    Price dropped {xaf(drops.get(item.id)!.previous_price)} → {xaf(drops.get(item.id)!.price)}
                  </Text>
                </View>
              )}
              <Link href={{ pathname: "/(browse)/listing/[id]", params: { id: item.id } }} asChild>
                <Pressable>
                  <ListingCard listing={item} isFavorite onToggleFavorite={() => handleRemove(item.id)} />
                </Pressable>
              </Link>
            </View>
          )
        }
      />
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, paddingBottom: TAB_BAR_SPACE, gap: spacing.md },
  compareBar: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  compareStart: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  compareHint: { flex: 1, ...typography.caption },
  compareLink: { color: colors.primary, fontWeight: "600" },
  compareGo: { backgroundColor: colors.primary, borderRadius: 999, paddingVertical: 8, paddingHorizontal: spacing.lg },
  compareGoText: { color: colors.onPrimary, fontWeight: "700" },
  drop: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6, marginLeft: 4 },
  dropText: { fontSize: 13, fontWeight: "700", color: colors.success },
  picked: { borderWidth: 2, borderColor: colors.primary, borderRadius: 20 },
});
