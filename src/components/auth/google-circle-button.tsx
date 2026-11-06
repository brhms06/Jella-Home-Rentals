import { useState, useMemo } from "react";
import { Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { signInWithGoogle } from "@/lib/oauth";
import { radius } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";

export function GoogleCircleButton() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [signingIn, setSigningIn] = useState(false);

  async function handlePress() {
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error("Google sign-in failed", err);
    } finally {
      setSigningIn(false);
    }
  }

  return (
    <Pressable style={styles.circle} onPress={handlePress} disabled={signingIn}>
      {signingIn ? <ActivityIndicator color="#fff" /> : <Ionicons name="logo-google" size={22} color="#fff" />}
    </Pressable>
  );
}

const makeStyles = ({  }: Theme) => StyleSheet.create({
  circle: {
    alignSelf: "center",
    width: 52,
    height: 52,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
});
