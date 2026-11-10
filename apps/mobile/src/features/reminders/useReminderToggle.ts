import { useCallback } from "react";
import { Alert, Linking } from "react-native";
import { useAppStore, type ReminderSettings } from "../../store/useAppStore";
import { requestReminderPermission } from "../../services/notifications";
import { useTranslation } from "../../i18n";

export type ReminderKind = "daily" | "intention" | "practice369";

/**
 * Turning a reminder on asks for notification permission first; a blocked
 * permission offers the OS settings instead of silently failing. Turning one
 * off never asks. The schedule itself follows the stored settings
 * (ReminderBridge in the root layout).
 */
export function useReminderToggle() {
  const { t } = useTranslation();
  const setReminders = useAppStore((s) => s.setReminders);

  return useCallback(
    async (kind: ReminderKind, on: boolean) => {
      const patch = (v: boolean) => ({ [kind]: v }) as Partial<ReminderSettings>;
      if (!on) {
        setReminders(patch(false));
        return;
      }
      const permission = await requestReminderPermission().catch(() => "denied" as const);
      if (permission === "granted") {
        setReminders(patch(true));
      } else if (permission === "blocked") {
        Alert.alert(t("profile.remindersBlockedTitle"), t("profile.remindersBlockedBody"), [
          { text: t("profile.cancel"), style: "cancel" },
          { text: t("profile.openSettings"), onPress: () => Linking.openSettings().catch(() => undefined) },
        ]);
      }
    },
    [setReminders, t],
  );
}
