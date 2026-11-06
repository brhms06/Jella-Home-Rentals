import { useMemo } from "react";
import { Text, ActivityIndicator, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { radius, spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { PressableScale as Pressable } from "@/components/ui/pressable-scale";

type Variant = "primary" | "outline" | "text";

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  color?: string;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = "primary",
  color: colorProp,
  disabled,
  loading,
  loadingLabel,
  style,
}: Props) {
  const theme = useTheme();
  const { colors } = theme;
  const color = colorProp ?? colors.primary;
  const onFilled = color === colors.primary ? colors.onPrimary : "#fff";
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const isDisabled = disabled || loading;

  if (variant === "text") {
    return (
      <Pressable onPress={onPress} disabled={isDisabled} style={style}>
        <Text style={[styles.textLabel, { color }, isDisabled && styles.disabledText]}>
          {loading ? loadingLabel ?? label : label}
        </Text>
      </Pressable>
    );
  }

  const filled = variant === "primary";

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={[
        styles.base,
        filled ? { backgroundColor: color } : { borderWidth: 1, borderColor: color },
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={filled ? onFilled : color} />
      ) : (
        <Text style={[styles.label, { color: filled ? onFilled : color }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const makeStyles = ({  }: Theme) => StyleSheet.create({
  base: {
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.5 },
  label: { fontSize: 16, fontWeight: "600" },
  textLabel: { fontSize: 15, fontWeight: "600" },
  disabledText: { opacity: 0.5 },
});
