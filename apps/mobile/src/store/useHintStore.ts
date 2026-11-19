import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

/** One-time coach marks. Add a key here when a new hint ships. */
export type HintKey = "asterTap";

interface HintStore {
  /** Hints the user has acted on; they never show again. */
  seen: HintKey[];
  /** True once the persisted list is loaded — hide hints until then so they don't flash. */
  hydrated: boolean;
  markSeen: (key: HintKey) => void;
  reset: () => void;
}

/**
 * Coach marks the user has already acted on. UI-only state, so it lives in
 * plain AsyncStorage (cleared by `wipeAllLocalData`), not the Keychain.
 */
export const useHintStore = create<HintStore>()(
  persist(
    (set) => ({
      seen: [],
      hydrated: false,
      markSeen: (key) => set((s) => (s.seen.includes(key) ? s : { seen: [...s.seen, key] })),
      reset: () => set({ seen: [] }),
    }),
    {
      name: "astroflow-hints",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ seen: s.seen }),
      onRehydrateStorage: () => () => useHintStore.setState({ hydrated: true }),
    },
  ),
);

/** Whether a hint should be shown right now. */
export function useShowHint(key: HintKey): boolean {
  return useHintStore((s) => s.hydrated && !s.seen.includes(key));
}
