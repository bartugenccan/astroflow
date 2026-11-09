import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { SpringBottomSheet } from "./ui/SpringBottomSheet";
import { ChunkyButton } from "./ui/ChunkyButton";
import { AppText } from "./ui/AppText";
import { PressableScale } from "./ui/PressableScale";
import { EnterView } from "../lib/motion";
import { useTranslation } from "../i18n";
import { useAppStore } from "../store/useAppStore";
import { astrologyApi } from "../services/astrologyApi";
import { PREMIUM_BETA } from "../services/config";
import { colors, spacing } from "../lib/design-system";

export type PaywallVariant = "compat" | "forecast" | "premium";

interface PaywallSheetProps {
  visible: boolean;
  onClose: () => void;
  variant: PaywallVariant;
  onUnlocked?: () => void;
}

/**
 * Monetization gate sheet. Payments are stubbed: "compat" grants the
 * device-scoped COMPATIBILITY unlock; "forecast"/"premium" flip the subscription
 * flag. Replace `unlock()` with a real IAP/RevenueCat purchase flow.
 */
export function PaywallSheet({ visible, onClose, variant, onUnlocked }: PaywallSheetProps) {
  const { t } = useTranslation();
  const setPremium = useAppStore((s) => s.setPremium);
  const addUnlockedFeature = useAppStore((s) => s.addUnlockedFeature);
  const [busy, setBusy] = useState(false);

  const title =
    variant === "compat"
      ? t("paywall.compatTitle")
      : variant === "forecast"
        ? t("paywall.forecastTitle")
        : t("paywall.title");
  const subtitle =
    variant === "compat"
      ? t("paywall.compatSubtitle")
      : variant === "forecast"
        ? t("paywall.forecastSubtitle")
        : t("paywall.subtitle");

  const perks =
    variant === "compat"
      ? [t("paywall.perkCompat"), t("paywall.perkReadings")]
      : [
          t("paywall.perkForecast"),
          t("paywall.perkBestDays"),
          t("paywall.perkCompat"),
          t("paywall.perkReadings"),
        ];

  const cta = variant === "compat" ? t("paywall.unlock") : t("paywall.unlockPremium");

  // No real payments yet: only dev builds can flip the stub. During the beta
  // release builds explain that Premium is open; otherwise they say "coming soon".
  const canStubUnlock = __DEV__;

  const continueBeta = () => {
    // Subscription features are client-gated: make sure they're open. Compatibility
    // readings are gated by the server, which follows its own PREMIUM_BETA.
    if (variant !== "compat") setPremium(true);
    onUnlocked?.();
    onClose();
  };

  const unlock = async () => {
    if (!canStubUnlock) return;
    setBusy(true);
    try {
      if (variant === "compat") {
        await astrologyApi.unlockFeature("COMPATIBILITY");
        addUnlockedFeature("COMPATIBILITY");
      } else {
        // Subscription unlocks everything for the demo stub.
        setPremium(true);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onUnlocked?.();
      onClose();
    } catch {
      // Keep the sheet open on failure so the user can retry.
    } finally {
      setBusy(false);
    }
  };

  return (
    <SpringBottomSheet visible={visible} onClose={onClose} title={t("paywall.premiumBadge")}>
      <EnterView>
        <AppText variant="title">{title}</AppText>
        <AppText variant="body" style={{ marginTop: spacing.sm }}>
          {subtitle}
        </AppText>
      </EnterView>

      <View style={styles.perks}>
        {perks.map((perk, i) => (
          <EnterView key={perk} index={i + 1} style={styles.perkRow}>
            <View style={styles.perkIcon}>
              <Ionicons name="sparkles" size={16} color={colors.star[300]} />
            </View>
            <AppText variant="body" color={colors.text.primary} style={styles.perkText}>
              {perk}
            </AppText>
          </EnterView>
        ))}
      </View>

      <EnterView index={perks.length + 1}>
        {canStubUnlock ? (
          <ChunkyButton label={cta} onPress={unlock} loading={busy} style={{ marginTop: spacing.lg }} />
        ) : PREMIUM_BETA ? (
          <>
            <AppText variant="body" center color={colors.star[200]} style={{ marginTop: spacing.lg }}>
              {t("paywall.betaNote")}
            </AppText>
            <ChunkyButton label={t("paywall.betaCta")} onPress={continueBeta} style={{ marginTop: spacing.md }} />
          </>
        ) : (
          <AppText variant="body" center color={colors.star[200]} style={{ marginTop: spacing.lg }}>
            {t("paywall.comingSoon")}
          </AppText>
        )}
      </EnterView>
      <PressableScale
        onPress={onClose}
        scaleTo={0.95}
        haptic="none"
        hitSlop={8}
        style={styles.later}
        accessibilityRole="button"
      >
        <AppText variant="bodySmall" center color={colors.text.tertiary} style={styles.laterText}>
          {t("paywall.maybeLater")}
        </AppText>
      </PressableScale>
    </SpringBottomSheet>
  );
}

const styles = StyleSheet.create({
  perks: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  perkRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  perkIcon: {
    height: 22,
    justifyContent: "center",
  },
  perkText: {
    flex: 1,
    minWidth: 0,
  },
  later: {
    alignSelf: "center",
    maxWidth: "100%",
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  laterText: {
    flexShrink: 1,
  },
});
