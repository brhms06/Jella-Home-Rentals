import { useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { lightColors, spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";

const gradientStyle =
  Platform.OS === "web"
    ? ({
        backgroundImage: [
          "radial-gradient(circle at 15% 12%, rgba(255,255,255,0.22), transparent 45%)",
          "radial-gradient(circle at 85% 8%, rgba(255,255,255,0.14), transparent 55%)",
          "radial-gradient(circle at 75% 90%, rgba(0,0,0,0.5), transparent 60%)",
          "linear-gradient(135deg, #F25623 0%, #4D4D4D 55%, #171717 100%)",
        ].join(", "),
      } as object)
    : { backgroundColor: lightColors.primaryDark };

export function GradientPanel() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={[styles.panel, gradientStyle]}>
      <Ionicons name="sparkles" size={26} color="#fff" />
      <Text style={styles.headline}>
        You can easily{"\n"}Get access your personal hub{"\n"}for clarity and productivity
      </Text>
    </View>
  );
}

const makeStyles = ({  }: Theme) => StyleSheet.create({
  panel: {
    flex: 1,
    justifyContent: "space-between",
    padding: spacing.xxl,
  },
  headline: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
    lineHeight: 30,
  },
});
