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
export const usePlanStore = create<PlanStore>()((set, get) => ({
  plan: null,
  loading: false,
  error: false,

  refresh: async (dto) => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const plan = await astrologyApi.getTodayPlan(dto);
      set({ plan, loading: false, error: false });
    } catch {
      set({ loading: false, error: true });
    }
  },

  reset: () => set({ plan: null, loading: false, error: false }),
}));
