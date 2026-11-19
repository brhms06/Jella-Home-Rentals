import { TAB_BAR_SPACE } from "@/components/ui/floating-tab-bar";
import { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, RefreshControl, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { ownerConversations, type OwnerConversation } from "@/lib/chat";
import { fetchContactEvents, getSeenAt, markInboxSeen, timeAgo, type ContactEvent } from "@/lib/inbox";
import { fetchOwnerRequests, respondToRequest, SLOT_LABEL, type OwnerRequest } from "@/lib/viewing-requests";
import { radius, spacing, cardShadow } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { RowSkeletonList } from "@/components/ui/skeleton";

const prettyDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

type Filter = "all" | "messages" | "requests" | "contacts";
type Item =
  | { kind: "chat"; key: string; at: number; data: OwnerConversation }
  | { kind: "request"; key: string; at: number; data: OwnerRequest }
  | { kind: "contact"; key: string; at: number; data: ContactEvent };

// Landlord inbox: viewing requests (need an answer) and WhatsApp contacts, newest first.
export default function Inbox() {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [requests, setRequests] = useState<OwnerRequest[]>([]);
  const [contacts, setContacts] = useState<ContactEvent[]>([]);
  const [chats, setChats] = useState<OwnerConversation[]>([]);
  const [seenAt, setSeenAt] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const [r, c, seen, m] = await Promise.all([fetchOwnerRequests(), fetchContactEvents(), getSeenAt(), ownerConversations()]);
      setRequests(r);
      setContacts(c);
      setChats(m);
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
    ...(filter === "all" || filter === "messages" ? chats.map((m) => ({ kind: "chat" as const, key: `m${m.id}`, at: new Date(m.last_message_at).getTime(), data: m })) : []),
    ...(filter === "all" || filter === "requests" ? requests.map((r) => ({ kind: "request" as const, key: `r${r.id}`, at: new Date(r.created_at).getTime(), data: r })) : []),
    ...(filter === "all" || filter === "contacts" ? contacts.map((c) => ({ kind: "contact" as const, key: `c${c.id}`, at: new Date(c.created_at).getTime(), data: c })) : []),
  ].sort((a, b) => {
    const pa = a.kind === "request" && a.data.status === "pending" ? 1 : 0;
    const pb = b.kind === "request" && b.data.status === "pending" ? 1 : 0;
    return pb - pa || b.at - a.at;
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inbox</Text>
      <View style={styles.filters}>
        {(["all", "messages", "requests", "contacts"] as Filter[]).map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} style={[styles.filter, filter === f && styles.filterOn]}>
            <Text style={[styles.filterText, filter === f && styles.filterTextOn]}>{f[0].toUpperCase() + f.slice(1)}</Text>
          </Pressable>
        ))}
      </View>
      {loading && items.length === 0 && <View style={styles.list}><RowSkeletonList /></View>}
      {!loading && failed && <ErrorState message="Couldn't load your inbox." onRetry={() => { setLoading(true); load().finally(() => setLoading(false)); }} />}
      {!loading && !failed && items.length === 0 && (
        <EmptyState icon="mail-outline" message="Nothing yet. Messages, viewing requests and WhatsApp contacts will appear here." />
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
          if (entry.kind === "chat") {
            const m = entry.data;
            return (
              <Pressable
                style={styles.card}
                onPress={() => router.push({ pathname: "/(dashboard)/chat/[id]", params: { id: m.id, name: m.renter_name } })}
              >
                <View style={styles.rowTop}>
                  <View style={styles.contactRow}>
                    <Ionicons name="chatbubble-ellipses" size={20} color={colors.primary} />
                    <Text style={styles.name} numberOfLines={1}>{m.renter_name}</Text>
                  </View>
                  {m.unread > 0 && <Badge label={`${m.unread} new`} tone="success" />}
                </View>
                <Text style={styles.listing} numberOfLines={1}>{m.listing_title}</Text>
                <Text style={styles.when} numberOfLines={1}>{m.last_message}</Text>
                <Text style={styles.listing}>{timeAgo(m.last_message_at)}</Text>
              </Pressable>
            );
          }
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
