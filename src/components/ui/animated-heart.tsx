import { useEffect } from "react";
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withSpring } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

// Heart that pops when it becomes a favorite.
export function AnimatedHeart({ active, size, activeColor }: { active?: boolean; size: number; activeColor: string }) {
  const scale = useSharedValue(1);
  useEffect(() => {
    if (active) scale.value = withSequence(withSpring(1.2, { duration: 120 }), withSpring(1, { duration: 220 }));
  }, [active, scale]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={anim}>
      <Ionicons name={active ? "heart" : "heart-outline"} size={size} color={active ? activeColor : "#fff"} />
    </Animated.View>
  );
}
