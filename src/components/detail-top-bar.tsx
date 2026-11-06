import { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { radius, spacing, cardShadow } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { NavMenu } from "@/components/nav-menu";

export function DetailTopBar() {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.nav}>
      <Link href="/(browse)/(tabs)" asChild>
        <Pressable>
          <Text style={styles.logo}>jella</Text>
        </Pressable>
      </Link>

      <Link href="/(browse)/(tabs)" asChild>
        <Pressable style={styles.searchPill}>
          <Ionicons name="search" size={14} color={colors.text} />
          <Text style={styles.searchPillText}>Search homes</Text>
        </Pressable>
      </Link>

      <NavMenu />
    </View>
  );
}

const makeStyles = ({ colors }: Theme) => StyleSheet.create({
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 64,
    paddingHorizontal: spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logo: { fontSize: 22, fontWeight: "700", color: colors.primary, letterSpacing: -0.5 },
  searchPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    ...cardShadow,
  },
  searchPillText: { fontSize: 13, fontWeight: "600", color: colors.text },
});
