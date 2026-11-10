import { StyleSheet, TextStyle } from "react-native";

/**
 * AstroFlow — "Kozmik Şeker" (Cosmic Candy) design system.
 *
 * A playful night sky: deep plum-indigo base, candy-bright accents, chunky
 * rounded type (Nunito) over a friendly sans (DM Sans). Every pressable
 * surface has a solid, hard-offset "slab" under it (no blurry drop shadows) and
 * physically pushes down when pressed. Aster, the star mascot, lives here.
 *
 * Token layers:
 *   palette  — tone pairs (face + slab + on) for buttons, chips, cards.
 *   surface  — background / card / sheet / raised fills.
 *   colors   — semantic text, border, status, plus the `star` accent scale.
 */

// ─── Font families ────────────────────────────────────────────────────────────
export const fonts = {
  // Caveat — handwriting, only on paper (manifest practice)
  script: "Caveat_500Medium",
  scriptBold: "Caveat_700Bold",
  // Nunito — rounded, chunky voice for headings, numbers and buttons
  display: "Nunito_900Black",
  heading: "Nunito_800ExtraBold",
  rounded: "Nunito_700Bold",
  roundedItalic: "Nunito_700Bold_Italic",
  // DM Sans — calm reading text
  sans: "DMSans_400Regular",
  sansMedium: "DMSans_500Medium",
  sansSemiBold: "DMSans_600SemiBold",
  sansBold: "DMSans_700Bold",
} as const;

// ─── Tone palette (face / slab / on) ──────────────────────────────────────────
export type Tone = "primary" | "candy" | "star" | "mint" | "sky" | "danger" | "night" | "cloud";

export const palette: Record<Tone, { face: string; slab: string; on: string; soft: string }> = {
  /** Aster violet — brand, primary CTAs. */
  primary: { face: "#7C4DFF", slab: "#5530C9", on: "#FFFFFF", soft: "rgba(124,77,255,0.18)" },
  /** Candy pink — love, delight, secondary highlights. */
  candy: { face: "#FF6FB5", slab: "#C9407F", on: "#2A0718", soft: "rgba(255,111,181,0.18)" },
  /** Star gold — rewards, Işık, Yıldız Tozu. */
  star: { face: "#FFC83D", slab: "#C99300", on: "#2B1A00", soft: "rgba(255,200,61,0.18)" },
  /** Mint — success, check-ins, completed quests. */
  mint: { face: "#2FD08A", slab: "#1E9A63", on: "#04261A", soft: "rgba(47,208,138,0.18)" },
  /** Sky — calm, info, air. */
  sky: { face: "#4CC9F0", slab: "#2A93B8", on: "#04222E", soft: "rgba(76,201,240,0.18)" },
  /** Danger — destructive actions. */
  danger: { face: "#FF5C6C", slab: "#C23545", on: "#FFFFFF", soft: "rgba(255,92,108,0.18)" },
  /** Night — secondary/neutral buttons on the dark base. */
  night: { face: "#33257A", slab: "#150E36", on: "#FFF8FF", soft: "rgba(255,248,255,0.08)" },
  /** Cloud — light button (third-party sign-in, contrast moments). */
  cloud: { face: "#FFF8FF", slab: "#BDB2E6", on: "#1A1240", soft: "rgba(255,248,255,0.18)" },
};

// ─── Surfaces ─────────────────────────────────────────────────────────────────
/**
 * "Soft night": a lavender-leaning night that reads calmer than pure ink, with
 * one card fill and one raised fill so screens don't stack five shades of
 * purple. Text contrast on every surface stays ≥ 4.8:1 (tertiary) and ≥ 7.4:1
 * (secondary).
 */
export const surface = {
  base: "#211853", // app background
  card: "#2C2168", // cards
  sheet: "#30236E", // bottom sheets
  raised: "#372A7E", // raised / pressed / inputs
  accent: "#45349A", // indigo accent surface
  slab: "#150E38", // hard shadow under night cards
  outline: "#43348F", // chunky 2px card border
} as const;

/**
 * Paper — the manifest practice surface. Cream sheet, faint ruled lines, a
 * candy margin rule and violet "ink" (12.6:1 on the face). Only practice and
 * writing surfaces use it, so it always means "this is your page".
 */
export const paper = {
  face: "#FFF6E5",
  /** Slightly darker cream for the hard slab under the sheet. */
  slab: "#D9C7A6",
  /** Ruled lines. */
  line: "rgba(124,77,255,0.16)",
  /** The vertical margin rule. */
  margin: "rgba(255,111,181,0.55)",
  /** Primary ink (handwriting, headings on paper). */
  ink: "#2E2463",
  /** Secondary ink (hints, Aster's margin notes) — 4.5:1+ on the face. */
  inkSoft: "rgba(46,36,99,0.72)",
  /** Trace guide for the 3-6-9 lines (decorative; the sentence is also shown in full). */
  inkTrace: "rgba(46,36,99,0.22)",
  /** Margin note highlight. */
  note: "rgba(255,200,61,0.35)",
} as const;

