import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { secureStorage } from "../services/secureStorage";
import { mascotApi } from "../services/mascotApi";
import type {
  JourneyClaim,
  LessonResult,
  MascotDelta,
  MascotEventKind,
  MascotState,
  MoodReply,
  MoodSky,
  SkyLessonKey,
} from "../services/types";
import type { Locale } from "../i18n";

export type CelebrationType =
  | "hatch"
  | "levelUp"
  | "reward"
  | "milestone"
  | "shield"
  | "journeyReturn"
  | "manifested"
  | "accountLinked";

/**
 * How loud a celebration is (Duolingo-style tiers):
 *   pill   — a small, non-blocking pill at the top that leaves on its own
 *   moment — the only full-screen beat: Aster hatching or growing a stage
 *   sheet  — a card in a bottom sheet (what Aster brought back from a journey)
 */
export type CelebrationTier = "pill" | "moment" | "sheet";

export function tierOf(type: CelebrationType): CelebrationTier {
  if (type === "hatch" || type === "levelUp") return "moment";
  if (type === "journeyReturn") return "sheet";
  return "pill";
}

/** One thing to celebrate on screen (queued so back-to-back rewards don't collide). */
export interface Celebration {
  id: number;
  type: CelebrationType;
  delta: MascotDelta | null;
  /**
   * reward: Işık to show. Starts at the delta's `xpGained`; rewards that land
   * while one is still waiting or on screen are added to it (one "+30", not
   * three pills in a row).
   */
  amount?: number;
  /** Bumped when a reward is merged into this one, so the pill restarts its timer. */
  bump?: number;
  milestoneName?: string | null;
  shieldsUsed?: number;
  /** journeyReturn: what Aster brought back. */
  journey?: JourneyClaim;
  /** manifested: the wish that came true. */
  wishText?: string;
}

interface MascotStore {
  state: MascotState | null;
  loading: boolean;
  error: boolean;
  queue: Celebration[];
  /** Device-side actions whose report failed (offline); retried on the next refresh. */
  pending: MascotEventKind[];
  /** When the state last came from the server (ms epoch; 0 = not this session). Not persisted. */
  fetchedAt: number;
  /** Re-read Aster's state from the server. */
  refresh: () => Promise<void>;
  /**
   * `refresh`, unless the state was fetched moments ago. For "a screen came
   * into focus": every write path already refreshes on its own, so a tab
   * switch needn't hit the server and re-render every Aster again.
   */
  refreshIfStale: () => Promise<void>;
  /**
   * Turn a server delta into celebrations (hatch → level-up → milestone →
   * reward), then re-read the state so quests and counters catch up.
   */
  applyDelta: (
    delta: MascotDelta | null | undefined,
    extra?: { milestoneName?: string | null; shieldsUsed?: number },
  ) => void;
  /** Report a device-side action; resolves the delta (null on failure / outside a moon window). */
  report: (kind: MascotEventKind) => Promise<MascotDelta | null>;
  purchase: (itemId: string) => Promise<boolean>;
  equip: (itemIds: string[]) => Promise<boolean>;
  /** Send Aster on today's journey. */
  launchJourney: (locale: Locale) => Promise<boolean>;
  /** Open what Aster brought back; queues the journey celebration. */
  claimJourney: () => Promise<JourneyClaim | null>;
  /** Morning sky check-in; resolves Aster's reply. */
  checkInMood: (sky: MoodSky, energy: number) => Promise<MoodReply | null>;
  startEclipse: (days: number) => Promise<boolean>;
  endEclipse: () => Promise<boolean>;
  /** Finish a Harita Yolu chapter; celebrates the Işık it earned. Null on failure. */
  completeLesson: (key: SkyLessonKey) => Promise<LessonResult | null>;
  /** Open a stage-locked chapter now for Yıldız Tozu. */
  unlockLesson: (key: SkyLessonKey) => Promise<boolean>;
  setNovaLook: (on: boolean) => Promise<boolean>;
  /** Queue a celebration that isn't a plain delta (a wish came true, the account is safe). */
  celebrate: (c: Omit<Celebration, "id">) => void;
  dismiss: () => void;
  reset: () => void;
}

