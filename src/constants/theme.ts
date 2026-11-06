const shared = {
  success: "#008A05",
  danger: "#C13515",
  whatsapp: "#25D366",
};

// black, orange, dark gray, light gray
export const lightColors = {
  ...shared,
  primary: "#F25623",
  primaryDark: "#C9400F",
  onPrimary: "#171717", // dark text on orange, as in the palette reference
  accent: "#4D4D4D",
  primaryMuted: "#FCE0D6",
  background: "#F5F5F5",
  surface: "#FFFFFF",
  surfaceMuted: "#DEDEDE",
  border: "#D0D0D0",
  text: "#171717",
  textMuted: "#5A5A5A",
  successBg: "#E6F4E6",
};

export const darkColors: Colors = {
  ...shared,
  primary: "#F6612F",
  primaryDark: "#FF8A60",
  onPrimary: "#171717",
  accent: "#4D4D4D",
  primaryMuted: "#3A1D12",
  background: "#171717",
  surface: "#212121",
  surfaceMuted: "#2C2C2C",
  border: "#3A3A3A",
  text: "#F0F0F0",
  textMuted: "#A6A6A6",
  successBg: "#1E3A22",
};

export type Colors = typeof lightColors;

export const makeTypography = (c: Colors) => ({
  title: { fontSize: 26, fontWeight: "700" as const, color: c.text },
  heading: { fontSize: 18, fontWeight: "700" as const, color: c.text },
  subheading: { fontSize: 16, fontWeight: "600" as const, color: c.text },
  body: { fontSize: 15, color: c.text },
  caption: { fontSize: 13, color: c.textMuted },
});

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };


export const DESKTOP_BREAKPOINT = 900;

export const cardShadow = {
  shadowColor: "#000",
  shadowOpacity: 0.06,
  shadowRadius: 10,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
};
