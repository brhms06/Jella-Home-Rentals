import { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import { fetchOwnerStats, fetchOwnerViewsByDay, type DayViews } from "@/lib/analytics";
import { radius, spacing, cardShadow } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { StatCard } from "@/components/ui/stat-card";

// Landlord dashboard header: 7-day totals plus a small views-per-day bar chart.
// Silent when the analytics migration hasn't been applied (fetch fails -> nothing renders).
export function InsightsStrip() {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [totals, setTotals] = useState<{ views: number; contacts: number; favorites: number } | null>(null);
  const [days, setDays] = useState<DayViews[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([fetchOwnerStats(7), fetchOwnerViewsByDay(7)])
        .then(([stats, byDay]) => {
          if (cancelled) return;
          setTotals(
            stats.reduce(
              (t, s) => ({ views: t.views + s.views, contacts: t.contacts + s.contacts, favorites: t.favorites + s.favorites }),
              { views: 0, contacts: 0, favorites: 0 }
            )
          );
          setDays(byDay);
        })
        .catch(() => !cancelled && setTotals(null));
      return () => {
        cancelled = true;
      };
    }, [])
  );

  if (!totals) return null;
  const max = Math.max(1, ...days.map((d) => d.views));

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Last 7 days</Text>
      <View style={styles.statRow}>
        <StatCard icon="eye-outline" value={totals.views} label="Views" tint={colors.primary} />
        <StatCard icon="chatbubble-outline" value={totals.contacts} label="Contacts" tint={colors.primary} />
        <StatCard icon="bookmark-outline" value={totals.favorites} label="Saves" tint={colors.primary} />
      </View>
      <View style={styles.chart}>
        {days.map((d) => (
          <View key={d.day} style={styles.barCol}>
            <View style={[styles.bar, { height: Math.max(4, (d.views / max) * 56) }]} />
            <Text style={styles.barLabel}>{new Date(d.day + "T00:00:00").toLocaleDateString(undefined, { weekday: "narrow" })}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md },
  title: { ...typography.subheading },
  statRow: { flexDirection: "row", gap: spacing.sm },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    ...cardShadow,
  },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  bar: { width: 14, borderRadius: 4, backgroundColor: colors.primary },
  barLabel: { fontSize: 11, color: colors.textMuted },
});
