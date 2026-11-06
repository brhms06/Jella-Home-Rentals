import { useMemo } from "react";
import type { ReactNode } from "react";
import { View, Text, TextInput, StyleSheet, type TextInputProps } from "react-native";
import { radius, spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";

type Props = TextInputProps & { label?: string; rightSlot?: ReactNode };

export function Input({ label, rightSlot, style, ...props }: Props) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.wrap}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.row}>
        <TextInput
          style={[styles.input, !!rightSlot && styles.inputWithSlot, props.multiline && styles.multiline, style]}
          placeholderTextColor={colors.textMuted}
          {...props}
        />
        {rightSlot && <View style={styles.slot}>{rightSlot}</View>}
      </View>
    </View>
  );
}

const makeStyles = ({ colors }: Theme) => StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  row: { justifyContent: "center" },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputWithSlot: { paddingRight: spacing.xl + spacing.sm },
  slot: { position: "absolute", right: spacing.md },
  multiline: { minHeight: 90, textAlignVertical: "top" },
});
