import { useEffect } from "react";
import { secureStorage } from "../../services/secureStorage";
import type { City } from "../../services/types";
import { useOnboardingDraft } from "../../store/useOnboardingDraft";

/**
 * The answers given before the chart is cast (name, birth date, time and
 * place) used to live in memory only: if Android killed the app in the
 * background, or a system font-size change restarted it, the newcomer was
 * thrown back to the name screen (F20). This keeps a small checkpoint so
 * onboarding resumes at the furthest step reached.
 *
 * It holds birth data, so it goes to the Keychain/Keystore like the tour
 * checkpoint, expires after a week, and is removed when onboarding ends (the
 * draft is cleared) or the user deletes their data.
 */
const KEY = "astroflow.onboarding.draft";
const MAX_AGE_MS = 7 * 86_400_000;
const WRITE_DEBOUNCE_MS = 300;

export interface DraftCheckpoint {
  name: string;
  birthDate: string | null;
  birthTime: string | null;
  unknownTime: boolean;
  city: City | null;
  manualLat: number | null;
  manualLon: number | null;
  savedAt: number;
}

export type ResumeStep = "/birth-date" | "/birth-time" | "/birth-place";

function isCheckpoint(value: unknown): value is DraftCheckpoint {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<DraftCheckpoint>;
  return (
    typeof v.name === "string" &&
    typeof v.savedAt === "number" &&
    (v.birthDate === null || typeof v.birthDate === "string") &&
    (v.birthTime === null || typeof v.birthTime === "string") &&
    typeof v.unknownTime === "boolean"
  );
}

export async function readDraftCheckpoint(now = Date.now()): Promise<DraftCheckpoint | null> {
  try {
    const raw = await secureStorage.getItem(KEY);
    if (typeof raw !== "string") return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isCheckpoint(parsed) || now - parsed.savedAt > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearDraftCheckpoint(): Promise<void> {
  try {
    await secureStorage.removeItem(KEY);
  } catch {
    // Nothing to clean up.
  }
}

/**
 * Where to pick up: the step after the last answer given. Only the name (or
 * nothing) means the welcome screen itself, with the name filled in.
 */
export function resumeStepFor(d: Pick<DraftCheckpoint, "name" | "birthDate" | "birthTime" | "unknownTime">): ResumeStep | null {
  if (!d.name.trim() || !d.birthDate) return null;
  if (d.birthTime || d.unknownTime) return "/birth-place";
  return "/birth-time";
}

/**
 * Mirrors the in-memory draft to the checkpoint while onboarding is open
 * (mounted in the onboarding layout). An empty draft — after the tour, a
 * sign-in or a data wipe — removes it.
 */
export function usePersistOnboardingDraft(): void {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = useOnboardingDraft.subscribe((s, prev) => {
      const changed =
        s.name !== prev.name ||
        s.birthDate !== prev.birthDate ||
        s.birthTime !== prev.birthTime ||
        s.unknownTime !== prev.unknownTime ||
        s.city !== prev.city ||
        s.manualLat !== prev.manualLat ||
        s.manualLon !== prev.manualLon;
      if (!changed) return;
      if (timer) clearTimeout(timer);
      // Emptied (onboarding finished, signed in, wiped): remove at once — the
      // layout may unmount before a debounced write would run.
      if (!s.name.trim() && !s.birthDate) {
        timer = null;
        clearDraftCheckpoint();
        return;
      }
      timer = setTimeout(() => {
        const checkpoint: DraftCheckpoint = {
          name: s.name,
          birthDate: s.birthDate,
          birthTime: s.birthTime,
          unknownTime: s.unknownTime,
          city: s.city,
          manualLat: s.manualLat,
          manualLon: s.manualLon,
          savedAt: Date.now(),
        };
        Promise.resolve(secureStorage.setItem(KEY, JSON.stringify(checkpoint))).catch(() => undefined);
      }, WRITE_DEBOUNCE_MS);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, []);
}
