import { Stack } from "expo-router";

export default function BrowseLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Homes for rent" }} />
      <Stack.Screen name="listing/[id]" options={{ title: "Listing" }} />
    </Stack>
  );
}
