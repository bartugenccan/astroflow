/** Canonical zodiac sign order (0 = Aries) — shared by the chart wheels. */
export const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

/** Absolute ecliptic longitude (0–360) from sign + degree + minute. */
export function absLongitude(sign: string, degree: number, minute = 0): number {
  return (SIGNS.indexOf(sign as (typeof SIGNS)[number]) * 30 + degree + minute / 60 + 360) % 360;
}
