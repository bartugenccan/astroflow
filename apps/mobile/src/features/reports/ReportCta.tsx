import React from "react";
import { StyleSheet, View } from "react-native";
import { Href, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { PressableScale } from "../../components/ui/PressableScale";
import { colors, spacing } from "../../lib/design-system";
import { useTranslation } from "../../i18n";
import type { ReportKind } from "../../services/types";

/** "Get this as a PDF" — opens My reports with that report highlighted. */
export function ReportCta({ kind }: { kind: ReportKind }) {
  const { t } = useTranslation();
  return (
    <PressableScale
      onPress={() => router.push(`/reports?kind=${kind}` as Href)}
      scaleTo={0.98}
      accessibilityRole="button"
    >
      <HairlineCard style={styles.row}>
        <View style={styles.icon}>
          <Ionicons name="document-text-outline" size={20} color={colors.gold[300]} />
        </View>
        <View style={styles.text}>
          <AppText variant="heading" numberOfLines={2}>
            {t(kind === "natal" ? "reports.ctaNatal" : "reports.ctaTransit")}
          </AppText>
          <AppText variant="bodySmall" color={colors.text.tertiary}>
            {t("reports.eyebrow")}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
      </HairlineCard>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
