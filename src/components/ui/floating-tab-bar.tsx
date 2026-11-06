import { View, Text, Pressable, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import type { ComponentProps } from "react";
import type { Tabs } from "expo-router";

// ponytail: expo-router doesn't re-export BottomTabBarProps, so derive it from <Tabs tabBar>
type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];
import { useTheme } from "@/lib/theme-context";

// Space for lists to reserve so content scrolls clear of the floating bar.
export const TAB_BAR_SPACE = 104;

// Floating pill tab bar: the active tab expands into an amber chip with its label.
// Colours follow the theme: espresso pill in light mode, raised surface pill in dark mode.
export function FloatingTabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const { dark, colors } = useTheme();

  // translucent tint over a blur = frosted glass; content shows through softly
  const pill = dark ? "rgba(44,44,44,0.62)" : "rgba(23,23,23,0.74)";
  const chip = colors.primary;
  const active = colors.onPrimary;
  const inactive = dark ? colors.textMuted : "rgba(222,222,222,0.62)";

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      <View style={styles.shadow}>
      <BlurView intensity={40} tint="dark" style={[styles.pill, { backgroundColor: pill }]}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          if ((options as { hidden?: boolean }).hidden) return null;
          const focused = state.index === index;
          const color = focused ? active : inactive;

          const onPress = () => {
            const event = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigateToTab(route.key);
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={options.title}
              hitSlop={6}
              style={styles.slot}
            >
              <View style={[styles.item, focused && { backgroundColor: chip }]}>
                {options.tabBarIcon?.({ focused, color, size: 22 })}
                {focused && (
                  <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(100)}>
                    <Text style={[styles.label, { color }]} numberOfLines={1} adjustsFontSizeToFit>
                      {options.title}
                    </Text>
                  </Animated.View>
                )}
              </View>
            </Pressable>
          );
        })}
      </BlurView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    padding: 4,
    overflow: "hidden",
  },
  shadow: {
    borderRadius: 999,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  // ponytail: equal-width slots so icons stay centred whichever tab is active; chip fills its slot
  slot: { flex: 1 },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    paddingHorizontal: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  label: { fontSize: 14, fontWeight: "600" },
});
