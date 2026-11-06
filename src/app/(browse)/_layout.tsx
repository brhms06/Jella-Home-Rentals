import { Stack } from "expo-router";
import { Platform, useWindowDimensions } from "react-native";

const DESKTOP_BREAKPOINT = 900;

export default function BrowseLayout() {
  const { width } = useWindowDimensions();
  const isDesktop = Platform.OS === "web" && width >= DESKTOP_BREAKPOINT;

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="listing/[id]" options={{ title: "Listing", headerShown: !isDesktop, headerBackButtonDisplayMode: "minimal" }} />
    </Stack>
  );
}
