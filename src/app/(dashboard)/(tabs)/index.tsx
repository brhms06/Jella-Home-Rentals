import { TAB_BAR_SPACE } from "@/components/ui/floating-tab-bar";
import { useCallback, useState, useMemo } from "react";
import { View, Text, FlatList, Pressable, RefreshControl, StyleSheet, Platform } from "react-native";
import { Link, useFocusEffect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { fetchMyListings, type Listing } from "@/lib/listings";
import { spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { ListingCard } from "@/components/listing-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InsightsStrip } from "@/components/insights-strip";

const serif = Platform.select({ ios: "Georgia", android: "serif", default: "Georgia" });

export default function Dashboard() {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { session, profile } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      let cancelled = false;
      setLoading(true);
      fetchMyListings(session.user.id, "newest")
        .then((data) => !cancelled && setListings(data))
        .finally(() => !cancelled && setLoading(false));
      return () => {
        cancelled = true;
      };
    }, [session])
  );

  async function handleRefresh() {
    if (!session) return;
    setRefreshing(true);
    try {
      setListings(await fetchMyListings(session.user.id, "newest"));
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Listings</Text>
        <Button label="Log out" variant="text" color={colors.textMuted} onPress={() => supabase.auth.signOut()} />
      </View>

      <View style={styles.header}>
        {profile?.suspended ? (
          <Text style={styles.suspended}>Account suspended — contact support</Text>
        ) : (
          <Link href="/(dashboard)/listing/new" style={styles.newButton}>
            + New listing
          </Link>
        )}
      </View>

      <InsightsStrip />

      {!loading && listings.length === 0 && (
        <EmptyState message="No listings yet. Add your first one." />
      )}

      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        renderItem={({ item }) => (
          <View>
            <Link href={`/(dashboard)/listing/${item.id}`} asChild>
              <Pressable>
                <ListingCard listing={item} variant="feed" showStatus />
              </Pressable>
            </Link>
          </View>
        )}
      />
    </View>
  );
}

const makeStyles = ({ colors }: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  title: { fontFamily: serif, fontSize: 30, letterSpacing: -0.5, color: colors.text },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  newButton: {
    color: colors.background,
    backgroundColor: colors.text,
    fontWeight: "600",
    fontSize: 15,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    textAlign: "center",
    overflow: "hidden",
    alignSelf: "stretch",
  },
  suspended: {
    color: colors.danger,
    backgroundColor: colors.surfaceMuted,
    fontWeight: "600",
    fontSize: 13,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
  },
  empty: { fontSize: 15, lineHeight: 24, textAlign: "center", color: colors.textMuted, marginTop: 40 },
  list: { padding: spacing.lg, paddingBottom: TAB_BAR_SPACE, gap: spacing.xl },
});