let nextId = 1;

/**
 * Append celebrations, folding every new plain reward into a reward that is
 * already queued (or showing). Everything else keeps its place in line.
 */
function enqueue(queue: Celebration[], items: Celebration[]): Celebration[] {
  let out = queue;
  for (const item of items) {
    if (item.type === "reward") {
      const at = out.findIndex((c) => c.type === "reward");
      if (at >= 0) {
        const prev = out[at];
        const merged: Celebration = {
          ...prev,
          delta: item.delta ?? prev.delta,
          amount: (prev.amount ?? 0) + (item.amount ?? 0),
          bump: (prev.bump ?? 0) + 1,
        };
        out = [...out.slice(0, at), merged, ...out.slice(at + 1)];
        continue;
      }
    }
    out = [...out, item];
  }
  return out;
}

/**
 * "Wears nothing" as ONE array. `s.state?.equipped ?? []` in a selector made a
 * fresh array on every store change, re-rendering its component each time.
 */
export const NO_EQUIPPED: string[] = [];

/** How long a fetched state counts as fresh for `refreshIfStale`. */
const FRESH_MS = 30_000;

/** Same server state as before? (Structural; the payload is small JSON.) */
function sameState(a: MascotState | null, b: MascotState | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Kinds worth retrying later: the app reports them itself and the server caps them per day. */
const RETRYABLE: readonly MascotEventKind[] = ["AFFIRMATION", "TAROT", "EVENING_REFLECTION", "BREATH"];

export const useMascotStore = create<MascotStore>()(
  persist(
    (set, get) => ({
      state: null,
      loading: false,
      error: false,
      queue: [],
      pending: [],
      fetchedAt: 0,

      refresh: async () => {
        // With a state on screen already, a background re-read stays quiet:
        // nothing shows a spinner for it, and every `set` re-renders subscribers.
        const quiet = get().state !== null;
        if (!quiet && !get().loading) set({ loading: true });
        try {
          const state = await mascotApi.getMascot();
          const unchanged = sameState(get().state, state);
          set({
            ...(unchanged ? {} : { state }),
            ...(get().loading ? { loading: false } : {}),
            ...(get().error ? { error: false } : {}),
            fetchedAt: Date.now(),
          });
        } catch {
          set({ loading: false, error: true });
          return;
        }
        // Back online: send what couldn't be reported before (oldest first, once each).
        const pending = get().pending;
        if (pending.length) {
          set({ pending: [] });
          for (const kind of pending) await get().report(kind);
        }
      },

      refreshIfStale: async () => {
        const { fetchedAt, loading } = get();
        if (loading || Date.now() - fetchedAt < FRESH_MS) return;
        await get().refresh();
      },

      applyDelta: (rawDelta, extra) => {
        const delta = rawDelta ?? null;
        const items: Celebration[] = [];
        if (delta?.hatched) items.push({ id: nextId++, type: "hatch", delta });
        else if (delta?.leveledUp) items.push({ id: nextId++, type: "levelUp", delta });
        if (extra?.milestoneName) {
          items.push({ id: nextId++, type: "milestone", delta, milestoneName: extra.milestoneName });
        }
        if (extra?.shieldsUsed) {
          items.push({ id: nextId++, type: "shield", delta, shieldsUsed: extra.shieldsUsed });
        }
        if (delta && delta.xpGained > 0 && !delta.hatched && !delta.leveledUp && !extra?.milestoneName) {
          items.push({ id: nextId++, type: "reward", delta, amount: delta.xpGained });
        }
        if (items.length) set((s) => ({ queue: enqueue(s.queue, items) }));
        if (delta) {
          // Reflect the new totals immediately; the refresh fills in quests/energy.
          const cur = get().state;
          if (cur) {
            set({
              state: {
                ...cur,
                xp: delta.xp,
                stardust: delta.stardust,
                stage: delta.stage,
                hatched: cur.hatched || delta.hatched,
                energy: delta.energy,
              },
            });
          }
        }
        get().refresh();
      },

      report: async (kind) => {
        try {
          const { delta, state } = await mascotApi.reportEvent(kind);
          set({ state });
          get().applyDelta(delta);
          return delta;
        } catch (err) {
          // Offline: keep it for later. A server "no" (e.g. no moon window) is final.
          const status = (err as { status?: number })?.status;
          const offline = status === undefined || status === 0;
          if (offline && RETRYABLE.includes(kind) && !get().pending.includes(kind)) {
            set((s) => ({ pending: [...s.pending, kind] }));
          }
          return null;
        }
      },

      purchase: async (itemId) => {
        try {
          const state = await mascotApi.purchase(itemId);
          set({ state });
          return true;
        } catch {
          return false;
        }
      },

      equip: async (itemIds) => {
        try {
          const state = await mascotApi.equip(itemIds);
          set({ state });
          return true;
        } catch {
          return false;
        }
      },

      launchJourney: async (locale) => {
        try {
          const state = await mascotApi.launchJourney(locale);
          set({ state });
          return true;
        } catch {
          get().refresh();
          return false;
        }
      },

      claimJourney: async () => {
        try {
          const claim = await mascotApi.claimJourney();
          set((s) => ({
            state: claim.state,
            queue: enqueue(s.queue, [
              { id: nextId++, type: "journeyReturn", delta: claim.delta, journey: claim },
              ...(claim.delta.leveledUp ? [{ id: nextId++, type: "levelUp" as const, delta: claim.delta }] : []),
            ]),
          }));
          return claim;
        } catch {
          get().refresh();
          return null;
        }
      },

      checkInMood: async (sky, energy) => {
        try {
          const res = await mascotApi.checkInMood(sky, energy);
          set({ state: res.state });
          if (res.delta.leveledUp) {
            set((s) => ({ queue: enqueue(s.queue, [{ id: nextId++, type: "levelUp", delta: res.delta }]) }));
          } else if (res.delta.xpGained > 0) {
            set((s) => ({
              queue: enqueue(s.queue, [{ id: nextId++, type: "reward", delta: res.delta, amount: res.delta.xpGained }]),
            }));
          }
          return res.reply;
        } catch {
          return null;
        }
      },

      startEclipse: async (days) => {
        try {
          set({ state: await mascotApi.startEclipse(days) });
          return true;
        } catch {
          return false;
        }
      },

      endEclipse: async () => {
        try {
          set({ state: await mascotApi.endEclipse() });
          return true;
        } catch {
          return false;
        }
      },

      completeLesson: async (key) => {
        try {
          const res = await mascotApi.completeLesson(key);
          set({ state: res.state });
          get().applyDelta(res.delta);
          return res;
        } catch {
          get().refresh();
          return null;
        }
      },

      unlockLesson: async (key) => {
        try {
          set({ state: await mascotApi.unlockLesson(key) });
          return true;
        } catch {
          return false;
        }
      },

      setNovaLook: async (on) => {
        try {
          set({ state: await mascotApi.setNovaLook(on) });
          return true;
        } catch {
          return false;
        }
      },

      celebrate: (c) => set((s) => ({ queue: enqueue(s.queue, [{ ...c, id: nextId++ }]) })),
      dismiss: () => set((s) => ({ queue: s.queue.slice(1) })),
      reset: () => set({ state: null, queue: [], error: false, pending: [], fetchedAt: 0 }),
    }),
    {
      name: "astroflow-mascot",
      storage: createJSONStorage(() => secureStorage),
      // Only what's needed to draw Aster instantly on launch, plus unsent reports; the rest is refetched.
      partialize: (s) => ({
        pending: s.pending,
        ...(s.state
          ? {
              state: {
                ...s.state,
                catalog: [],
                abilities: [],
                today: {},
              },
            }
          : {}),
      }),
    },
  ),
);
