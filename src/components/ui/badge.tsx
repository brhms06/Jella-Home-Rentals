import { useMemo } from "react";
import { Text, StyleSheet } from "react-native";
import { radius } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";

type Tone = "success" | "muted";

export function Badge({ label, tone }: { label: string; tone: Tone }) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const isSuccess = tone === "success";
  return (
    <Text
      style={[
        styles.base,
        { backgroundColor: isSuccess ? colors.successBg : colors.surfaceMuted, color: isSuccess ? colors.success : colors.textMuted },
      ]}
    >
      {label}
    </Text>
  );
}

const makeStyles = ({  }: Theme) => StyleSheet.create({
  base: {
    fontSize: 12,
    fontWeight: "700",
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
});
