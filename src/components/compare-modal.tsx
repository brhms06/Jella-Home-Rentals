import { useMemo } from "react";
import { View, Text, Modal, ScrollView, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import type { PublicListing } from "@/lib/listings";
import { radius, spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";

const label = (s: string | null) => (s ? s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) : "—");

// Side-by-side comparison of 2-3 listings. The best (lowest) price is highlighted.
export function CompareModal({ listings, onClose }: { listings: PublicListing[]; onClose: () => void }) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const cheapest = Math.min(...listings.map((l) => l.price));

  const rows: { name: string; render: (l: PublicListing) => string; best?: (l: PublicListing) => boolean }[] = [
    { name: "Price / month", render: (l) => `$${l.price}`, best: (l) => l.price === cheapest },
    { name: "City", render: (l) => l.city ?? "—" },
    { name: "Type", render: (l) => label(l.property_type) },
    { name: "Unit", render: (l) => label(l.unit_type) },
    { name: "Bedrooms", render: (l) => String(l.bedrooms ?? "—") },
    { name: "Bathrooms", render: (l) => String(l.bathrooms ?? "—") },
    { name: "Amenities", render: (l) => (l.amenities.length ? l.amenities.map(label).join(", ") : "—") },
  ];

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaProvider>
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Compare</Text>
          <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close">
            <Ionicons name="close" size={24} color={colors.text} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.row}>
            {listings.map((l) => (
              <View key={l.id} style={styles.col}>
                <Image source={{ uri: l.photos[0] }} style={styles.photo} contentFit="cover" />
                <Text style={styles.title} numberOfLines={2}>{l.title}</Text>
              </View>
            ))}
          </View>
          {rows.map((r) => (
            <View key={r.name} style={styles.block}>
              <Text style={styles.rowName}>{r.name}</Text>
              <View style={styles.row}>
                {listings.map((l) => (
                  <Text key={l.id} style={[styles.col, styles.value, r.best?.(l) && styles.best]}>
                    {r.render(l)}
                  </Text>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.lg },
  headerTitle: { ...typography.heading },
  body: { padding: spacing.lg, gap: spacing.lg },
  row: { flexDirection: "row", gap: spacing.md },
  col: { flex: 1 },
  photo: { width: "100%", aspectRatio: 1, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  title: { ...typography.subheading, marginTop: spacing.sm },
  block: { gap: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  rowName: { ...typography.caption, fontWeight: "600" },
  value: { ...typography.body },
  best: { color: colors.success, fontWeight: "700" },
});
