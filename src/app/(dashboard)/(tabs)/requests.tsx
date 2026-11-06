import { TAB_BAR_SPACE } from "@/components/ui/floating-tab-bar";
import { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, RefreshControl, StyleSheet, Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import { fetchOwnerRequests, respondToRequest, SLOT_LABEL, type OwnerRequest } from "@/lib/viewing-requests";
import { radius, spacing, cardShadow } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

const prettyDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

export default function Requests() {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [requests, setRequests] = useState<OwnerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      setRequests(await fetchOwnerRequests());
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load().finally(() => setLoading(false));
    }, [load])
  );

  async function respond(id: string, status: "accepted" | "declined") {
    setBusyId(id);
    try {
      await respondToRequest(id, status);
      setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    } catch {
      Alert.alert("Couldn't update", "Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Viewing requests</Text>
      {!loading && failed && <EmptyState icon="alert-circle-outline" message="Couldn't load requests." />}
      {!loading && !failed && requests.length === 0 && (
        <EmptyState icon="calendar-outline" message="No viewing requests yet. They'll appear here." />
      )}
      <FlatList
        data={requests}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.rowTop}>
              <Text style={styles.listing} numberOfLines={1}>{item.listing_title}</Text>
              <Badge
                label={item.status[0].toUpperCase() + item.status.slice(1)}
                tone={item.status === "accepted" ? "success" : "muted"}
              />
            </View>
            <Text style={styles.name}>{item.renter_name}</Text>
            <Text style={styles.when}>
              {prettyDate(item.preferred_date)} · {SLOT_LABEL[item.preferred_slot]}
            </Text>
            {item.note ? <Text style={styles.note}>“{item.note}”</Text> : null}
            {item.status === "pending" && (
              <View style={styles.actions}>
                <Button label="Decline" variant="outline" color={colors.danger} disabled={busyId === item.id} onPress={() => respond(item.id, "declined")} style={styles.action} />
                <Button label="Accept" loading={busyId === item.id} loadingLabel="..." onPress={() => respond(item.id, "accepted")} style={styles.action} />
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.title, paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  list: { padding: spacing.lg, paddingBottom: TAB_BAR_SPACE, gap: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
    ...cardShadow,
  },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  listing: { ...typography.caption, flex: 1 },
  name: { ...typography.subheading },
  when: { ...typography.body, color: colors.textMuted },
  note: { ...typography.caption, fontStyle: "italic" },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  action: { flex: 1 },
});
