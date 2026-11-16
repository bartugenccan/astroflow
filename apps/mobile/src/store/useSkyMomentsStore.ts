import { create } from "zustand";
import { astrologyApi } from "../services/astrologyApi";
import type { CreateBirthProfileDto, SkyMomentsResponse } from "../services/types";
import { todayISO } from "../lib/dates";

interface SkyMomentsStore {
  data: SkyMomentsResponse | null;
  /** Local day the data was fetched on; the moments only change day to day. */
  day: string | null;
  loading: boolean;
  error: boolean;
  /** Fetch once per local day (or always with `force`). */
  load: (dto: CreateBirthProfileDto, force?: boolean) => Promise<void>;
  reset: () => void;
}

let inFlight: Promise<void> | null = null;

/**
 * The user's key sky moments (GET /plan/moments). Not persisted: the server
 * computes them from the stored chart in well under a second, and they are
 * only valid for the day they were read.
 */
export const useSkyMomentsStore = create<SkyMomentsStore>()((set, get) => ({
  data: null,
  day: null,
  loading: false,
  error: false,

  load: (dto, force = false) => {
    const today = todayISO();
    if (!force && get().data && get().day === today) return Promise.resolve();
    if (inFlight) return inFlight;
    inFlight = (async () => {
      if (!get().data) set({ loading: true, error: false });
      try {
        const data = await astrologyApi.getSkyMoments(dto);
        set({ data, day: today, loading: false, error: false });
      } catch {
        set({ loading: false, error: true });
      } finally {
        inFlight = null;
      }
    })();
    return inFlight;
  },

  reset: () => set({ data: null, day: null, loading: false, error: false }),
}));
