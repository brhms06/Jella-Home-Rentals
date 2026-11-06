import { Stack } from "expo-router";
import { useIsDesktop } from "@/hooks/use-desktop";
import { AuthShell } from "@/components/auth/auth-shell";

import { useTheme } from "@/lib/theme-context";

export default function AuthLayout() {
  const theme = useTheme();
  const { colors } = theme;
  const isDesktop = useIsDesktop();
  const stack = (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
  );
  return isDesktop ? <AuthShell>{stack}</AuthShell> : stack;
}
