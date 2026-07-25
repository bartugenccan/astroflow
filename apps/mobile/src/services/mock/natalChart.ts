import {
  Aspect,
  AspectType,
  CreateBirthProfileDto,
  NatalChartData,
  PlanetPlacement,
} from "../types";

const SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const PLANETS = [
  "Sun", "Moon", "Mercury", "Venus", "Mars",
  "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto",
] as const;

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂",
  Jupiter: "♃", Saturn: "♄", Uranus: "♅", Neptune: "♆", Pluto: "♇",
};

const ELEMENT_BY_SIGN: Record<string, string> = {
  Aries: "Fire", Leo: "Fire", Sagittarius: "Fire",
  Taurus: "Earth", Virgo: "Earth", Capricorn: "Earth",
  Gemini: "Air", Libra: "Air", Aquarius: "Air",
  Cancer: "Water", Scorpio: "Water", Pisces: "Water",
};

const MODALITY_BY_SIGN: Record<string, string> = {
  Aries: "Cardinal", Cancer: "Cardinal", Libra: "Cardinal", Capricorn: "Cardinal",
  Taurus: "Fixed", Leo: "Fixed", Scorpio: "Fixed", Aquarius: "Fixed",
  Gemini: "Mutable", Virgo: "Mutable", Sagittarius: "Mutable", Pisces: "Mutable",
};

const ASPECT_DEFS = [
  { name: "Conjunction", angle: 0, orb: 8, type: "neutral" as AspectType },
  { name: "Sextile", angle: 60, orb: 5, type: "harmonic" as AspectType },
  { name: "Square", angle: 90, orb: 7, type: "challenging" as AspectType },
  { name: "Trine", angle: 120, orb: 7, type: "harmonic" as AspectType },
  { name: "Opposition", angle: 180, orb: 7, type: "challenging" as AspectType },
];

