import { useEffect, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { radius, spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";

export function EmptyState({ icon = "home-outline", message }: { icon?: keyof typeof Ionicons.glyphMap; message: string }) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.wrap}>
      <Animated.View style={styles.circle}>
        <Ionicons name={icon} size={30} color={colors.primary} />
      </Animated.View>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  wrap: { alignItems: "center", gap: spacing.md, marginTop: 48, paddingHorizontal: spacing.xl },
  circle: { width: 72, height: 72, borderRadius: radius.pill, backgroundColor: colors.primaryMuted, alignItems: "center", justifyContent: "center" },
  text: { ...typography.body, color: colors.textMuted, textAlign: "center" },
});
