import { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { AppleCircleButton } from "@/components/auth/apple-circle-button";
import { GoogleCircleButton } from "@/components/auth/google-circle-button";

export function SocialSignInRow() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.row}>
      <AppleCircleButton />
      <GoogleCircleButton />
    </View>
  );
}

const makeStyles = ({  }: Theme) => StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "center", gap: spacing.md },
});
