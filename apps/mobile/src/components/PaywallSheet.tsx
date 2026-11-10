import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { FullScreenOverlay } from "./ui/FullScreenOverlay";
import { ChunkyButton } from "./ui/ChunkyButton";
import { ChunkyCard } from "./ui/ChunkyCard";
import { AppText } from "./ui/AppText";
import { AsterCameo } from "./ui/AsterCameo";
import { EnterView } from "../lib/motion";
import { useTranslation } from "../i18n";
import { useAppStore } from "../store/useAppStore";
import { astrologyApi } from "../services/astrologyApi";
import { PREMIUM_BETA } from "../services/config";
import { colors, palette, radii, spacing } from "../lib/design-system";

export type PaywallVariant = "compat" | "forecast" | "premium";

interface PaywallSheetProps {
  visible: boolean;
  onClose: () => void;
  variant: PaywallVariant;
  onUnlocked?: () => void;
}

/**
 * The paywall, full screen: it rises over everything like a lesson and closes
 * with ✕, "Maybe later" or the Android back button. The API is the old sheet's,
 * so every gate keeps calling it the same way (and still gets `onUnlocked`).
 * `/premium` shows the same content as a page (Profile → Premium).
 */
export function PaywallSheet({ visible, onClose, variant, onUnlocked }: PaywallSheetProps) {
  return (
    <FullScreenOverlay visible={visible} onClose={onClose}>
      <PaywallContent variant={variant} onClose={onClose} onUnlocked={onUnlocked} />
    </FullScreenOverlay>
  );
}

/** What Premium opens and the way in; shared by the overlay and `/premium`. */
export function PaywallContent({
  variant,
  onClose,
  onUnlocked,
}: {
  variant: PaywallVariant;
  onClose: () => void;
  onUnlocked?: () => void;
}) {
  const { t } = useTranslation();
  const setPremium = useAppStore((s) => s.setPremium);
  const addUnlockedFeature = useAppStore((s) => s.addUnlockedFeature);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

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

  // Premium sells volume (more AI, more of everything); depth is earned with Light.
  const perks =
    variant === "compat"
      ? [t("paywall.perkCompat"), t("paywall.perkUnlimited")]
      : [
          t("paywall.perkUnlimited"),
          t("paywall.perkForecast"),
          t("paywall.perkBestDays"),
          t("paywall.perkCompat"),
          t("paywall.perkManifests"),
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
    setFailed(false);
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
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
      <View style={styles.body}>
        <EnterView style={styles.badgeRow}>
          <View style={styles.premiumBadge}>
            <Ionicons name="sparkles" size={14} color={palette.star.on} />
            <AppText variant="label" color={palette.star.on}>
              {t("paywall.premiumBadge")}
            </AppText>
          </View>
        </EnterView>
        <EnterView>
          <AsterCameo text={t("profileUi.paywall.asterLine")} size={64} action="cheer" />
        </EnterView>

        {/* The plan: what Premium actually opens — no invented prices. */}
        <EnterView index={1}>
          <ChunkyCard tone="star" tinted depth="lg" style={styles.plan}>
            <View style={styles.planHead}>
              <View style={styles.planBadge}>
                <Ionicons name="sparkles" size={20} color={palette.star.on} />
              </View>
              <View style={styles.grow}>
                <AppText variant="heading">{title}</AppText>
                <AppText variant="bodySmall" color={colors.text.secondary}>
                  {subtitle}
                </AppText>
              </View>
            </View>
            <View style={styles.perks}>
              {perks.map((perk, i) => (
                <EnterView key={perk} index={i + 2} style={styles.perkRow}>
                  <View style={styles.perkCheck}>
                    <Ionicons name="checkmark" size={14} color={palette.mint.on} />
                  </View>
                  <AppText variant="body" color={colors.text.primary} style={styles.grow}>
                    {perk}
                  </AppText>
                </EnterView>
              ))}
            </View>
            {PREMIUM_BETA && !canStubUnlock ? (
              <View style={styles.beta}>
                <Ionicons name="gift" size={16} color={palette.mint.face} />
                <AppText variant="bodySmall" color={colors.text.primary} style={styles.grow}>
                  {t("paywall.betaNote")}
                </AppText>
              </View>
            ) : null}
          </ChunkyCard>
        </EnterView>

        <EnterView index={perks.length + 2} style={styles.actions}>
          {canStubUnlock ? (
            <ChunkyButton
              label={cta}
              onPress={unlock}
              loading={busy}
              variant="star"
              size="lg"
              icon={<Ionicons name="lock-open" size={18} color={palette.star.on} />}
            />
          ) : PREMIUM_BETA ? (
            <ChunkyButton label={t("paywall.betaCta")} onPress={continueBeta} variant="star" size="lg" />
          ) : (
            <AppText variant="body" center color={colors.text.accent}>
              {t("paywall.comingSoon")}
            </AppText>
          )}
          {failed ? (
            <AppText
              variant="bodySmall"
              center
              color={colors.semantic.error}
              accessibilityLiveRegion="polite"
            >
              {t("common.stateError")}
            </AppText>
          ) : null}
          <ChunkyButton
            label={t("paywall.maybeLater")}
            onPress={onClose}
            variant="ghost"
            size="md"
            uppercase={false}
            haptic="none"
          />
          <AppText variant="bodySmall" center>
            {t("profileUi.paywall.honest")}
          </AppText>
          <AppText variant="bodySmall" center color={colors.text.tertiary}>
            {t("paywall.pointsNote")}
          </AppText>
        </EnterView>
      </View>
  );
}

const styles = StyleSheet.create({
  badgeRow: { alignItems: "center" },
  premiumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: palette.star.face,
  },
  body: {
    gap: spacing.lg,
  },
  plan: {
    gap: spacing.lg,
  },
  planHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  planBadge: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.star.face,
  },
  grow: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  perks: {
    gap: spacing.md,
  },
  perkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  perkCheck: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.mint.face,
  },
  beta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: palette.mint.soft,
  },
  actions: {
    gap: spacing.md,
  },
});
