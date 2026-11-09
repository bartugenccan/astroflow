import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, Paths } from "expo-file-system";
import { APP_STORE_KEY, useAppStore } from "../store/useAppStore";
import { useAffirmationStore } from "../store/useAffirmationStore";
import { useOnboardingDraft } from "../store/useOnboardingDraft";
import { useTarotStore } from "../store/useTarotStore";
import { useElectionStore } from "../store/useElectionStore";
import { useReportsStore } from "../store/useReportsStore";
import { useMascotStore } from "../store/useMascotStore";
import { useReflectionStore } from "../store/useReflectionStore";
import { astrologyApi } from "./astrologyApi";
import { clearInterpretationCache } from "./interpretationCache";
import { resetDeviceToken } from "./deviceAuth";
import { secureStorage } from "./secureStorage";
import { cancelAllReminders } from "./notifications";

/** Other persisted stores that live in the Keychain/Keystore (see each store's `name`). */
const SECURE_STORE_KEYS = [
  "astroflow-tarot",
  "astroflow-election",
  "astroflow-affirmations",
  "astroflow-mascot",
  "astroflow-reflections",
];

/**
 * "Delete my data": the server copy first (chat, memory, goals, saved people,
 * device-specific readings — and the device token is revoked), then everything
 * on this phone. If the server call fails nothing local is touched, so the
 * user can retry instead of being left with orphaned data on the server.
 */
export async function deleteMyData(): Promise<void> {
  await astrologyApi.deleteMyData();
  await wipeAllLocalData({ keepIdentity: false });
}

/**
 * Clears this phone back to a fresh install: voice recordings, every store,
 * the in-memory reading cache, plaintext and Keychain storage. With
 * `keepIdentity` (Start over) the device token survives, so the account's
 * server data is still there after re-onboarding; without it the install
 * becomes a new device.
 *
 * Flipping `hasOnboarded` back to false makes the root layout swap to the
 * onboarding stack.
 */
export async function wipeAllLocalData({ keepIdentity }: { keepIdentity: boolean }): Promise<void> {
  // Reports lived in Documents before moving to the cache; clear both.
  for (const [root, folder] of [
    [Paths.document, "affirmations"],
    [Paths.document, "reports"],
    [Paths.cache, "reports"],
  ] as const) {
    try {
      const dir = new Directory(root, folder);
      if (dir.exists) dir.delete();
    } catch {
      // Nothing saved yet, or already gone.
    }
  }

  clearInterpretationCache();
  await cancelAllReminders();
  if (!keepIdentity) await resetDeviceToken();

  useOnboardingDraft.getState().clear();
  useAffirmationStore.setState({ customs: [], days: {}, recordings: {} });
  useTarotStore.getState().reset();
  useElectionStore.getState().reset();
  useReportsStore.getState().reset();
  useMascotStore.getState().reset();
  useReflectionStore.getState().reset();
  useAppStore.getState().reset();

  // Last, so the stores' own persistence writes above can't restore anything.
  for (const key of [APP_STORE_KEY, ...SECURE_STORE_KEYS]) await secureStorage.removeItem(key);
  await AsyncStorage.clear();
}
