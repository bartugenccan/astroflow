/** Mirrored in apps/mobile/src/services/types.ts — keep both in sync. */

export const ELECTION_EVENT_IDS = [
  'engagement',
  'wedding',
  'proposal',
  'first_date',
  'business_launch',
  'contract',
  'job_interview',
  'investment',
  'moving',
  'travel',
  'new_beginning',
] as const;
export type ElectionEventId = (typeof ELECTION_EVENT_IDS)[number];

export type ElectionGroup = 'love' | 'business' | 'life';
export type ElectionVerdict = 'excellent' | 'good' | 'mixed' | 'avoid';
export type ElectionTone = 'good' | 'bad' | 'neutral';

/** One computed reason a day/hour is better or worse. Labels are localized templates, never AI. */
export interface ElectionFactor {
  key:
    | 'moon_phase'
    | 'moon_voc'
    | 'moon_sign'
    | 'moon_aspect'
    | 'retrograde'
    | 'eclipse'
    | 'combust'
    | 'natal';
  tone: ElectionTone;
  /** Score contribution (points). */
  impact: number;
  label: string;
}

/** A stretch of the day whose event chart is strongest. Times are local to the place. */
export interface ElectionHourWindow {
  from: string; // "HH:mm"
  to: string; // "HH:mm"
  score: number;
  /** Rising sign of the event chart at the window's best hour (English, canonical). */
  ascendant: string;
  highlights: string[];
}

export interface ElectionEventRef {
  id: ElectionEventId;
  label: string;
  /** The reader's own words, when they typed the event instead of picking one. */
  fromText?: string;
}

export interface ElectionPlace {
  name: string;
  latitude: number;
  longitude: number;
}

export interface ElectionDay {
  date: string; // "YYYY-MM-DD"
  score: number; // 0–100
  verdict: ElectionVerdict;
  factors: ElectionFactor[];
}

export interface ElectionAlternative {
  date: string;
  score: number;
  verdict: ElectionVerdict;
}

export interface ElectionCheck extends ElectionDay {
  event: ElectionEventRef;
  place: ElectionPlace;
  hours: ElectionHourWindow[];
  /** Clearly better days within two weeks either side, best first. */
  alternatives: ElectionAlternative[];
}

export interface ElectionPick extends ElectionDay {
  bestHour: ElectionHourWindow | null;
}

export interface ElectionAvoid {
  kind: 'retrograde' | 'eclipse';
  from: string;
  to: string;
  label: string;
}

export interface ElectionSearch {
  event: ElectionEventRef;
  place: ElectionPlace;
  from: string; // first scanned day
  to: string; // last scanned day
  days: { date: string; score: number }[];
  top: ElectionPick[];
  avoid: ElectionAvoid[];
}

export interface ElectionCheckReading {
  summary: string;
  why: string;
  advice: string;
  caution: string;
}

export interface ElectionSearchReading {
  summary: string;
  tips: string[];
}
