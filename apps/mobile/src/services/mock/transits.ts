import {
  CreateBirthProfileDto,
  NatalChartData,
  TransitData,
  Transit,
  TransitReport,
  TransitMovement,
  AspectType,
} from "../types";

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const TRANSIT_PLANETS = ["Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
const ASPECTS = ["Trine", "Square", "Sextile", "Conjunction", "Opposition"];

/**
 * Build believable current-sky transits against the natal chart.
 * Deterministic per chart so the day's guidance stays stable across renders.
 */
export function generateTransits(
  dto: CreateBirthProfileDto,
  chart: NatalChartData,
): TransitData {
  let seed = 0;
  const key = `${dto.birthDate}${dto.birthTime}`;
  for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const count = 5 + Math.floor(rand() * 2);
  const transits: Transit[] = Array.from({ length: count }, () => {
    const tp = TRANSIT_PLANETS[Math.floor(rand() * TRANSIT_PLANETS.length)];
    const np = chart.planets[Math.floor(rand() * chart.planets.length)];
    const aspect = ASPECTS[Math.floor(rand() * ASPECTS.length)];
    return {
      transitPlanet: tp,
      transitSign: SIGNS[Math.floor(rand() * 12)],
      transitDegree: Math.round(rand() * 30 * 10) / 10,
      natalPlanet: np.name,
      natalSign: np.sign,
      aspect,
      orb: Math.round(rand() * 5 * 10) / 10,
      interpretation: `${tp} ${aspect.toLowerCase()} your natal ${np.name}`,
      action: "",
    };
  });

  return {
    date: new Date(0).toISOString(),
    transits,
    dailyScores: {
      harmony: 40 + Math.floor(rand() * 55),
      tension: 20 + Math.floor(rand() * 50),
      energy: 40 + Math.floor(rand() * 55),
      focus: 40 + Math.floor(rand() * 55),
      creativity: 40 + Math.floor(rand() * 55),
    },
  };
}

const ALL_PLANETS = [
  "Sun", "Moon", "Mercury", "Venus", "Mars",
  "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto",
];
// Rough per-planet dwell time in a house (days) for the offline mock.
const MOCK_DAYS: Record<string, number> = {
  Sun: 6, Moon: 1, Mercury: 18, Venus: 28, Mars: 44,
  Jupiter: 360, Saturn: 880, Uranus: 2500, Neptune: 5000, Pluto: 5500,
};
const NATURE: Record<string, AspectType> = {
  Trine: "harmonic", Sextile: "harmonic",
  Square: "challenging", Opposition: "challenging", Conjunction: "neutral",
};

/**
 * Deterministic planet-centric transit report for the offline (mock) path.
 * Not astronomically exact — the HTTP client provides real data.
 */
export function generateTransitReport(
  dto: CreateBirthProfileDto,
  chart: NatalChartData,
): TransitReport {
  let seed = 0;
  const key = `${dto.birthDate}${dto.birthTime}report`;
  for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  const movements: TransitMovement[] = ALL_PLANETS.map((planet) => {
    const natalHouse = 1 + Math.floor(rand() * 12);
    const retrograde = rand() < 0.2;
    const aspectCount = Math.floor(rand() * 3);
    const aspects = Array.from({ length: aspectCount }, () => {
      const np = chart.planets[Math.floor(rand() * chart.planets.length)];
      const aspect = ASPECTS[Math.floor(rand() * ASPECTS.length)];
      return {
        natalPlanet: np.name,
        natalSign: np.sign,
        aspect,
        nature: NATURE[aspect] ?? ("neutral" as AspectType),
        orb: Math.round(rand() * 5 * 10) / 10,
      };
    });
    return {
      planet,
      sign: SIGNS[Math.floor(rand() * 12)],
      degree: Math.floor(rand() * 30),
      minute: Math.floor(rand() * 60),
      retrograde,
      natalHouse,
      daysInHouse: Math.round(MOCK_DAYS[planet] * (0.3 + rand() * 0.7) * 10) / 10,
      aspects,
    };
  });

  const skyAspects = movements.slice(0, 4).map((m, i) => {
    const other = movements[(i + 3) % movements.length];
    const aspect = ASPECTS[Math.floor(rand() * ASPECTS.length)];
    return {
      planet1: m.planet,
      planet2: other.planet,
      aspect,
      nature: NATURE[aspect] ?? ("neutral" as AspectType),
      orb: Math.round(rand() * 5 * 10) / 10,
    };
  });

  return { date: new Date().toISOString().slice(0, 10), movements, skyAspects };
}
