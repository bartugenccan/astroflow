/**
 * Client-side types mirroring the NestJS API DTOs 1:1.
 * Source of truth: apps/api/src/modules/astrology/astrology-adapter.service.ts
 * and .../ai-insight-engine.service.ts. Keep in sync when the API changes.
 */

export type AspectType = "harmonic" | "challenging" | "neutral";
export type EnergyState = "HARMONY" | "MOMENTUM" | "STRESS" | "OVERLOAD";
export type Element = "Fire" | "Earth" | "Air" | "Water";

export interface DegreePosition {
  sign: string;
  degree: number;
  minute: number;
}

export interface HousePlacement {
  house: number;
  sign: string;
  degree: number;
  minute: number;
  ruler: string;
  rulerSign: string;
  rulerHouse: number;
  planetsInHouse: string[];
}

export interface PlanetPlacement {
  name: string;
  sign: string;
  degree: number;
  minute: number;
  house: number;
  retrograde: boolean;
  symbol: string;
}

export interface Aspect {
  planet1: string;
  planet2: string;
  aspect: string;
  orb: number;
  type: AspectType;
}

export interface NodePlacement {
  sign: string;
  degree: number;
  minute: number;
  house: number;
}

export interface NatalChartData {
  houses: HousePlacement[];
  planets: PlanetPlacement[];
  angles: {
    ascendant: DegreePosition;
    midheaven: DegreePosition;
  };
  nodes: {
    north: NodePlacement;
    south: NodePlacement;
  };
  sect: "day" | "night";
  saturn: { natalSign: string; natalHouse: number; returnAge: number };
  summary: {
    sunSign: string;
    moonSign: string;
    risingSign: string;
    dominantElement: string;
    dominantPlanet: string;
    dominantModality: string;
  };
  aspects: Aspect[];
  chartMeta: {
    calculatedAt: string;
    julianDay: number;
    siderealTime: number;
  };
}

export interface Transit {
  transitPlanet: string;
  transitSign: string;
  transitDegree: number;
  natalPlanet: string;
  natalSign: string;
  aspect: string;
  orb: number;
  interpretation: string;
  action: string;
}

export interface TransitData {
  date: string;
  transits: Transit[];
  dailyScores: {
    harmony: number;
    tension: number;
    energy: number;
    focus: number;
    creativity: number;
  };
}

/** MVP UI subset of the API's DailyInsight (ignores actions/ritualWindows/forecast). */
export interface DailyInsight {
  energyState: EnergyState;
  title: string;
  summary: string;
}

/** Matches CreateBirthProfileDto on the API. */
export interface CreateBirthProfileDto {
  birthDate: string; // "YYYY-MM-DD"
  birthTime: string; // "HH:mm"
  latitude: number;
  longitude: number;
}

/** Matches BirthProfileResponseDto on the API, plus client-only display fields. */
export interface BirthProfileResponse {
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  sunSign: string;
  moonSign: string;
  risingSign: string;
  risingDegree: number;
  dominantElement: string;
  dominantPlanet: string;
  // client-only convenience for display
  placeName?: string;
  unknownTime?: boolean;
}

export interface City {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  admin1?: string; // region/state, for disambiguation
  timezone?: string; // IANA tz (from geocoding)
}

// ─── AI interpretation results (mirror apps/api interpretation.types.ts) ──────
export interface PlacementInterpretation {
  planet: string; // "Sun".."Pluto" or "Ascendant"
  sign: string;
  house: number;
  retrograde: boolean;
  text: string;
}

export interface BigThreeReading {
  sunSign: string;
  moonSign: string;
  risingSign: string;
  text: string;
}

export interface AspectInterpretation {
  planet1: string;
  planet2: string;
  aspect: string;
  type: AspectType;
  orb: number;
  text: string;
}

export interface ChartOverview {
  text: string;
}

export interface HouseInterpretation {
  house: number;
  sign: string;
  ruler: string;
  rulerSign: string;
  rulerHouse: number;
  planetsInHouse: string[];
  text: string;
}

export interface NodeAnalysis {
  northSign: string;
  northHouse: number;
  southSign: string;
  southHouse: number;
  text: string;
}

export interface ChartContext {
  sect: "day" | "night";
  saturnReturnAge: number;
  saturnSign: string;
  saturnHouse: number;
  text: string;
}
