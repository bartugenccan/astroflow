/* AUTO-MIRRORED from apps/api/src/modules/mascot/constellations.ts.
 * The server is authoritative; keep both in sync. */

export const ZODIAC_CONSTELLATIONS = {
  Aries: "aries",
  Taurus: "taurus",
  Gemini: "gemini",
  Cancer: "cancer",
  Leo: "leo",
  Virgo: "virgo",
  Libra: "libra",
  Scorpio: "scorpius",
  Sagittarius: "sagittarius",
  Capricorn: "capricornus",
  Aquarius: "aquarius",
  Pisces: "pisces",
} as const;

export const SKY_CONSTELLATIONS = [
  "orion",
  "ursaMajor",
  "ursaMinor",
  "cassiopeia",
  "cygnus",
  "lyra",
  "andromeda",
  "pegasus",
  "perseus",
  "draco",
  "crux",
  "canisMajor",
] as const;

export type ConstellationKey =
  | (typeof ZODIAC_CONSTELLATIONS)[keyof typeof ZODIAC_CONSTELLATIONS]
  | (typeof SKY_CONSTELLATIONS)[number];

export const ALL_CONSTELLATIONS: readonly ConstellationKey[] = [
  ...Object.values(ZODIAC_CONSTELLATIONS),
  ...SKY_CONSTELLATIONS,
];

/** Share of journeys that bring back the zodiac constellation of the discovery's sign. */
export const ZODIAC_SHARE = 0.6;

export function zodiacConstellation(sign: string | null | undefined): ConstellationKey | null {
  if (!sign) return null;
  return (ZODIAC_CONSTELLATIONS as Record<string, ConstellationKey>)[sign] ?? null;
}

export interface PickInput {
  /** The user's natal Sun sign — the very first journey always brings it home. */
  sunSign: string | null;
  /** Sign of the transiting planet in today's discovery. */
  discoverySign: string | null;
  /** Keys the user already holds. */
  owned: readonly string[];
  /** Two independent uniform rolls in [0, 1) — injected so the pick is testable. */
  rolls: [number, number];
}

/**
 * Which constellation a journey brings back. First ever: the Sun sign's. Then
 * mostly the zodiac constellation of the discovery's sign; otherwise a sky
 * figure, preferring ones not yet found so the album keeps filling.
 */
export function pickConstellation({ sunSign, discoverySign, owned, rolls }: PickInput): ConstellationKey {
  const sun = zodiacConstellation(sunSign);
  if (owned.length === 0 && sun) return sun;

  const zodiac = zodiacConstellation(discoverySign);
  if (zodiac && rolls[0] < ZODIAC_SHARE) return zodiac;

  const missing = SKY_CONSTELLATIONS.filter((k) => !owned.includes(k));
  const pool: readonly ConstellationKey[] = missing.length ? missing : SKY_CONSTELLATIONS;
  return pool[Math.min(pool.length - 1, Math.floor(rolls[1] * pool.length))];
}
