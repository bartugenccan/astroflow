import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { SpringBottomSheet } from "../../components/ui/SpringBottomSheet";
import { useTranslation, type TranslationKey } from "../../i18n";
import { colors, palette, radii, spacing } from "../../lib/design-system";
import { formatInstant } from "../../lib/dates";
import { openManageSubscriptions, useBillingStore } from "../../services/purchases";

interface PremiumPerksSheetProps {
  visible: boolean;
  onClose: () => void;
  /**
   * beta: everyone has Premium for free (what's included, and the promise
   * that nothing starts charging unannounced). active: a paid subscription
   * (what it opens, when it renews, and where to manage it).
   */
  mode: "beta" | "active";
}

/** The same perks, in the same order, as the paywall. */
const PERKS: TranslationKey[] = [
  "paywall.perkUnlimited",
  "paywall.perkForecast",
  "paywall.perkBestDays",
  "paywall.perkCompat",
  "paywall.perkManifests",
];

/**
 * What "Premium" means for you, from Profile's Premium row: in the beta it
 * explains the free access (F15); for a subscriber it lists what the
 * subscription opens, its renewal date and a way to manage it. Never sells.
 */
export function PremiumPerksSheet({ visible, onClose, mode }: PremiumPerksSheetProps) {
  const { t, locale } = useTranslation();
  const billing = useBillingStore();
  const active = mode === "active";

  return (
    <SpringBottomSheet
      visible={visible}
      onClose={onClose}
      title={t(active ? "profileUi.profile.premiumActiveTitle" : "profileUi.profile.premiumBetaTitle")}
      icon="sparkles"
      tone="star"
    >
      <View style={styles.body}>
        <AppText variant="body">
          {t(active ? "profileUi.profile.premiumActiveBody" : "profileUi.profile.premiumBetaBody")}
        </AppText>

        <View style={styles.list}>
          <AppText variant="label" color={colors.text.tertiary}>
            {t(active ? "profileUi.profile.premiumActiveIncluded" : "profileUi.profile.premiumBetaIncluded")}
          </AppText>
          {PERKS.map((key) => (
            <View key={key} style={styles.perk}>
              <Ionicons name="checkmark-circle" size={20} color={palette.star.face} />
              <AppText variant="bodySmall" style={styles.flex}>
                {t(key)}
              </AppText>
            </View>
          ))}
        </View>

        {active ? (
          <>
            {billing.expiresAt ? (
              <View style={styles.note}>
                <Ionicons name="calendar-outline" size={20} color={palette.mint.face} />
                <AppText variant="bodySmall" color={colors.text.secondary} style={styles.flex}>
                  {t(billing.willRenew ? "profileUi.paywall.renewsOn" : "profileUi.paywall.endsOn", {
                    date: formatInstant(billing.expiresAt, locale),
                  })}
                </AppText>
              </View>
            ) : null}
            <AppText variant="bodySmall" color={colors.text.tertiary}>
              {t("paywall.fairUseNote")}
            </AppText>
            <View style={styles.actions}>
              <ChunkyButton label={t("profileUi.profile.premiumBetaOk")} onPress={onClose} variant="star" />
              <ChunkyButton
                label={t("profileUi.paywall.manage")}
                onPress={() => void openManageSubscriptions()}
                variant="ghost"
                uppercase={false}
              />
            </View>
          </>
        ) : (
          <>
            <View style={styles.note}>
              <Ionicons name="shield-checkmark-outline" size={20} color={palette.mint.face} />
              <AppText variant="bodySmall" color={colors.text.secondary} style={styles.flex}>
                {t("profileUi.profile.premiumBetaPromise")}
              </AppText>
            </View>
            <AppText variant="bodySmall" color={colors.text.tertiary}>
              {t("paywall.pointsNote")}
            </AppText>
            <ChunkyButton label={t("profileUi.profile.premiumBetaOk")} onPress={onClose} variant="star" />
          </>
        )}
      </View>
    </SpringBottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg, paddingBottom: spacing.lg },
  flex: { flex: 1, minWidth: 0 },
  list: { gap: spacing.sm },
  perk: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 28 },
  note: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: palette.mint.soft,
  },
  actions: { gap: spacing.sm },
});
