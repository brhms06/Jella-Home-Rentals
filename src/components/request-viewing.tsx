import { useMemo, useState } from "react";
import { View, Text, Modal, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { createViewingRequest, nextDays, SLOT_LABEL, type Slot } from "@/lib/viewing-requests";
import { radius, spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function Chip({ label, selected, onPress, styles }: { label: string; selected: boolean; onPress: () => void; styles: ReturnType<typeof makeStyles> }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipOn]}>
      <Text style={[styles.chipText, selected && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

// "Request a viewing" button + sheet. Sends a day + time slot to the landlord (no phone number shared).
export function RequestViewing({ listingId, deviceId }: { listingId: string; deviceId: string }) {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const days = useMemo(() => nextDays(7), []);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState(days[1].iso);
  const [slot, setSlot] = useState<Slot>("morning");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function send() {
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    setError(null);
    setSending(true);
    try {
      await createViewingRequest({ listingId, deviceId, name, date, slot, note });
      setSent(true);
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? "";
      setError(msg.includes("too many") ? "You already have 3 pending requests for this listing." : "Couldn't send your request. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function close() {
    setOpen(false);
    setSent(false);
    setError(null);
  }

  return (
    <>
      <Button label="Request a viewing" variant="outline" onPress={() => setOpen(true)} />
      <Modal visible={open} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
        <SafeAreaProvider>
        <SafeAreaView style={styles.safe}>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={styles.header}>
              <Text style={styles.title}>Request a viewing</Text>
              <Pressable onPress={close} hitSlop={8} accessibilityLabel="Close">
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
            {sent ? (
              <View style={styles.done}>
                <Ionicons name="checkmark-circle" size={56} color={colors.success} />
                <Text style={styles.doneTitle}>Request sent</Text>
                <Text style={styles.hint}>The landlord will accept or decline. Check your Profile tab for the answer.</Text>
                <Button label="Done" onPress={close} style={{ alignSelf: "stretch" }} />
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
                <Input label="Your name" value={name} onChangeText={setName} />
                <Text style={styles.label}>Day</Text>
                <View style={styles.chips}>
                  {days.map((d) => (
                    <Chip key={d.iso} label={d.label} selected={date === d.iso} onPress={() => setDate(d.iso)} styles={styles} />
                  ))}
                </View>
                <Text style={styles.label}>Time</Text>
                <View style={styles.chips}>
                  {(Object.keys(SLOT_LABEL) as Slot[]).map((s) => (
                    <Chip key={s} label={SLOT_LABEL[s]} selected={slot === s} onPress={() => setSlot(s)} styles={styles} />
                  ))}
                </View>
                <Input label="Note (optional)" value={note} onChangeText={setNote} multiline placeholder="Anything the landlord should know" />
                {error && <Text style={styles.error}>{error}</Text>}
                <Button label="Send request" loading={sending} loadingLabel="Sending..." onPress={send} />
              </ScrollView>
            )}
          </KeyboardAvoidingView>
        </SafeAreaView>
        </SafeAreaProvider>
      </Modal>
    </>
  );
}

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing.lg },
  title: { ...typography.heading },
  body: { padding: spacing.lg, gap: spacing.md },
  label: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingVertical: 8, paddingHorizontal: spacing.md, backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text, fontWeight: "500" },
  chipTextOn: { color: colors.onPrimary, fontWeight: "700" },
  error: { color: colors.danger },
  done: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xl },
  doneTitle: { ...typography.title },
  hint: { ...typography.caption, textAlign: "center" },
});
