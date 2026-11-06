import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";

export function DividerOnPhoto({ label }: { label: string }) {
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

const makeStyles = ({  }: Theme) => StyleSheet.create({
  divider: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.xs },
  line: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.3)" },
  text: { fontSize: 13, color: "rgba(255,255,255,0.8)" },
});
