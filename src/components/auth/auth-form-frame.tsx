import { useMemo } from "react";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { GoogleButton } from "./google-button";
import { AuthDivider } from "./auth-divider";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthFormFrame({ title, subtitle, children, footer }: Props) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.wrap}>
      <Ionicons name="sparkles" size={22} color={colors.primary} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <View style={styles.fields}>{children}</View>

      <AuthDivider label="or continue with" />

      <GoogleButton />

      {footer}
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  wrap: { gap: spacing.md },
  title: { ...typography.title, marginTop: spacing.sm },
  subtitle: { ...typography.body, color: colors.textMuted, marginBottom: spacing.sm },
  fields: { gap: spacing.md },
});
