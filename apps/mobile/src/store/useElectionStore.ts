import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ElectionQuery } from "../services/types";

const MAX_RECENT = 6;

interface ElectionState {
  /** The question the result screen shows. */
  current: ElectionQuery | null;
  /** Recently asked questions, newest first — one tap to reopen. */
  recent: { query: ElectionQuery; askedAt: string }[];
  ask: (query: ElectionQuery) => void;
  reset: () => void;
}

const same = (a: ElectionQuery, b: ElectionQuery) => JSON.stringify(a) === JSON.stringify(b);

export const useElectionStore = create<ElectionState>()(
  persist(
    (set) => ({
      current: null,
      recent: [],
      ask: (query) =>
        set((s) => ({
          current: query,
          recent: [
            { query, askedAt: new Date().toISOString() },
            ...s.recent.filter((r) => !same(r.query, query)),
          ].slice(0, MAX_RECENT),
        })),
      reset: () => set({ current: null, recent: [] }),
    }),
    {
      name: "astroflow-election",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ current: s.current, recent: s.recent }),
    },
  ),
);
