import type { ComponentProps } from "react";
import { Pressable } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Drop-in Pressable that shrinks slightly while held.
export function PressableScale({ style, onPressIn, onPressOut, ...rest }: ComponentProps<typeof Pressable>) {
  const scale = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      style={[style as object, anim]}
      onPressIn={(e) => {
        scale.value = withSpring(0.98, { duration: 150 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { duration: 200 });
        onPressOut?.(e);
      }}
    />
  );
}
