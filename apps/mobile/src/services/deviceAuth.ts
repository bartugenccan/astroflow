import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "./config";

/** Signed device token from the API (Keychain / Keystore, not plain storage). */
const TOKEN_KEY = "astroflow.deviceToken";
/** Where builds before device tokens kept their self-generated id (plain AsyncStorage). */
const LEGACY_ID_KEY = "astroflow-device-id";

let cached: string | null = null;
let pending: Promise<string> | null = null;

/**
 * The device token every API request carries as `Authorization: Bearer`.
 * Registered once per install; an install from before tokens claims the id it
 * already had (so its saved data stays reachable), then that plaintext id is
 * removed from the device.
 */
export function getDeviceToken(): Promise<string> {
  if (cached) return Promise.resolve(cached);
  pending ??= load().finally(() => {
    pending = null;
  });
  return pending;
}

/** Forget the token (after a 401, or when the user deletes their data). */
export async function resetDeviceToken(): Promise<void> {
  cached = null;
  await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
}

async function load(): Promise<string> {
  const stored = await SecureStore.getItemAsync(TOKEN_KEY);
  if (stored) {
    cached = stored;
    return stored;
  }
  const legacyId = await AsyncStorage.getItem(LEGACY_ID_KEY);
  let res = await register(legacyId ?? undefined);
  // Already claimed (or malformed): start this install fresh.
  if (legacyId && (res.status === 409 || res.status === 400)) res = await register();
  if (!res.ok) throw new Error(`Device registration failed (${res.status})`);
  const { token } = (await res.json()) as { token: string };
  await SecureStore.setItemAsync(TOKEN_KEY, token, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
  if (legacyId) await AsyncStorage.removeItem(LEGACY_ID_KEY);
  cached = token;
  return token;
}

function register(legacyDeviceId?: string): Promise<Response> {
  return fetch(`${API_URL}/api/v1/auth/device`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(legacyDeviceId ? { legacyDeviceId } : {}),
  });
}
