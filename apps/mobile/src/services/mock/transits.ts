import { CreateBirthProfileDto, NatalChartData, TransitData, Transit } from "../types";

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
