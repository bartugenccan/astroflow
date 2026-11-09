import { USE_HTTP } from "./config";
import { delay } from "./delay";
import { request } from "./httpAstrologyApi";
import type {
  ConstellationEntry,
  JourneyClaim,
  JourneyDiscovery,
  MascotDelta,
  MascotEventKind,
  MascotEventResult,
  MascotState,
  MoodCheckInResult,
  MoodSky,
} from "./types";
import type { Locale } from "../i18n";
import {
  ABILITIES,
  CATALOG,
  DUPLICATE_STARDUST,
  ECLIPSE_MAX_DAYS,
  EVENT_RULES,
  JOURNEY_HOURS,
  JOURNEY_MIN_ENERGY,
  MAX_SHIELDS,
  SHIELD_EVERY_JOURNEYS,
  SHIELD_MIN_STAGE,
  STAGES,
  advanceOrbit,
  catalogItem,
  eclipseActive,
  eclipseDays,
  energyFor,
  isoWeek,
  journeyEarnsShield,
  journeyStatus,
  lunarWindow,
  moodFor,
  shiftDays,
  stageBounds,
  stageFor,
  stardustFor,
  viewOrbit,
} from "../lib/mascotRules";
import { ALL_CONSTELLATIONS, pickConstellation } from "../lib/constellations";
import { useAppStore } from "../store/useAppStore";

/** Aster's growth API: the server is authoritative, the mock mirrors its rules offline. */
export interface MascotApi {
  getMascot(): Promise<MascotState>;
  /** Report a device-side positive action (affirmation, tarot, ritual, reflection, breath). */
  reportEvent(kind: MascotEventKind): Promise<MascotEventResult>;
  purchase(itemId: string): Promise<MascotState>;
  equip(itemIds: string[]): Promise<MascotState>;
  /** Send Aster on today's journey (needs energy; once a day). */
  launchJourney(locale: Locale): Promise<MascotState>;
  /** Open what Aster brought back. */
  claimJourney(): Promise<JourneyClaim>;
  /** Morning sky check-in: a label and a 1–5 energy, nothing else. */
  checkInMood(sky: MoodSky, energy: number): Promise<MoodCheckInResult>;
  startEclipse(days: number): Promise<MascotState>;
  endEclipse(): Promise<MascotState>;
  getConstellations(): Promise<ConstellationEntry[]>;
}

const httpMascotApi: MascotApi = {
  getMascot: () => request<MascotState>("GET", "mascot"),
  reportEvent: (kind) => request<MascotEventResult>("POST", "mascot/events", { kind }),
  purchase: (itemId) => request<MascotState>("POST", "mascot/purchase", { itemId }),
  equip: (itemIds) => request<MascotState>("POST", "mascot/equip", { itemIds }),
  launchJourney: (locale) => request<MascotState>("POST", "mascot/journey/launch", undefined, { locale }),
  claimJourney: () => request<JourneyClaim>("POST", "mascot/journey/claim"),
  checkInMood: (sky, energy) => request<MoodCheckInResult>("POST", "mascot/mood", { sky, energy }),
  startEclipse: (days) => request<MascotState>("POST", "mascot/eclipse", { days }),
  endEclipse: () => request<MascotState>("DELETE", "mascot/eclipse"),
  getConstellations: () => request<ConstellationEntry[]>("GET", "mascot/constellations"),
};

// ─── Offline mock (same rules as MascotService / JourneyService) ────────────

