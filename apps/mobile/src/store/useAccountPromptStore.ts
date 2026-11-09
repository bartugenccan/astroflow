import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ACCOUNTS_ENABLED } from "../services/auth/account";
import { useAppStore } from "./useAppStore";

/** The moments Aster asks the user to protect it: right after they've invested. */
export type ProtectMoment = "hatch" | "firstJourney" | "orbit3";

export const PROTECT_MAX_ASKS = 3;
export const PROTECT_MIN_GAP_DAYS = 2;
const DAY_MS = 86_400_000;

interface AccountPromptState {
  asks: number;
  lastAskedAt: string | null;
  /** Moments already used, so each one asks at most once. */
  used: ProtectMoment[];
  /** The moment waiting to be shown (the sheet opens when nothing else is celebrating). */
  open: ProtectMoment | null;
  /** Offer the sheet for this moment if the rules allow it. */
  offer: (moment: ProtectMoment, ctx: { resting: boolean }) => void;
  /** "Not now", or the sheet closed after a successful link. */
  close: () => void;
  reset: () => void;
}

/**
 * When to ask an anonymous user to protect Aster with an account. Never
 * during onboarding, never while they rest (eclipse), at most three times,
 * at least two days apart, once per moment. Kept in plain storage: it holds
 * no personal data.
 */
export const useAccountPromptStore = create<AccountPromptState>()(
  persist(
    (set, get) => ({
      asks: 0,
      lastAskedAt: null,
      used: [],
      open: null,

      offer: (moment, { resting }) => {
        if (!ACCOUNTS_ENABLED || useAppStore.getState().account) return;
        const s = get();
        if (resting || s.open || s.used.includes(moment) || s.asks >= PROTECT_MAX_ASKS) return;
        if (s.lastAskedAt && Date.now() - Date.parse(s.lastAskedAt) < PROTECT_MIN_GAP_DAYS * DAY_MS) return;
        set({
          open: moment,
          asks: s.asks + 1,
          lastAskedAt: new Date().toISOString(),
          used: [...s.used, moment],
        });
      },

      close: () => set({ open: null }),
      reset: () => set({ asks: 0, lastAskedAt: null, used: [], open: null }),
    }),
    {
      name: "astroflow-account-prompt",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ asks: s.asks, lastAskedAt: s.lastAskedAt, used: s.used }),
    },
  ),
);
