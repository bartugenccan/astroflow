import React from "react";
import { StyleSheet, View } from "react-native";
import { Href, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { colors, palette, radii, spacing } from "../../lib/design-system";
import { useTranslation } from "../../i18n";
import type { ReportKind } from "../../services/types";

/** "Get this as a PDF" — opens My reports with that report highlighted. */
export function ReportCta({ kind }: { kind: ReportKind }) {
  const { t } = useTranslation();
  const title = t(kind === "natal" ? "reports.ctaNatal" : "reports.ctaTransit");
  return (
      <ChunkyCard
        style={styles.row}
        onPress={() => router.push(`/reports?kind=${kind}` as Href)}
        accessibilityLabel={title}
      >
        <View style={styles.icon}>
          <Ionicons name="document-text" size={20} color={palette.candy.on} />
        </View>
        <View style={styles.text}>
          <AppText variant="heading" numberOfLines={2}>
            {title}
          </AppText>
          <AppText variant="bodySmall" color={colors.text.tertiary}>
            {t("reports.eyebrow")}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
      </ChunkyCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.candy.face,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
