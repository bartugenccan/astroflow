import { create } from "zustand";
import { BirthProfileResponse, City } from "../services/types";

/**
 * The onboarding draft. Held in memory and mirrored to a small secure
 * checkpoint while onboarding is open (features/onboarding/draftCheckpoint.ts),
 * so a restarted app resumes at the furthest step; cleared once onboarding ends.
 */
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
  /** Restore the answers from a checkpoint after the app was restarted. */
  hydrate: (d: Pick<OnboardingDraft, "name" | "birthDate" | "birthTime" | "unknownTime" | "city" | "manualLat" | "manualLon">) => void;
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
  hydrate: (d) => set({ ...d }),
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
