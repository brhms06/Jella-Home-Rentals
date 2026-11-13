import { useMemo, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { BUEA, reverseGeocode, type LatLng } from "@/lib/maps";
import { radius, spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";
import { MapView, Marker, type MapRef } from "@/components/map/map";

type Props = {
  value: LatLng | null;
  onChange: (p: LatLng) => void;
  // called with the looked-up street/city so the form can fill empty fields
  onAddress: (a: { address: string | null; city: string | null }) => void;
};

// Landlord: pin the property. "Use my location" while standing at the house, then drag the pin to fine-tune.
export function LocationPicker({ value, onChange, onAddress }: Props) {
  const theme = useTheme();
  const { colors, dark } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const mapRef = useRef<MapRef | null>(null);
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);

  async function place(p: LatLng) {
    onChange(p);
    try {
      onAddress(await reverseGeocode(p));
    } catch {}
  }

  async function useMyLocation() {
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        setDenied(true);
        return;
      }
      setDenied(false);
      const here = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const p = { latitude: here.coords.latitude, longitude: here.coords.longitude };
      mapRef.current?.animateToRegion({ ...p, latitudeDelta: 0.004, longitudeDelta: 0.004 }, 500);
      await place(p);
    } catch {
      setDenied(true);
    } finally {
      setLocating(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={{ ...(value ?? BUEA), latitudeDelta: value ? 0.004 : 0.08, longitudeDelta: value ? 0.004 : 0.08 }}
          userInterfaceStyle={dark ? "dark" : "light"}
          onLongPress={(e: { nativeEvent: { coordinate: LatLng } }) => place(e.nativeEvent.coordinate)}
        >
          {value && (
            <Marker coordinate={value} draggable onDragEnd={(e: { nativeEvent: { coordinate: LatLng } }) => place(e.nativeEvent.coordinate)} pinColor={colors.primary} />
          )}
        </MapView>
      </View>
      <Pressable style={styles.button} onPress={useMyLocation} disabled={locating} accessibilityRole="button">
        {locating ? <ActivityIndicator color={colors.onPrimary} /> : <Ionicons name="locate" size={18} color={colors.onPrimary} />}
        <Text style={styles.buttonText}>{value ? "Re-pin to my current location" : "Use my current location"}</Text>
      </Pressable>
      <Text style={styles.hint}>
        {denied
          ? "Location permission is off. "
          : value
            ? "Drag the pin or long-press the map to adjust. "
            : "Stand at the property and tap the button, or long-press the map. "}
        Renters only see an approximate area until they pay to unlock.
      </Text>
      {denied && (
        <Pressable onPress={() => Linking.openSettings()}>
          <Text style={styles.link}>Open settings</Text>
        </Pressable>
      )}
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) => StyleSheet.create({
  wrap: { gap: spacing.sm },
  mapWrap: { height: 200, borderRadius: radius.lg, overflow: "hidden", backgroundColor: colors.surfaceMuted },
  button: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, paddingVertical: 12, borderRadius: radius.pill, backgroundColor: colors.primary },
  buttonText: { color: colors.onPrimary, fontWeight: "700", fontSize: 15 },
  hint: { ...typography.caption },
  link: { color: colors.primary, fontWeight: "600" },
});
