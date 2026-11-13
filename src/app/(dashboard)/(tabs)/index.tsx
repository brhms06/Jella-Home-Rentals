import { TAB_BAR_SPACE } from "@/components/ui/floating-tab-bar";
import { useCallback, useState, useMemo } from "react";
import { View, Text, FlatList, Pressable, RefreshControl, StyleSheet } from "react-native";
import { Link, router, useFocusEffect, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { fetchMyListings, type Listing } from "@/lib/listings";
import { fetchInboxCount } from "@/lib/inbox";
import { attentionItems, filterListings, type ListingFilter } from "@/lib/home-tasks";
import { radius, spacing, cardShadow } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { ListingCard } from "@/components/listing-card";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { InsightsStrip } from "@/components/insights-strip";

const FILTERS: { value: ListingFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "live", label: "Live" },
  { value: "paused", label: "Paused" },
  { value: "pending", label: "Pending" },
];

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};

// Landlord Home: greeting, one primary action, what needs attention, weekly numbers, then the listings.
export default function Dashboard() {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { session, profile } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [inboxCount, setInboxCount] = useState(0);
  const [filter, setFilter] = useState<ListingFilter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!session) return;
    const [mine, inbox] = await Promise.all([fetchMyListings(session.user.id, "newest"), fetchInboxCount().catch(() => 0)]);
    setListings(mine);
    setInboxCount(inbox);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      load()
        .catch(() => {})
        .finally(() => !cancelled && setLoading(false));
      return () => {
        cancelled = true;
      };
    }, [load])
  );

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  const tasks = attentionItems({ inboxCount, listings, idStatus: profile?.id_status });
  const shown = filterListings(listings, filter);
  const firstName = profile?.full_name?.trim().split(" ")[0];

  const header = (
    <View style={styles.header}>
      <View style={styles.hello}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>{greeting()}</Text>
          <Text style={styles.name} numberOfLines={1}>{firstName ?? "Landlord"}</Text>
        </View>
        <Pressable onPress={() => router.push("/(dashboard)/(tabs)/profile")} accessibilityLabel="Profile">
          <Avatar uri={profile?.avatar_url} name={profile?.full_name} size={44} />
        </Pressable>
      </View>

      {profile?.suspended ? (
        <Text style={styles.suspended}>Account suspended — contact support</Text>
      ) : (
        <Link href="/(dashboard)/listing/new" asChild>
          <Pressable style={styles.newCard} accessibilityRole="button">
            <View style={styles.newIcon}>
              <Ionicons name="add" size={26} color={colors.onPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.newTitle}>New listing</Text>
              <Text style={styles.newSub}>Add photos, a price and the map pin</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color={colors.background} />
          </Pressable>
        </Link>
      )}

      {tasks.length > 0 && (
        <View style={styles.tasks}>
          <Text style={styles.sectionTitle}>Needs your attention</Text>
          {tasks.map((t) => (
            <Pressable
              key={t.key}
              style={styles.task}
              disabled={!t.href}
              onPress={() => t.href && router.push(t.href as Href)}
              accessibilityRole={t.href ? "button" : undefined}
            >
              <View style={styles.taskIcon}>
                <Ionicons name={t.icon} size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.taskTitle}>{t.title}</Text>
                <Text style={styles.taskSub}>{t.subtitle}</Text>
              </View>
              {t.href && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
            </Pressable>
          ))}
        </View>
      )}

      <InsightsStrip />

      <View style={styles.listHead}>
        <Text style={styles.sectionTitle}>Your listings{listings.length ? ` (${listings.length})` : ""}</Text>
      </View>
      {listings.length > 0 && (
        <View style={styles.filters}>
          {FILTERS.map((f) => (
            <Pressable key={f.value} onPress={() => setFilter(f.value)} style={[styles.filter, filter === f.value && styles.filterOn]}>
              <Text style={[styles.filterText, filter === f.value && styles.filterTextOn]}>{f.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={shown}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          !loading ? (
            <EmptyState message={listings.length === 0 ? "No listings yet. Add your first one." : "No listings in this view."} />
          ) : undefined
        }
        renderItem={({ item }) => (
          <View style={styles.cardWrap}>
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

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { paddingBottom: TAB_BAR_SPACE },
  header: { gap: spacing.lg, paddingBottom: spacing.sm },
  hello: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  greeting: { ...typography.caption },
  name: { ...typography.title },
  newCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    padding: spacing.md,
    borderRadius: 22,
    backgroundColor: colors.text,
    ...cardShadow,
  },
  newIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  newTitle: { color: colors.background, fontSize: 17, fontWeight: "700" },
  newSub: { color: colors.background, opacity: 0.7, fontSize: 13 },
  suspended: {
    color: colors.danger,
    backgroundColor: colors.surfaceMuted,
    fontWeight: "600",
    fontSize: 13,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: spacing.lg,
    alignSelf: "flex-start",
  },
  tasks: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  sectionTitle: { ...typography.subheading },
  task: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  taskIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primaryMuted, alignItems: "center", justifyContent: "center" },
  taskTitle: { fontSize: 15, fontWeight: "600", color: colors.text },
  taskSub: { ...typography.caption },
  listHead: { paddingHorizontal: spacing.lg },
  filters: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg },
  filter: { paddingVertical: 6, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  filterOn: { backgroundColor: colors.text, borderColor: colors.text },
  filterText: { fontSize: 13, fontWeight: "600", color: colors.text },
  filterTextOn: { color: colors.background },
  cardWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.xl },
});
