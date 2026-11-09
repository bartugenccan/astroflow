import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { secureStorage } from "../services/secureStorage";
import { mascotApi } from "../services/mascotApi";
import type { MascotDelta, MascotEventKind, MascotState } from "../services/types";

/** One thing to celebrate on screen (queued so back-to-back rewards don't collide). */
export interface Celebration {
  id: number;
  type: "hatch" | "levelUp" | "reward" | "milestone" | "shield";
  delta: MascotDelta | null;
  milestoneName?: string | null;
  shieldsUsed?: number;
}

interface MascotStore {
  state: MascotState | null;
  loading: boolean;
  error: boolean;
  queue: Celebration[];
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
  dismiss: () => void;
  reset: () => void;
}

let nextId = 1;

export const useMascotStore = create<MascotStore>()(
  persist(
    (set, get) => ({
      state: null,
      loading: false,
      error: false,
      queue: [],

      refresh: async () => {
        set({ loading: true });
        try {
          const state = await mascotApi.getMascot();
          set({ state, loading: false, error: false });
        } catch {
          set({ loading: false, error: true });
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
        } catch {
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

      dismiss: () => set((s) => ({ queue: s.queue.slice(1) })),
      reset: () => set({ state: null, queue: [], error: false }),
    }),
    {
      name: "astroflow-mascot",
      storage: createJSONStorage(() => secureStorage),
      // Only what's needed to draw Aster instantly on launch; the rest is refetched.
      partialize: (s) =>
        s.state
          ? {
              state: {
                ...s.state,
                catalog: [],
                abilities: [],
                today: {},
              },
            }
          : {},
    },
  ),
);
