import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * The system "rate this app" prompt, asked only right after a happy moment
 * (Aster grew into a later stage, or a manifest came true) and at most once
 * every 120 days on this device. Apple shows it at most three times a year on
 * its own terms and may show nothing at all, so this never blocks anything and
 * never tells the user it asked.
 *
 * `expo-store-review` is native and arrived after build 1.1.0 (8) was made,
 * while runtimeVersion follows the app version — an OTA of this code can land
 * on a binary without the module. It is therefore required lazily, inside the
 * try: on such a binary the prompt silently does nothing instead of the app
 * failing at launch.
 *
 * UI-only state in plain AsyncStorage (cleared by `wipeAllLocalData`).
 */
const KEY = "astroflow.review.lastAsked";
const MIN_GAP_MS = 120 * 24 * 60 * 60 * 1000;

type StoreReviewModule = typeof import("expo-store-review");

let inFlight = false;

export async function maybeAskForReview(now: number = Date.now()): Promise<void> {
  if (inFlight) return;
  inFlight = true;
  try {
    const last = Number((await AsyncStorage.getItem(KEY)) ?? 0);
    if (Number.isFinite(last) && last > 0 && now - last < MIN_GAP_MS) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const StoreReview: StoreReviewModule = require("expo-store-review");
    if (!(await StoreReview.isAvailableAsync())) return;
    if (!(await StoreReview.hasAction())) return;
    await AsyncStorage.setItem(KEY, String(now));
    await StoreReview.requestReview();
  } catch {
    // Missing native module or a refused prompt: never worth surfacing.
  } finally {
    inFlight = false;
  }
}
