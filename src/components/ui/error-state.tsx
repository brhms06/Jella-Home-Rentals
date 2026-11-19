import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { radius, spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { Button } from "@/components/ui/button";

// "Couldn't load" screen with a retry (and an optional way out, for screens that hide the header).
export function ErrorState({
  message = "Couldn't load this. Check your connection and try again.",
  onRetry,
  secondary,
}: {
  message?: string;
  onRetry?: () => void;
  secondary?: { label: string; onPress: () => void };
}) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <Animated.View entering={FadeInDown.duration(350)} style={styles.wrap}>
      <View style={styles.circle}>
        <Ionicons name="cloud-offline-outline" size={32} color={colors.danger} />
      </View>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.text}>{message}</Text>
      {onRetry && <Button label="Try again" onPress={onRetry} style={styles.button} />}
      {secondary && <Button label={secondary.label} variant="text" onPress={secondary.onPress} />}
    </Animated.View>
  );
}

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  wrap: { alignItems: "center", gap: spacing.md, marginTop: 64, paddingHorizontal: spacing.xl },
  circle: { width: 72, height: 72, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted, alignItems: "center", justifyContent: "center" },
  title: { ...typography.heading },
  text: { ...typography.body, color: colors.textMuted, textAlign: "center" },
  button: { alignSelf: "stretch", marginTop: spacing.sm },
});
