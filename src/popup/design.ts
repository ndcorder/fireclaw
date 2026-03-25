import type { CSSProperties } from "react";

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
} as const;

export const colors = {
  backgroundBase: "#F9F9F9",
  backgroundLighter: "#FBFBFB",
  surfaceTint: "#F6F6F6",
  accentBlack: "#262626",
  heat100: "#FA5D19",
  heat90: "#F67738",
  heat40: "#FA5D1966",
  heat16: "#FA5D1929",
  borderFaint: "#EDEDED",
  borderMuted: "#E8E8E8",
  borderLoud: "#E6E6E6",
  blackAlpha72: "rgba(38, 38, 38, 0.72)",
  blackAlpha64: "rgba(38, 38, 38, 0.64)",
  blackAlpha56: "rgba(38, 38, 38, 0.56)",
  blackAlpha40: "rgba(38, 38, 38, 0.4)",
  success: "#42C366",
  successTint: "#42C36626",
  warning: "#ECB730",
  warningTint: "#ECB73026",
  danger: "#EB3424",
  dangerTint: "#EB342426",
} as const;

export const font = {
  family: '"IBM Plex Sans", "Inter", system-ui, sans-serif',
  size: {
    xs: 11,
    sm: 12,
    md: 13,
    lg: 15,
    xl: 18,
  } as const,
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  } as const,
} as const;

export const shadows = {
  card: "0 6px 16px rgba(38, 38, 38, 0.08)",
} as const;

export const textStyle = (overrides: CSSProperties = {}): CSSProperties => ({
  fontFamily: font.family,
  color: colors.accentBlack,
  ...overrides,
});
