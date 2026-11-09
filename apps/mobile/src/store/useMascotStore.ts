import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { secureStorage } from "../services/secureStorage";
import { mascotApi } from "../services/mascotApi";
import type {
  JourneyClaim,
  MascotDelta,
  MascotEventKind,
  MascotState,
  MoodReply,
  MoodSky,
} from "../services/types";
import type { Locale } from "../i18n";

/** One thing to celebrate on screen (queued so back-to-back rewards don't collide). */
export interface Celebration {
  id: number;
  type: "hatch" | "levelUp" | "reward" | "milestone" | "shield" | "journeyReturn" | "manifested" | "accountLinked";
  delta: MascotDelta | null;
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
  refresh: () => Promise<void>;
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
  /** Queue a celebration that isn't a plain delta (a wish came true, the account is safe). */
  celebrate: (c: Omit<Celebration, "id">) => void;
  dismiss: () => void;
  reset: () => void;
}

let nextId = 1;

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

      refresh: async () => {
        set({ loading: true });
        try {
          const state = await mascotApi.getMascot();
          set({ state, loading: false, error: false });
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
          items.push({ id: nextId++, type: "reward", delta });
        }
        if (items.length) set((s) => ({ queue: [...s.queue, ...items] }));
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
            queue: [...s.queue, { id: nextId++, type: "journeyReturn", delta: claim.delta, journey: claim }],
          }));
          if (claim.delta.leveledUp) {
            set((s) => ({ queue: [...s.queue, { id: nextId++, type: "levelUp", delta: claim.delta }] }));
          }
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
            set((s) => ({ queue: [...s.queue, { id: nextId++, type: "levelUp", delta: res.delta }] }));
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

      celebrate: (c) => set((s) => ({ queue: [...s.queue, { ...c, id: nextId++ }] })),
      dismiss: () => set((s) => ({ queue: s.queue.slice(1) })),
      reset: () => set({ state: null, queue: [], error: false, pending: [] }),
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
