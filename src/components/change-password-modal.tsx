import { useState, useMemo } from "react";
import { View, Text, Pressable, Modal, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { changePassword } from "@/lib/profile";
import { spacing, radius, cardShadow } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Props = { visible: boolean; onClose: () => void; email: string };

const RULES = [
  { key: "upper", label: "At least 1 uppercase", test: (v: string) => /[A-Z]/.test(v) },
  { key: "number", label: "At least 1 number", test: (v: string) => /[0-9]/.test(v) },
  { key: "length", label: "At least 8 characters", test: (v: string) => v.length >= 8 },
] as const;

function PasswordField({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
}) {
  const theme = useTheme();
  const { colors } = theme;
  const [visible, setVisible] = useState(false);
  return (
    <Input
      label={label}
      secureTextEntry={!visible}
      value={value}
      onChangeText={onChangeText}
      rightSlot={
        <Pressable onPress={() => setVisible((s) => !s)} hitSlop={8}>
          <Ionicons name={visible ? "eye-off-outline" : "eye-outline"} size={18} color={colors.textMuted} />
        </Pressable>
      }
    />
  );
}

export function ChangePasswordModal({ visible, onClose, email }: Props) {
  const theme = useTheme();
  const { colors, typography } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const metRules = RULES.filter((r) => r.test(newPassword));
  const score = metRules.length;
  const canSubmit = currentPassword.length > 0 && score === RULES.length && newPassword === confirmPassword && confirmPassword.length > 0;

  function reset() {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleApply() {
    setError(null);
    setSubmitting(true);
    try {
      await changePassword(email, currentPassword, newPassword);
      handleClose();
    } catch (err) {
      setError((err as Error)?.message ?? "Couldn't change password.");
    } finally {
      setSubmitting(false);
    }
  }

  const strengthLabel = score === 0 ? "" : score === RULES.length ? "Strong password." : score >= 2 ? "Medium password." : "Weak password.";

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={handleClose}>
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <View style={styles.iconBadge}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={typography.subheading}>Change Password</Text>
              <Text style={styles.caption}>Update password for enhanced account security.</Text>
            </View>
          </View>
          <View style={styles.divider} />

          <PasswordField label="Current Password" value={currentPassword} onChangeText={setCurrentPassword} />
          <PasswordField label="New Password" value={newPassword} onChangeText={setNewPassword} />
          <PasswordField label="Confirm New Password" value={confirmPassword} onChangeText={setConfirmPassword} />

          <View style={styles.strengthRow}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[
                  styles.strengthSegment,
                  i < score && { backgroundColor: score === RULES.length ? colors.success : score >= 2 ? colors.primary : colors.danger },
                ]}
              />
            ))}
          </View>
          {!!strengthLabel && <Text style={styles.strengthLabel}>{strengthLabel} Must contain;</Text>}

          {RULES.map((rule) => {
            const met = rule.test(newPassword);
            return (
              <View key={rule.key} style={styles.ruleRow}>
                <Ionicons
                  name={met ? "checkmark-circle" : "close-circle"}
                  size={16}
                  color={met ? colors.success : colors.textMuted}
                />
                <Text style={styles.ruleLabel}>{rule.label}</Text>
              </View>
            );
          })}

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.footer}>
            <Button label="Discard" variant="outline" onPress={handleClose} style={styles.footerButton} />
            <Button
              label="Apply Changes"
              disabled={!canSubmit}
              loading={submitting}
              loadingLabel="Applying..."
              onPress={handleApply}
              style={styles.footerButton}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#00000066", alignItems: "center", justifyContent: "center", padding: spacing.lg },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    gap: spacing.md,
    ...cardShadow,
  },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primaryMuted,
    alignItems: "center",
    justifyContent: "center",
  },
  caption: { ...typography.caption, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border },
  strengthRow: { flexDirection: "row", gap: spacing.xs },
  strengthSegment: { flex: 1, height: 4, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted },
  strengthLabel: { ...typography.caption },
  ruleRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  ruleLabel: { ...typography.caption },
  error: { color: colors.danger },
  footer: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  footerButton: { flex: 1 },
});
