import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "./ui/AppText";
import { useTranslation } from "../i18n";
import { colors, spacing } from "../lib/design-system";

/**
 * Shown by a release build that has no usable API URL (missing, or not https).
 * The alternative would be the dev mock layer — fake readings presented as
 * real — so the build fails loudly instead.
 */
export function ConfigErrorScreen() {
  const { t } = useTranslation();
  return (
    <View style={styles.root}>
      <Ionicons name="cloud-offline-outline" size={40} color={colors.gold[300]} />
      <AppText variant="title" center>
        {t("common.configErrorTitle")}
      </AppText>
      <AppText variant="body" center>
        {t("common.configErrorBody")}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
    padding: spacing.xxl,
    backgroundColor: colors.ink[950],
  },
});
