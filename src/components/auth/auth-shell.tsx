import { useEffect, useState, type ReactNode, useMemo } from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { usePathname } from "expo-router";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { radius, spacing, cardShadow } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { GradientPanel } from "./gradient-panel";

const DURATION = 380;

export function AuthShell({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const pathname = usePathname();
  const isLogin = !pathname.includes("signup");

  const progress = useSharedValue(isLogin ? 0 : 1);
  const formOpacity = useSharedValue(1);
  const [panelWidth, setPanelWidth] = useState(0);

  useEffect(() => {
    progress.value = withTiming(isLogin ? 0 : 1, { duration: DURATION, easing: Easing.out(Easing.cubic) });
    formOpacity.value = withSequence(
      withTiming(0, { duration: DURATION / 2 }),
      withTiming(1, { duration: DURATION / 2 })
    );
  }, [isLogin]);

  function handleLayout(e: LayoutChangeEvent) {
    setPanelWidth(e.nativeEvent.layout.width / 2);
  }

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * panelWidth }],
  }));

  const formStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * -panelWidth }],
    opacity: formOpacity.value,
  }));

  return (
    <View style={styles.page}>
      <View style={styles.card} onLayout={handleLayout}>
        <Animated.View style={[styles.half, styles.left, panelStyle]}>
          <GradientPanel />
        </Animated.View>
        <Animated.View style={[styles.half, styles.right, formStyle]}>
          <View style={styles.formInner}>{children}</View>
        </Animated.View>
      </View>
    </View>
  );
}

const makeStyles = ({ colors }: Theme) => StyleSheet.create({
  page: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
    padding: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 1040,
    height: 640,
    position: "relative",
    borderRadius: radius.lg,
    overflow: "hidden",
    backgroundColor: colors.background,
    ...cardShadow,
  },
  half: { position: "absolute", top: 0, bottom: 0, width: "50%" },
  left: { left: 0 },
  right: { left: "50%" },
  formInner: { flex: 1, justifyContent: "center", padding: spacing.xxl },
});
