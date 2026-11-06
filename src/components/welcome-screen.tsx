import { useEffect, useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { radius, spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { HeroBackground } from "@/components/hero-background";
import { Reveal } from "@/components/ui/reveal";

export function WelcomeScreen({ onDone }: { onDone: () => void }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <HeroBackground>
      <SafeAreaView style={styles.safe}>
        <Text style={styles.wordmark}>JELLA</Text>

        <Reveal delay={150} style={styles.bottom}>
          <Text style={styles.headline}>PERFECT{"\n"}PLACE</Text>
          <Text style={styles.tagline}>
            Find long-term rentals near you and message landlords directly on WhatsApp.
          </Text>
          <Pressable style={styles.cta} onPress={onDone}>
            <Text style={styles.ctaText}>Get Started</Text>
            <View style={styles.ctaIcon}>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </View>
          </Pressable>
        </Reveal>
      </SafeAreaView>
    </HeroBackground>
  );
}

const makeStyles = ({ colors }: Theme) => StyleSheet.create({
  safe: { flex: 1, justifyContent: "space-between", padding: spacing.xl },
  wordmark: { fontSize: 18, fontWeight: "800", letterSpacing: 2, color: "#fff" },
  bottom: { gap: spacing.md },
  headline: { fontSize: 44, fontWeight: "800", lineHeight: 48, color: "#fff" },
  tagline: { fontSize: 15, lineHeight: 22, color: "rgba(255,255,255,0.8)" },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.primaryMuted,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingLeft: spacing.lg,
    marginTop: spacing.sm,
  },
  ctaText: { fontSize: 16, fontWeight: "700", color: colors.text },
  ctaIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
});
