import Constants from "expo-constants";
import PostHog from "posthog-react-native";

type ExpoExtra = {
  posthogProjectToken?: string;
  posthogHost?: string;
};

type IdentifiedAccount = {
  id: string;
  email: string | null;
  displayName: string | null;
};

const extra = Constants.expoConfig?.extra as ExpoExtra | undefined;
const projectToken = extra?.posthogProjectToken?.trim();
const host = extra?.posthogHost?.trim();

function reportMissingConfiguration(variableName: string) {
  if (__DEV__) {
    console.error(
      new Error(
        `${variableName} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${variableName} is configured`,
      ),
    );
  }
}

if (!projectToken) reportMissingConfiguration("EXPO_PUBLIC_POSTHOG_KEY");
if (!host) reportMissingConfiguration("EXPO_PUBLIC_POSTHOG_HOST");

/** Shared client for the Expo app. Import this instance for non-component analytics calls. */
export const posthog =
  projectToken && host
    ? new PostHog(projectToken, {
        host,
        captureAppLifecycleEvents: true,
        errorTracking: {
          autocapture: {
            uncaughtExceptions: true,
            unhandledRejections: true,
            console: [],
          },
        },
        logs: {
          serviceName: "astroflow-mobile",
          serviceVersion: Constants.expoConfig?.version,
          environment: __DEV__ ? "development" : "production",
        },
      })
    : null;

type ApiRequestLog = {
  method: string;
  api_area: string;
  duration_ms: number;
  status_code: number;
};

/** Dedicated PostHog log emitter. Only its purpose-written records leave the app. */
export const posthogLogger = {
  apiRequestCompleted(attributes: ApiRequestLog): void {
    posthog?.logger.info("api_request_completed", attributes);
  },
  apiRequestFailed(attributes: ApiRequestLog): void {
    if (attributes.status_code >= 500 || attributes.status_code === 0) {
      posthog?.logger.error("api_request_failed", attributes);
      return;
    }
    posthog?.logger.warn("api_request_failed", attributes);
  },
};

let identifiedAccountId: string | null = null;

/** Identify authenticated accounts with their stable server id, not a provider profile field. */
export function identifyAccount(account: IdentifiedAccount): void {
  if (!posthog || identifiedAccountId === account.id) return;

  posthog.identify(account.id, {
    $set: {
      ...(account.email ? { email: account.email } : {}),
      ...(account.displayName ? { display_name: account.displayName } : {}),
    },
  });
  identifiedAccountId = account.id;
}

/** Clear the persisted analytics identity when this device signs out. */
export function resetPostHog(): void {
  posthog?.reset();
  identifiedAccountId = null;
}
