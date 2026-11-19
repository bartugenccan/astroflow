import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "./config";
import { useAppStore } from "../store/useAppStore";

/** Signed device token from the API (Keychain / Keystore, not plain storage). */
const TOKEN_KEY = "astroflow.deviceToken";
/** Where builds before device tokens kept their self-generated id (plain AsyncStorage). */
const LEGACY_ID_KEY = "astroflow-device-id";

let cached: string | null = null;
let pending: Promise<string> | null = null;

type IdentityListener = (subject: string | null) => void;
const listeners = new Set<IdentityListener>();
let lastSubject: string | null = null;

/**
 * The subject a device token speaks for (its JWT `sub`): the anonymous
 * install, or the account it signed in to. Random UUID, no personal data. Used
 * as the RevenueCat app user id so a subscription follows the account.
 * Read-only decode; the server still verifies every token.
 */
export function subjectOf(token: string | null | undefined): string | null {
  const part = token?.split(".")[1];
  if (!part) return null;
  try {
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    const sub = (JSON.parse(atob(b64)) as { sub?: unknown }).sub;
    return typeof sub === "string" && sub ? sub : null;
  } catch {
    return null;
  }
}

/** Current subject, registering the install first if needed. */
export async function getSubject(): Promise<string | null> {
  return subjectOf(await getDeviceToken().catch(() => null));
}

/** Called whenever the token's subject changes (first registration, sign-in, reset). */
export function onIdentityChange(listener: IdentityListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function announce(token: string | null): void {
  const subject = subjectOf(token);
  if (subject === lastSubject) return;
  lastSubject = subject;
  for (const l of listeners) {
    try {
      l(subject);
    } catch {
      // A listener must never break auth.
    }
  }
}

/**
 * The device token every API request carries as `Authorization: Bearer`.
 * Registered once per install. A plaintext id left by a build from before
 * tokens is only deleted: claiming it would let anyone who knows a UUID take
 * over that install's data.
 */
export function getDeviceToken(): Promise<string> {
  if (cached) return Promise.resolve(cached);
  pending ??= load().finally(() => {
    pending = null;
  });
  return pending;
}

/**
 * Forget the token (after a 401, logout, or data deletion). The next request
 * registers a fresh anonymous install, so any account link shown is stale.
 */
export async function resetDeviceToken(): Promise<void> {
  cached = null;
  useAppStore.getState().setAccount(null);
  await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
  announce(null);
}

/** Swap in a token the API minted for this install (sign-in to an account). */
export async function setDeviceToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
  cached = token;
  announce(token);
}

async function load(): Promise<string> {
  const stored = await SecureStore.getItemAsync(TOKEN_KEY);
  if (stored) {
    cached = stored;
    announce(stored);
    return stored;
  }
  const res = await fetch(`${API_URL}/api/v1/auth/device`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) throw new Error(`Device registration failed (${res.status})`);
  const { token } = (await res.json()) as { token: string };
  await SecureStore.setItemAsync(TOKEN_KEY, token, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
  await AsyncStorage.removeItem(LEGACY_ID_KEY).catch(() => undefined);
  cached = token;
  announce(token);
  return token;
}
