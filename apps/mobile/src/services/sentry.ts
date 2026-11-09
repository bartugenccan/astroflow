import * as Sentry from "@sentry/react-native";
import { isRunningInExpoGo } from "expo";

/**
 * Crash + error reporting. Off unless EXPO_PUBLIC_SENTRY_DSN is set, and off in
 * __DEV__ so local work never pollutes the project.
 *
 * Privacy: events are NOT linked to the user — no user id, no device id, no IP
 * (sendDefaultPii false). Birth data, coordinates and anything the user typed
 * (Aster chat, tarot questions, election events, affirmations) is scrubbed from
 * extras, contexts and breadcrumbs before an event leaves the phone.
 */
const DSN = (process.env.EXPO_PUBLIC_SENTRY_DSN ?? "").trim();
const ENVIRONMENT = process.env.EXPO_PUBLIC_APP_ENV ?? (__DEV__ ? "development" : "production");

export const SENTRY_ENABLED = DSN.length > 0 && !__DEV__;

/** Wired to the expo-router navigation container in app/_layout.tsx. */
export const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: !isRunningInExpoGo(),
});

const SENSITIVE_KEY =
  /birth|latitude|longitude|^lat$|^lng$|^lon$|place|city|coord|message|content|question|text|body|affirmation|memory|displayname|personname|email|^code$|token|authorization/i;

const REDACTED = "[redacted]";

const SDK_CONTEXTS = new Set([
  "app",
  "device",
  "os",
  "runtime",
  "culture",
  "trace",
  "react_native_context",
  "expo",
  "response",
]);

/** Drop query string and fragment: a city search URL carries the typed birth place. */
function stripQuery(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

/** Span / request data keys that can carry a full URL or its query. */
const URL_KEYS = ["url", "http.url", "http.full_url", "url.full", "server.address.full"];
const QUERY_KEYS = ["http.query", "http.fragment", "url.query", "url.fragment"];

function scrubUrlData(data: Record<string, unknown> | undefined): void {
  if (!data) return;
  for (const k of QUERY_KEYS) delete data[k];
  for (const k of URL_KEYS) if (typeof data[k] === "string") data[k] = stripQuery(data[k] as string);
}

function scrub(value: unknown, depth = 0): unknown {
  if (depth > 6 || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((v) => scrub(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = SENSITIVE_KEY.test(k) ? REDACTED : scrub(v, depth + 1);
  }
  return out;
}

export function initSentry(): void {
  Sentry.init({
    dsn: DSN,
    enabled: SENTRY_ENABLED,
    environment: ENVIRONMENT,
    sendDefaultPii: false,
    tracesSampleRate: 0.2,
    integrations: [navigationIntegration],
    enableNativeFramesTracking: !isRunningInExpoGo(),
    beforeBreadcrumb(crumb) {
      // Console output can echo user text; HTTP crumbs keep only method/status/url path.
      if (crumb.category === "console") return null;
      scrubUrlData(crumb.data);
      if (crumb.data) crumb.data = scrub(crumb.data) as typeof crumb.data;
      return crumb;
    },
    // Fetch spans record the full URL and its query (http.query) — strip both.
    beforeSendSpan(span) {
      scrubUrlData(span.data as Record<string, unknown> | undefined);
      if (span.description) span.description = stripQuery(span.description);
      return span;
    },
    beforeSendTransaction(event) {
      delete event.user;
      for (const span of event.spans ?? []) {
        scrubUrlData(span.data as Record<string, unknown> | undefined);
        if (span.description) span.description = stripQuery(span.description);
      }
      scrubUrlData(event.contexts?.trace?.data as Record<string, unknown> | undefined);
      if (event.request) {
        delete event.request.query_string;
        if (event.request.url) event.request.url = stripQuery(event.request.url);
      }
      return event;
    },
    beforeSend(event) {
      delete event.user;
      if (event.request) {
        delete event.request.query_string;
        delete event.request.data;
        if (event.request.url) event.request.url = stripQuery(event.request.url);
      }
      if (event.extra) event.extra = scrub(event.extra) as typeof event.extra;
      if (event.contexts) {
        // SDK-owned contexts (os, device, app…) drive Sentry's UI; only scrub ours.
        for (const key of Object.keys(event.contexts)) {
          if (!SDK_CONTEXTS.has(key)) {
            event.contexts[key] = scrub(event.contexts[key]) as (typeof event.contexts)[string];
          }
        }
      }
      return event;
    },
  });
}

/** Report a handled error that should still be visible in Sentry. */
export function reportError(error: unknown, tags?: Record<string, string>): void {
  if (!SENTRY_ENABLED) return;
  Sentry.captureException(error, tags ? { tags } : undefined);
}

export { Sentry };
