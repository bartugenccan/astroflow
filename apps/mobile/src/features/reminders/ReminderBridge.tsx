import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import { useRouter, type Href } from "expo-router";
import * as Notifications from "expo-notifications";
import { useAppStore } from "../../store/useAppStore";
import { useMascotStore } from "../../store/useMascotStore";
import { usePlanStore } from "../../store/usePlanStore";
import { useReflectionStore } from "../../store/useReflectionStore";
import { localDay } from "../../store/useAffirmationStore";
import { reminderRoute, syncReminders } from "../../services/notifications";

/** Re-planning is cheap but touches the OS scheduler; coalesce bursts of state changes. */
const DEBOUNCE_MS = 1500;

/**
 * Keeps the device's scheduled reminders in step with the settings, the
 * language, Aster's day (what's done, the orbit, a journey, a rest) and the
 * personal plan — and opens the right screen when a reminder is tapped.
 * Renders nothing; mounted once the user has onboarded.
 */
export function ReminderBridge() {
  const router = useRouter();
  const reminders = useAppStore((s) => s.reminders);
  const locale = useAppStore((s) => s.locale);
  const mascot = useMascotStore((s) => s.state);
  const plan = usePlanStore((s) => s.plan);
  // Today's practice: a 3-6-9 session already written isn't reminded again.
  const practice = useReflectionStore((s) => s.practice[localDay()]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      syncReminders({ settings: reminders, locale, mascot, plan, practice }).catch(() => undefined);
    }, DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [reminders, locale, mascot, plan, practice]);

  // A new day may have started while the app slept: re-plan on return.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") useMascotStore.getState().refresh();
    });
    return () => sub.remove();
  }, []);

  const response = Notifications.useLastNotificationResponse();
  useEffect(() => {
    const route = reminderRoute(response ?? null);
    if (!route) return;
    // Handle each tap once, including the one that cold-started the app.
    Notifications.clearLastNotificationResponse();
    router.navigate(route as Href);
  }, [response, router]);

  return null;
}
