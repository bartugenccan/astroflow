/**
 * Which daily counters one AI generation is charged to. Pure, so the caps are
 * unit-tested (`test/ai-budget-rules.test.mjs`); `AiBudgetService` bumps the
 * counters in order and stops at the first one past its cap.
 *
 * A device (subject) younger than a day is "new": it gets a smaller own cap
 * and also draws from a shared new-device pool. Minting devices is free, so
 * without the pool a script could create thousands and drain the global
 * budget, sending every real user to templated text for the rest of the day.
 * With it, fresh devices can spend at most the pool; established users keep
 * the rest of the global budget.
 */

export const NEW_DEVICE_AGE_MS = 24 * 60 * 60 * 1000;

/** `ai_usage.deviceId` of the system-wide counter. */
export const GLOBAL_KEY = '*';
/** `ai_usage.deviceId` of the shared counter for devices younger than a day. */
export const NEW_DEVICES_KEY = '*new';

export interface AiBudgetLimits {
  perDevice: number;
  global: number;
  perNewDevice: number;
  newDevicesGlobal: number;
}

export type AiBudgetScope = 'device' | 'new_devices' | 'global';

export interface AiBudgetCounter {
  key: string;
  cap: number;
  scope: AiBudgetScope;
}

/**
 * The counters for one generation, in charge order: the device's own first
 * (a device hammering its own cap never touches the shared ones), then the
 * new-device pool when it applies, then the global one.
 *
 * `ageMs` is how long ago the subject's first install registered, or null
 * when unknown (a legacy id): unknown counts as established.
 */
export function aiBudgetCounters(
  deviceId: string | undefined,
  ageMs: number | null,
  limits: AiBudgetLimits,
): AiBudgetCounter[] {
  const counters: AiBudgetCounter[] = [];
  const isNew = !!deviceId && ageMs !== null && ageMs < NEW_DEVICE_AGE_MS;
  if (deviceId) {
    counters.push({ key: deviceId, cap: isNew ? Math.min(limits.perNewDevice, limits.perDevice) : limits.perDevice, scope: 'device' });
  }
  if (isNew) counters.push({ key: NEW_DEVICES_KEY, cap: limits.newDevicesGlobal, scope: 'new_devices' });
  counters.push({ key: GLOBAL_KEY, cap: limits.global, scope: 'global' });
  return counters;
}
