import { Platform, useWindowDimensions } from "react-native";
import { Tabs } from "expo-router";
import { TabIcon } from "@/components/ui/tab-icon";
import { FloatingTabBar } from "@/components/ui/floating-tab-bar";

import { useTheme } from "@/lib/theme-context";
import { useUnseenDropCount } from "@/lib/price-drops";
import { useRenterUnread } from "@/lib/chat";

const DESKTOP_BREAKPOINT = 900;

export default function BrowseTabsLayout() {
  const theme = useTheme();
  const { colors } = theme;
  const { width } = useWindowDimensions();
  const drops = useUnseenDropCount();
  const unread = useRenterUnread();
  const isDesktop = Platform.OS === "web" && width >= DESKTOP_BREAKPOINT;

  return (
    <Tabs
      tabBar={(props) => (isDesktop ? null : <FloatingTabBar {...props} />)}
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        headerShown: !isDesktop,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Explore",
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="grid" outline="grid-outline" focused={focused} color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: "Wishlists",
          tabBarBadge: drops > 0 ? drops : undefined,
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="bookmarks" outline="bookmarks-outline" focused={focused} color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="chatbubbles" outline="chatbubbles-outline" focused={focused} color={color as string} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="person" outline="person-outline" focused={focused} color={color as string} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
