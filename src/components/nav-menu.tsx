import { useState, useMemo } from "react";
import { View, Text, Pressable, Switch, Modal, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { radius, spacing, cardShadow } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";

export function NavMenu() {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { session, profile } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const isAdmin = !!session && profile?.role === "superadmin";
  const initial = profile?.full_name?.trim()?.[0]?.toUpperCase() ?? "?";

  return (
    <>
      <Pressable style={styles.menuCluster} onPress={() => setMenuOpen(true)} hitSlop={8}>
        {isAdmin && (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        )}
        <View style={styles.hamburger}>
          <Ionicons name="menu-outline" size={18} color={colors.text} />
        </View>
      </Pressable>

      <Modal transparent visible={menuOpen} animationType="none" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setMenuOpen(false)} />
        <View style={styles.menuPanel}>
          {isAdmin ? (
            <AdminMenu onNavigate={() => setMenuOpen(false)} />
          ) : (
            <PublicMenu onNavigate={() => setMenuOpen(false)} darkMode={darkMode} setDarkMode={setDarkMode} />
          )}
        </View>
      </Modal>
    </>
  );
}

function PublicMenu({ onNavigate, darkMode, setDarkMode }: { onNavigate: () => void; darkMode: boolean; setDarkMode: (v: boolean) => void }) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <>
      <Link href="/(browse)/(tabs)/favorites" asChild>
        <Pressable style={styles.menuRow} onPress={onNavigate}>
          <Ionicons name="heart-outline" size={18} color={colors.text} />
          <Text style={styles.menuRowText}>Favorites</Text>
        </Pressable>
      </Link>
      <Link href="/(auth)/login" asChild>
        <Pressable style={styles.menuRow} onPress={onNavigate}>
          <Ionicons name="log-in-outline" size={18} color={colors.text} />
          <Text style={styles.menuRowText}>Admin login</Text>
        </Pressable>
      </Link>
      {/* ponytail: UI-only, wire real dark theme when it exists */}
      <View style={styles.menuRow}>
        <Ionicons name={darkMode ? "moon-outline" : "sunny-outline"} size={18} color={colors.text} />
        <Text style={styles.menuRowText}>Dark mode</Text>
        <Switch value={darkMode} onValueChange={setDarkMode} style={styles.menuSwitch} />
      </View>
    </>
  );
}

function AdminMenu({ onNavigate }: { onNavigate: () => void }) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <>
      <Link href="/(dashboard)/(tabs)/profile" asChild>
        <Pressable style={styles.menuRow} onPress={onNavigate}>
          <Ionicons name="person-circle-outline" size={18} color={colors.text} />
          <Text style={styles.menuRowText}>Profile</Text>
        </Pressable>
      </Link>
      <Link href="/(dashboard)/(tabs)/admin" asChild>
        <Pressable style={styles.menuRow} onPress={onNavigate}>
          <Ionicons name="list-outline" size={18} color={colors.text} />
          <Text style={styles.menuRowText}>Listings</Text>
        </Pressable>
      </Link>
      <View style={styles.menuDivider} />
      <Pressable
        style={styles.menuRow}
        onPress={() => {
          onNavigate();
          supabase.auth.signOut();
        }}
      >
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={[styles.menuRowText, { color: colors.danger }]}>Logout</Text>
      </Pressable>
    </>
  );
}

const makeStyles = ({ colors }: Theme) => StyleSheet.create({
  menuCluster: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.primary, fontWeight: "700", fontSize: 14 },
  hamburger: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  menuPanel: {
    position: "absolute",
    top: 60,
    right: spacing.xl,
    width: 240,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    ...cardShadow,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  menuRowText: { fontSize: 14, fontWeight: "600", color: colors.text, flex: 1 },
  menuSwitch: { marginLeft: "auto" },
  menuDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
});
