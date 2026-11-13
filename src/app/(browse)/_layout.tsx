import { Stack } from "expo-router";

export default function BrowseLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="discover" options={{ headerShown: false }} />
      <Stack.Screen name="listing/[id]" options={{ title: "Listing", headerShown: false }} />
    </Stack>
  );
}
