import { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Link, usePathname } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { radius, spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";

const LINKS = [
  { href: "/(dashboard)/(tabs)" as const, label: "Home", icon: "home-outline" as const },
  { href: "/(dashboard)/(tabs)/requests" as const, label: "Inbox", icon: "mail-outline" as const },
  { href: "/(dashboard)/(tabs)/admin" as const, label: "Admin", icon: "grid-outline" as const },
  { href: "/(dashboard)/(tabs)/profile" as const, label: "Profile", icon: "person-circle-outline" as const },
];

export function DashboardSidebar() {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const pathname = usePathname();

  return (
    <View style={styles.sidebar}>
      <Text style={styles.brand}>Jella</Text>
      {LINKS.map((l) => {
        const active = pathname === l.href || (l.label === "Home" && pathname === "/(dashboard)/(tabs)/index");
        return (
          <Link key={l.href} href={l.href} asChild>
            <Pressable style={StyleSheet.flatten([styles.row, active && styles.rowActive])}>
              <Ionicons name={l.icon} size={18} color={active ? colors.primary : colors.text} />
              <Text style={[styles.rowText, active && { color: colors.primary }]}>{l.label}</Text>
            </Pressable>
          </Link>
        );
      })}
      <View style={{ flex: 1 }} />
      <Pressable style={styles.row} onPress={() => supabase.auth.signOut()}>
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={[styles.rowText, { color: colors.danger }]}>Logout</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = ({ colors }: Theme) => StyleSheet.create({
  sidebar: {
    width: 220,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  brand: { fontSize: 20, fontWeight: "700", color: colors.primary, marginBottom: spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  rowActive: { backgroundColor: colors.primaryMuted },
  rowText: { fontSize: 15, fontWeight: "600", color: colors.text },
});
