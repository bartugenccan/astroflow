import { USE_HTTP } from "./config";
import { delay } from "./delay";
import { request } from "./httpAstrologyApi";
import type {
  MascotDelta,
  MascotEventKind,
  MascotEventResult,
  MascotState,
} from "./types";
import {
  ABILITIES,
  CATALOG,
  EVENT_RULES,
  MAX_SHIELDS,
  SHIELD_MIN_STAGE,
  STAGES,
  catalogItem,
  energyFor,
  isoWeek,
  lunarWindow,
  moodFor,
  stageBounds,
  stageFor,
} from "../lib/mascotRules";

/** Aster's growth API: the server is authoritative, the mock mirrors its rules offline. */
export interface MascotApi {
  getMascot(): Promise<MascotState>;
  /** Report a device-side positive action (affirmation, tarot, ritual, reflection, breath). */
  reportEvent(kind: MascotEventKind): Promise<MascotEventResult>;
  purchase(itemId: string): Promise<MascotState>;
  equip(itemIds: string[]): Promise<MascotState>;
}

const httpMascotApi: MascotApi = {
  getMascot: () => request<MascotState>("GET", "mascot"),
  reportEvent: (kind) => request<MascotEventResult>("POST", "mascot/events", { kind }),
  purchase: (itemId) => request<MascotState>("POST", "mascot/purchase", { itemId }),
  equip: (itemIds) => request<MascotState>("POST", "mascot/equip", { itemIds }),
};

// ─── Offline mock (same rules as MascotService) ─────────────────────────────

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
};

export class MascotRequestError extends Error {}

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
  let xpGained = 0;
  if (key !== null) {
    mock.events.push({ kind, day: today, refKey: key });
    xpGained = rule.xp;
  }
  const hatchNow = !!opts.hatch && !mock.hatched;
  mock.xp += xpGained;
  mock.stardust += xpGained;
  if (hatchNow) mock.hatched = true;
  mock.stage = stageFor(mock.xp, mock.hatched);
  const energy = energyFor(mock.events.filter((e) => e.day === today).map((e) => e.kind));
  return {
    kind,
    xpGained,
    stardustGained: xpGained,
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
  });
}

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
};

export const mascotApi: MascotApi = USE_HTTP ? httpMascotApi : mockMascotApi;
