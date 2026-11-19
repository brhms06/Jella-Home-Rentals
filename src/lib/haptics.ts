import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

// Tiny taps for micro-interactions. No-ops on web.
export const tap = () => {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};
export const success = () => {
  if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};
