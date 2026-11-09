import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { translate, type Locale } from "../i18n";
import type { ReminderSettings } from "../store/useAppStore";

/**
 * Local reminders, scheduled on the device. No push token is ever created and
 * nothing leaves the phone: the OS fires repeating calendar triggers.
 *
 * Each reminder has a fixed identifier, so re-syncing replaces it instead of
 * stacking duplicates; `syncReminders` is safe to call on every launch and
 * after any settings or language change.
 */

const DAILY_ID = "astroflow.reminder.daily";
const INTENTION_ID = "astroflow.reminder.intention";
const CHANNEL_ID = "reminders";
/** Evening check-in time for the intention reminder (local). */
const INTENTION_HOUR = 20;
const INTENTION_MINUTE = 30;

/** Where a tap on each reminder leads (an expo-router path). */
export type ReminderRoute = "/" | "/intentions";

// Show reminders that fire while the app is open, quietly.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export type PermissionResult = "granted" | "denied" | "blocked";

/**
 * Ask for notification permission only when the user turns a reminder on.
 * "blocked" means the OS won't show the prompt again — send them to Settings.
 */
export async function requestReminderPermission(): Promise<PermissionResult> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return "granted";
  if (!current.canAskAgain) return "blocked";
  const next = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  if (next.granted) return "granted";
  return next.canAskAgain ? "denied" : "blocked";
}

async function hasPermission(): Promise<boolean> {
  const { granted } = await Notifications.getPermissionsAsync();
  return granted;
}

async function ensureChannel(locale: Locale): Promise<void> {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: translate(locale, "reminders.channelName"),
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

/** Make the scheduled reminders match the settings (and the current language). */
export async function syncReminders(settings: ReminderSettings, locale: Locale): Promise<void> {
  await Promise.all([
    Notifications.cancelScheduledNotificationAsync(DAILY_ID).catch(() => undefined),
    Notifications.cancelScheduledNotificationAsync(INTENTION_ID).catch(() => undefined),
  ]);
  if (!settings.daily && !settings.intention) return;
  if (!(await hasPermission())) return;
  await ensureChannel(locale);

  if (settings.daily) {
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_ID,
      content: {
        title: translate(locale, "reminders.dailyTitle"),
        body: translate(locale, "reminders.dailyBody"),
        data: { route: "/" satisfies ReminderRoute },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: settings.hour,
        minute: settings.minute,
        channelId: CHANNEL_ID,
      },
    });
  }
  if (settings.intention) {
    await Notifications.scheduleNotificationAsync({
      identifier: INTENTION_ID,
      content: {
        title: translate(locale, "reminders.intentionTitle"),
        body: translate(locale, "reminders.intentionBody"),
        data: { route: "/intentions" satisfies ReminderRoute },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: INTENTION_HOUR,
        minute: INTENTION_MINUTE,
        channelId: CHANNEL_ID,
      },
    });
  }
}

/** Remove every scheduled reminder (data deletion, start over). */
export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
}

/** The route a tapped reminder asks for, if it is one of ours. */
export function reminderRoute(response: Notifications.NotificationResponse | null): ReminderRoute | null {
  const route = response?.notification.request.content.data?.route;
  return route === "/" || route === "/intentions" ? route : null;
}
