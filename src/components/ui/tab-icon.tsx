import { useEffect } from "react";
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withSpring } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

// Tab bar icon that hops when its tab becomes active.
export function TabIcon({ name, outline, focused, color, size }: { name: keyof typeof Ionicons.glyphMap; outline: keyof typeof Ionicons.glyphMap; focused: boolean; color: string; size: number }) {
  const y = useSharedValue(0);
  useEffect(() => {
    if (focused) y.value = withSequence(withSpring(-3, { duration: 120 }), withSpring(0, { duration: 220 }));
  }, [focused, y]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    <Animated.View style={anim}>
      <Ionicons name={focused ? name : outline} size={size} color={color} />
    </Animated.View>
  );
}