/** Deterministic 32-bit hash → seed. Same birth data always yields the same chart. */
function seedFrom(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Mulberry32 PRNG — deterministic, no global Math.random. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Real tropical Sun sign from the birth date, so the chart feels accurate. */
function sunSignFromDate(birthDate: string): string {
  const [, mStr, dStr] = birthDate.split("-");
  const m = parseInt(mStr, 10);
  const d = parseInt(dStr, 10);
  const ranges: [number, number, string][] = [
    [1, 20, "Capricorn"], [2, 19, "Aquarius"], [3, 20, "Pisces"],
    [4, 20, "Aries"], [5, 21, "Taurus"], [6, 21, "Gemini"],
    [7, 22, "Cancer"], [8, 23, "Leo"], [9, 23, "Virgo"],
    [10, 23, "Libra"], [11, 22, "Scorpio"], [12, 22, "Sagittarius"],
  ];
  const cur = ranges[m - 1];
  if (d < cur[1]) {
    return ranges[(m + 10) % 12][2];
  }
  return cur[2];
}

function absToSignDegree(abs: number): { sign: string; degree: number; minute: number } {
  const norm = ((abs % 360) + 360) % 360;
  const signIndex = Math.floor(norm / 30);
  const within = norm - signIndex * 30;
  const degree = Math.floor(within);
  const minute = Math.floor((within - degree) * 60);
  return { sign: SIGNS[signIndex], degree, minute };
}

function dominant<T extends string>(items: T[]): T {
  const counts = new Map<T, number>();
  items.forEach((i) => counts.set(i, (counts.get(i) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Build a plausible, deterministic natal chart from birth data.
 * Not astronomically accurate — a believable stand-in until the API is wired.
 */
export function generateNatalChart(dto: CreateBirthProfileDto): NatalChartData {
  const rng = mulberry32(seedFrom(`${dto.birthDate}${dto.birthTime}${dto.latitude}`));

  // Ascendant: seeded, but nudged by birth time so morning/evening differ.
  const [hh, mm] = dto.birthTime.split(":").map((n) => parseInt(n, 10));
  const timeFraction = (hh * 60 + mm) / 1440;
  const ascAbs = (timeFraction * 360 + rng() * 40) % 360;
  const asc = absToSignDegree(ascAbs);
  const mcAbs = (ascAbs + 270 + rng() * 20) % 360;
  const mc = absToSignDegree(mcAbs);

  // House cusps: equal-house layout from the ascendant.
  const houseCusps = Array.from({ length: 12 }, (_, i) => {
    const pos = absToSignDegree((ascAbs + i * 30) % 360);
    return { house: i + 1, sign: pos.sign, degree: pos.degree, minute: pos.minute };
  });

  const houseOf = (abs: number): number => {
    const rel = (((abs - ascAbs) % 360) + 360) % 360;
    return Math.floor(rel / 30) + 1;
  };

  // Sun uses the real sign; other planets seeded within believable spreads.
  const realSun = sunSignFromDate(dto.birthDate);
  const sunAbs = SIGNS.indexOf(realSun) * 30 + rng() * 30;

  const planets: PlanetPlacement[] = PLANETS.map((name, idx) => {
    let abs: number;
    if (name === "Sun") {
      abs = sunAbs;
    } else if (name === "Mercury") {
      abs = sunAbs + (rng() * 56 - 28); // Mercury stays near the Sun
    } else if (name === "Venus") {
      abs = sunAbs + (rng() * 92 - 46); // Venus within ~47°
    } else {
      abs = rng() * 360;
    }
    const pos = absToSignDegree(abs);
    // Outer planets retrograde more often; deterministic per planet.
    const retroChance = idx >= 5 ? 0.4 : 0.12;
    return {
      name,
      sign: pos.sign,
      degree: pos.degree,
      minute: pos.minute,
      house: houseOf(abs),
      retrograde: rng() < retroChance,
      symbol: PLANET_SYMBOLS[name],
    };
  });

  const aspects = computeAspects(planets);
  const sun = planets[0];
  const moon = planets[1];
  const saturn = planets.find((p) => p.name === "Saturn")!;

  // Enrich houses with traditional rulers + occupants.
  const planetHouse: Record<string, number> = {};
  const planetSign: Record<string, string> = {};
  for (const p of planets) {
    planetHouse[p.name] = p.house;
    planetSign[p.name] = p.sign;
  }
  const houses = houseCusps.map((h) => {
    const ruler = TRADITIONAL_RULER[h.sign];
    return {
      ...h,
      ruler,
      rulerSign: planetSign[ruler] ?? h.sign,
      rulerHouse: planetHouse[ruler] ?? h.house,
      planetsInHouse: planets.filter((p) => p.house === h.house).map((p) => p.name),
    };
  });

  // Lunar nodes: seeded, opposite each other.
  const northAbs = rng() * 360;
  const northPos = absToSignDegree(northAbs);
  const southPos = absToSignDegree((northAbs + 180) % 360);

  const elements = planets.map((p) => ELEMENT_BY_SIGN[p.sign]);
  const modalities = planets.map((p) => MODALITY_BY_SIGN[p.sign]);

  return {
    houses,
    planets,
    angles: { ascendant: asc, midheaven: mc },
    nodes: {
      north: { ...northPos, house: houseOf(northAbs) },
      south: { ...southPos, house: houseOf((northAbs + 180) % 360) },
    },
    sect: sun.house >= 7 ? "day" : "night",
    saturn: { natalSign: saturn.sign, natalHouse: saturn.house, returnAge: 29.5 },
    summary: {
      sunSign: sun.sign,
      moonSign: moon.sign,
      risingSign: asc.sign,
      dominantElement: dominant(elements),
      dominantPlanet: planets[Math.floor(rng() * 5)].name,
      dominantModality: dominant(modalities),
    },
    aspects,
    chartMeta: {
      calculatedAt: new Date(0).toISOString(),
      julianDay: 0,
      siderealTime: 0,
    },
  };
}

const TRADITIONAL_RULER: Record<string, string> = {
  Aries: "Mars", Taurus: "Venus", Gemini: "Mercury", Cancer: "Moon",
  Leo: "Sun", Virgo: "Mercury", Libra: "Venus", Scorpio: "Mars",
  Sagittarius: "Jupiter", Capricorn: "Saturn", Aquarius: "Saturn", Pisces: "Jupiter",
};

function computeAspects(planets: PlanetPlacement[]): Aspect[] {
  const out: Aspect[] = [];
  const abs = (p: PlanetPlacement) =>
    SIGNS.indexOf(p.sign) * 30 + p.degree + p.minute / 60;
  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      let diff = Math.abs(abs(planets[i]) - abs(planets[j]));
      diff = Math.min(diff, 360 - diff);
      for (const def of ASPECT_DEFS) {
        const delta = Math.abs(diff - def.angle);
        if (delta <= def.orb) {
          out.push({
            planet1: planets[i].name,
            planet2: planets[j].name,
            aspect: def.name,
            orb: Math.round(delta * 10) / 10,
            type: def.type,
          });
          break;
        }
      }
    }
  }
  return out;
}
