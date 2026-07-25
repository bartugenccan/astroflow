import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

const KEY = "astroflow-device-id";
let cached: string | null = null;

/** Stable anonymous device identifier, generated once and persisted. */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached;
  const existing = await AsyncStorage.getItem(KEY);
  if (existing) {
    cached = existing;
    return existing;
  }
  const id = Crypto.randomUUID();
  await AsyncStorage.setItem(KEY, id);
  cached = id;
  return id;
}
