import { Platform, useWindowDimensions } from "react-native";
import { DESKTOP_BREAKPOINT } from "@/constants/theme";

export function useIsDesktop() {
  const { width } = useWindowDimensions();
  return Platform.OS === "web" && width >= DESKTOP_BREAKPOINT;
}
