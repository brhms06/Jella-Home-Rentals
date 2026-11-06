import type { ReactNode } from "react";
import { View, KeyboardAvoidingView, Platform, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn } from "react-native-reanimated";
import Svg, { Circle, Rect, Path } from "react-native-svg";


// Warm dusk skyline drawn in code (no image asset). Bottom stays dark so white text/forms read cleanly.
function Skyline() {
  const ink = "rgba(23,23,23,0.88)";
  const glow = "#FF9B78";
  return (
    <Animated.View style={styles.art} entering={FadeIn.duration(500)}>
    <Svg style={StyleSheet.absoluteFill} viewBox="0 0 400 220" preserveAspectRatio="xMidYMax slice">
      <Circle cx="290" cy="70" r="46" fill="#FFD2C2" opacity={0.9} />
      <Circle cx="290" cy="70" r="74" fill="#FFD2C2" opacity={0.25} />
      <Path d="M0 220V150l40-34 40 34v70z" fill={ink} opacity={0.55} />
      <Path d="M300 220v-80l45-38 55 38v80z" fill={ink} opacity={0.55} />
      <Path d="M60 220v-96l60-52 60 52v96z" fill={ink} />
      <Rect x="100" y="150" width="18" height="22" rx="3" fill={glow} />
      <Rect x="126" y="150" width="18" height="22" rx="3" fill={glow} opacity={0.6} />
      <Rect x="108" y="188" width="24" height="32" rx="3" fill={glow} opacity={0.35} />
      <Path d="M190 220v-120h70v120z" fill={ink} />
      <Rect x="204" y="118" width="12" height="16" rx="2" fill={glow} opacity={0.7} />
      <Rect x="234" y="118" width="12" height="16" rx="2" fill={glow} />
      <Rect x="204" y="150" width="12" height="16" rx="2" fill={glow} opacity={0.5} />
      <Rect x="234" y="150" width="12" height="16" rx="2" fill={glow} opacity={0.8} />
    </Svg>
    </Animated.View>
  );
}

export function HeroBackground({ style, children }: { style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  return (
    <View style={[styles.container, style]}>
      <LinearGradient
        style={StyleSheet.absoluteFill}
        colors={["#FFB095", "#F25623", "#4D4D4D", "#171717"]}
        locations={[0, 0.4, 0.78, 1]}
      />
      <Skyline />
      {/* lifts the form above the iOS keyboard; the art stays put behind it */}
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {children}
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: "hidden" },
  art: { position: "absolute", left: 0, right: 0, top: "22%", height: "38%" },
});
