import { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, Redirect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useIsDesktop } from "@/hooks/use-desktop";
import { HeroBackground } from "@/components/hero-background";
import { DividerOnPhoto } from "@/components/auth/divider-on-photo";
import { SocialSignInRow } from "@/components/auth/social-sign-in-row";
import { radius, spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { Reveal } from "@/components/ui/reveal";

export default function AuthGateway() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const isDesktop = useIsDesktop();
  const router = useRouter();

  if (isDesktop) return <Redirect href="/(auth)/login" />;

  return (
    <HeroBackground>
      <SafeAreaView style={styles.safe}>
        <Pressable
          style={styles.backButton}
          hitSlop={8}
          accessibilityLabel="Back"
          onPress={() => (router.canGoBack() ? router.back() : router.replace("/(browse)/(tabs)/profile"))}
        >
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>

        <Reveal delay={150} style={styles.bottom}>
          <Text style={styles.headline}>Find Your{"\n"}Perfect Place</Text>

          <View style={styles.buttonRow}>
            <Link href="/(auth)/login" asChild>
              <Pressable style={styles.loginButton}>
                <Text style={styles.loginButtonText}>Login</Text>
              </Pressable>
            </Link>
            <Link href="/(auth)/signup" asChild>
              <Pressable style={styles.signupButton}>
                <Text style={styles.signupButtonText}>Sign Up</Text>
              </Pressable>
            </Link>
          </View>

          <DividerOnPhoto label="Other ways to sign in" />
          <SocialSignInRow />
        </Reveal>
      </SafeAreaView>
    </HeroBackground>
  );
}

const makeStyles = ({ colors }: Theme) => StyleSheet.create({
  safe: { flex: 1, justifyContent: "space-between", padding: spacing.xl },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  bottom: { gap: spacing.lg },
  headline: { fontSize: 34, fontWeight: "800", lineHeight: 40, color: "#fff" },
  buttonRow: { flexDirection: "row", gap: spacing.md },
  loginButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
  },
  loginButtonText: { fontSize: 16, fontWeight: "700", color: colors.text },
  signupButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.6)",
  },
  signupButtonText: { fontSize: 16, fontWeight: "700", color: "#fff" },
});
