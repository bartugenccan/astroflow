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

// ─── Deep transits (mirror apps/api astrology-adapter + interpretation types) ──
export interface TransitAspectRef {
  natalPlanet: string;
  natalSign: string;
  aspect: string;
  nature: AspectType;
  orb: number;
}

export interface TransitMovement {
  planet: string;
  sign: string;
  degree: number;
  minute: number;
  retrograde: boolean;
  natalHouse: number;
  daysInHouse: number;
  aspects: TransitAspectRef[];
}

export interface TransitReport {
  date: string;
  movements: TransitMovement[];
  skyAspects: {
    planet1: string;
    planet2: string;
    aspect: string;
    nature: AspectType;
    orb: number;
  }[];
}

export interface TransitDetail {
  planet: string;
  sign: string;
  natalHouse: number;
  daysInHouse: number;
  retrograde: boolean;
  aspects: TransitAspectRef[];
  text: string;
}

export interface TransitOverview {
  date: string;
  text: string;
}

// ─── Best days + forecast (mirror apps/api) ──────────────────────────────────
export type LifeArea = "love" | "career" | "money" | "energy";

export interface BestDayScore {
  date: string;
  love: number;
  career: number;
  money: number;
  energy: number;
  overall: number;
}

export interface BestDayReason {
  date: string;
  score: number;
  reason: string;
}

export interface BestDaysResponse {
  start: string;
  days: number;
  scores: BestDayScore[];
  top: Record<LifeArea, BestDayReason[]>;
}

export type ForecastPeriod = "weekly" | "monthly";

export interface ForecastTheme {
  area: LifeArea;
  text: string;
}

export interface Forecast {
  period: ForecastPeriod;
  start: string;
  overview: string;
  themes: ForecastTheme[];
  keyDates: { date: string; label: string }[];
}

// ─── Year Ahead / Solar Return (mirror apps/api) ─────────────────────────────

/** One placement in the return chart. Only shown under "show me why". */
export interface YearAheadPlacement {
  name: string;
  sign: string;
  degree: number;
  minute: number;
  house: number;
  retrograde: boolean;
  symbol: string;
}

/** The raw return chart. Kept out of the way until the reader asks for it. */
export interface YearAheadChart {
  returnAtUtc: string;
  returnDateLocal: string;
  ageTurning: number;
  windowStart: string;
  windowEnd: string;
  ascendantSign: string;
  midheavenSign: string;
  sunHouse: number;
  moonSign: string;
  moonHouse: number;
  planets: YearAheadPlacement[];
  angularPlanets: string[];
  houseEmphasis: { house: number; planets: string[] }[];
  aspectsToSun: {
    planet: string;
    aspect: string;
    orb: number;
    type: AspectType;
  }[];
}

/**
 * "Your Year Ahead" — the birthday-to-birthday reading. Plain language leads;
 * `why` and `chart` are the progressive-disclosure half.
 */
export interface YearAhead {
  start: string;
  end: string;
  age: number;
  headline: string;
  overview: string;
  strengths: ForecastTheme[];
  tender: ForecastTheme[];
  turningPoints: { month: string; label: string }[];
  why: string;
  focusAreas: LifeArea[];
  chart: YearAheadChart;
}

// ─── Compatibility / synastry (mirror apps/api) ──────────────────────────────
export interface SynastryTopAspect {
  planetA: string;
  planetB: string;
  aspect: string;
  nature: AspectType;
  orb: number;
  categories: ("love" | "communication" | "stability" | "friction")[];
  weight: number;
}

export type SynastryDimensionKey =
  | "attraction"
  | "intimacy"
  | "communication"
  | "values"
  | "commitment"
  | "conflict"
  | "enmeshment";

export interface SynastryDimensionScore {
  key: SynastryDimensionKey;
  value: number; // 0-100
  lowerIsBetter: boolean;
}

export interface CompatibilityScore {
  overall: number;
  dimensions: SynastryDimensionScore[]; // the same 7 for every couple
  aspectCount: number;
  topAspects: SynastryTopAspect[];
  locked: boolean;
}

