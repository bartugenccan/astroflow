import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, Paths } from "expo-file-system";
import { useAppStore } from "../store/useAppStore";
import { useAffirmationStore } from "../store/useAffirmationStore";
import { useOnboardingDraft } from "../store/useOnboardingDraft";
import { useTarotStore } from "../store/useTarotStore";
import { useElectionStore } from "../store/useElectionStore";
import { clearInterpretationCache } from "./interpretationCache";
import { resetDeviceId } from "./deviceId";

/**
 * Developer-only "factory reset": makes the app behave like a fresh install.
 *
 * - Deletes the affirmation voice recordings from the documents folder.
 * - Clears the in-memory interpretation cache.
 * - Forgets the device ID, so the backend sees a new device (saved people,
 *   intentions and Aster's memory belong to the old ID and no longer appear).
 * - Resets every in-memory store, then wipes AsyncStorage.
 *
 * Flipping `hasOnboarded` back to false makes the root layout swap to the
 * onboarding stack. Server-side rows for the old device ID are left alone.
 */
export async function wipeAllLocalData(): Promise<void> {
  try {
    const recordings = new Directory(Paths.document, "affirmations");
    if (recordings.exists) recordings.delete();
  } catch {
    // Nothing recorded yet, or already gone.
  }

  clearInterpretationCache();
  await resetDeviceId();

  useOnboardingDraft.getState().clear();
  useAffirmationStore.setState({ customs: [], days: {}, recordings: {} });
  useTarotStore.getState().reset();
  useElectionStore.getState().reset();
  useAppStore.getState().reset();

  // Last, so the stores' own persistence writes above can't restore anything.
  await AsyncStorage.clear();
}
