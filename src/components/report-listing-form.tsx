import { useState, useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { createReport } from "@/lib/reports";
import { spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ReportListingForm({ listingId, deviceId }: { listingId: string; deviceId: string }) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [reason, setReason] = useState("");
  const [contact, setContact] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [open, setOpen] = useState(false);

  async function handleSubmit() {
    if (!reason.trim()) {
      setError("Please describe the issue.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await createReport(deviceId, listingId, reason.trim(), contact.trim() || undefined);
      setSubmitted(true);
    } catch {
      setError("Couldn't submit report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <View style={styles.section}>
        <Text style={styles.confirmed}>Thanks — we&apos;ll take a look.</Text>
      </View>
    );
  }

  if (!open) {
    return (
      <Pressable style={styles.toggle} onPress={() => setOpen(true)}>
        <Ionicons name="flag-outline" size={16} color={colors.textMuted} />
        <Text style={styles.toggleText}>Report this listing</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Report this listing</Text>
      <Input placeholder="What's wrong with this listing?" value={reason} onChangeText={setReason} multiline />
      <Input placeholder="Your phone number (optional)" value={contact} onChangeText={setContact} keyboardType="phone-pad" style={styles.inputSpacing} />
      {error && <Text style={styles.error}>{error}</Text>}
      <Button label="Report listing" loading={submitting} loadingLabel="Sending..." variant="text" color={colors.danger} onPress={handleSubmit} style={styles.button} />
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  section: { marginTop: spacing.xl, gap: spacing.sm },
  toggle: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, paddingVertical: spacing.md },
  toggleText: { fontSize: 14, color: colors.textMuted, fontWeight: "500" },
  heading: { ...typography.heading },
  inputSpacing: { marginTop: spacing.sm },
  button: { marginTop: spacing.xs },
  error: { color: colors.danger },
  confirmed: { ...typography.body, color: colors.textMuted },
});
