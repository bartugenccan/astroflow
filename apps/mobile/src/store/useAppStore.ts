import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Locale } from "../i18n";
import { BirthProfileResponse } from "../services/types";

interface AppState {
  locale: Locale;
  hasOnboarded: boolean;
  displayName: string;
  birthProfile: BirthProfileResponse | null;
  _hasHydrated: boolean;

  setLocale: (locale: Locale) => void;
  setDisplayName: (name: string) => void;
  completeOnboarding: (name: string, profile: BirthProfileResponse) => void;
  reset: () => void;
  setHasHydrated: (v: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      locale: "en",
      hasOnboarded: false,
      displayName: "",
      birthProfile: null,
      _hasHydrated: false,

      setLocale: (locale) => set({ locale }),
      setDisplayName: (displayName) => set({ displayName }),
      completeOnboarding: (displayName, birthProfile) =>
        set({ displayName, birthProfile, hasOnboarded: true }),
      reset: () =>
        set({ hasOnboarded: false, displayName: "", birthProfile: null }),
      setHasHydrated: (v) => set({ _hasHydrated: v }),
    }),
    {
      name: "astroflow-app",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        locale: state.locale,
        hasOnboarded: state.hasOnboarded,
        displayName: state.displayName,
        birthProfile: state.birthProfile,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
