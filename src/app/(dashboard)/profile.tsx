import { useCallback, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { fetchProfile, updateProfile } from "@/lib/profile";

export default function Profile() {
  const { session } = useAuth();
  const [fullName, setFullName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!session) return;
      let cancelled = false;
      fetchProfile(session.user.id).then((data) => {
        if (cancelled) return;
        setFullName(data.full_name ?? "");
        setWhatsappNumber(data.whatsapp_number ?? "");
      });
      return () => {
        cancelled = true;
      };
    }, [session])
  );

  async function handleSave() {
    if (!session) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateProfile(session.user.id, { full_name: fullName, whatsapp_number: whatsappNumber });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Full name</Text>
      <TextInput style={styles.input} value={fullName} onChangeText={setFullName} />

      <Text style={styles.label}>WhatsApp number</Text>
      <TextInput
        style={styles.input}
        placeholder="+2348012345678"
        value={whatsappNumber}
        onChangeText={setWhatsappNumber}
        keyboardType="phone-pad"
      />
      <Text style={styles.hint}>Renters will use this to contact you about your listings.</Text>

      {saved && <Text style={styles.saved}>Saved.</Text>}

      <Pressable style={styles.button} onPress={handleSave} disabled={saving}>
        <Text style={styles.buttonText}>{saving ? "Saving..." : "Save"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 8 },
  label: { fontSize: 14, fontWeight: "600", color: "#555", marginTop: 12 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16 },
  hint: { color: "#888", fontSize: 12 },
  saved: { color: "#2a2", marginTop: 8 },
  button: { backgroundColor: "#208AEF", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 16 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