export interface CompatibilityReading {
  text: string;
  headline: string;
}

/** A second person entered for compatibility (mirror SavedPerson on the API). */
export interface SavedPerson {
  id: string;
  label: string;
  relationship?: string | null;
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  unknownTime: boolean;
  placeName?: string | null;
  sunSign: string;
  moonSign: string;
  risingSign: string;
  createdAt: string;
  updatedAt: string;
}

export interface SavePersonInput {
  label: string;
  relationship?: string;
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  unknownTime?: boolean;
  placeName?: string;
}

// ─── Companion (chat + guidance) ─────────────────────────────────────────────
export type GuidanceTopic =
  | "love"
  | "work"
  | "money"
  | "decision"
  | "person"
  | "mood"
  | "general";

export interface GuidanceAnswer {
  topic: string;
  takeaway: string;
  why: string;
  actions: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  takeaway?: string;
  why?: string;
  createdAt: string;
}

export interface ChatReply {
  reply: string;
  takeaway?: string;
  why?: string;
}

// ─── Intentions (daily practice) ─────────────────────────────────────────────
export interface Intention {
  id: string;
  goalText: string;
  category: string;
  lifeArea: LifeArea;
  affirmation: string;
  dailyTarget: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  progress: { count: number; target: number };
  streak: { currentStreak: number; longestStreak: number };
}

export interface IntentionSuggestion {
  goal: string;
  why: string;
  lifeArea: LifeArea;
}

export interface CreateIntentionInput {
  goalText: string;
  category: string;
  lifeArea?: LifeArea;
  dailyTarget: number;
}

export interface CheckInInput {
  conviction: number;
  userText?: string;
  inputMode?: "text" | "voice";
  transcript?: string;
}

export interface CheckInResult {
  response: string;
  conviction: number;
  followUp: string;
  strongerPhrasing?: string;
  progress: { count: number; target: number };
  dayCompleted: boolean;
  streak: { currentStreak: number; longestStreak: number };
  milestoneName: string | null;
}

export interface IntentionCheckInHistory {
  id: string;
  date: string;
  conviction: number;
  userText?: string | null;
  aiResponse: string;
  createdAt: string;
}

// ─── Affirmations (device-local practice) ─────────────────────────────────────

export type AffirmationCategory = "money" | "love" | "career" | "health" | "confidence" | "calm";

/**
 * One affirmation. Built-ins carry an i18n key (`builtinKey`) so they follow
 * the app language; the user's own carry their `text` verbatim.
 */
export interface Affirmation {
  id: string;
  category: AffirmationCategory;
  builtinKey?: string;
  text?: string;
  custom: boolean;
  createdAt: string;
}

/** What the user did on one calendar day ("YYYY-MM-DD", local time). */
export interface AffirmationDay {
  date: string;
  /** Affirmation ids ticked as done that day. */
  done: string[];
  /** Times each affirmation was repeated that day. */
  reps: Record<string, number>;
}

// ─── Tarot (mirrors apps/api/src/modules/tarot/tarot.types.ts) ────────────────

export type TarotCategory = "general" | "love" | "career" | "money" | "health" | "spiritual";

/** One drawn card; its index in the spread is its position (0..2). */
export interface TarotDrawnCard {
  cardId: string;
  reversed: boolean;
}

export interface TarotSpread {
  category: TarotCategory;
  question?: string;
  cards: TarotDrawnCard[];
}

export interface TarotCardReading {
  cardId: string;
  position: number;
  positionName: string;
  reversed: boolean;
  headline: string;
  keywords: string[];
  /** The card's imagery and archetype, upright or reversed. */
  essence: string;
  /** What the card says in this position of the spread. */
  inPosition: string;
  /** Personal reading: category + question + chart + the day's sky. */
  forYou: string;
  shadow: string;
  advice: string;
  /** Golden Dawn astrological correspondence. */
  astro: string;
}

export interface TarotSynthesis {
  title: string;
  story: string;
  guidance: string[];
  affirmation: string;
}
