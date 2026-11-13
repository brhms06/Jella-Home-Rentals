import { useState, useMemo } from "react";
import { View, Text, Pressable, Image, ScrollView, StyleSheet } from "react-native";
import { NEARBY_OPTIONS } from "@/components/neighbourhood";
import type { Listing, ListingInput, PropertyType, UnitType } from "@/lib/listings";
import { radius, spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const AMENITY_OPTIONS = ["wifi", "parking", "laundry", "furnished", "pets_allowed"];

const PROPERTY_TYPE_OPTIONS: { value: PropertyType; label: string }[] = [
  { value: "home", label: "Home" },
  { value: "guest_house", label: "Guest House" },
  { value: "hotel", label: "Hotel" },
];

const UNIT_TYPE_OPTIONS: { value: UnitType; label: string }[] = [
  { value: "single_room", label: "Single room" },
  { value: "studio", label: "Studio" },
  { value: "apartment", label: "Apartment" },
];

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
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [price, setPrice] = useState(initial?.price?.toString() ?? "");
  const [bedrooms, setBedrooms] = useState(initial?.bedrooms?.toString() ?? "");
  const [bathrooms, setBathrooms] = useState(initial?.bathrooms?.toString() ?? "");
  const [amenities, setAmenities] = useState<string[]>(initial?.amenities ?? []);
  const [propertyType, setPropertyType] = useState<PropertyType>(initial?.property_type ?? "home");
  const [unitType, setUnitType] = useState<UnitType | null>(initial?.unit_type ?? null);
  const [nearby, setNearby] = useState<string[]>(initial?.nearby ?? []);
  const [note, setNote] = useState(initial?.neighbourhood_note ?? "");

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
      property_type: propertyType,
      unit_type: propertyType === "home" ? unitType : null,
      nearby,
      neighbourhood_note: note.trim() || null,
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Input placeholder="Title" value={title} onChangeText={setTitle} />
      <Input placeholder="Description" value={description} onChangeText={setDescription} multiline />
      <Input placeholder="Address" value={address} onChangeText={setAddress} />
      <Input placeholder="City" value={city} onChangeText={setCity} />
      <Input placeholder="Price per month" value={price} onChangeText={setPrice} keyboardType="numeric" />
      <Input placeholder="Bedrooms" value={bedrooms} onChangeText={setBedrooms} keyboardType="numeric" />
      <Input placeholder="Bathrooms" value={bathrooms} onChangeText={setBathrooms} keyboardType="numeric" />

      <Text style={styles.label}>Property type</Text>
      <View style={styles.amenityRow}>
        {PROPERTY_TYPE_OPTIONS.map((option) => (
          <Pressable
            key={option.value}
            style={[styles.chip, propertyType === option.value && styles.chipSelected]}
            onPress={() => {
              setPropertyType(option.value);
              if (option.value !== "home") setUnitType(null);
            }}
          >
            <Text style={propertyType === option.value ? styles.chipTextSelected : styles.chipText}>{option.label}</Text>
          </Pressable>
        ))}
      </View>

      {propertyType === "home" && (
        <>
          <Text style={styles.label}>Property</Text>
          <View style={styles.amenityRow}>
            {UNIT_TYPE_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                style={[styles.chip, unitType === option.value && styles.chipSelected]}
                onPress={() => setUnitType(unitType === option.value ? null : option.value)}
              >
                <Text style={unitType === option.value ? styles.chipTextSelected : styles.chipText}>{option.label}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

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

      <Text style={styles.label}>Nearby</Text>
      <View style={styles.amenityRow}>
        {NEARBY_OPTIONS.map((o) => (
          <Pressable
            key={o.key}
            style={[styles.chip, nearby.includes(o.key) && styles.chipSelected]}
            onPress={() => setNearby((prev) => (prev.includes(o.key) ? prev.filter((x) => x !== o.key) : [...prev, o.key]))}
          >
            <Text style={nearby.includes(o.key) ? styles.chipTextSelected : styles.chipText}>{o.label}</Text>
          </Pressable>
        ))}
      </View>
      <Input placeholder="Neighbourhood note (optional), e.g. 5 min walk to the market" value={note} onChangeText={setNote} maxLength={200} multiline />

      <Text style={styles.label}>Photos</Text>
      <View style={styles.photoRow}>
        {photos.map((url) => (
          <Image key={url} source={{ uri: url }} style={styles.photo} />
        ))}
      </View>
      <Button
        label="Add photo"
        loading={uploadingPhoto}
        loadingLabel="Uploading..."
        variant="outline"
        onPress={onPickPhoto}
      />

      <Button label={submitLabel} loading={submitting} loadingLabel="Saving..." onPress={handleSubmit} style={styles.submitButton} />
    </ScrollView>
  );
}

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  container: { padding: spacing.xl, gap: spacing.md },
  label: { ...typography.caption, fontWeight: "600", marginTop: spacing.xs },
  amenityRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingVertical: 6, paddingHorizontal: spacing.md },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text },
  chipTextSelected: { color: colors.onPrimary },
  photoRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  photo: { width: 80, height: 80, borderRadius: radius.md },
  submitButton: { marginTop: spacing.sm },
});
