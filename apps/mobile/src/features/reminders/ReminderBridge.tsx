import { useEffect } from "react";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { useAppStore } from "../../store/useAppStore";
import { reminderRoute, syncReminders } from "../../services/notifications";

/**
 * Keeps the device's scheduled reminders in step with the stored settings
 * (on launch, on toggle/time change, and on language change so the text
 * follows), and opens the right screen when a reminder is tapped.
 * Renders nothing; mounted once the user has onboarded.
 */
export function ReminderBridge() {
  const router = useRouter();
  const reminders = useAppStore((s) => s.reminders);
  const locale = useAppStore((s) => s.locale);

  useEffect(() => {
    syncReminders(reminders, locale).catch(() => undefined);
  }, [reminders, locale]);

  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const route = reminderRoute(response ?? null);
    if (!route) return;
    // Handle each tap once, including the one that cold-started the app.
    Notifications.clearLastNotificationResponse();
    router.navigate(route);
  }, [response, router]);

  return null;
}
