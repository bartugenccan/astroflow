/**
 * API wiring. Set EXPO_PUBLIC_API_URL to point the app at the real backend;
 * leaving it unset keeps a DEV build on the local mock data layer.
 *
 * On a physical device in dev use your machine's LAN IP, not localhost, e.g.
 *   EXPO_PUBLIC_API_URL=http://192.168.1.20:3000
 *
 * Release builds are stricter: the API must be https (birth data and chat go
 * over this connection), and the mock layer is never used — a release build
 * without a valid URL shows a configuration error instead of fake data.
 */
const raw = (process.env.EXPO_PUBLIC_API_URL ?? "").trim().replace(/\/+$/, "");
const insecureInRelease = !__DEV__ && raw.length > 0 && !raw.startsWith("https://");

export const API_URL = insecureInRelease ? "" : raw;

/** A release build that has no usable API URL (missing, or not https). */
export const API_CONFIG_ERROR = !__DEV__ && API_URL.length === 0;

/** Real backend unless this is a dev build with no URL set. */
export const USE_HTTP = API_URL.length > 0 || !__DEV__;

/**
 * Everyone gets Premium until real payments ship. Flip
 * EXPO_PUBLIC_PREMIUM_BETA=false (with PREMIUM_BETA=false on the API) when they do.
 */
export const PREMIUM_BETA = (process.env.EXPO_PUBLIC_PREMIUM_BETA ?? "true") !== "false";
