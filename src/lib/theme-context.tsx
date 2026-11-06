import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { StyleSheet, Appearance, AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { lightColors, darkColors, makeTypography, type Colors } from "@/constants/theme";

export type Mode = "system" | "light" | "dark";
export type Theme = { dark: boolean; colors: Colors; typography: ReturnType<typeof makeTypography> };

const KEY = "jella_theme_mode";
const build = (dark: boolean): Theme => {
  const colors = dark ? darkColors : lightColors;
  return { dark, colors, typography: makeTypography(colors) };
};
const light = build(false);
const dark = build(true);

const Ctx = createContext<{ theme: Theme; mode: Mode; setMode: (m: Mode) => void }>({ theme: light, mode: "system", setMode: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  // ponytail: read the OS scheme ourselves — useColorScheme() can go stale on iOS after the phone setting
  // changes while the app is backgrounded, so also re-read it whenever the app returns to the foreground.
  const [system, setSystem] = useState(Appearance.getColorScheme());
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => setSystem(colorScheme));
    const app = AppState.addEventListener("change", (s) => s === "active" && setSystem(Appearance.getColorScheme()));
    return () => {
      sub.remove();
      app.remove();
    };
  }, []);
  const [mode, setModeState] = useState<Mode>("system");
  const [veil, setVeil] = useState(lightColors.background);
  const fade = useSharedValue(0);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((v) => {
      if (v === "light" || v === "dark") setModeState(v);
    });
  }, []);

  const isDark = mode === "system" ? system === "dark" : mode === "dark";
  const theme = isDark ? dark : light;

  function setMode(next: Mode) {
    const nextDark = next === "system" ? system === "dark" : next === "dark";
    if (nextDark !== isDark) {
      // old background covers the swap, then fades away to reveal the new theme
      setVeil(theme.colors.background);
      fade.value = 1;
      fade.value = withTiming(0, { duration: 300 });
    }
    setModeState(next);
    AsyncStorage.setItem(KEY, next).catch(() => {});
  }

  const value = useMemo(() => ({ theme, mode, setMode }), [theme, mode, system]); // eslint-disable-line react-hooks/exhaustive-deps
  const veilStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  return (
    <Ctx.Provider value={value}>
      {children}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: veil }, veilStyle]} />
    </Ctx.Provider>
  );
}

export const useTheme = () => useContext(Ctx).theme;
export const useThemeMode = () => {
  const { mode, setMode } = useContext(Ctx);
  return { mode, setMode };
};
