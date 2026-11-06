import { useEffect, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import Animated, { FadeIn, useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { HouseLogo } from "@/components/house-logo";

import { useTheme, type Theme } from "@/lib/theme-context";

// Shown while the app boots (session + onboarding flag). Logo springs in, wordmark fades up, a soft glow breathes.
export function AnimatedSplash() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const pop = useSharedValue(0.85);
  useEffect(() => {
    pop.value = withSpring(1, { damping: 16, stiffness: 140 });
  }, [pop]);
  const logo = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }], opacity: Math.min(1, pop.value) }));

  return (
    <Animated.View style={styles.wrap} entering={FadeIn.duration(200)}>
      <View style={styles.halo} />
      <Animated.View style={logo}>
        <HouseLogo size={96} />
      </Animated.View>
      <Animated.Text entering={FadeIn.delay(350).duration(500)} style={styles.word}>
        JELLA
      </Animated.Text>
    </Animated.View>
  );
}

const makeStyles = ({ colors }: Theme) => StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background, gap: 16 },
  halo: { position: "absolute", width: 170, height: 170, borderRadius: 85, backgroundColor: colors.primaryMuted },
  word: { fontSize: 22, fontWeight: "800", letterSpacing: 6, color: colors.text, marginTop: 120 },
});
