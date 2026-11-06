import { useEffect, useState, useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle, Path } from "react-native-svg";
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { signInWithGoogle } from "@/lib/oauth";
import { radius, spacing } from "@/constants/theme";
import { useTheme, type Theme } from "@/lib/theme-context";

const HOVER_DURATION = 150;
const SLIDE_DURATION = 220;
const REVERT_DURATION = 200;
const ARROW_SIZE = 20;

function ArrowIcon() {
  return (
    <Svg width={ARROW_SIZE - 2} height={ARROW_SIZE - 2} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="9.5" stroke="#FFFFFF" strokeWidth={2} />
      <Path
        d="M7.5 12H15.5M12 8.5L15.5 12L12 15.5"
        stroke="#FFFFFF"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function GoogleButton() {
  const theme = useTheme();
  const { colors } = theme;
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [isActive, setIsActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSpinner, setShowSpinner] = useState(false);
  const iconColor = isActive || isSubmitting ? colors.onPrimary : colors.text;

  const pillProgress = useSharedValue(0);
  const contentTranslateX = useSharedValue(0);
  const contentOpacity = useSharedValue(1);

  useEffect(() => {
    pillProgress.value = withTiming(isActive || isSubmitting ? 1 : 0, {
      duration: HOVER_DURATION,
      easing: Easing.out(Easing.cubic),
    });
  }, [isActive, isSubmitting]);

  function startSignIn() {
    setShowSpinner(true);
    signInWithGoogle().catch((error) => {
      console.error("Google sign-in failed", error);
      setShowSpinner(false);
      setIsSubmitting(false);
      contentTranslateX.value = withTiming(0, { duration: REVERT_DURATION });
      contentOpacity.value = withTiming(1, { duration: REVERT_DURATION });
    });
  }

  function handlePress() {
    setIsSubmitting(true);
    contentTranslateX.value = withTiming(
      -24,
      { duration: SLIDE_DURATION, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(startSignIn)();
      }
    );
    contentOpacity.value = withTiming(0, { duration: SLIDE_DURATION, easing: Easing.in(Easing.cubic) });
  }

  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(pillProgress.value, [0, 1], ["rgba(255,56,92,0)", colors.primary]),
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: contentTranslateX.value }],
    opacity: contentOpacity.value,
  }));

  const textColorStyle = useAnimatedStyle(() => ({
    color: interpolateColor(pillProgress.value, [0, 1], [colors.text, colors.onPrimary]),
  }));

  const arrowSlotStyle = useAnimatedStyle(() => ({
    opacity: pillProgress.value,
    transform: [
      { translateX: interpolate(pillProgress.value, [0, 1], [-6, 0]) },
      { scale: interpolate(pillProgress.value, [0, 1], [0.8, 1]) },
    ],
  }));

  return (
    <Pressable
      onHoverIn={() => setIsActive(true)}
      onHoverOut={() => setIsActive(false)}
      onPressIn={() => setIsActive(true)}
      onPressOut={() => setIsActive(false)}
      onPress={handlePress}
      disabled={isSubmitting}
      style={styles.wrapper}
    >
      <Animated.View style={[styles.pill, pillStyle]}>
        <Animated.View style={[styles.content, contentStyle]}>
          <Ionicons name="logo-google" size={18} color={iconColor} />
          <Animated.Text style={[styles.label, textColorStyle]}>Continue with Google</Animated.Text>
          <Animated.View style={[styles.arrowSlot, arrowSlotStyle]}>
            <ArrowIcon />
          </Animated.View>
        </Animated.View>
        {showSpinner && (
          <View style={styles.spinnerOverlay}>
            <ActivityIndicator color={colors.onPrimary} />
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const makeStyles = ({ colors }: Theme) => StyleSheet.create({
  wrapper: { alignSelf: "center" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    overflow: "hidden",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  label: { fontSize: 15, fontWeight: "600" },
  arrowSlot: {
    width: ARROW_SIZE,
    height: ARROW_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  spinnerOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
