import { AspectType } from './astrology.constants';

export type Locale = 'en' | 'tr';
export type EnergyState = 'HARMONY' | 'MOMENTUM' | 'STRESS' | 'OVERLOAD';

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

export interface DailyInsight {
  energyState: EnergyState;
  title: string;
  summary: string;
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
  sect: 'day' | 'night';
  saturnReturnAge: number;
  saturnSign: string;
  saturnHouse: number;
  text: string;
}

export interface TransitAspectRef {
  natalPlanet: string;
  natalSign: string;
  aspect: string;
  nature: AspectType;
  orb: number;
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

export interface CompatibilityReading {
  text: string;
  headline: string; // short, shareable one-liner
}

export type ForecastPeriod = 'weekly' | 'monthly';

export interface ForecastTheme {
  area: 'love' | 'career' | 'money' | 'energy';
  text: string;
}

export interface Forecast {
  period: ForecastPeriod;
  start: string; // YYYY-MM-DD (week start) or YYYY-MM-01 (month)
  overview: string;
  themes: ForecastTheme[];
  keyDates: { date: string; label: string }[];
}

/**
 * The Solar Return reading, presented as "Your Year Ahead".
 *
 * Same contract as `GuidanceAnswer`: the plain-language half is what the UI
 * leads with, `why` carries the astrology and is only revealed on demand. The
 * caller pairs this with the raw `YearAheadChart` for the expanded view.
 */
export interface YearAhead {
  /** Birthday-to-birthday window, YYYY-MM-DD. */
  start: string;
  end: string;
  /** Age the person turns in this cycle. */
  age: number;
  /** One line naming what the year is about. No jargon. */
  headline: string;
  overview: string;
  /** What the year supports, and what it asks for care around. */
  strengths: ForecastTheme[];
  tender: ForecastTheme[];
  /** Dated-to-the-month moments worth watching, in plain language. */
  turningPoints: { month: string; label: string }[];
  /** The astrology reasoning, revealed under "show me why". */
  why: string;
}

/** A question-first, plain-language answer: takeaway up front, why on demand. */
export interface GuidanceAnswer {
  topic: string;
  takeaway: string; // the plain-language headline
  why: string; // the astrology reasoning (revealed on "show me why")
  actions: string[]; // 1-3 concrete suggestions
}
