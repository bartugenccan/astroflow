import { create } from "zustand";
import { astrologyApi } from "../services/astrologyApi";
import type { CreateBirthProfileDto, DailyPlan } from "../services/types";

interface PlanStore {
  plan: DailyPlan | null;
  loading: boolean;
  error: boolean;
  /** Load today's personal sky plan; the server rebuilds it when mood or wishes change. */
  refresh: (dto: CreateBirthProfileDto) => Promise<void>;
  reset: () => void;
}

/**
 * Today's personal sky plan (GET /plan/today). Not persisted: it is cheap to
 * fetch, belongs to one local day, and must follow the server's view of the
 * user's mood and wishes.
 */
/** The request in flight, so overlapping refreshes (two tabs focusing) share one. */
let inFlight: Promise<void> | null = null;

export const usePlanStore = create<PlanStore>()((set, get) => ({
  plan: null,
  loading: false,
  error: false,

  refresh: (dto) => {
    if (inFlight) return inFlight;
    inFlight = (async () => {
      // `loading` only drives the empty-card spinner: with a plan on screen a
      // re-read stays quiet instead of re-rendering every subscriber twice.
      if (!get().plan) set({ loading: true });
      try {
        const plan = await astrologyApi.getTodayPlan(dto);
        const prev = get().plan;
        const unchanged = prev !== null && JSON.stringify(prev) === JSON.stringify(plan);
        set({
          ...(unchanged ? {} : { plan }),
          ...(get().loading ? { loading: false } : {}),
          ...(get().error ? { error: false } : {}),
        });
      } catch {
        set({ loading: false, error: true });
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  },

  reset: () => set({ plan: null, loading: false, error: false }),
}));
