import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { radius, spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";

export const NEARBY_OPTIONS: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "school", label: "School", icon: "school-outline" },
  { key: "market", label: "Market", icon: "cart-outline" },
  { key: "hospital", label: "Hospital", icon: "medkit-outline" },
  { key: "pharmacy", label: "Pharmacy", icon: "bandage-outline" },
  { key: "transport", label: "Transport", icon: "bus-outline" },
  { key: "restaurants", label: "Restaurants", icon: "restaurant-outline" },
  { key: "bank", label: "Bank", icon: "card-outline" },
  { key: "worship", label: "Place of worship", icon: "business-outline" },
];

// "Neighbourhood" block on the listing page. Renders nothing when the landlord added no info.
export function Neighbourhood({ nearby, note }: { nearby: string[]; note: string | null }) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const items = NEARBY_OPTIONS.filter((o) => nearby.includes(o.key));
  if (items.length === 0 && !note) return null;
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Neighbourhood</Text>
      {items.length > 0 && (
        <View style={styles.chips}>
          {items.map((o) => (
            <View key={o.key} style={styles.chip}>
              <Ionicons name={o.icon} size={16} color={colors.text} />
              <Text style={styles.chipText}>{o.label}</Text>
            </View>
          ))}
        </View>
      )}
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  wrap: { gap: spacing.sm, marginTop: spacing.sm },
  heading: { ...typography.heading },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingVertical: 8, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted },
  chipText: { fontSize: 14, color: colors.text },
  note: { ...typography.body, lineHeight: 22 },
});
