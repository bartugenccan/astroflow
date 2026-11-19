import { create } from "zustand";
import { astrologyApi } from "../services/astrologyApi";
import { ApiError } from "../services/httpAstrologyApi";
import type { CreateBirthProfileDto, SkyMomentsResponse } from "../services/types";
import { todayISO } from "../lib/dates";

interface SkyMomentsStore {
  data: SkyMomentsResponse | null;
  /** Local day the data was fetched on; the moments only change day to day. */
  day: string | null;
  loading: boolean;
  error: boolean;
  /** Fetch once per local day (or always with `force`). An empty list is a valid answer. */
  load: (dto: CreateBirthProfileDto, force?: boolean) => Promise<void>;
  reset: () => void;
}

let inFlight: Promise<void> | null = null;

const RETRY_DELAY_MS = 1500;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * One read of GET /plan/moments, with two recoveries:
 * - 404: the server has no chart for this device (e.g. the device token was
 *   re-registered after a 401, so the new device id has no DeviceChart). The
 *   birth data is sent again (POST /astrology/natal stores it) and the read
 *   retried once.
 * - Any other failure: retried once after a short pause.
 */
async function fetchMoments(dto: CreateBirthProfileDto): Promise<SkyMomentsResponse> {
  try {
    return await astrologyApi.getSkyMoments(dto);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      await astrologyApi.getNatalChart(dto);
    } else {
      await wait(RETRY_DELAY_MS);
    }
    return astrologyApi.getSkyMoments(dto);
  }
}

/**
 * The user's key sky moments (GET /plan/moments). Not persisted: the server
 * computes them from the stored chart in well under a second, and they are
 * only valid for the day they were read: a load on a new local day (Today
 * reloads on focus and when the app returns to the foreground) fetches again.
 */
export const useSkyMomentsStore = create<SkyMomentsStore>()((set, get) => ({
  data: null,
  day: null,
  loading: false,
  error: false,

  load: (dto, force = false) => {
    const today = todayISO();
    const { data, day } = get();
    // Same day, already loaded (an empty list counts): nothing to do.
    if (!force && data && day === today) return Promise.resolve();
    if (inFlight) return inFlight;
    inFlight = (async () => {
      // A new day keeps yesterday's list on screen (the moments span weeks)
      // until today's arrives.
      if (!get().data) set({ loading: true, error: false });
      try {
        const fresh = await fetchMoments(dto);
        set({ data: fresh, day: today, loading: false, error: false });
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
