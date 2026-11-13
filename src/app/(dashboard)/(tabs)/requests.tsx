import { TAB_BAR_SPACE } from "@/components/ui/floating-tab-bar";
import { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, RefreshControl, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { fetchContactEvents, getSeenAt, markInboxSeen, timeAgo, type ContactEvent } from "@/lib/inbox";
import { fetchOwnerRequests, respondToRequest, SLOT_LABEL, type OwnerRequest } from "@/lib/viewing-requests";
import { radius, spacing, cardShadow } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

const prettyDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

type Filter = "all" | "requests" | "contacts";
type Item =
  | { kind: "request"; key: string; at: number; data: OwnerRequest }
  | { kind: "contact"; key: string; at: number; data: ContactEvent };

// Landlord inbox: viewing requests (need an answer) and WhatsApp contacts, newest first.
export default function Inbox() {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [requests, setRequests] = useState<OwnerRequest[]>([]);
  const [contacts, setContacts] = useState<ContactEvent[]>([]);
  const [seenAt, setSeenAt] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const [r, c, seen] = await Promise.all([fetchOwnerRequests(), fetchContactEvents(), getSeenAt()]);
      setRequests(r);
      setContacts(c);
      setSeenAt(seen); // read before marking seen so the "New" tags survive this visit
      setFailed(false);
      markInboxSeen();
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

  // pending requests first (they need an answer), then everything else newest-first
  const items: Item[] = [
    ...(filter !== "contacts" ? requests.map((r) => ({ kind: "request" as const, key: `r${r.id}`, at: new Date(r.created_at).getTime(), data: r })) : []),
    ...(filter !== "requests" ? contacts.map((c) => ({ kind: "contact" as const, key: `c${c.id}`, at: new Date(c.created_at).getTime(), data: c })) : []),
  ].sort((a, b) => {
    const pa = a.kind === "request" && a.data.status === "pending" ? 1 : 0;
    const pb = b.kind === "request" && b.data.status === "pending" ? 1 : 0;
    return pb - pa || b.at - a.at;
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inbox</Text>
      <View style={styles.filters}>
        {(["all", "requests", "contacts"] as Filter[]).map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} style={[styles.filter, filter === f && styles.filterOn]}>
            <Text style={[styles.filterText, filter === f && styles.filterTextOn]}>{f[0].toUpperCase() + f.slice(1)}</Text>
          </Pressable>
        ))}
      </View>
      {!loading && failed && <EmptyState icon="alert-circle-outline" message="Couldn't load your inbox." />}
      {!loading && !failed && items.length === 0 && (
        <EmptyState icon="mail-outline" message="Nothing yet. Viewing requests and WhatsApp contacts will appear here." />
      )}
      <FlatList
        data={items}
        keyExtractor={(i) => i.key}
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
        renderItem={({ item: entry }) => {
          if (entry.kind === "contact") {
            const c = entry.data;
            return (
              <View style={styles.card}>
                <View style={styles.rowTop}>
                  <View style={styles.contactRow}>
                    <Ionicons
                      name={c.event === "arrived" ? "flag" : "logo-whatsapp"}
                      size={20}
                      color={c.event === "arrived" ? colors.primary : colors.whatsapp}
                    />
                    <Text style={styles.name} numberOfLines={1}>
                      {c.event === "arrived" ? "A renter arrived at the property" : "A renter opened WhatsApp"}
                    </Text>
                  </View>
                  {entry.at > seenAt && <Badge label="New" tone="success" />}
                </View>
                <Text style={styles.listing} numberOfLines={1}>{c.listing_title}</Text>
                <Text style={styles.when}>{timeAgo(c.created_at)}</Text>
              </View>
            );
          }
          const item = entry.data;
          return (
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
          );
        }}
      />
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  title: { ...typography.title, paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  filters: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  filter: { paddingVertical: 6, paddingHorizontal: spacing.md, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  filterOn: { backgroundColor: colors.text, borderColor: colors.text },
  filterText: { fontSize: 13, fontWeight: "600", color: colors.text },
  filterTextOn: { color: colors.background },
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
  contactRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  listing: { ...typography.caption, flex: 1 },
  name: { ...typography.subheading },
  when: { ...typography.body, color: colors.textMuted },
  note: { ...typography.caption, fontStyle: "italic" },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  action: { flex: 1 },
});
