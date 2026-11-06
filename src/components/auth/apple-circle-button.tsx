import { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { radius } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";

// ponytail: decorative only, no Apple auth wired up (no expo-apple-authentication / Supabase provider) — per user request, for visual parity with the reference design.
export function AppleCircleButton() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.circle}>
      <Ionicons name="logo-apple" size={22} color="#fff" />
    </View>
  );
}

const makeStyles = ({  }: Theme) => StyleSheet.create({
  circle: {
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
});
