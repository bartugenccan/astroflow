import { StyleSheet, TextStyle } from "react-native";

/**
 * AstroFlow — "Celestial Gold" design system.
 * Deep ink-indigo night sky, champagne gold accents, fine constellation
 * linework. Serif display (Cormorant Garamond) + quiet sans (Manrope).
 */

// ─── Font families ────────────────────────────────────────────────────────────
export const fonts = {
  serif: "CormorantGaramond_600SemiBold",
  serifMedium: "CormorantGaramond_500Medium",
  serifItalic: "CormorantGaramond_500Medium_Italic",
  sans: "Manrope_400Regular",
  sansMedium: "Manrope_500Medium",
  sansSemiBold: "Manrope_600SemiBold",
  sansBold: "Manrope_700Bold",
} as const;

// ─── Colour tokens ────────────────────────────────────────────────────────────
export const colors = {
  // Night-sky scale, warm-black → indigo
  ink: {
    950: "#060810", // app base background
    900: "#0A0E1C", // cards base
    800: "#101731", // surface / sheet
    700: "#182042", // raised / pressed
    600: "#232E5C", // indigo accent surface
  },
  // Champagne gold scale
  gold: {
    100: "#F7F0DD", // highlight / sparkle cores
    200: "#EFDFB8",
    300: "#E7CD8F", // primary accent — icons, active states
    400: "#D9B964", // buttons, ring strokes
    500: "#C29C48", // pressed / darker stroke
    600: "#96762F", // deep gold, subtle borders
  },
  moon: "#C9D1E4", // silver — moon glyph, secondary accent
  text: {
    primary: "#F3EFE4", // warm off-white
    secondary: "rgba(243,239,228,0.68)",
    tertiary: "rgba(243,239,228,0.42)",
    gold: "#E7CD8F",
    onGold: "#181129", // text on gold fills
  },
  // Aspect / status semantics
  semantic: {
    harmonic: "#8FBF9F", // sage green
    challenging: "#C98080", // muted rose
    neutral: "#8E97B8", // slate blue
    error: "#D98A8A",
  },
  // Element coloring for zodiac signs in the wheel — muted metallics
  element: {
    fire: "#D6976B",
    earth: "#9FAE87",
    air: "#A9B7D9",
    water: "#7FA3B8",
  },
  border: {
    hairline: "rgba(231,205,143,0.14)", // signature gold hairline
    hairlineStrong: "rgba(231,205,143,0.30)",
    inner: "rgba(243,239,228,0.06)",
  },
  glow: {
    gold: "rgba(217,185,100,0.35)",
    goldSoft: "rgba(217,185,100,0.16)",
  },
} as const;

// ─── Gradients ────────────────────────────────────────────────────────────────
export const gradients = {
  sky: ["#0A0E1C", "#060810"] as const, // vertical background
  skyRadialCenter: "#141B38", // radial glow behind hero/chart
  goldButton: ["#E7CD8F", "#C29C48"] as const,
  goldShimmer: [
    "rgba(231,205,143,0)",
    "rgba(247,240,221,0.55)",
    "rgba(231,205,143,0)",
  ] as const,
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────
export const typography = StyleSheet.create({
  // Cormorant serif — the mystical voice
  display: {
    fontFamily: fonts.serif,
    fontSize: 38,
    lineHeight: 44,
    letterSpacing: 0.2,
    color: colors.text.primary,
  } as TextStyle,
  title: {
    fontFamily: fonts.serif,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: 0.2,
    color: colors.text.primary,
  } as TextStyle,
  serifBody: {
    fontFamily: fonts.serifItalic,
    fontSize: 21,
    lineHeight: 32,
    color: colors.text.primary,
  } as TextStyle,
  // Manrope sans — UI text
  heading: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 17,
    lineHeight: 22,
    color: colors.text.primary,
  } as TextStyle,
  body: {
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 22,
    color: colors.text.secondary,
  } as TextStyle,
  bodySmall: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    color: colors.text.tertiary,
  } as TextStyle,
  label: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    color: colors.text.tertiary,
  } as TextStyle,
  numeric: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.4,
    color: colors.text.secondary,
  } as TextStyle,
});

// ─── Spacing ──────────────────────────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

// ─── Radii ────────────────────────────────────────────────────────────────────
export const radii = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

// ─── Shadows / glows ──────────────────────────────────────────────────────────
export const shadows = {
  goldGlow: {
    shadowColor: "#D9B964",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  card: {
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

// ─── Motion tokens ────────────────────────────────────────────────────────────
export const motion = {
  spring: {
    gentle: { damping: 18, stiffness: 120, mass: 1 }, // enter transitions
    snappy: { damping: 14, stiffness: 220, mass: 0.8 }, // press feedback
    slow: { damping: 24, stiffness: 80, mass: 1.2 }, // chart / large elements
  },
  duration: { fast: 160, base: 280, slow: 500, reveal: 1400 },
  stagger: 70, // ms per list item
} as const;

// ─── Blur ─────────────────────────────────────────────────────────────────────
export const blurIntensity = {
  light: 10,
  medium: 20,
  heavy: 40,
} as const;
