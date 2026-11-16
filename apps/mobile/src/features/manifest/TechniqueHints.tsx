import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "../../components/ui/AppText";
import { Chip } from "../../components/ui/Chip";
import { useTranslation, type TranslationKey } from "../../i18n";
import { colors, spacing } from "../../lib/design-system";
import { checkAffirmation } from "./affirmationTechnique";

/**
 * Gentle, live technique hints under an affirmation being written: four small
 * chips (first person, present tense, positive, believable) and one tip for
 * the first habit that is missing. Advisory only — nothing is blocked.
 */
export function TechniqueHints({ text }: { text: string }) {
  const { t, locale } = useTranslation();
  const checks = useMemo(() => checkAffirmation(text, locale), [text, locale]);
  if (checks.length === 0) return null;
  const missing = checks.find((c) => !c.ok);

  return (
    <View style={styles.root} accessibilityLiveRegion="polite">
      <View style={styles.chips}>
        {checks.map((c) => (
          <Chip
            key={c.key}
            label={t(`practice.technique.${c.key}` as TranslationKey)}
            icon={c.ok ? "checkmark-circle" : "ellipse-outline"}
            tone={c.ok ? "mint" : "star"}
            selected={c.ok}
          />
        ))}
      </View>
      <AppText variant="bodySmall" color={colors.text.secondary}>
        {missing ? t(`practice.technique.tip.${missing.key}` as TranslationKey) : t("practice.technique.allGood")}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xs },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
});
