import { forwardRef, useImperativeHandle, type ReactNode } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme-context";

// Web stand-in: react-native-maps is native-only. Shows a placeholder so screens still render in the browser.
export const MAPS_SUPPORTED = false;
export type MapRef = any;

export const MapView = forwardRef(function MapView({ style }: { style?: any; children?: ReactNode; [k: string]: any }, ref) {
  const { colors } = useTheme();
  useImperativeHandle(ref, () => ({ fitToCoordinates() {}, animateToRegion() {}, animateCamera() {} }));
  return (
    <View style={[{ alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceMuted, gap: 8 }, style]}>
      <Ionicons name="map-outline" size={32} color={colors.textMuted} />
      <Text style={{ color: colors.textMuted, textAlign: "center", paddingHorizontal: 24 }}>Maps are available in the mobile app.</Text>
    </View>
  );
});
export const Marker = (_: any) => null;
export const Polyline = (_: any) => null;
export const Circle = (_: any) => null;
