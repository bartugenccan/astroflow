import { create } from "zustand";
import { getLocales } from "expo-localization";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Locale } from "../i18n";
import { AccountInfo, BirthProfileResponse } from "../services/types";
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
  /** Linked account (Apple / Google / email), or null while anonymous. */
  account: AccountInfo | null;

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
  /** Local reminders (scheduled on the device by services/notifications). */
  reminders: ReminderSettings;
  /** When the user accepted the AI / entertainment notice (ISO), or null. */
  aiConsentAt: string | null;

  setLocale: (locale: Locale) => void;
  setDisplayName: (name: string) => void;
  completeOnboarding: (name: string, profile: BirthProfileResponse) => void;
  setBirthProfile: (profile: BirthProfileResponse) => void;
  setAccount: (account: AccountInfo | null) => void;
  setPremium: (v: boolean) => void;
  setUnlockedFeatures: (features: string[]) => void;
  addUnlockedFeature: (feature: string) => void;
  markPersonChartViewed: (id: string) => void;
  recordCompanionMessage: () => void;
  recordTarotReading: () => void;
  setReminders: (patch: Partial<ReminderSettings>) => void;
  acceptAiConsent: () => void;
  reset: () => void;
  setHasHydrated: (v: boolean) => void;
}

export interface ReminderSettings {
  /** Daily nudge to open today's reading, at hour:minute local time. */
  daily: boolean;
  hour: number;
  minute: number;
  /** Evening nudge to check in on intentions. */
  intention: boolean;
}

export const DEFAULT_REMINDERS: ReminderSettings = { daily: false, hour: 9, minute: 0, intention: false };

/** How many distinct saved people can be viewed before Premium is required. */
export const FREE_PERSON_CHARTS = 2;
/** How many active intentions a free user can keep. */
export const FREE_INTENTIONS = 1;
/** How many companion messages a free user can send per day. */
export const FREE_DAILY_MESSAGES = 5;
/** How many tarot readings a free user can draw per day. */
export const FREE_DAILY_TAROT = 1;

/** First-launch language: Turkish phones start in Turkish. A saved choice wins after that. */
const initialLocale: Locale = getLocales()[0]?.languageCode === "tr" ? "tr" : "en";

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      locale: initialLocale,
      hasOnboarded: false,
      displayName: "",
      birthProfile: null,
      _hasHydrated: false,
      account: null,
      isPremium: PREMIUM_BETA,
      unlockedFeatures: [],
      viewedPersonChartIds: [],
      companionMsgDate: "",
      companionMsgCount: 0,
      tarotDate: "",
      tarotCount: 0,
      reminders: DEFAULT_REMINDERS,
      aiConsentAt: null,

      setLocale: (locale) => set({ locale }),
      setDisplayName: (displayName) => set({ displayName }),
      completeOnboarding: (displayName, birthProfile) =>
        set({ displayName, birthProfile, hasOnboarded: true }),
      setBirthProfile: (birthProfile) => set({ birthProfile }),
      setAccount: (account) => set({ account }),
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
      setReminders: (patch) => set((s) => ({ reminders: { ...s.reminders, ...patch } })),
      acceptAiConsent: () => set({ aiConsentAt: new Date().toISOString() }),
      reset: () =>
        set({
          hasOnboarded: false,
          displayName: "",
          birthProfile: null,
          account: null,
          isPremium: PREMIUM_BETA,
          unlockedFeatures: [],
          viewedPersonChartIds: [],
          companionMsgDate: "",
          companionMsgCount: 0,
          tarotDate: "",
          tarotCount: 0,
          reminders: DEFAULT_REMINDERS,
          aiConsentAt: null,
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
        account: state.account,
        isPremium: state.isPremium,
        unlockedFeatures: state.unlockedFeatures,
        viewedPersonChartIds: state.viewedPersonChartIds,
        companionMsgDate: state.companionMsgDate,
        companionMsgCount: state.companionMsgCount,
        tarotDate: state.tarotDate,
        tarotCount: state.tarotCount,
        reminders: state.reminders,
        aiConsentAt: state.aiConsentAt,
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
