import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack, ThemeProvider as NavThemeProvider, DefaultTheme } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useTheme } from "@/lib/theme-context";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { WelcomeScreen } from "@/components/welcome-screen";
import { AnimatedSplash } from "@/components/animated-splash";

// ponytail: always land on the public browse tabs, never a deep auth screen
export const unstable_settings = { initialRouteName: "(browse)" };

const ONBOARDED_KEY = "jella_has_onboarded";

function RootNavigator() {
  const { session, profile, loading } = useAuth();
  const { dark, colors } = useTheme();
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDED_KEY).then((v) => setHasOnboarded(v === "1"));
    // ponytail: hold the splash ~0.8s so the intro animation is actually seen
    const t = setTimeout(() => setMinElapsed(true), 800);
    return () => clearTimeout(t);
  }, []);

  if (!minElapsed || hasOnboarded === null || loading || (session && !profile)) return <AnimatedSplash />;

  if (!hasOnboarded) {
    return (
      <WelcomeScreen
        onDone={() => {
          AsyncStorage.setItem(ONBOARDED_KEY, "1");
          setHasOnboarded(true);
        }}
      />
    );
  }

  const navTheme = {
    ...DefaultTheme,
    dark,
    colors: { ...DefaultTheme.colors, primary: colors.primary, background: colors.background, card: colors.surface, text: colors.text, border: colors.border },
  };

  return (
    <NavThemeProvider value={navTheme}>
    <StatusBar style={dark ? "light" : "dark"} />
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session && (profile?.role === "landlord" || profile?.role === "superadmin")}>
        <Stack.Screen name="(dashboard)" />
      </Stack.Protected>
      <Stack.Protected guard={!session || profile?.role === "superadmin"}>
        <Stack.Screen name="(browse)" />
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}
