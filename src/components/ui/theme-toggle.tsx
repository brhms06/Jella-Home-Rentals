import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, withTiming, Easing } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useTheme, useThemeMode, type Mode } from "@/lib/theme-context";
import { radius, spacing } from "@/constants/theme";

const OPTIONS: { value: Mode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: "system", label: "Auto", icon: "phone-portrait-outline" },
  { value: "light", label: "Light", icon: "sunny-outline" },
  { value: "dark", label: "Dark", icon: "moon-outline" },
];

// Segmented control; the highlight glides between options (iOS-style 250ms ease, no bounce).
export function ThemeToggle() {
  const { colors } = useTheme();
  const { mode, setMode } = useThemeMode();
  const [width, setWidth] = useState(0);
  const index = OPTIONS.findIndex((o) => o.value === mode);
  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: withTiming((width / 3) * index, { duration: 250, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }) }] }), [width, index]);

  return (
    <View style={[styles.track, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width - 8)}>
      {width > 0 && <Animated.View style={[styles.thumb, { width: width / 3, backgroundColor: colors.primary }, slide]} />}
      {OPTIONS.map((o) => {
        const active = o.value === mode;
        return (
          <Pressable key={o.value} style={styles.option} onPress={() => setMode(o.value)} accessibilityLabel={`${o.label} theme`}>
            <Ionicons name={o.icon} size={16} color={active ? colors.onPrimary : colors.textMuted} />
            <Text style={[styles.label, { color: active ? colors.onPrimary : colors.textMuted }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: "row", borderRadius: radius.pill, borderWidth: 1, padding: 4 },
  thumb: { position: "absolute", top: 4, bottom: 4, left: 4, borderRadius: radius.pill },
  option: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, paddingVertical: 10 },
  label: { fontSize: 14, fontWeight: "600" },
});
