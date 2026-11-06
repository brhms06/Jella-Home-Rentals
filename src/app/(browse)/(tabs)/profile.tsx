import { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Link } from "expo-router";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { MyRequests } from "@/components/my-requests";
import { SafeAreaView } from "react-native-safe-area-context";
import { radius, spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";

export default function Profile() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Profile</Text>
        <Link href="/(auth)/welcome" asChild>
          <Pressable style={styles.loginButton}>
            <Text style={styles.loginButtonText}>Landlord login</Text>
          </Pressable>
        </Link>

        <MyRequests />

        <Text style={styles.sectionLabel}>Appearance</Text>
        <ThemeToggle />
      </View>
    </SafeAreaView>
  );
}

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.lg, gap: spacing.lg },
  title: { ...typography.title },
  sectionLabel: { ...typography.subheading, marginTop: spacing.md },
  loginButton: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
  },
  loginButtonText: { fontSize: 16, fontWeight: "600", color: colors.primary },
});