function localDay(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface MockEvent {
  kind: MascotEventKind;
  day: string;
  refKey: string;
}

interface MockJourney {
  day: string;
  returnsAt: Date;
  claimedAt: Date | null;
  discovery: JourneyDiscovery;
  constellationKey: string;
  duplicate: boolean;
}

/** A handful of plausible transits so the mock journey has something real-looking to bring back. */
const MOCK_DISCOVERIES: Omit<JourneyDiscovery, "link">[] = [
  {
    transitPlanet: "Venus",
    aspect: "Trine",
    natalPoint: "Moon",
    nature: "harmonic",
    orb: 0.8,
    sign: "Libra",
    title: "A soft heart day",
    body: "Venus is warming your natal Moon, so kindness lands easily today. Send one message you've been meaning to send.",
  },
  {
    transitPlanet: "Mars",
    aspect: "Square",
    natalPoint: "Sun",
    nature: "challenging",
    orb: 1.2,
    sign: "Capricorn",
    title: "Friction with a purpose",
    body: "Mars is pushing on your natal Sun, so patience may run short. Put that drive into one task before lunch.",
  },
  {
    transitPlanet: "Jupiter",
    aspect: "Sextile",
    natalPoint: "Mercury",
    nature: "harmonic",
    orb: 1.5,
    sign: "Cancer",
    title: "Words open doors",
    body: "Jupiter is widening your natal Mercury, so ideas travel further today. Pitch the thing you keep rehearsing.",
  },
];

const mock = {
  xp: 0,
  stardust: 0,
  stage: 0,
  hatched: false,
  shields: 0,
  lastFreeShieldWeek: null as string | null,
  owned: [] as string[],
  equipped: [] as string[],
  events: [] as MockEvent[],
  orbit: { streak: 0, best: 0, lastDate: null as string | null },
  eclipse: { start: null as string | null, end: null as string | null },
  journeys: [] as MockJourney[],
  journeysCompleted: 0,
  constellations: new Map<string, { count: number; firstFoundAt: string }>(),
  moods: new Map<string, { sky: MoodSky; energy: number }>(),
};

export class MascotRequestError extends Error {}

function todayJourney(today = localDay()): MockJourney | null {
  return mock.journeys.find((j) => j.day === today) ?? null;
}

function mockView(): MascotState {
  const today = localDay();
  if (mock.stage >= SHIELD_MIN_STAGE && mock.lastFreeShieldWeek !== isoWeek(today)) {
    mock.lastFreeShieldWeek = isoWeek(today);
    if (mock.shields < MAX_SHIELDS) mock.shields += 1;
  }
  const kinds = mock.events.filter((e) => e.day === today).map((e) => e.kind);
  const counts: Partial<Record<MascotEventKind, number>> = {};
  for (const k of kinds) counts[k] = (counts[k] ?? 0) + 1;
  const energy = energyFor(kinds);
  const { floor, next } = stageBounds(mock.stage);
  const resting = eclipseActive(mock.eclipse, today);
  const journey = todayJourney(today);
  const status = journeyStatus(journey, energy, resting, new Date());
  const back = status === "returned" || status === "claimed";
  return {
    xp: mock.xp,
    stardust: mock.stardust,
    stage: mock.stage,
    stageKey: STAGES[mock.stage].key,
    hatched: mock.hatched,
    stageFloorXp: floor,
    nextStageXp: next,
    energy,
    mood: moodFor(energy),
    shields: mock.shields,
    maxShields: MAX_SHIELDS,
    equipped: [...mock.equipped],
    owned: [...mock.owned],
    today: counts,
    abilities: ABILITIES.map((a) => ({
      key: a.key,
      minStage: a.minStage,
      unlocked: mock.stage >= a.minStage,
      available: a.available,
    })),
    catalog: CATALOG.map((item) => ({
      ...item,
      owned: mock.owned.includes(item.id),
      locked: mock.stage < item.minStage,
    })),
    orbit: viewOrbit(mock.orbit, today, mock.shields, eclipseDays(mock.eclipse)),
    eclipse: { active: resting, start: mock.eclipse.start, end: mock.eclipse.end, maxDays: ECLIPSE_MAX_DAYS },
    journey: {
      status,
      minEnergy: JOURNEY_MIN_ENERGY,
      returnsAt: journey?.returnsAt.toISOString() ?? null,
      discovery: back ? (journey?.discovery ?? null) : null,
      constellationKey: back ? (journey?.constellationKey ?? null) : null,
      completed: mock.journeysCompleted,
      shieldEvery: SHIELD_EVERY_JOURNEYS,
    },
    skyCheckIn: mock.moods.get(today) ?? null,
    constellations: { found: mock.constellations.size, total: ALL_CONSTELLATIONS.length },
  };
}

/** Mirror of MascotService.award, used by the mock intentions API too. */
export function mockAward(kind: MascotEventKind, refKey = "", opts: { hatch?: boolean } = {}): MascotDelta {
  const rule = EVENT_RULES[kind];
  const today = localDay();
  const previousStage = mock.stage;
  const todayCount = mock.events.filter((e) => e.kind === kind && e.day === today).length;
  let key: string | null = null;
  if (todayCount < rule.dailyCap) {
    if (rule.mode === "slot") key = String(todayCount + 1);
    else if (rule.mode === "ref") {
      key = mock.events.some((e) => e.kind === kind && e.day === today && e.refKey === refKey) ? null : refKey;
    } else {
      key = mock.events.some((e) => e.kind === kind && e.refKey === refKey) ? null : refKey;
    }
  }
  const awarded = key !== null;
  if (awarded) {
    mock.events.push({ kind, day: today, refKey: key as string });
    if (kind !== "ACCOUNT_LINKED" && mock.orbit.lastDate !== today) {
      const next = advanceOrbit(mock.orbit, today, mock.shields, eclipseDays(mock.eclipse));
      mock.orbit = { streak: next.streak, best: next.best, lastDate: next.lastDate };
      mock.shields -= Math.min(next.shieldsUsed, mock.shields);
    }
  }
  const xpGained = awarded ? rule.xp : 0;
  const stardustGained = awarded ? stardustFor(kind) : 0;
  const hatchNow = !!opts.hatch && !mock.hatched;
  mock.xp += xpGained;
  mock.stardust += stardustGained;
  if (hatchNow) mock.hatched = true;
  mock.stage = stageFor(mock.xp, mock.hatched);
  const energy = energyFor(mock.events.filter((e) => e.day === today).map((e) => e.kind));
  return {
    kind,
    xpGained,
    stardustGained,
    xp: mock.xp,
    stardust: mock.stardust,
    stage: mock.stage,
    previousStage,
    leveledUp: mock.stage > previousStage,
    hatched: hatchNow,
    energy,
  };
}

/** Mock shields for the mock intentions streak. */
export function mockShieldCount(): number {
  return mock.shields;
}

/** Mock mood for the mock plan. */
export function mockTodayMood(): MoodSky | null {
  return mock.moods.get(localDay())?.sky ?? null;
}

export function mockResetMascot(): void {
  Object.assign(mock, {
    xp: 0,
    stardust: 0,
    stage: 0,
    hatched: false,
    shields: 0,
    lastFreeShieldWeek: null,
    owned: [],
    equipped: [],
    events: [],
    orbit: { streak: 0, best: 0, lastDate: null },
    eclipse: { start: null, end: null },
    journeys: [],
    journeysCompleted: 0,
    constellations: new Map(),
    moods: new Map(),
  });
}

/** Offline, Aster is away a minute rather than hours, so the loop can be tried end to end. */
const MOCK_AWAY_MS = __DEV__ ? 60_000 : JOURNEY_HOURS * 3_600_000;

const mockMascotApi: MascotApi = {
  async getMascot() {
    await delay(200);
    return mockView();
  },
  async reportEvent(kind) {
    await delay(200);
    let refKey = "";
    if (kind === "MOON_RITUAL") {
      const w = lunarWindow(new Date());
      if (!w) throw new MascotRequestError("No new or full moon right now");
      refKey = `${w.phase}:${w.peakDate}`;
    }
    const delta = mockAward(kind, refKey);
    return { delta, state: mockView() };
  },
  async purchase(itemId) {
    await delay(250);
    const item = catalogItem(itemId);
    if (!item) throw new MascotRequestError("Unknown item");
    if (mock.stage < item.minStage) throw new MascotRequestError("Locked");
    if (mock.stardust < item.price) throw new MascotRequestError("Not enough stardust");
    if (item.kind === "shield") {
      if (mock.shields >= MAX_SHIELDS) throw new MascotRequestError("Shield stock is full");
      mock.shields += 1;
    } else {
      if (mock.owned.includes(item.id)) throw new MascotRequestError("Already owned");
      mock.owned.push(item.id);
    }
    mock.stardust -= item.price;
    return mockView();
  },
  async equip(itemIds) {
    await delay(150);
    const bySlot = new Map<string, string>();
    for (const id of itemIds) {
      const item = catalogItem(id);
      if (!item?.slot) continue;
      const free = item.price === 0 && mock.stage >= item.minStage;
      if (mock.owned.includes(id) || free) bySlot.set(item.slot, id);
    }
    mock.equipped = [...bySlot.values()];
    return mockView();
  },
  async launchJourney() {
    await delay(400);
    const view = mockView();
    if (view.journey.status !== "ready") throw new MascotRequestError(`Can't set off (${view.journey.status})`);
    const owned = [...mock.constellations.keys()];
    const pick = MOCK_DISCOVERIES[mock.journeysCompleted % MOCK_DISCOVERIES.length];
    const constellationKey = pickConstellation({
      sunSign: useAppStore.getState().birthProfile?.sunSign ?? null,
      discoverySign: pick.sign,
      owned,
      rolls: [Math.random(), Math.random()],
    });
    mock.journeys.push({
      day: localDay(),
      returnsAt: new Date(Date.now() + MOCK_AWAY_MS),
      claimedAt: null,
      discovery: { ...pick, link: `/chart?planet=${pick.natalPoint}&transit=${pick.transitPlanet}` },
      constellationKey,
      duplicate: owned.includes(constellationKey),
    });
    return mockView();
  },
  async claimJourney() {
    await delay(300);
    const j = todayJourney();
    if (!j || j.claimedAt || Date.now() < j.returnsAt.getTime()) {
      throw new MascotRequestError("No journey to open right now");
    }
    j.claimedAt = new Date();
    const found = mock.constellations.get(j.constellationKey);
    mock.constellations.set(j.constellationKey, {
      count: (found?.count ?? 0) + 1,
      firstFoundAt: found?.firstFoundAt ?? new Date().toISOString(),
    });
    const bonusStardust = j.duplicate ? DUPLICATE_STARDUST : 0;
    mock.stardust += bonusStardust;
    const delta = mockAward("JOURNEY_RETURN", j.day);
    mock.journeysCompleted += 1;
    let shieldGranted = false;
    if (journeyEarnsShield(mock.journeysCompleted) && mock.shields < MAX_SHIELDS) {
      mock.shields += 1;
      shieldGranted = true;
    }
    return {
      delta,
      discovery: j.discovery,
      constellationKey: j.constellationKey,
      duplicate: j.duplicate,
      bonusStardust,
      shieldGranted,
      state: mockView(),
    };
  },
  async checkInMood(sky, energy) {
    await delay(250);
    mock.moods.set(localDay(), { sky, energy });
    const delta = mockAward("SKY_CHECKIN");
    return {
      delta,
      reply: {
        replyKey: `mood.reply.${sky}`,
        moon: { sign: "Cancer", natalHouse: 10 },
        suggestBreath: sky === "CLOUDY" || sky === "STORMY",
      },
      state: mockView(),
    };
  },
  async startEclipse(days) {
    await delay(200);
    const n = Math.max(1, Math.min(ECLIPSE_MAX_DAYS, Math.round(days)));
    const today = localDay();
    mock.eclipse = { start: today, end: shiftDays(today, n - 1) };
    return mockView();
  },
  async endEclipse() {
    await delay(200);
    const today = localDay();
    if (mock.eclipse.start) {
      const end = shiftDays(today, -1);
      mock.eclipse = end < mock.eclipse.start ? { start: null, end: null } : { ...mock.eclipse, end };
    }
    return mockView();
  },
  async getConstellations() {
    await delay(200);
    return ALL_CONSTELLATIONS.map((key) => {
      const c = mock.constellations.get(key);
      return { key, found: !!c, count: c?.count ?? 0, firstFoundAt: c?.firstFoundAt ?? null };
    });
  },
};

export const mascotApi: MascotApi = USE_HTTP ? httpMascotApi : mockMascotApi;
