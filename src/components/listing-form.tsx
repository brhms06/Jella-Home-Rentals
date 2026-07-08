import { useState } from "react";
import { View, Text, TextInput, Pressable, Image, ScrollView, StyleSheet } from "react-native";
import type { Listing, ListingInput } from "@/lib/listings";

const AMENITY_OPTIONS = ["wifi", "parking", "laundry", "furnished", "pets_allowed"];

type Props = {
  initial?: Partial<Listing>;
  photos: string[];
  onPickPhoto: () => void;
  uploadingPhoto: boolean;
  onSubmit: (input: ListingInput) => void;
  submitting: boolean;
  submitLabel: string;
};

export function ListingForm({
  initial,
  photos,
  onPickPhoto,
  uploadingPhoto,
  onSubmit,
  submitting,
  submitLabel,
}: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [price, setPrice] = useState(initial?.price?.toString() ?? "");
  const [bedrooms, setBedrooms] = useState(initial?.bedrooms?.toString() ?? "");
  const [bathrooms, setBathrooms] = useState(initial?.bathrooms?.toString() ?? "");
  const [amenities, setAmenities] = useState<string[]>(initial?.amenities ?? []);

  function toggleAmenity(a: string) {
    setAmenities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  }

  function handleSubmit() {
    onSubmit({
      title,
      description,
      address,
      city,
      price: Number(price) || 0,
      bedrooms: bedrooms ? Number(bedrooms) : null,
      bathrooms: bathrooms ? Number(bathrooms) : null,
      amenities,
      photos,
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TextInput style={styles.input} placeholder="Title" value={title} onChangeText={setTitle} />
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="Description"
        value={description}
        onChangeText={setDescription}
        multiline
      />
      <TextInput style={styles.input} placeholder="Address" value={address} onChangeText={setAddress} />
      <TextInput style={styles.input} placeholder="City" value={city} onChangeText={setCity} />
      <TextInput
        style={styles.input}
        placeholder="Price per month"
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Bedrooms"
        value={bedrooms}
        onChangeText={setBedrooms}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Bathrooms"
        value={bathrooms}
        onChangeText={setBathrooms}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Amenities</Text>
      <View style={styles.amenityRow}>
        {AMENITY_OPTIONS.map((a) => (
          <Pressable
            key={a}
            style={[styles.chip, amenities.includes(a) && styles.chipSelected]}
            onPress={() => toggleAmenity(a)}
          >
            <Text style={amenities.includes(a) ? styles.chipTextSelected : styles.chipText}>{a}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Photos</Text>
      <View style={styles.photoRow}>
        {photos.map((url) => (
          <Image key={url} source={{ uri: url }} style={styles.photo} />
        ))}
      </View>
      <Pressable style={styles.secondaryButton} onPress={onPickPhoto} disabled={uploadingPhoto}>
        <Text style={styles.secondaryButtonText}>
          {uploadingPhoto ? "Uploading..." : "Add photo"}
        </Text>
      </Pressable>

      <Pressable style={styles.button} onPress={handleSubmit} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? "Saving..." : submitLabel}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 12, fontSize: 16 },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  label: { fontSize: 14, fontWeight: "600", marginTop: 8, color: "#555" },
  amenityRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1, borderColor: "#ccc", borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12 },
  chipSelected: { backgroundColor: "#208AEF", borderColor: "#208AEF" },
  chipText: { color: "#333" },
  chipTextSelected: { color: "#fff" },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photo: { width: 80, height: 80, borderRadius: 8 },
  secondaryButton: { borderWidth: 1, borderColor: "#208AEF", borderRadius: 8, padding: 12, alignItems: "center" },
  secondaryButtonText: { color: "#208AEF", fontWeight: "600" },
  button: { backgroundColor: "#208AEF", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
