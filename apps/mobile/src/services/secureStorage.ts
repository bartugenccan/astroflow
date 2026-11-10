import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import type { StateStorage } from "zustand/middleware";

/**
 * zustand `persist` storage backed by the iOS Keychain / Android Keystore,
 * for state that holds personal data (birth date, time and place).
 *
 * SecureStore values are kept small (Android warns above ~2 KB), so a value is
 * split into chunks: `<name>.n` holds the chunk count, `<name>.0…` the parts.
 * A store that previously lived in AsyncStorage is moved over on first read
 * and the plaintext copy removed.
 */
const CHUNK = 1800;
const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

async function readChunks(name: string): Promise<string | null> {
  const count = Number(await SecureStore.getItemAsync(`${name}.n`, OPTIONS));
  if (!count) return null;
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const part = await SecureStore.getItemAsync(`${name}.${i}`, OPTIONS);
    if (part === null) return null; // torn write — treat as absent
    parts.push(part);
  }
  return parts.join("");
}

async function removeChunks(name: string): Promise<void> {
  const count = Number(await SecureStore.getItemAsync(`${name}.n`, OPTIONS)) || 0;
  await SecureStore.deleteItemAsync(`${name}.n`, OPTIONS);
  for (let i = 0; i < count; i++) await SecureStore.deleteItemAsync(`${name}.${i}`, OPTIONS);
}

async function writeChunks(name: string, value: string): Promise<void> {
  const previous = Number(await SecureStore.getItemAsync(`${name}.n`, OPTIONS)) || 0;
  const count = Math.max(1, Math.ceil(value.length / CHUNK));
  for (let i = 0; i < count; i++) {
    await SecureStore.setItemAsync(`${name}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK), OPTIONS);
  }
  await SecureStore.setItemAsync(`${name}.n`, String(count), OPTIONS);
  for (let i = count; i < previous; i++) await SecureStore.deleteItemAsync(`${name}.${i}`, OPTIONS);
}

/**
 * What each key holds in the keychain right now, as far as this process knows.
 * zustand's `persist` calls `setItem` on every `set` — a `loading` flag
 * flipping included — even when the persisted slice is byte-for-byte the same,
 * and every write is several keychain round-trips. An unchanged value is
 * skipped.
 */
const known = new Map<string, string | null>();

/**
 * One queue per key: chunked writes to the same key never interleave (two
 * overlapping writes could otherwise leave chunks from both).
 */
const queues = new Map<string, Promise<void>>();

function enqueue(name: string, task: () => Promise<void>): Promise<void> {
  const run = (queues.get(name) ?? Promise.resolve()).catch(() => undefined).then(task);
  queues.set(name, run);
  void run.finally(() => {
    if (queues.get(name) === run) queues.delete(name);
  });
  return run;
}

export const secureStorage: StateStorage = {
  async getItem(name) {
    await queues.get(name)?.catch(() => undefined);
    const stored = await readChunks(name);
    if (stored !== null) {
      known.set(name, stored);
      return stored;
    }
    // One-time move from the old plaintext location.
    const legacy = await AsyncStorage.getItem(name);
    if (legacy === null) return null;
    await secureStorage.setItem(name, legacy);
    await AsyncStorage.removeItem(name);
    return legacy;
  },

  setItem(name, value) {
    if (known.get(name) === value) return Promise.resolve();
    // Claim the value now, so the identical writes that follow in the same
    // burst are skipped before this one has even reached the keychain.
    known.set(name, value);
    return enqueue(name, () => writeChunks(name, value)).catch((err: unknown) => {
      // Not written after all: let the next identical value try again.
      if (known.get(name) === value) known.delete(name);
      throw err;
    });
  },

  removeItem(name) {
    known.set(name, null);
    return enqueue(name, async () => {
      await removeChunks(name);
      await AsyncStorage.removeItem(name);
    }).catch((err: unknown) => {
      known.delete(name);
      throw err;
    });
  },
};
