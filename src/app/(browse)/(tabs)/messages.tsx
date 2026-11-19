import { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { TAB_BAR_SPACE } from "@/components/ui/floating-tab-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/ui/error-state";
import { RowSkeletonList } from "@/components/ui/skeleton";
import { getDeviceId } from "@/lib/device";
import { renterConversations, type RenterConversation } from "@/lib/chat";
import { timeAgo } from "@/lib/inbox";
import { radius, spacing, cardShadow } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";

// Renter: conversations with landlords (kept on this device, no account needed).
export default function Messages() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [items, setItems] = useState<RenterConversation[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    getDeviceId()
        .then(renterConversations)
        .then((c) => {
          setFailed(false);
          setItems(c);
        })
        .catch(() => setFailed(true));
  }, []);

  useFocusEffect(load);

  return (
    <View style={styles.container}>
      {items === null && !failed && <View style={styles.list}><RowSkeletonList /></View>}
      {failed && !items?.length && <ErrorState onRetry={load} />}
      {items?.length === 0 && (
        <EmptyState icon="chatbubbles-outline" message="No messages yet. Unlock a listing to chat with its landlord." />
      )}
      <FlatList
        data={items ?? []}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        renderItem={({ item: c }) => (
          <Pressable
            style={styles.card}
            onPress={() => router.push({ pathname: "/(browse)/chat/[listingId]", params: { listingId: c.listing_id, title: c.listing_title } })}
          >
            <View style={styles.rowTop}>
              <Text style={styles.listing} numberOfLines={1}>{c.listing_title}</Text>
              {c.unread > 0 && <Badge label={`${c.unread} new`} tone="success" />}
            </View>
            <Text style={styles.last} numberOfLines={1}>{c.last_message}</Text>
            <Text style={styles.when}>{timeAgo(c.last_message_at)}</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing.lg, paddingBottom: TAB_BAR_SPACE, gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.xs, ...cardShadow },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  listing: { ...typography.subheading, flex: 1 },
  last: { ...typography.body, color: colors.textMuted },
  when: { ...typography.caption },
});
