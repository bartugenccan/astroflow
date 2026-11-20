import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { SpringBottomSheet } from "../../components/ui/SpringBottomSheet";
import { useTranslation, type TranslationKey } from "../../i18n";
import { colors, palette, radii, spacing } from "../../lib/design-system";

interface PremiumBetaSheetProps {
  visible: boolean;
  onClose: () => void;
}

const PERKS: TranslationKey[] = [
  "paywall.perkUnlimited",
  "paywall.perkForecast",
  "paywall.perkBestDays",
  "paywall.perkCompat",
  "paywall.perkManifests",
];

/**
 * What "Premium" means while everyone has it for free (F15): what's
 * included, that it costs nothing now, and the promise that nothing starts
 * charging without a clear notice first. No price, no button that buys.
 */
export function PremiumBetaSheet({ visible, onClose }: PremiumBetaSheetProps) {
  const { t } = useTranslation();
  return (
    <SpringBottomSheet
      visible={visible}
      onClose={onClose}
      title={t("profileUi.profile.premiumBetaTitle")}
      icon="sparkles"
      tone="star"
    >
      <View style={styles.body}>
        <AppText variant="body">{t("profileUi.profile.premiumBetaBody")}</AppText>

        <View style={styles.list}>
          <AppText variant="label" color={colors.text.tertiary}>
            {t("profileUi.profile.premiumBetaIncluded")}
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

        <View style={styles.promise}>
          <Ionicons name="shield-checkmark-outline" size={20} color={palette.mint.face} />
          <AppText variant="bodySmall" color={colors.text.secondary} style={styles.flex}>
            {t("profileUi.profile.premiumBetaPromise")}
          </AppText>
        </View>

        <AppText variant="bodySmall" color={colors.text.tertiary}>
          {t("paywall.pointsNote")}
        </AppText>

        <ChunkyButton label={t("profileUi.profile.premiumBetaOk")} onPress={onClose} variant="star" />
      </View>
    </SpringBottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg, paddingBottom: spacing.lg },
  flex: { flex: 1, minWidth: 0 },
  list: { gap: spacing.sm },
  perk: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 28 },
  promise: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: palette.mint.soft,
  },
});