// ─── Colour tokens ────────────────────────────────────────────────────────────
export const colors = {
  // Star gold accent scale (warm, sticker-bright): icons, eyebrows, rewards
  star: {
    100: "#FFF4D1",
    200: "#FFE38A",
    300: "#FFD25C", // accent — icons, active states, eyebrows
    400: "#FFC83D", // fills, ring strokes
    500: "#E8A912",
    600: "#C99300",
  },
  moon: "#CFD6FF",
  text: {
    primary: "#FFF8FF",
    secondary: "rgba(255,248,255,0.78)",
    tertiary: "rgba(255,248,255,0.58)",
    accent: "#FFD25C",
    onAccent: "#2B1A00",
    onPrimary: "#FFFFFF",
    violet: "#B9A2FF",
  },
  semantic: {
    harmonic: "#2FD08A",
    challenging: "#FF7A8A",
    neutral: "#9AA3D9",
    error: "#FF6B7A",
  },
  element: {
    fire: "#FF8A5B",
    earth: "#8BD17C",
    air: "#8FB8FF",
    water: "#5CD6E6",
  },
  border: {
    hairline: "rgba(185,162,255,0.18)",
    hairlineStrong: "rgba(185,162,255,0.36)",
    inner: "rgba(255,248,255,0.08)",
    chunky: surface.outline,
  },
  glow: {
    star: "rgba(255,200,61,0.40)",
    starSoft: "rgba(255,200,61,0.16)",
    violet: "rgba(124,77,255,0.45)",
    /** The running-light ring around "this needs you" cards: dim tail and bright head. */
    ringDim: "rgba(150,118,47,0.15)",
    ringBright: "rgba(247,240,221,0.95)",
  },
  overlay: {
    /** Dim behind sheets and modals. */
    scrim: "rgba(6, 8, 16, 0.55)",
    /** Glossy highlight on a filled progress bar. */
    gloss: "rgba(255,255,255,0.38)",
    /** Faint gold sheen along a sheet's top edge. */
    sheen: "rgba(255,210,92,0.08)",
    /** Deep night scrim behind full-screen celebrations (isolates the card). */
    celebration: "rgba(14,9,40,0.6)",
  },
} as const;

/**
 * Illustration-only colours (Aster, the sky backdrop) that have no UI role.
 * Everything else in the art reuses the palette above.
 */
export const art = {
  /** Pure white catch-lights in Aster's eyes and shine. */
  sparkle: "#FFFFFF",
  /** Aster's blush. */
  blush: "#FF8FC5",
  /** Backdrop nebula clouds. */
  nebulaViolet: "#4B2FB0",
  nebulaPink: "#B23A8A",
  /** Hard ink for Aster's face (eyes, mouth). */
  ink: palette.star.on,
  /** Aster's body gradient per stage (egg → Nova): top, bottom and the slab under it. */
  stageBody: [
  { top: "#FFF6DC", bottom: "#FFE0A0", slab: "#E3BC6E" }, // egg shell
  { top: "#FFF0B8", bottom: "#FFD25C", slab: "#E2A512" },
  { top: "#FFEC9E", bottom: "#FFC83D", slab: "#D99A00" },
  { top: "#FFE98F", bottom: "#FFBE2E", slab: "#D08F00" },
  { top: "#FFE680", bottom: "#FFB31F", slab: "#C98600" },
  { top: "#FFF3B0", bottom: "#FFA8D8", slab: "#C9407F" }, // Nova: candy-gold,
  ] as readonly { top: string; bottom: string; slab: string }[],
} as const;

/** Life-area / category accent tones, used by chips and intention cards. */
export const areaTone: Record<string, Tone> = {
  love: "candy",
  career: "sky",
  money: "star",
  energy: "mint",
  strength: "primary",
  reading: "sky",
  calm: "mint",
  confidence: "star",
};

// ─── Gradients ────────────────────────────────────────────────────────────────
export const gradients = {
  sky: ["#2C2068", "#211853"] as const,
  skyRadialCenter: "#3A2A8C",
  nebula: ["rgba(124,77,255,0.35)", "rgba(255,111,181,0.10)", "rgba(26,18,64,0)"] as const,
  primaryButton: ["#8F66FF", "#7C4DFF"] as const,
  shimmer: [
    "rgba(255,248,255,0)",
    "rgba(255,248,255,0.45)",
    "rgba(255,248,255,0)",
  ] as const,
} as const;

