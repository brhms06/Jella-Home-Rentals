import { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";

import { useTheme, type Theme } from "@/lib/theme-context";

type Props = { uri?: string | null; name?: string | null; size?: number };

export function Avatar({ uri, name, size = 56 }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const style = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={style} />;
  }

  const initials = (name ?? "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <View style={[style, styles.fallback]}>
      <Text style={[styles.initials, { fontSize: size / 2.5 }]}>{initials}</Text>
    </View>
  );
}

const makeStyles = ({ colors }: Theme) => StyleSheet.create({
  fallback: { backgroundColor: colors.primaryMuted, alignItems: "center", justifyContent: "center" },
  initials: { color: colors.primary, fontWeight: "700" },
});
