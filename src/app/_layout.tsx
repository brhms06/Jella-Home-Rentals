import { View, ActivityIndicator, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { AuthProvider, useAuth } from "@/lib/auth-context";

function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(dashboard)" />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="(browse)" />
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
});

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
