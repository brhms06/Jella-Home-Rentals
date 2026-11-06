import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";

export function AuthDivider({ label }: { label: string }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.divider}>
      <View style={styles.line} />
      <Text style={styles.text}>{label}</Text>
      <View style={styles.line} />
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  divider: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.sm },
  line: { flex: 1, height: 1, backgroundColor: colors.border },
  text: { ...typography.caption },
});
