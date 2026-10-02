import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Locale } from "../i18n";
import { BirthProfileResponse } from "../services/types";
import { PREMIUM_BETA } from "../services/config";
import { secureStorage } from "../services/secureStorage";

/** Persist key. Lives in the Keychain/Keystore: it holds birth date, time and place. */
export const APP_STORE_KEY = "astroflow-app";

interface AppState {
  locale: Locale;
  hasOnboarded: boolean;
  displayName: string;
  birthProfile: BirthProfileResponse | null;
  _hasHydrated: boolean;

  // Monetization (payments are stubbed; these mirror the device entitlement).
  isPremium: boolean;
  unlockedFeatures: string[];
  // Saved people whose charts have been opened (first N are free — see FREE_PERSON_CHARTS).
  viewedPersonChartIds: string[];
  // Companion daily message quota (free tier — see FREE_DAILY_MESSAGES).
  companionMsgDate: string;
  companionMsgCount: number;
  // Tarot daily reading quota (free tier — see FREE_DAILY_TAROT).
  tarotDate: string;
  tarotCount: number;

  setLocale: (locale: Locale) => void;
  setDisplayName: (name: string) => void;
  completeOnboarding: (name: string, profile: BirthProfileResponse) => void;
  setBirthProfile: (profile: BirthProfileResponse) => void;
  setPremium: (v: boolean) => void;
  setUnlockedFeatures: (features: string[]) => void;
  addUnlockedFeature: (feature: string) => void;
  markPersonChartViewed: (id: string) => void;
  recordCompanionMessage: () => void;
  recordTarotReading: () => void;
  reset: () => void;
  setHasHydrated: (v: boolean) => void;
}

/** How many distinct saved people can be viewed before Premium is required. */
export const FREE_PERSON_CHARTS = 2;
/** How many active intentions a free user can keep. */
export const FREE_INTENTIONS = 1;
/** How many companion messages a free user can send per day. */
export const FREE_DAILY_MESSAGES = 5;
/** How many tarot readings a free user can draw per day. */
export const FREE_DAILY_TAROT = 1;

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      locale: "en",
      hasOnboarded: false,
      displayName: "",
      birthProfile: null,
      _hasHydrated: false,
      isPremium: PREMIUM_BETA,
      unlockedFeatures: [],
      viewedPersonChartIds: [],
      companionMsgDate: "",
      companionMsgCount: 0,
      tarotDate: "",
      tarotCount: 0,

      setLocale: (locale) => set({ locale }),
      setDisplayName: (displayName) => set({ displayName }),
      completeOnboarding: (displayName, birthProfile) =>
        set({ displayName, birthProfile, hasOnboarded: true }),
      setBirthProfile: (birthProfile) => set({ birthProfile }),
      setPremium: (isPremium) => set({ isPremium }),
      setUnlockedFeatures: (unlockedFeatures) => set({ unlockedFeatures }),
      addUnlockedFeature: (feature) =>
        set((s) =>
          s.unlockedFeatures.includes(feature)
            ? s
            : { unlockedFeatures: [...s.unlockedFeatures, feature] },
        ),
      markPersonChartViewed: (id) =>
        set((s) =>
          s.viewedPersonChartIds.includes(id)
            ? s
            : { viewedPersonChartIds: [...s.viewedPersonChartIds, id] },
        ),
      recordCompanionMessage: () =>
        set((s) => {
          const today = new Date().toISOString().slice(0, 10);
          return s.companionMsgDate === today
            ? { companionMsgCount: s.companionMsgCount + 1 }
            : { companionMsgDate: today, companionMsgCount: 1 };
        }),
      recordTarotReading: () =>
        set((s) => {
          const today = new Date().toISOString().slice(0, 10);
          return s.tarotDate === today
            ? { tarotCount: s.tarotCount + 1 }
            : { tarotDate: today, tarotCount: 1 };
        }),
      reset: () =>
        set({
          hasOnboarded: false,
          displayName: "",
          birthProfile: null,
          isPremium: PREMIUM_BETA,
          unlockedFeatures: [],
          viewedPersonChartIds: [],
          companionMsgDate: "",
          companionMsgCount: 0,
          tarotDate: "",
          tarotCount: 0,
        }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: APP_STORE_KEY,
      storage: createJSONStorage(() => secureStorage),
      partialize: (state) => ({
        locale: state.locale,
        hasOnboarded: state.hasOnboarded,
        displayName: state.displayName,
        birthProfile: state.birthProfile,
        isPremium: state.isPremium,
        unlockedFeatures: state.unlockedFeatures,
        viewedPersonChartIds: state.viewedPersonChartIds,
        companionMsgDate: state.companionMsgDate,
        companionMsgCount: state.companionMsgCount,
        tarotDate: state.tarotDate,
        tarotCount: state.tarotCount,
      }),
      onRehydrateStorage: () => (state) => {
        // Beta: Premium for everyone, whatever an older build persisted.
        if (PREMIUM_BETA && state && !state.isPremium) state.setPremium(true);
        state?.setHasHydrated(true);
      },
    },
  ),
);

/** True when the feature is covered by an active subscription or a per-item unlock. */
export function useIsFeatureUnlocked(feature: string): boolean {
  return useAppStore(
    (s) => s.isPremium || s.unlockedFeatures.includes(feature),
  );
}
