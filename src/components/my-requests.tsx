import { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Link, useFocusEffect } from "expo-router";
import { getDeviceId } from "@/lib/device";
import { fetchMyRequests, cancelViewingRequest, SLOT_LABEL, type MyRequest } from "@/lib/viewing-requests";
import { radius, spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { Badge } from "@/components/ui/badge";

const prettyDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });

// Renter's own viewing requests and their status (device-based, no account). Hidden when there are none.
export function MyRequests() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [requests, setRequests] = useState<MyRequest[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getDeviceId().then(async (id) => {
        if (cancelled) return;
        setDeviceId(id);
        try {
          const data = await fetchMyRequests(id);
          if (!cancelled) setRequests(data);
        } catch {
          if (!cancelled) setRequests([]);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  async function cancel(id: string) {
    if (!deviceId) return;
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status: "cancelled" } : r)));
    try {
      await cancelViewingRequest(id, deviceId);
    } catch {
      setRequests(await fetchMyRequests(deviceId));
    }
  }

  if (requests.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>My viewing requests</Text>
      {requests.map((r) => (
        <View key={r.id} style={styles.row}>
          <View style={{ flex: 1, gap: 2 }}>
            <Link href={{ pathname: "/(browse)/listing/[id]", params: { id: r.listing_id } }} asChild>
              <Pressable>
                <Text style={styles.title} numberOfLines={1}>{r.listing_title}</Text>
              </Pressable>
            </Link>
            <Text style={styles.when}>{prettyDate(r.preferred_date)} · {SLOT_LABEL[r.preferred_slot]}</Text>
          </View>
          <Badge label={r.status[0].toUpperCase() + r.status.slice(1)} tone={r.status === "accepted" ? "success" : "muted"} />
          {r.status === "pending" && (
            <Pressable onPress={() => cancel(r.id)} hitSlop={8}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  wrap: { gap: spacing.sm },
  heading: { ...typography.subheading, marginTop: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  title: { ...typography.body, fontWeight: "600" },
  when: { ...typography.caption },
  cancel: { color: colors.danger, fontWeight: "600", fontSize: 13 },
});
