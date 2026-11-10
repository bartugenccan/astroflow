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

/** A linked account, as GET /auth/me returns it. */
export interface AccountInfo {
  id: string;
  providers: AuthProviderId[];
  email: string | null;
  displayName: string | null;
}

export type AuthProviderId = "apple" | "google" | "email";

/** POST /auth/{apple,google,email/verify}. `token` is set when the install switched to the account (sign-in). */
export interface LinkResult {
  account: AccountInfo;
  token: string | null;
  signedIn: boolean;
  /** The one-time stardust thank-you for protecting Aster (null when already given). */
  mascot?: MascotDelta | null;
}

/** GET /me/profile — the saved chart plus display fields. */
export interface SavedProfile extends Omit<BirthProfileResponse, "placeName"> {
  displayName: string | null;
  placeName: string | null;
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
  streak: IntentionStreakInfo;
  /** How the wish star shines — from care, not from days. */
  star?: WishStar;
  manifestedAt?: string | null;
  /** The new moon (UTC date) the wish waits for, when planted for it. */
  plantedMoon?: string | null;
  natalHouse?: number | null;
  /** Present on create: what setting it did for Aster (first one hatches the egg). */
  mascot?: MascotDelta | null;
  /** Report card; only on the single-manifest read. */
  stats?: IntentionStats;
}

export interface IntentionStats {
  daysActive: number;
  checkIns: number;
  practiceDays: number;
  longestStreak: number;
  /** Conviction (1–5) of the last check-ins, oldest first, at most 30. */
  convictionTrend: number[];
}

/** Something the user noticed on the way to a manifest. */
export interface IntentionSign {
  id: string;
  text: string;
  date: string;
  createdAt: string;
}

export interface SignResult {
  sign: IntentionSign;
  mascot: MascotDelta | null;
}

export type StarState = "seed" | "spark" | "glowing" | "radiant";

export interface WishStar {
  state: StarState;
  /** Quiet for a few days — shown softly, never dimmed. */
  resting: boolean;
  /** Planted for a new moon that hasn't come yet. */
  waiting: boolean;
}

/** Where a life area lives in the natal chart. */
export interface LifeAreaContext {
  area: LifeArea;
  house: number;
  sign: string | null;
  ruler: string | null;
  rulerSign: string | null;
  rulerHouse: number | null;
  planets: string[];
  /** Birth time unknown → houses are only a sketch. */
  approximate: boolean;
}

export interface PowerDay {
  date: string;
  locked: boolean;
  score: number | null;
  reason: { transitPlanet: string; natalPlanet: string; aspect: string; nature: AspectNature } | null;
}

export interface PowerDays {
  area: LifeArea;
  stage: number;
  visible: number;
  days: PowerDay[];
}

export interface IntentionStreakInfo {
  currentStreak: number;
  longestStreak: number;
  /** Shields Aster spent on this read to keep the streak alive. */
  shieldsUsed?: number;
  lastActiveDate?: string | null;
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
  /** The affirmation kept or edited in the wizard; generated when absent. */
  affirmation?: string;
  /** Plant now, or wait for the next new moon. */
  plant?: "now" | "newMoon";
}

export interface CheckInInput {
  conviction: number;
  userText?: string;
  inputMode?: "text" | "voice";
  transcript?: string;
}

// ─── Manifest practice (device-local record of what was practised) ─────────────

/**
 * The four guided manifest methods:
 *   script    — write it on paper as if it already happened (a check-in with text)
 *   read      — read the affirmation aloud, three times (an AFFIRMATION event)
 *   369       — write the line 3× in the morning, 6× at noon, 9× in the evening
 *               (each session is a check-in; three per day, like the CHECKIN cap)
 *   visualize — a minute of breathing with Aster, then three lines of gratitude
 *               (a BREATH event; the gratitude stays on the device)
 */
export type PracticeMethod = "script" | "read" | "369" | "visualize";

/** The three 3-6-9 sessions of a local day. */
export type PracticeSlot = "morning" | "noon" | "evening";

/** What was practised on one local day. */
export interface PracticeDay {
  script?: boolean;
  /** Times read aloud today. */
  read?: number;
  s369?: Partial<Record<PracticeSlot, boolean>>;
  visualize?: boolean;
}

