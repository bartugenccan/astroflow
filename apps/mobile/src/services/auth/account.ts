import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import type { Locale } from "../../i18n";
import { useAppStore } from "../../store/useAppStore";
import { useOnboardingDraft } from "../../store/useOnboardingDraft";
import { API_URL } from "../config";
import { request } from "../httpAstrologyApi";
import { setDeviceToken } from "../deviceAuth";
import { clearInterpretationCache } from "../interpretationCache";
import { wipeAllLocalData } from "../dataWipe";
import type { AccountInfo, AuthProviderId, BirthProfileResponse, LinkResult, SavedProfile } from "../types";

/**
 * Optional accounts on top of the anonymous install.
 *
 * Linking (no account yet behind this install) keeps the token and data as
 * they are; signing in to an existing account returns a new token for the
 * account's data, after which the saved profile is pulled down so the phone
 * shows that account's chart. All of it needs the real API.
 */

export const ACCOUNTS_ENABLED = API_URL.length > 0;

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";
// The native URL scheme only exists in builds made with it (see app.config.js).
const GOOGLE_IOS_URL_SCHEME = process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME ?? "";

export const GOOGLE_ENABLED =
  ACCOUNTS_ENABLED &&
  GOOGLE_WEB_CLIENT_ID.length > 0 &&
  (Platform.OS !== "ios" || (GOOGLE_IOS_CLIENT_ID.length > 0 && GOOGLE_IOS_URL_SCHEME.length > 0));

/** The user closed the provider's sheet — not an error to show. */
export class AuthCancelled extends Error {
  constructor() {
    super("Sign-in cancelled");
    this.name = "AuthCancelled";
  }
}

export async function isAppleAvailable(): Promise<boolean> {
  if (!ACCOUNTS_ENABLED || Platform.OS !== "ios") return false;
  return AppleAuthentication.isAvailableAsync().catch(() => false);
}

export async function signInWithApple(): Promise<LinkResult> {
  // Apple embeds the SHA-256 we pass; the server re-hashes the raw nonce to compare.
  const rawNonce = `${Crypto.randomUUID()}${Crypto.randomUUID()}`;
  const nonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce,
    });
  } catch (err) {
    if ((err as { code?: string }).code === "ERR_REQUEST_CANCELED") throw new AuthCancelled();
    throw err;
  }
  if (!credential.identityToken) throw new Error("Apple returned no identity token");
  return finish(
    await request<LinkResult>("POST", "auth/apple", {
      identityToken: credential.identityToken,
      rawNonce,
      authorizationCode: credential.authorizationCode ?? undefined,
      givenName: credential.fullName?.givenName ?? undefined,
    }),
  );
}

export async function signInWithGoogle(): Promise<LinkResult> {
  // Loaded lazily so the native module is only touched when Google is configured.
  const { GoogleSignin } = await import("@react-native-google-signin/google-signin");
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    ...(GOOGLE_IOS_CLIENT_ID ? { iosClientId: GOOGLE_IOS_CLIENT_ID } : {}),
  });
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  const res = await GoogleSignin.signIn();
  if (res.type !== "success") throw new AuthCancelled();
  const idToken = res.data.idToken;
  // Our session is the device token; don't keep the SDK's (next time = account chooser).
  await GoogleSignin.signOut().catch(() => undefined);
  if (!idToken) throw new Error("Google returned no ID token");
  return finish(await request<LinkResult>("POST", "auth/google", { idToken }));
}

export async function startEmailSignIn(email: string, locale: Locale): Promise<void> {
  await request<void>("POST", "auth/email/start", { email: email.trim(), locale });
}

export async function verifyEmailSignIn(email: string, code: string): Promise<LinkResult> {
  return finish(await request<LinkResult>("POST", "auth/email/verify", { email: email.trim(), code }));
}

/** Re-read the account behind this install (e.g. after a link from another phone). */
export async function refreshAccount(): Promise<AccountInfo | null> {
  if (!ACCOUNTS_ENABLED) return null;
  const { account } = await request<{ account: AccountInfo | null }>("GET", "auth/me");
  useAppStore.getState().setAccount(account);
  return account;
}

export async function unlinkProvider(provider: AuthProviderId): Promise<void> {
  const { account } = await request<{ account: AccountInfo }>("DELETE", `auth/identities/${provider}`);
  useAppStore.getState().setAccount(account);
}

/** Sign out: this install is revoked and the phone starts fresh; the account keeps its data. */
export async function signOut(): Promise<void> {
  await request<void>("POST", "auth/logout").catch(() => undefined);
  await wipeAllLocalData({ keepIdentity: false });
}

/**
 * Put the display-only fields (name, birth place label) next to the server's
 * chart, so a sign-in on another phone can restore them. Best effort.
 */
export async function syncProfileMeta(): Promise<void> {
  if (!ACCOUNTS_ENABLED) return;
  const { displayName, birthProfile } = useAppStore.getState();
  if (!birthProfile) return;
  await request<void>("PUT", "me/profile", {
    displayName: displayName.slice(0, 40),
    ...(birthProfile.placeName ? { placeName: birthProfile.placeName.slice(0, 120) } : {}),
  }).catch(() => undefined);
}

function toBirthProfile(p: SavedProfile): BirthProfileResponse {
  const { displayName: _name, placeName, ...rest } = p;
  return { ...rest, ...(placeName ? { placeName } : {}) };
}

async function finish(result: LinkResult): Promise<LinkResult> {
  const store = useAppStore.getState();
  if (result.token) {
    // Signed in to an existing account: switch this install to its data.
    await setDeviceToken(result.token);
    clearInterpretationCache();
    const { profile } = await request<{ profile: SavedProfile | null }>("GET", "me/profile");
    if (profile) {
      const name = profile.displayName || result.account.displayName || store.displayName;
      store.completeOnboarding(name, toBirthProfile(profile));
      useOnboardingDraft.getState().clear();
    }
  } else {
    // Linked this install's own data: make sure the server can restore it later.
    await syncProfileMeta();
  }
  store.setAccount(result.account);
  return result;
}
