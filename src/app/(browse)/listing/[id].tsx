import { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Linking,
  Alert,
} from "react-native";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { fetchListing, type Listing } from "@/lib/listings";
import { fetchProfile } from "@/lib/profile";

export default function BrowseListingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      fetchListing(id).then((data) => !cancelled && setListing(data));
      return () => {
        cancelled = true;
      };
    }, [id])
  );

  async function handleContact() {
    if (!listing) return;
    if (!name.trim()) {
      setContactError("Please enter your name.");
      return;
    }
    setContactError(null);
    setSending(true);
    try {
      const owner = await fetchProfile(listing.owner_id);
      if (!owner.whatsapp_number) {
        setContactError("Landlord hasn't added a contact number yet.");
        return;
      }
      const digits = owner.whatsapp_number.replace(/\D/g, "");
      const text = `Hi, I'm ${name} and I'm interested in "${listing.title}". ${message}`;
      const url = `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
      await Linking.openURL(url);
    } catch {
      setContactError("Couldn't open WhatsApp. Is it installed?");
    } finally {
      setSending(false);
    }
  }

  if (!listing) return null;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScrollView horizontal style={styles.photoRow}>
        {listing.photos.map((url) => (
          <Image key={url} source={{ uri: url }} style={styles.photo} />
        ))}
      </ScrollView>

      <Text style={styles.title}>{listing.title}</Text>
      <Text style={styles.price}>${listing.price}/mo</Text>
      <Text style={styles.subtitle}>
        {listing.address ? `${listing.address}, ` : ""}
        {listing.city}
      </Text>
      <Text style={styles.meta}>
        {listing.bedrooms ?? "—"} bed · {listing.bathrooms ?? "—"} bath
      </Text>
      {listing.amenities.length > 0 && (
        <Text style={styles.meta}>{listing.amenities.join(", ")}</Text>
      )}
      {listing.description && <Text style={styles.description}>{listing.description}</Text>}

      <Text style={styles.contactHeading}>Contact landlord</Text>
      <TextInput style={styles.input} placeholder="Your name" value={name} onChangeText={setName} />
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Hi, I'm interested in this listing..."
        value={message}
        onChangeText={setMessage}
        multiline
      />
      {contactError && <Text style={styles.error}>{contactError}</Text>}
      <Pressable style={styles.button} onPress={handleContact} disabled={sending}>
        <Text style={styles.buttonText}>{sending ? "Opening WhatsApp..." : "Contact via WhatsApp"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 8 },
  photoRow: { marginBottom: 12 },
  photo: { width: 200, height: 150, borderRadius: 10, marginRight: 8 },
  title: { fontSize: 24, fontWeight: "700" },
  price: { fontSize: 18, color: "#208AEF", fontWeight: "600" },
  subtitle: { color: "#666" },
  meta: { color: "#444" },
  description: { marginTop: 8, lineHeight: 20 },
  contactHeading: { fontSize: 18, fontWeight: "700", marginTop: 24 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16, marginTop: 8 },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  error: { color: "#d33", marginTop: 8 },
  button: { backgroundColor: "#25D366", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 12 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
