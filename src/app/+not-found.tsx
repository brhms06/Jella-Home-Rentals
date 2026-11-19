import { router } from "expo-router";
import { View } from "react-native";
import { ErrorState } from "@/components/ui/error-state";
import { useTheme } from "@/lib/theme-context";

// Unknown link / deleted route. Home is the safe way out for both renters and landlords.
export default function NotFound() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: "center" }}>
      <ErrorState message="That page doesn't exist or the link is out of date." secondary={{ label: "Go to home", onPress: () => router.replace("/") }} />
    </View>
  );
}
