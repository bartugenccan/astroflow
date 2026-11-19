import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * The app tour Aster gives once (`TourHost`).
 *
 * - `null`: never decided. Once the user is onboarded, the host turns it into
 *   `pending` — new users right after onboarding, existing users once after
 *   the update that brought the tour.
 * - `pending`: waiting for a calm moment on the tabs.
 * - `done`: shown (or skipped). Set the moment the tour *starts*, so killing
 *   the app halfway never makes it loop; Profile → "Watch the tour again"
 *   puts it back to `pending`.
 *
 * UI-only state, plain AsyncStorage (cleared by `wipeAllLocalData`).
 */
export type TourStatus = "pending" | "done";

/** Bump to show a reworked tour once more to everyone who saw an older one. */
export const TOUR_VERSION = 1;

interface TourStore {
  status: TourStatus | null;
  /** The tour version last shown. */
  version: number;
  hydrated: boolean;
  /** Queue the tour (first time, or a replay from Profile). */
  queue: () => void;
  /** The tour is starting: never start it again on its own. */
  markShown: () => void;
  reset: () => void;
}

export const useTourStore = create<TourStore>()(
  persist(
    (set) => ({
      status: null,
      version: 0,
      hydrated: false,
      queue: () => set({ status: "pending" }),
      markShown: () => set({ status: "done", version: TOUR_VERSION }),
      reset: () => set({ status: null, version: 0 }),
    }),
    {
      name: "astroflow-tour",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ status: s.status, version: s.version }),
      onRehydrateStorage: () => () => useTourStore.setState({ hydrated: true }),
    },
  ),
);
