import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { translate, type Locale, type TranslationKey } from "../i18n";
import type { ReminderSettings } from "../store/useAppStore";
import type { DailyPlan, MascotState, PracticeDay, PracticeSlot } from "./types";

/**
 * Local reminders, scheduled on the device. No push token is ever created and
 * nothing leaves the phone.
 *
 * Reminders are one-shot notifications for the next few days, rebuilt every
 * time something changes (settings, language, Aster's day, the plan). That
 * is what lets them be gentle: a reminder for something already done today
 * is simply not scheduled, an eclipse (rest) silences everything, and if the
 * app isn't opened at all they stop after a few days instead of nagging.
 */

const CHANNEL_ID = "reminders";
const PREFIX = "astroflow.";
/** Days ahead we keep reminders for (today + the next two). */
const DAYS_AHEAD = 3;
/** Evening check-in time (local) — the intention / orbit reminder. */
const EVENING_HOUR = 20;
const EVENING_MINUTE = 30;

/** The 3-6-9 sessions (local time): 3 lines in the morning, 6 at noon, 9 in the evening. */
const PRACTICE_369_AT: readonly { slot: PracticeSlot; hour: number; reps: number }[] = [
  { slot: "morning", hour: 9, reps: 3 },
  { slot: "noon", hour: 14, reps: 6 },
  { slot: "evening", hour: 21, reps: 9 },
];

/** The deep link a 3-6-9 reminder opens. */
export const PRACTICE_369_ROUTE = "/practice?method=369";

/** Where a tap on each reminder leads (an expo-router path). */
export type ReminderRoute = "/" | "/intentions" | `/intentions/${string}` | typeof PRACTICE_369_ROUTE;

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
 * Ask for notification permission (when the user turns a reminder on, or
 * when Aster first sets off on a journey). "blocked" means the OS won't show
 * the prompt again — send them to Settings.
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

/** What the reminders are built from. Mascot and plan are optional (not loaded yet). */
export interface ReminderContext {
  settings: ReminderSettings;
  locale: Locale;
  mascot: MascotState | null;
  plan: DailyPlan | null;
  /** Today's practice so far (a 3-6-9 session already written isn't reminded). */
  practice?: PracticeDay;
  now?: Date;
}

export interface PlannedReminder {
  id: string;
  at: Date;
  titleKey: TranslationKey;
  bodyKey: TranslationKey;
  params?: Record<string, string | number>;
  route: ReminderRoute;
}

function at(base: Date, dayOffset: number, hour: number, minute: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + dayOffset, hour, minute, 0, 0);
}

/**
 * Pure: which reminders should exist right now. Exported for tests and so
 * the rules are readable in one place.
 */
export function planReminders({
  settings,
  locale,
  mascot,
  plan,
  practice,
  now = new Date(),
}: ReminderContext): PlannedReminder[] {
  if (mascot?.eclipse.active) return [];
  const out: PlannedReminder[] = [];
  const doneToday = (k: keyof MascotState["today"]) => (mascot?.today?.[k] ?? 0) > 0;
  const future = (d: Date) => d.getTime() > now.getTime() + 60_000;

  // Aster coming home is something the user started — always worth a ping.
  if (mascot?.journey.status === "away" && mascot.journey.returnsAt) {
    const back = new Date(mascot.journey.returnsAt);
    if (future(back)) {
      out.push({
        id: `${PREFIX}journey`,
        at: back,
        titleKey: "reminders.journeyTitle",
        bodyKey: "reminders.journeyBody",
        route: "/",
      });
    }
  }

  if (settings.daily) {
    for (let d = 0; d < DAYS_AHEAD; d++) {
      const when = at(now, d, settings.hour, settings.minute);
      if (!future(when)) continue;
      // Today's reading already read (or the day checked in): no need to ask.
      if (d === 0 && (doneToday("SKY_READ") || doneToday("SKY_CHECKIN"))) continue;
      const power = d === 0 && plan?.powerIntentionId && plan.focusWhy;
      out.push(
        power
          ? {
              id: `${PREFIX}daily.${d}`,
              at: when,
              titleKey: "reminders.powerTitle",
              bodyKey: "reminders.powerBody",
              params: {
                area: translate(locale, `lifeAreas.${plan.focusArea}` as TranslationKey),
                planet: plan.focusWhy
                  ? translate(locale, `planets.${plan.focusWhy.transitPlanet}` as TranslationKey)
                  : "",
              },
              route: `/intentions/${plan.powerIntentionId}`,
            }
          : {
              id: `${PREFIX}daily.${d}`,
              at: when,
              titleKey: "reminders.dailyTitle",
              bodyKey: "reminders.dailyBody",
              route: "/",
            },
      );
    }
  }

  if (settings.intention || settings.daily) {
    for (let d = 0; d < DAYS_AHEAD; d++) {
      const when = at(now, d, EVENING_HOUR, EVENING_MINUTE);
      if (!future(when)) continue;
      const orbitAtRisk = d === 0 && !!mascot?.orbit.atRisk && mascot.orbit.streak >= 2;
      if (orbitAtRisk) {
        out.push({
          id: `${PREFIX}evening.${d}`,
          at: when,
          titleKey: "reminders.orbitTitle",
          bodyKey: "reminders.orbitBody",
          params: { n: mascot?.orbit.streak ?? 0 },
          route: "/",
        });
        continue;
      }
      if (!settings.intention) continue;
      if (d === 0 && doneToday("CHECKIN")) continue;
      out.push({
        id: `${PREFIX}evening.${d}`,
        at: when,
        titleKey: "reminders.intentionTitle",
        bodyKey: "reminders.intentionBody",
        route: "/intentions",
      });
    }
  }
  if (settings.practice369) {
    for (let d = 0; d < DAYS_AHEAD; d++) {
      for (const s of PRACTICE_369_AT) {
        const when = at(now, d, s.hour, 0);
        if (!future(when)) continue;
        if (d === 0 && practice?.s369?.[s.slot]) continue;
        out.push({
          id: `${PREFIX}369.${s.slot}.${d}`,
          at: when,
          titleKey: `reminders.s369.${s.slot}Title` as TranslationKey,
          bodyKey: "reminders.s369.body",
          params: { n: s.reps },
          route: PRACTICE_369_ROUTE,
        });
      }
    }
  }
  return out;
}

/** Ids this module ever schedules (current and legacy repeating ones). */
async function cancelOurs(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => undefined)),
  );
}

/** Make the scheduled reminders match the settings, the day so far and the plan. */
export async function syncReminders(ctx: ReminderContext): Promise<void> {
  await cancelOurs();
  const planned = planReminders(ctx);
  if (planned.length === 0 || !(await hasPermission())) return;
  await ensureChannel(ctx.locale);
  for (const r of planned) {
    await Notifications.scheduleNotificationAsync({
      identifier: r.id,
      content: {
        title: translate(ctx.locale, r.titleKey, r.params),
        body: translate(ctx.locale, r.bodyKey, r.params),
        data: { route: r.route },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: r.at,
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
  if (route === "/" || route === "/intentions" || route === PRACTICE_369_ROUTE) return route;
  if (typeof route === "string" && /^\/intentions\/[A-Za-z0-9-]{1,64}$/.test(route)) {
    return route as ReminderRoute;
  }
  return null;
}
