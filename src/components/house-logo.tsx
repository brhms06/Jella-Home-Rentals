import Svg, { Path, Rect } from "react-native-svg";

// Brand mark: a simple house. Same shape is exported to assets/images/splash-icon.png.
export function HouseLogo({ size = 96, color = "#F25623", accent = "#FFD2C2" }: { size?: number; color?: string; accent?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Path d="M50 12 6 50h12v38h64V50h12z" fill={color} />
      <Rect x="40" y="58" width="20" height="30" rx="4" fill={accent} />
    </Svg>
  );
}
