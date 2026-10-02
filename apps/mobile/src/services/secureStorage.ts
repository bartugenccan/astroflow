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

export const secureStorage: StateStorage = {
  async getItem(name) {
    const stored = await readChunks(name);
    if (stored !== null) return stored;
    // One-time move from the old plaintext location.
    const legacy = await AsyncStorage.getItem(name);
    if (legacy === null) return null;
    await secureStorage.setItem(name, legacy);
    await AsyncStorage.removeItem(name);
    return legacy;
  },

  async setItem(name, value) {
    const previous = Number(await SecureStore.getItemAsync(`${name}.n`, OPTIONS)) || 0;
    const count = Math.max(1, Math.ceil(value.length / CHUNK));
    for (let i = 0; i < count; i++) {
      await SecureStore.setItemAsync(`${name}.${i}`, value.slice(i * CHUNK, (i + 1) * CHUNK), OPTIONS);
    }
    await SecureStore.setItemAsync(`${name}.n`, String(count), OPTIONS);
    for (let i = count; i < previous; i++) await SecureStore.deleteItemAsync(`${name}.${i}`, OPTIONS);
  },

  async removeItem(name) {
    await removeChunks(name);
    await AsyncStorage.removeItem(name);
  },
};
