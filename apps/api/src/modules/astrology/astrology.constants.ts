/**
 * Canonical ENGLISH astrology vocabulary — the single source of truth for
 * everything the API emits over the wire. The mobile app is English-canonical
 * and translates for display via its own i18n layer.
 */

export const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
] as const;
export type Sign = (typeof SIGNS)[number];

export const PLANETS = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
] as const;
export type Planet = (typeof PLANETS)[number];

export const PLANET_SYMBOLS: Record<Planet, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇',
};

export const ELEMENT_BY_SIGN: Record<Sign, 'Fire' | 'Earth' | 'Air' | 'Water'> = {
  Aries: 'Fire', Leo: 'Fire', Sagittarius: 'Fire',
  Taurus: 'Earth', Virgo: 'Earth', Capricorn: 'Earth',
  Gemini: 'Air', Libra: 'Air', Aquarius: 'Air',
  Cancer: 'Water', Scorpio: 'Water', Pisces: 'Water',
};

export const MODALITY_BY_SIGN: Record<Sign, 'Cardinal' | 'Fixed' | 'Mutable'> = {
  Aries: 'Cardinal', Cancer: 'Cardinal', Libra: 'Cardinal', Capricorn: 'Cardinal',
  Taurus: 'Fixed', Leo: 'Fixed', Scorpio: 'Fixed', Aquarius: 'Fixed',
  Gemini: 'Mutable', Virgo: 'Mutable', Sagittarius: 'Mutable', Pisces: 'Mutable',
};

/** Modern sign rulers (used to weight the dominant planet). */
export const SIGN_RULER: Record<Sign, Planet> = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
  Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Pluto',
  Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Uranus', Pisces: 'Neptune',
};

/** Traditional sign rulers — used for house-cusp rulership analysis. */
export const TRADITIONAL_SIGN_RULER: Record<Sign, Planet> = {
  Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
  Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
  Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
};

export type AspectType = 'harmonic' | 'challenging' | 'neutral';

/** Major aspect names (capitalized) → nature. Matches the ephemeris lib's `label`. */
export const ASPECT_NATURE: Record<string, AspectType> = {
  Conjunction: 'neutral',
  Sextile: 'harmonic',
  Square: 'challenging',
  Trine: 'harmonic',
  Opposition: 'challenging',
};

/** Weighting for dominant element/modality tallies. */
export const PLANET_WEIGHT: Record<Planet, number> = {
  Sun: 4, Moon: 4,
  Mercury: 2, Venus: 2, Mars: 2,
  Jupiter: 2, Saturn: 2,
  Uranus: 1, Neptune: 1, Pluto: 1,
};

export const ANGULAR_HOUSE_DIGNITY: Record<number, number> = {
  1: 5, 4: 4, 7: 4, 10: 5,
};

/** Convert an absolute ecliptic longitude (0–360) to sign + within-sign d/m. */
export function absToSign(abs: number): { sign: Sign; degree: number; minute: number } {
  const norm = ((abs % 360) + 360) % 360;
  const signIndex = Math.floor(norm / 30);
  const within = norm - signIndex * 30;
  const degree = Math.floor(within);
  const minute = Math.floor((within - degree) * 60);
  return { sign: SIGNS[signIndex], degree, minute };
}

/** The five major aspects, with the orb (tolerance in degrees) each allows. */
export const MAJOR_ASPECTS: { name: string; angle: number; orb: number }[] = [
  { name: 'Conjunction', angle: 0, orb: 8 },
  { name: 'Sextile', angle: 60, orb: 5 },
  { name: 'Square', angle: 90, orb: 7 },
  { name: 'Trine', angle: 120, orb: 7 },
  { name: 'Opposition', angle: 180, orb: 7 },
];

export interface AspectHit {
  name: string;
  angle: number;
  orb: number; // deviation from exact (0 = exact)
  maxOrb: number; // the allowance for this aspect (for tightness = 1 - orb/maxOrb)
}

/**
 * Match a major aspect between two absolute ecliptic longitudes. Pure — reused
 * by transits, synastry, and the best-days scorer. Returns null when no aspect
 * falls within orb.
 */
export function matchAspect(a: number, b: number): AspectHit | null {
  let diff = Math.abs(a - b) % 360;
  if (diff > 180) diff = 360 - diff;
  for (const asp of MAJOR_ASPECTS) {
    const delta = Math.abs(diff - asp.angle);
    if (delta <= asp.orb) {
      return { name: asp.name, angle: asp.angle, orb: delta, maxOrb: asp.orb };
    }
  }
  return null;
}

// ─── Synastry (compatibility) scoring ────────────────────────────────────────

/** Canonical unordered key for a planet pair, so Sun-Moon === Moon-Sun. */
export function pairKey(a: string, b: string): string {
  return [a, b].sort().join('-');
}