export interface CheckInResult {
  response: string;
  conviction: number;
  followUp: string;
  strongerPhrasing?: string;
  progress: { count: number; target: number };
  dayCompleted: boolean;
  streak: IntentionStreakInfo;
  milestoneName: string | null;
  mascot?: MascotDelta | null;
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
  /** "three" (default) or the five-card "decision" spread (Glimmer). */
  spread?: TarotSpreadKey;
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

// ─── Election (mirrors apps/api/src/modules/election/election.types.ts) ───────

export type ElectionEventId =
  | "engagement"
  | "wedding"
  | "proposal"
  | "first_date"
  | "business_launch"
  | "contract"
  | "job_interview"
  | "investment"
  | "moving"
  | "travel"
  | "new_beginning";

export type ElectionVerdict = "excellent" | "good" | "mixed" | "avoid";
export type ElectionTone = "good" | "bad" | "neutral";

export interface ElectionFactor {
  key: "moon_phase" | "moon_voc" | "moon_sign" | "moon_aspect" | "retrograde" | "eclipse" | "combust" | "natal";
  tone: ElectionTone;
  impact: number;
  label: string;
}

export interface ElectionHourWindow {
  from: string;
  to: string;
  score: number;
  /** Rising sign of the event chart (English, canonical). */
  ascendant: string;
  highlights: string[];
}

export interface ElectionPlace {
  name: string;
  latitude: number;
  longitude: number;
}

export interface ElectionEventRef {
  id: ElectionEventId;
  label: string;
  fromText?: string;
}

export interface ElectionDay {
  date: string;
  score: number;
  verdict: ElectionVerdict;
  factors: ElectionFactor[];
}

export interface ElectionCheck extends ElectionDay {
  event: ElectionEventRef;
  place: ElectionPlace;
  hours: ElectionHourWindow[];
  alternatives: { date: string; score: number; verdict: ElectionVerdict }[];
}

export interface ElectionPick extends ElectionDay {
  bestHour: ElectionHourWindow | null;
}

export interface ElectionAvoid {
  kind: "retrograde" | "eclipse";
  from: string;
  to: string;
  label: string;
}

export interface ElectionSearch {
  event: ElectionEventRef;
  place: ElectionPlace;
  from: string;
  to: string;
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

/** What the reader is asking — one date, or the best dates in a month range. */
export type ElectionCheckQuery = {
  mode: "check";
  eventId?: ElectionEventId;
  eventText?: string;
  place: ElectionPlace;
  date: string;
};
export type ElectionSearchQuery = {
  mode: "search";
  eventId?: ElectionEventId;
  eventText?: string;
  place: ElectionPlace;
  from: string;
  to: string;
};
export type ElectionQuery = ElectionCheckQuery | ElectionSearchQuery;

// ─── PDF reports (mirrors apps/api/src/modules/reports/reports.types.ts) ──────

export type ReportKind = "natal" | "transit";
export type ReportStatus = "queued" | "running" | "ready" | "failed";

export interface ReportMeta {
  id: string;
  kind: ReportKind;
  status: ReportStatus;
  progress: number;
  total: number;
  stage: string | null;
  name: string;
  locale: string;
  createdAt: string;
  error: string | null;
}

export interface ReportBirth {
  birthDate: string;
  birthTime: string;
  unknownTime: boolean;
  latitude: number;
  longitude: number;
  placeName?: string;
}

export interface NatalBalance {
  elements: Record<"Fire" | "Earth" | "Air" | "Water", number>;
  modalities: Record<"Cardinal" | "Fixed" | "Mutable", number>;
  dominantElement: string;
  dominantModality: string;
  chartRuler: { planet: string; sign: string; house: number } | null;
}

export interface NatalExtras {
  balance: string;
  chartRuler: string;
  themes: { love: string; career: string; money: string; growth: string };
  closing: string;
}

export interface NatalReportData {
  kind: "natal";
  name: string;
  birth: ReportBirth;
  generatedAt: string;
  chart: NatalChartData;
  bigThree: BigThreeReading;
  overview: ChartOverview;
  context: ChartContext;
  placements: PlacementInterpretation[];
  houses: HouseInterpretation[];
  aspects: AspectInterpretation[];
  nodes: NodeAnalysis;
  balance: NatalBalance;
  extras: NatalExtras;
}

export type TimelineEventKind = "aspect" | "house_ingress" | "sign_ingress" | "station" | "eclipse";

export interface TimelineEvent {
  id: string;
  kind: TimelineEventKind;
  planet: string;
  target?: string;
  aspect?: string;
  nature?: "harmonic" | "challenging" | "neutral";
  house?: number;
  sign?: string;
  direction?: "retrograde" | "direct";
  eclipse?: "solar" | "lunar";
  start: string;
  end: string;
  exact: string[];
  weight: number;
  label?: string;
}

export interface TransitSpotlight {
  eventId: string;
  title: string;
  text: string;
  howToUse: string;
}

export interface TransitQuarter {
  from: string;
  to: string;
  title: string;
  text: string;
  focus: string[];
}

export interface TransitReportData {
  kind: "transit";
  name: string;
  birth: ReportBirth;
  generatedAt: string;
  chart: NatalChartData;
  today: { report: TransitReport; overview: TransitOverview; details: TransitDetail[] };
  timeline: { from: string; to: string; events: TimelineEvent[] };
  spotlights: TransitSpotlight[];
  quarters: TransitQuarter[];
}

export type ReportData = NatalReportData | TransitReportData;

export interface CreateReportInput {
  kind: ReportKind;
  name: string;
  placeName?: string;
  unknownTime?: boolean;
}

// ─── Aster (the growing star mascot) ─────────────────────────────────────────
export type MascotEventKind =
  | "INTENTION_CREATE"
  | "CHECKIN"
  | "DAY_COMPLETE"
  | "MILESTONE"
  | "SKY_READ"
  | "AFFIRMATION"
  | "TAROT"
  | "MOON_RITUAL"
  | "EVENING_REFLECTION"
  | "BREATH"
  | "SKY_CHECKIN"
  | "JOURNEY_RETURN"
  | "MANIFESTED"
  | "ACCOUNT_LINKED"
  | "SKY_LESSON"
  | "SIGN_LOG";

export type MascotMood = "sleepy" | "happy" | "glowing";
export type AccessorySlot = "head" | "neck" | "hand" | "aura";

export interface MascotDelta {
  kind: MascotEventKind;
  xpGained: number;
  stardustGained: number;
  xp: number;
  stardust: number;
  stage: number;
  previousStage: number;
  leveledUp: boolean;
  hatched: boolean;
  energy: number;
}

export interface MascotCatalogItem {
  id: string;
  kind: "accessory" | "shield" | "pass";
  slot?: AccessorySlot;
  /** For passes: the metered feature it tops up. */
  pass?: PassFeature;
  price: number;
  minStage: number;
  owned: boolean;
  locked: boolean;
}

export interface MascotAbility {
  key: "skyWhisper" | "streakShield" | "powerDays" | "weeklyLetter" | "novaTheme";
  minStage: number;
  unlocked: boolean;
  /** False while the ability is still "coming soon". */
  available: boolean;
}

/** Harita Yolu chapters, in path order. */
export type SkyLessonKey =
  | "bigThree"
  | "chartMood"
  | "personal"
  | "housesSelf"
  | "housesWorld"
  | "aspects"
  | "jupiterSaturn"
  | "nodes";

export type LessonStatus = "done" | "open" | "lockedPrev" | "lockedStage";

export interface SkyPathChapter {
  key: SkyLessonKey;
  status: LessonStatus;
  minStage: number;
  /** Yıldız Tozu to open it before the stage; 0 = never sold. */
  earlyPrice: number;
  /** Bought early. */
  early: boolean;
}

export type PassFeature = "tarot" | "chat";
export type TarotSpreadKey = "three" | "decision";

/** What the next stage opens, and the Işık still to earn for it. */
export interface NextUnlocks {
  stage: number;
  lessons: SkyLessonKey[];
  spreads: TarotSpreadKey[];
  abilities: string[];
  items: string[];
  xpNeeded: number;
}

export interface LessonResult {
  delta: MascotDelta;
  state: MascotState;
}

export interface AsterLetter {
  week: string;
  greeting: string;
  body: string;
  highlight: string;
  ahead: string;
  createdAt: string;
}

export interface MascotState {
  xp: number;
  stardust: number;
  stage: number;
  stageKey: "egg" | "spark" | "starling" | "glimmer" | "constellation" | "nova";
  hatched: boolean;
  stageFloorXp: number;
  nextStageXp: number | null;
  energy: number;
  mood: MascotMood;
  shields: number;
  maxShields: number;
  equipped: string[];
  owned: string[];
  today: Partial<Record<MascotEventKind, number>>;
  abilities: MascotAbility[];
  catalog: MascotCatalogItem[];
  /** The device-wide "I showed up" streak. */
  orbit: OrbitView;
  /** A chosen rest: streaks pause, quests and nudges go quiet. */
  eclipse: EclipseView;
  journey: JourneyView;
  /** Today's sky check-in, if done. */
  skyCheckIn: { sky: MoodSky; energy: number } | null;
  constellations: { found: number; total: number };
  /** Harita Yolu: every chapter and where it stands. */
  skyPath: SkyPathChapter[];
  /** Premium tastes bought today (extra uses on top of the free allowance). */
  passesToday: Partial<Record<PassFeature, number>>;
  /** What the next stage opens; null at Nova or before hatching. */
  nextUnlocks: NextUnlocks | null;
  /** Nova look switched on (stage 5 only). */
  novaLook: boolean;
}

export interface OrbitView {
  streak: number;
  best: number;
  countedToday: boolean;
  /** Alive, but today isn't counted yet. */
  atRisk: boolean;
}

export interface EclipseView {
  active: boolean;
  start: string | null;
  end: string | null;
  maxDays: number;
}

export type JourneyStatus = "locked" | "ready" | "away" | "returned" | "claimed";

export interface JourneyDiscovery {
  transitPlanet: string;
  aspect: string;
  natalPoint: string;
  nature: AspectNature;
  orb: number;
  sign: string;
  title: string;
  body: string;
  /** In-app deep link ("See it in your chart"). */
  link: string;
}

export interface JourneyView {
  status: JourneyStatus;
  minEnergy: number;
  returnsAt: string | null;
  /** Only once Aster is back. */
  discovery: JourneyDiscovery | null;
  constellationKey: string | null;
  completed: number;
  shieldEvery: number;
}

export interface JourneyClaim {
  delta: MascotDelta;
  discovery: JourneyDiscovery;
  constellationKey: string;
  duplicate: boolean;
  bonusStardust: number;
  shieldGranted: boolean;
  state: MascotState;
}

export interface ConstellationEntry {
  key: string;
  found: boolean;
  count: number;
  firstFoundAt: string | null;
}

export type MoodSky = "RADIANT" | "CLEAR" | "PARTLY" | "CLOUDY" | "STORMY";

export interface MoodReply {
  /** i18n key: mood.reply.<SKY>. */
  replyKey: string;
  moon: { sign: string; natalHouse: number } | null;
  suggestBreath: boolean;
}

export interface MoodCheckInResult {
  delta: MascotDelta;
  reply: MoodReply;
  state: MascotState;
}

// ─── Personal sky plan ───────────────────────────────────────────────────────

export type AspectNature = "harmonic" | "challenging" | "neutral";

export interface PlanWhy {
  transitPlanet: string;
  aspect: string;
  natalPoint: string;
  nature: AspectNature;
}

export interface PlanPrefill {
  category?: AffirmationCategory;
  intentionId?: string;
  area?: LifeArea;
  questionKey?: string;
  questionParams?: Record<string, string>;
}

export interface PlanStep {
  kind: MascotEventKind;
  titleKey: string;
  why: PlanWhy | null;
  whyKey?: string;
  prefill?: PlanPrefill;
}

export interface DailyPlan {
  date: string;
  focusArea: LifeArea;
  focusWhy: PlanWhy | null;
  moon: { sign: string; natalHouse: number } | null;
  powerIntentionId: string | null;
  gentle: boolean;
  anchors: PlanStep[];
  steps: PlanStep[];
  week: { date: string; area: LifeArea; score: number }[];
}

export interface MascotEventResult {
  delta: MascotDelta;
  state: MascotState;
}