// ─── Typography ───────────────────────────────────────────────────────────────
export const typography = StyleSheet.create({
  /** The biggest moment on a screen (welcome title, a reveal). Use once per screen. */
  hero: {
    fontFamily: fonts.display,
    fontSize: 44,
    lineHeight: 50,
    color: colors.text.primary,
  } as TextStyle,
  display: {
    fontFamily: fonts.display,
    fontSize: 34,
    lineHeight: 40,
    color: colors.text.primary,
  } as TextStyle,
  title: {
    fontFamily: fonts.heading,
    fontSize: 26,
    lineHeight: 32,
    color: colors.text.primary,
  } as TextStyle,
  /** Lead / quote text (affirmations, guidance). Rounded, not serif. */
  lead: {
    fontFamily: fonts.rounded,
    fontSize: 19,
    lineHeight: 27,
    color: colors.text.primary,
  } as TextStyle,
  heading: {
    fontFamily: fonts.heading,
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
    fontFamily: fonts.heading,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: colors.text.tertiary,
  } as TextStyle,
  labelLong: {
    fontFamily: fonts.rounded,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0.2,
    color: colors.text.tertiary,
  } as TextStyle,
  numeric: {
    fontFamily: fonts.heading,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 0.3,
    color: colors.text.secondary,
  } as TextStyle,
  /** Chunky button label — uppercase, Duolingo-style. */
  button: {
    fontFamily: fonts.heading,
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.text.primary,
  } as TextStyle,
  /** Big stat numbers (streaks, Işık). */
  stat: {
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 26,
    color: colors.text.primary,
  } as TextStyle,
  /** Handwriting on paper (manifest practice). Line height = the paper's ruling. */
  script: {
    fontFamily: fonts.script,
    fontSize: 24,
    lineHeight: 32,
    color: paper.ink,
  } as TextStyle,
  /** The big handwritten sentence (reading aloud, the manifest itself). */
  scriptLarge: {
    fontFamily: fonts.scriptBold,
    fontSize: 30,
    lineHeight: 38,
    color: paper.ink,
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

// ─── Layout ───────────────────────────────────────────────────────────────────
export const layout = {
  /** Horizontal screen padding. Full-bleed rows (`BleedRow`) cancel exactly this. */
  gutter: spacing.xl,
} as const;

// ─── Radii ────────────────────────────────────────────────────────────────────
export const radii = {
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

// ─── Depth (hard-offset slabs) ────────────────────────────────────────────────
/** Height of the solid slab under a face. Pressing travels `depth - 1`. */
export const depth = {
  sm: 3,
  md: 5,
  lg: 6,
} as const;

// ─── Shadows / glows ──────────────────────────────────────────────────────────
export const shadows = {
  /** Soft glow for luminous things (Aster, stars) — never for buttons/cards. */
  glow: {
    shadowColor: "#FFC83D",
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  /** Hard offset: a crisp slab, no blur. */
  card: {
    shadowColor: surface.slab,
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 5 },
    elevation: 0,
  },
} as const;

// ─── Motion tokens ────────────────────────────────────────────────────────────
/**
 * One rhythm for the whole app. Reach for the semantic names first:
 *   press  — a face going down under a finger
 *   enter  — a block arriving on screen
 *   pop    — a reward, a tick, a star appearing (small overshoot)
 *   sheet  — sheets and panels sliding in
 * Exits are faster than entrances (`duration.exit`), and nothing decorative loops.
 */
const springs = {
  gentle: { damping: 18, stiffness: 120, mass: 1 },
  snappy: { damping: 14, stiffness: 260, mass: 0.7 },
  slow: { damping: 24, stiffness: 80, mass: 1.2 },
  mystic: { damping: 15, stiffness: 150, mass: 1.1 },
  /** Overshooting pop — counters, mascot cheer. */
  bouncy: { damping: 8, stiffness: 220, mass: 0.8 },
  /** Squash & stretch recovery. */
  squash: { damping: 6, stiffness: 300, mass: 0.6 },
} as const;

export const motion = {
  spring: {
    ...springs,
    press: springs.snappy,
    enter: springs.gentle,
    pop: { damping: 12, stiffness: 220, mass: 0.8 },
    sheet: springs.mystic,
  },
  duration: {
    fast: 160,
    base: 280,
    slow: 500,
    reveal: 1400,
    /** Leaving is quicker than arriving (~65% of an entrance). */
    exit: 180,
    /** How long a reward pill stays before it leaves on its own. */
    toast: 1600,
    /** A milestone / shield pill stays a little longer. */
    toastLong: 2200,
  },
  stagger: 40,
  /** Only the first few blocks of a screen stagger; the rest just fade in. */
  staggerMax: 3,
} as const;

// ─── Blur ─────────────────────────────────────────────────────────────────────
export const blurIntensity = {
  light: 10,
  medium: 20,
  heavy: 40,
} as const;