/** Importance of a cross-chart planet pair (higher = matters more). Default 1. */
export const SYNASTRY_PAIR_WEIGHT: Record<string, number> = {
  'Moon-Sun': 5,
  'Mars-Venus': 5,
  'Sun-Venus': 4,
  'Moon-Venus': 4,
  'Moon-Moon': 4,
  'Sun-Sun': 4,
  'Mars-Moon': 4,
  'Mercury-Mercury': 3,
  'Mercury-Moon': 3,
  'Mars-Sun': 3,
  'Venus-Venus': 3,
  'Saturn-Sun': 3,
  'Moon-Saturn': 3,
  'Saturn-Venus': 3,
  'Mars-Mars': 2,
  'Mars-Saturn': 2,
};

export type SynastryCategory = 'love' | 'communication' | 'stability' | 'friction';

/** Which categories a planet pair contributes to. */
export const SYNASTRY_CATEGORY_MAP: Record<string, SynastryCategory[]> = {
  'Moon-Sun': ['love', 'stability'],
  'Mars-Venus': ['love'],
  'Sun-Venus': ['love'],
  'Moon-Venus': ['love'],
  'Moon-Moon': ['stability', 'communication'],
  'Sun-Sun': ['stability'],
  'Mars-Moon': ['love', 'friction'],
  'Mercury-Mercury': ['communication'],
  'Mercury-Moon': ['communication'],
  'Mercury-Sun': ['communication'],
  'Mars-Sun': ['friction'],
  'Venus-Venus': ['love'],
  'Saturn-Sun': ['stability', 'friction'],
  'Moon-Saturn': ['stability', 'friction'],
  'Saturn-Venus': ['stability', 'friction'],
  'Mars-Mars': ['friction'],
  'Mars-Saturn': ['friction'],
};

/**
 * The FIXED synastry rubric: the same 7 dimensions are scored for EVERY couple,
 * each over a fixed list of planet pairs, so results are comparable across
 * people (not dependent on which aspects happen to exist). `lowerIsBetter` dims
 * (conflict, enmeshment) are healthiest when LOW. `pairs` are canonical unordered
 * planet pairs; each is evaluated in both cross-chart directions.
 */
export type SynastryDimensionKey =
  | 'attraction'
  | 'intimacy'
  | 'communication'
  | 'values'
  | 'commitment'
  | 'conflict'
  | 'enmeshment';

export interface SynastryDimension {
  key: SynastryDimensionKey;
  lowerIsBetter: boolean;
  weight: number; // contribution to `overall`
  pairs: [string, string][];
}

export const SYNASTRY_DIMENSIONS: SynastryDimension[] = [
  {
    key: 'attraction',
    lowerIsBetter: false,
    weight: 0.18,
    pairs: [['Venus', 'Mars'], ['Sun', 'Mars'], ['Moon', 'Mars'], ['Sun', 'Venus'], ['Mars', 'Mars']],
  },
  {
    key: 'intimacy',
    lowerIsBetter: false,
    weight: 0.18,
    pairs: [['Moon', 'Moon'], ['Moon', 'Venus'], ['Moon', 'Sun'], ['Sun', 'Sun']],
  },
  {
    key: 'communication',
    lowerIsBetter: false,
    weight: 0.15,
    pairs: [['Mercury', 'Mercury'], ['Mercury', 'Moon'], ['Mercury', 'Sun'], ['Mercury', 'Venus']],
  },
  {
    key: 'values',
    lowerIsBetter: false,
    weight: 0.12,
    pairs: [['Sun', 'Saturn'], ['Venus', 'Saturn'], ['Sun', 'Jupiter'], ['Venus', 'Jupiter']],
  },
  {
    key: 'commitment',
    lowerIsBetter: false,
    weight: 0.15,
    pairs: [['Saturn', 'Moon'], ['Saturn', 'Sun'], ['Saturn', 'Venus'], ['Sun', 'Moon']],
  },
  {
    key: 'conflict',
    lowerIsBetter: true,
    weight: 0.12,
    pairs: [['Mars', 'Mars'], ['Mars', 'Saturn'], ['Mars', 'Sun'], ['Mars', 'Moon'], ['Saturn', 'Sun']],
  },
  {
    key: 'enmeshment',
    lowerIsBetter: true,
    weight: 0.1,
    pairs: [['Moon', 'Pluto'], ['Sun', 'Pluto'], ['Venus', 'Pluto'], ['Mars', 'Pluto'], ['Moon', 'Saturn']],
  },
];

// ─── Best-days scoring ───────────────────────────────────────────────────────

export type LifeArea = 'love' | 'career' | 'money' | 'energy';

/** Natal planets/points each life-area cares about when a transit aspects them. */
export const BEST_DAYS_NATAL_TARGETS: Record<LifeArea, string[]> = {
  love: ['Venus', 'Moon', 'Sun', 'Mars'],
  career: ['Sun', 'Saturn', 'Jupiter', 'Mars'],
  money: ['Venus', 'Jupiter'],
  energy: ['Mars', 'Sun'],
};

/** Transiting planets each life-area weights most heavily. */
export const BEST_DAYS_TRANSIT_SOURCES: Record<LifeArea, string[]> = {
  love: ['Venus', 'Moon', 'Jupiter', 'Mars'],
  career: ['Sun', 'Saturn', 'Jupiter', 'Mars'],
  money: ['Venus', 'Jupiter'],
  energy: ['Mars', 'Sun', 'Jupiter'],
};
