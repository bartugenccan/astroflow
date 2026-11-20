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
 * Optional accounts need the real API. Lives here (not in auth/account) so
 * stores can read it without importing the auth service, which would close
 * the cycle account → dataWipe → stores → account.
 */
export const ACCOUNTS_ENABLED = API_URL.length > 0;

/**
 * Everyone gets Premium until real payments ship. Flip
 * EXPO_PUBLIC_PREMIUM_BETA=false (with PREMIUM_BETA=false on the API) when they do.
 */
export const PREMIUM_BETA = (process.env.EXPO_PUBLIC_PREMIUM_BETA ?? "true") !== "false";

/**
 * Public website with the privacy policy, terms and support pages
 * (apps/web, one page per language: /{locale}/privacy, /terms, /support).
 * Hosted on Vercel at getastroflow.com (the old astroflow-web.vercel.app
 * address keeps working for older builds).
 */
const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL || "https://getastroflow.com").trim().replace(/\/+$/, "");

export type LegalPage = "privacy" | "terms" | "support";

/**
 * Where in-app reports (e.g. a harmful AI answer) go: the same address as the
 * website's support page in that language. Both forward to the team inbox
 * (Cloudflare Email Routing); EXPO_PUBLIC_SUPPORT_EMAIL overrides both.
 */
export function supportEmail(locale: "en" | "tr"): string {
  const override = (process.env.EXPO_PUBLIC_SUPPORT_EMAIL ?? "").trim();
  if (override) return override;
  return locale === "tr" ? "destek@getastroflow.com" : "support@getastroflow.com";
}

export function legalUrl(page: LegalPage, locale: "en" | "tr"): string {
  return `${SITE_URL}/${locale}/${page}`;
}

/**
 * The short link printed on share cards (e.g. "astroflow-web.vercel.app/s").
 * apps/web serves /s as a redirect to the store tagged with campaign "share",
 * falling back to the waitlist where the app isn't available. Follows
 * EXPO_PUBLIC_SITE_URL, so it switches by itself once the real domain exists.
 */
export function shareLinkLabel(): string {
  return `${SITE_URL.replace(/^https?:\/\//, "")}/s`;
}
