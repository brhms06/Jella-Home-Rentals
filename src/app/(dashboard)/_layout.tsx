import { Stack } from "expo-router";

export default function DashboardLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "My listings" }} />
      <Stack.Screen name="profile" options={{ title: "Profile" }} />
      <Stack.Screen name="listing/new" options={{ title: "New listing" }} />
      <Stack.Screen name="listing/[id]/index" options={{ title: "Listing" }} />
      <Stack.Screen name="listing/[id]/edit" options={{ title: "Edit listing" }} />
    </Stack>
  );
}
