import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { lightColors, radius, spacing, cardShadow } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
  tint?: string;
};

export function StatCard({ icon, value, label, tint = lightColors.primary }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: tint + "22" }]}>
        <Ionicons name={icon} size={20} color={tint} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  card: {
    flexGrow: 1,
    flexBasis: 140,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
    ...cardShadow,
  },
  iconWrap: { width: 36, height: 36, borderRadius: radius.md, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  value: { ...typography.title, fontSize: 22 },
  label: { ...typography.caption },
});
