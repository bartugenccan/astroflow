import { secureStorage } from "../../services/secureStorage";
import type { BirthProfileResponse } from "../../services/types";

/**
 * The onboarding draft lives in memory only, so a reload between the chart
 * reveal and the end of the intro tour used to throw the newcomer back to the
 * very first step. Once the chart is cast we keep a small checkpoint (name,
 * the cast profile and the tour page) so the tour resumes where it stopped.
 *
 * It holds birth data, so it goes to the Keychain/Keystore like the app store,
 * and it is removed the moment onboarding completes.
 */
const KEY = "astroflow.onboarding.tour";

export interface TourCheckpoint {
  name: string;
  profile: BirthProfileResponse;
  page: number;
}

function isCheckpoint(value: unknown): value is TourCheckpoint {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<TourCheckpoint>;
  return (
    typeof v.name === "string" &&
    typeof v.page === "number" &&
    !!v.profile &&
    typeof v.profile === "object" &&
    typeof v.profile.sunSign === "string" &&
    typeof v.profile.birthDate === "string"
  );
}

export async function readTourCheckpoint(): Promise<TourCheckpoint | null> {
  try {
    const raw = await secureStorage.getItem(KEY);
    if (typeof raw !== "string") return null;
    const parsed: unknown = JSON.parse(raw);
    return isCheckpoint(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeTourCheckpoint(checkpoint: TourCheckpoint): Promise<void> {
  try {
    await secureStorage.setItem(KEY, JSON.stringify(checkpoint));
  } catch {
    // Best effort: without a checkpoint a reload simply restarts onboarding.
  }
}

export async function clearTourCheckpoint(): Promise<void> {
  try {
    await secureStorage.removeItem(KEY);
  } catch {
    // Nothing to clean up.
  }
}
