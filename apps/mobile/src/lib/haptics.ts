import * as Haptics from "expo-haptics";

/**
 * Semantic haptics. Components say *what happened* (a tap, a choice, a win)
 * instead of picking an engine pattern, so the whole app buzzes the same way.
 *
 * Success and celebrate share a short cooldown: one event that reaches the user
 * through two paths (a sheet's own tick and the reward pill, say) is felt once.
 * Every call is fire-and-forget; a device without a haptic engine just stays still.
 */

const COOLDOWN_MS = 350;
let lastStrong = 0;

function strongAllowed(): boolean {
  const now = Date.now();
  if (now - lastStrong < COOLDOWN_MS) return false;
  lastStrong = now;
  return true;
}

const swallow = () => undefined;

export const haptics = {
  /** A light press: buttons, rows, opening a sheet. */
  tap() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(swallow);
  },
  /** A firmer press for a primary action. */
  press() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(swallow);
  },
  /** Changing a choice: tabs, chips, pickers, toggles. */
  select() {
    Haptics.selectionAsync().catch(swallow);
  },
  /** Something worked: a reward, a completed practice. */
  success() {
    if (!strongAllowed()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(swallow);
  },
  /** Something needs care (not an error dialog — a gentle nudge). */
  warning() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(swallow);
  },
  /** A big moment only: Aster hatches or grows. */
  celebrate() {
    if (!strongAllowed()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(swallow);
  },
};
