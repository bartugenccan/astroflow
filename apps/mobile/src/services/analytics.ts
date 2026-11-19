import PostHog from "posthog-react-native";

/**
 * Product analytics (PostHog). Off unless EXPO_PUBLIC_POSTHOG_KEY is set, and
 * off in __DEV__ so local work never lands in the project.
 *
 * Privacy (matches ship.config.json → "Usage Data / Product Interaction",
 * not linked, not tracking):
 *  - anonymous only: we never call identify(), and no person profiles are made;
 *  - no GeoIP enrichment (PostHog would otherwise derive a city from the IP);
 *  - events carry only the names and small enums below, never birth data,
 *    names, places or anything the user typed;
 *  - screens are reported by route pattern ("(tabs)/today"), never with ids.
 * No ATT prompt is needed: nothing is shared with other companies' apps.
 */
const KEY = (process.env.EXPO_PUBLIC_POSTHOG_KEY ?? "").trim();
const HOST = (process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://eu.i.posthog.com").trim();

export const ANALYTICS_ENABLED = KEY.length > 0 && !__DEV__;

export const posthog: PostHog | null = ANALYTICS_ENABLED
  ? new PostHog(KEY, {
      host: HOST,
      personProfiles: "never",
      disableGeoip: true,
      captureAppLifecycleEvents: true,
      // Crashes go to Sentry; PostHog stays product analytics only.
      errorTracking: { autocapture: false },
      preloadFeatureFlags: false,
      flushAt: 20,
    })
  : null;

/** Every event the app sends, with its allowed properties. Add here first. */
export interface AnalyticsEvents {
  onboarding_completed: Record<string, never>;
  reading_go_deeper: { open: boolean };
  detail_level_changed: { level: "simple" | "deep" };
  aster_opened: { hinted: boolean };
  sky_moment_opened: Record<string, never>;
  planet_opened: { planet: string };
  tarot_started: { category: string; spread: string; asked: boolean };
  companion_message_sent: Record<string, never>;
  paywall_viewed: { source: string };
  purchase_started: { product: string };
  purchase_completed: { product: string };
  purchase_failed: { reason: string };
  purchases_restored: { active: boolean };
  /** The OS share sheet was opened for a card (iOS can't tell us whether it was actually sent). */
  share_sheet_opened: { variant: ShareCardVariant };
  /** Onboarding "where did you hear about us?" — one tap from a fixed list, never free text. */
  acquisition_source: { source: AcquisitionSource };
}

export type ShareCardVariant = "daily" | "bigThree" | "compatibility";

export const ACQUISITION_SOURCES = ["tiktok", "instagram", "friend", "app_store", "other"] as const;
export type AcquisitionSource = (typeof ACQUISITION_SOURCES)[number];

export function track<E extends keyof AnalyticsEvents>(event: E, ...props: AnalyticsEvents[E] extends Record<string, never> ? [] : [AnalyticsEvents[E]]): void {
  if (!posthog) return;
  try {
    posthog.capture(event, (props[0] ?? {}) as Record<string, string | number | boolean>);
  } catch {
    // Analytics must never break the app.
  }
}

/** A screen view, by expo-router route pattern (segments, no ids). */
export function trackScreen(route: string): void {
  if (!posthog || !route) return;
  try {
    void posthog.screen(route);
  } catch {
    // ignore
  }
}

/** "Delete my data": drop the anonymous id and queued events on this phone. */
export async function resetAnalytics(): Promise<void> {
  try {
    await posthog?.reset();
  } catch {
    // ignore
  }
}
