import { TAB_BAR_SPACE } from "@/components/ui/floating-tab-bar";
import { useCallback, useState, useMemo } from "react";
import { View, Text, FlatList, RefreshControl, StyleSheet, Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import { BarChart, LineChart, PieChart } from "react-native-gifted-charts";
import { fetchListingsForAdmin, updateVerificationStatus, fetchLandlords, setLandlordSuspended, fetchAdminStats, type AdminStats } from "@/lib/admin";
import { fetchReports, updateReportStatus, type Report } from "@/lib/reports";
import type { Listing } from "@/lib/listings";
import type { Profile } from "@/lib/profile";
import { spacing, radius, cardShadow } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { openIdDocument, setIdStatus, ID_STATUS_LABEL } from "@/lib/verification";

type AdminView = "listings" | "reports" | "landlords";

export default function Admin() {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [view, setView] = useState<AdminView>("listings");
  const [listings, setListings] = useState<Listing[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [landlords, setLandlords] = useState<Profile[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [, statsResult] = await Promise.all([
        view === "listings"
          ? fetchListingsForAdmin("pending").then(setListings)
          : view === "reports"
            ? fetchReports("open").then(setReports)
            : fetchLandlords().then(setLandlords),
        fetchAdminStats(),
      ]);
      setStats(statsResult);
    } catch (err) {
      console.error("admin load failed", err);
      setError((err as Error)?.message ?? "Couldn't load data.");
    }
  }, [view]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      load().finally(() => !cancelled && setLoading(false));
      return () => {
        cancelled = true;
      };
    }, [load])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function handleVerification(id: string, status: string) {
    setUpdatingId(id);
    try {
      await updateVerificationStatus(id, status);
      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch (err) {
      console.error("updateVerificationStatus failed", err);
      Alert.alert("Couldn't update", "Please try again.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleReportStatus(id: string, status: string) {
    setUpdatingId(id);
    try {
      await updateReportStatus(id, status);
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error("updateReportStatus failed", err);
      Alert.alert("Couldn't update", "Please try again.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleIdDecision(id: string, status: "verified" | "rejected") {
    setUpdatingId(id);
    try {
      await setIdStatus(id, status);
      setLandlords((prev) => prev.map((l) => (l.id === id ? { ...l, id_status: status } : l)));
    } catch {
      Alert.alert("Couldn't update", "Please try again.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleToggleSuspend(id: string, suspended: boolean) {
    setUpdatingId(id);
    try {
      const updated = await setLandlordSuspended(id, suspended);
      setLandlords((prev) => prev.map((l) => (l.id === id ? updated : l)));
    } catch (err) {
      console.error("setLandlordSuspended failed", err);
      Alert.alert("Couldn't update", "Please try again.");
    } finally {
      setUpdatingId(null);
    }
  }

  const verifiedPct = stats && stats.totalListingsCount > 0 ? Math.round((stats.verifiedListingsCount / stats.totalListingsCount) * 100) : 0;

  const header = (
    <View>
      <Text style={styles.headerTitle}>Admin</Text>

      {stats && (
        <>
          <View style={styles.statRow}>
            <StatCard icon="time-outline" value={stats.pendingListingsCount} label="Pending listings" />
            <StatCard icon="flag-outline" value={stats.openReportsCount} label="Open reports" tint={colors.danger} />
            <StatCard icon="people-outline" value={stats.landlordsCount} label="Landlords" />
            <StatCard icon="bag-check-outline" value={stats.successfulUnlocksCount} label="Unlocks" tint={colors.success} />
          </View>

          <View style={styles.highlightCard}>
            <Text style={styles.highlightLabel}>Earnings this month</Text>
            <Text style={styles.highlightValue}>${stats.monthRevenue.toLocaleString()}</Text>
          </View>

          <View style={styles.widgetRow}>
            <View style={styles.widgetCard}>
              <Text style={styles.widgetLabel}>Total revenue</Text>
              <Text style={styles.widgetValue}>${stats.totalRevenue.toLocaleString()}</Text>
              {stats.revenueSeries.some((r) => r.value > 0) && (
                <LineChart
                  data={stats.revenueSeries.map((r) => ({ value: r.value }))}
                  height={40}
                  thickness={2}
                  color={colors.primary}
                  hideDataPoints
                  hideRules
                  hideAxesAndRules
                  curved
                  areaChart
                  startFillColor={colors.primary}
                  startOpacity={0.15}
                  endOpacity={0}
                />
              )}
            </View>
            <View style={styles.widgetCard}>
              <Text style={styles.widgetLabel}>Verified listings</Text>
              <Text style={styles.widgetValue}>
                {stats.verifiedListingsCount} / {stats.totalListingsCount}
              </Text>
            </View>
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Revenue Report</Text>
            <BarChart
              data={stats.revenueSeries.map((r) => ({ value: r.value, label: r.month, frontColor: colors.primary }))}
              height={160}
              barWidth={18}
              spacing={20}
              roundedTop
              noOfSections={4}
              yAxisTextStyle={styles.chartAxisText}
              xAxisLabelTextStyle={styles.chartAxisText}
              rulesColor={colors.border}
              yAxisColor={colors.border}
              xAxisColor={colors.border}
            />
          </View>

          <View style={styles.gaugeCard}>
            <Text style={styles.chartTitle}>Verification rate</Text>
            <PieChart
              donut
              radius={60}
              innerRadius={45}
              data={[
                { value: verifiedPct, color: colors.primary },
                { value: 100 - verifiedPct, color: colors.surfaceMuted },
              ]}
              centerLabelComponent={() => <Text style={styles.gaugeCenterText}>{verifiedPct}%</Text>}
            />
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>Review queue</Text>
      <View style={styles.toggleRow}>
        <Button label="Listings" variant={view === "listings" ? "primary" : "outline"} onPress={() => setView("listings")} style={styles.toggleButton} />
        <Button label="Reports" variant={view === "reports" ? "primary" : "outline"} onPress={() => setView("reports")} style={styles.toggleButton} />
        <Button label="Landlords" variant={view === "landlords" ? "primary" : "outline"} onPress={() => setView("landlords")} style={styles.toggleButton} />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );

  return (
    <View style={styles.container}>
      {view === "landlords" ? (
        <>
          {!loading && !error && landlords.length === 0 && <Text style={styles.empty}>No landlords yet.</Text>}
          <FlatList
            data={landlords}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListHeaderComponent={header}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.full_name ?? "Unnamed landlord"}
                  </Text>
                  {item.suspended && <Badge label="Suspended" tone="muted" />}
                </View>
                <Text style={styles.subtitle}>{item.whatsapp_number ?? "No WhatsApp number"}</Text>
                <Text style={styles.subtitle}>ID: {ID_STATUS_LABEL[item.id_status ?? "none"]}</Text>
                {item.id_status === "pending" && item.id_document_path && (
                  <View style={styles.actionRow}>
                    <Button label="View ID" variant="outline" onPress={() => openIdDocument(item.id_document_path!).catch(() => Alert.alert("Couldn't open ID"))} style={styles.actionButton} />
                    <Button label="Approve" variant="outline" loading={updatingId === item.id} onPress={() => handleIdDecision(item.id, "verified")} style={styles.actionButton} />
                    <Button label="Reject" variant="outline" color={colors.danger} loading={updatingId === item.id} onPress={() => handleIdDecision(item.id, "rejected")} style={styles.actionButton} />
                  </View>
                )}
                <View style={styles.actionRow}>
                  <Button
                    label={item.suspended ? "Unsuspend" : "Suspend"}
                    loading={updatingId === item.id}
                    variant="outline"
                    color={item.suspended ? undefined : colors.danger}
                    onPress={() => handleToggleSuspend(item.id, !item.suspended)}
                    style={styles.actionButton}
                  />
                </View>
              </View>
            )}
          />
        </>
      ) : view === "listings" ? (
        <>
          {!loading && !error && listings.length === 0 && <Text style={styles.empty}>No pending listings.</Text>}
          <FlatList
            data={listings}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListHeaderComponent={header}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Badge label="Pending" tone="muted" />
                </View>
                <Text style={styles.subtitle}>
                  {item.city ?? "—"} · ${item.price}/mo
                </Text>
                <View style={styles.actionRow}>
                  <Button label="Verify" loading={updatingId === item.id} variant="outline" onPress={() => handleVerification(item.id, "verified")} style={styles.actionButton} />
                  <Button label="Reject" loading={updatingId === item.id} variant="outline" color={colors.danger} onPress={() => handleVerification(item.id, "rejected")} style={styles.actionButton} />
                  <Button label="Suspend" loading={updatingId === item.id} variant="outline" onPress={() => handleVerification(item.id, "suspended")} style={styles.actionButton} />
                </View>
              </View>
            )}
          />
        </>
      ) : (
        <>
          {!loading && !error && reports.length === 0 && <Text style={styles.empty}>No open reports.</Text>}
          <FlatList
            data={reports}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            ListHeaderComponent={header}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.subtitle}>Listing: {item.listing_id}</Text>
                <Text style={styles.body}>{item.reason}</Text>
                <View style={styles.actionRow}>
                  <Button label="Mark reviewed" loading={updatingId === item.id} variant="outline" onPress={() => handleReportStatus(item.id, "reviewed")} style={styles.actionButton} />
                  <Button label="Dismiss" loading={updatingId === item.id} variant="outline" onPress={() => handleReportStatus(item.id, "dismissed")} style={styles.actionButton} />
                </View>
              </View>
            )}
          />
        </>
      )}
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTitle: { ...typography.title, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  statRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  highlightCard: {
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: 4,
  },
  highlightLabel: { ...typography.caption },
  highlightValue: { ...typography.title, color: colors.primary },
  widgetRow: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.md },
  widgetCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: 4, borderWidth: 1, borderColor: colors.border, ...cardShadow },
  widgetLabel: { ...typography.caption },
  widgetValue: { ...typography.subheading },
  chartCard: {
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...cardShadow,
  },
  chartTitle: { ...typography.subheading, marginBottom: spacing.md },
  chartAxisText: { color: colors.textMuted, fontSize: 11 },
  gaugeCard: {
    marginTop: spacing.md,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    ...cardShadow,
  },
  gaugeCenterText: { ...typography.subheading },
  sectionTitle: { ...typography.heading, paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  toggleRow: { flexDirection: "row", gap: spacing.sm, paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  toggleButton: { flex: 1 },
  empty: { ...typography.body, textAlign: "center", color: colors.textMuted, marginTop: 40 },
  error: { ...typography.body, textAlign: "center", color: colors.danger, margin: spacing.lg },
  list: { paddingBottom: TAB_BAR_SPACE, gap: spacing.md },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: spacing.md, gap: 4, borderWidth: 1, borderColor: colors.border, marginHorizontal: spacing.lg },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  title: { ...typography.subheading, flexShrink: 1 },
  subtitle: { ...typography.caption },
  body: { ...typography.body, marginTop: 4 },
  actionRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  actionButton: { flex: 1 },
});
