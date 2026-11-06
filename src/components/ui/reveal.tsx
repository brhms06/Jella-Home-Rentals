import type { ReactNode } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

// Fade + rise on mount; use `delay` (ms) to stagger siblings.
export function Reveal({ children, delay = 0, style }: { children: ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View entering={FadeIn.delay(delay).duration(300)} style={style}>
      {children}
    </Animated.View>
  );
}
