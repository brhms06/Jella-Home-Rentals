import { View } from "react-native";
import { Tabs } from "expo-router";

import { useTheme } from "@/lib/theme-context";
import { useAuth } from "@/lib/auth-context";
import { useIsDesktop } from "@/hooks/use-desktop";
import { TabIcon } from "@/components/ui/tab-icon";
import { FloatingTabBar } from "@/components/ui/floating-tab-bar";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

export default function DashboardTabsLayout() {
  const theme = useTheme();
  const { colors } = theme;
  const { profile } = useAuth();
  const isAdmin = profile?.role === "superadmin";
  const isDesktop = useIsDesktop();

  const tabs = (
    <Tabs
      tabBar={(props) => (isDesktop ? null : <FloatingTabBar {...props} />)}
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        headerShown: !isDesktop,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home", tabBarIcon: ({ color, size, focused }) => <TabIcon name="home" outline="home-outline" focused={focused} color={color as string} size={size} /> }} />
      <Tabs.Screen name="requests" options={{ title: "Requests", tabBarIcon: ({ color, size, focused }) => <TabIcon name="calendar" outline="calendar-outline" focused={focused} color={color as string} size={size} /> }} />
      <Tabs.Screen name="admin" options={{ title: "Admin", href: isAdmin ? undefined : null, tabBarIcon: ({ color, size, focused }) => <TabIcon name="shield-checkmark" outline="shield-checkmark-outline" focused={focused} color={color as string} size={size} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", tabBarIcon: ({ color, size, focused }) => <TabIcon name="person" outline="person-outline" focused={focused} color={color as string} size={size} /> }} />
    </Tabs>
  );

  if (!isDesktop) return tabs;

  return (
    <View style={{ flex: 1, flexDirection: "row" }}>
      <DashboardSidebar />
      <View style={{ flex: 1 }}>{tabs}</View>
    </View>
  );
}
