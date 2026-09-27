import { create } from "zustand";
import { BirthProfileResponse, City } from "../services/types";

/** In-memory only — the onboarding draft is discarded once the chart is cast. */
interface OnboardingDraft {
  name: string;
  birthDate: string | null; // "YYYY-MM-DD"
  birthTime: string | null; // "HH:mm"
  unknownTime: boolean;
  city: City | null;
  manualLat: number | null;
  manualLon: number | null;
  /** The cast chart, held between the reveal and the intro tour. */
  profile: BirthProfileResponse | null;

  setName: (name: string) => void;
  setBirthDate: (date: string) => void;
  setBirthTime: (time: string) => void;
  setUnknownTime: (unknown: boolean) => void;
  setCity: (city: City) => void;
  setManualCoords: (lat: number, lon: number) => void;
  setProfile: (profile: BirthProfileResponse) => void;
  clear: () => void;
}

export const useOnboardingDraft = create<OnboardingDraft>((set) => ({
  name: "",
  birthDate: null,
  birthTime: null,
  unknownTime: false,
  city: null,
  manualLat: null,
  manualLon: null,
  profile: null,

  setName: (name) => set({ name }),
  setBirthDate: (birthDate) => set({ birthDate }),
  setBirthTime: (birthTime) => set({ birthTime, unknownTime: false }),
  setUnknownTime: (unknownTime) =>
    set({ unknownTime, birthTime: unknownTime ? "12:00" : null }),
  setCity: (city) => set({ city, manualLat: null, manualLon: null }),
  setManualCoords: (manualLat, manualLon) =>
    set({ manualLat, manualLon, city: null }),
  setProfile: (profile) => set({ profile }),
  clear: () =>
    set({
      name: "",
      birthDate: null,
      birthTime: null,
      unknownTime: false,
      city: null,
      manualLat: null,
      manualLon: null,
      profile: null,
    }),
}));
