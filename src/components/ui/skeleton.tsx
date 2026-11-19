import { useEffect, useMemo } from "react";
import { View, StyleSheet, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { radius, spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";

// A softly pulsing placeholder block. Compose these to mirror the real layout while data loads.
export function Skeleton({
  width = "100%",
  height,
  corner = radius.sm,
  style,
}: {
  width?: DimensionValue;
  height: number;
  corner?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const o = useSharedValue(0.5);
  useEffect(() => {
    o.value = withRepeat(withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, [o]);
  const anim = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[{ width, height, borderRadius: corner, backgroundColor: colors.surfaceMuted }, anim, style]} />;
}

// Mirrors a browse listing card: photo, title, meta line, price.
export function ListingCardSkeleton() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.card}>
      <Skeleton height={200} corner={radius.lg} />
      <Skeleton width="70%" height={16} />
      <Skeleton width="45%" height={13} />
      <Skeleton width="30%" height={16} />
    </View>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <View style={{ gap: spacing.lg }}>
      {Array.from({ length: count }, (_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </View>
  );
}

// Mirrors a conversation / inbox row.
export function RowSkeleton() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <View style={styles.row}>
      <Skeleton width="55%" height={15} />
      <Skeleton width="85%" height={13} />
      <Skeleton width="25%" height={11} />
    </View>
  );
}

export function RowSkeletonList({ count = 4 }: { count?: number }) {
  return (
    <View style={{ gap: spacing.md }}>
      {Array.from({ length: count }, (_, i) => (
        <RowSkeleton key={i} />
      ))}
    </View>
  );
}

// Full-page placeholder for a listing detail screen.
export function DetailSkeleton() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Skeleton height={300} corner={0} />
      <View style={{ padding: spacing.lg, gap: spacing.md }}>
        <Skeleton width="75%" height={24} />
        <Skeleton width="50%" height={14} />
        <Skeleton width="35%" height={20} />
        <Skeleton height={14} style={{ marginTop: spacing.md }} />
        <Skeleton width="90%" height={14} />
        <Skeleton width="80%" height={14} />
      </View>
    </View>
  );
}

const makeStyles = ({ colors }: Theme) => StyleSheet.create({
  card: { gap: spacing.sm },
  row: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
});
