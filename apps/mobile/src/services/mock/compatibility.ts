import {
  CompatibilityReading,
  CompatibilityScore,
  CreateBirthProfileDto,
  SynastryDimensionKey,
  SynastryDimensionScore,
  SynastryTopAspect,
} from "../types";
import { Locale } from "../../i18n";

const DIMS: { key: SynastryDimensionKey; lowerIsBetter: boolean }[] = [
  { key: "attraction", lowerIsBetter: false },
  { key: "intimacy", lowerIsBetter: false },
  { key: "communication", lowerIsBetter: false },
  { key: "values", lowerIsBetter: false },
  { key: "commitment", lowerIsBetter: false },
  { key: "conflict", lowerIsBetter: true },
  { key: "enmeshment", lowerIsBetter: true },
];

/**
 * Deterministic mock synastry, seeded from both people's birth data so the
 * same pair always yields the same score (mirrors the backend's determinism).
 */

function seed(a: CreateBirthProfileDto, b: CreateBirthProfileDto): number {
  const s = `${a.birthDate}|${a.latitude}|${b.birthDate}|${b.latitude}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function pick(seedN: number, lo: number, hi: number): number {
  const x = Math.sin(seedN) * 10000;
  const f = x - Math.floor(x);
  return Math.round(lo + f * (hi - lo));
}

const ASPECTS: Omit<SynastryTopAspect, "categories" | "weight">[] = [
  { planetA: "Sun", planetB: "Moon", aspect: "Trine", nature: "harmonic", orb: 1.2 },
  { planetA: "Venus", planetB: "Mars", aspect: "Conjunction", nature: "neutral", orb: 2.1 },
  { planetA: "Moon", planetB: "Moon", aspect: "Sextile", nature: "harmonic", orb: 3.0 },
  { planetA: "Mercury", planetB: "Mercury", aspect: "Square", nature: "challenging", orb: 2.6 },
  { planetA: "Sun", planetB: "Saturn", aspect: "Opposition", nature: "challenging", orb: 4.1 },
  { planetA: "Venus", planetB: "Venus", aspect: "Trine", nature: "harmonic", orb: 1.9 },
];

export function mockCompatibility(
  self: CreateBirthProfileDto,
  other: CreateBirthProfileDto,
): CompatibilityScore {
  const s = seed(self, other);
  const dimensions: SynastryDimensionScore[] = DIMS.map((d, i) => ({
    key: d.key,
    lowerIsBetter: d.lowerIsBetter,
    value: d.lowerIsBetter ? pick(s + i + 1, 15, 65) : pick(s + i + 1, 45, 92),
  }));
  // Overall = weighted-ish average, inverting lower-is-better dims.
  const contribs = dimensions.map((d) => (d.lowerIsBetter ? 100 - d.value : d.value));
  const overall = Math.round(contribs.reduce((a, b) => a + b, 0) / contribs.length);
  const topAspects: SynastryTopAspect[] = ASPECTS.map((a) => ({
    ...a,
    categories: ["love"],
    weight: 4,
  }));
  return {
    overall,
    dimensions,
    aspectCount: topAspects.length,
    topAspects,
    locked: false,
  };
}

export function mockCompatibilityReading(
  self: CreateBirthProfileDto,
  other: CreateBirthProfileDto,
  locale: Locale,
): CompatibilityReading {
  const { overall } = mockCompatibility(self, other);
  return locale === "tr"
    ? {
        text: `Genel uyumunuz ${overall}/100. Aranızda gerçek bir çekim ve karşılıklı anlayış var. Sürtüşme anlarında sabır ve açık iletişim en güçlü araçlarınız olacak; farklılıklarınızı birbirinizi tamamlayan bir denge olarak görün.`,
        headline: `Uyum ${overall}/100`,
      }
    : {
        text: `Your overall compatibility is ${overall}/100. There's genuine attraction and mutual understanding between you. In moments of friction, patience and open communication are your strongest tools; see your differences as a balance that completes each other.`,
        headline: `${overall}/100 match`,
      };
}
