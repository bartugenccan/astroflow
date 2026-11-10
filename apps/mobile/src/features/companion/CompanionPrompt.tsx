import React from "react";
import { StyleSheet, View } from "react-native";
import { BleedRow } from "../../components/ui/BleedRow";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { Chip } from "../../components/ui/Chip";
import { GuidanceTopic } from "../../services/types";
import { useTranslation, TranslationKey } from "../../i18n";
import { colors, spacing } from "../../lib/design-system";

const TOPICS: GuidanceTopic[] = ["love", "work", "money", "decision", "person", "mood"];

/**
 * Question-first entry to the companion: chips + "Talk to Aster". The guidance
 * answer sheet is owned by the parent screen (rendered at the screen root, NOT
 * inside the ScrollView) — this component only surfaces the chips.
 */
export function CompanionPrompt({
  onSelectTopic,
}: {
  onSelectTopic: (topic: GuidanceTopic) => void;
}) {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View style={styles.wrap}>
      <AppText variant="label" color={colors.text.accent}>
        {t("companion.whatsOnYourMind")}
      </AppText>

      <BleedRow contentContainerStyle={styles.chips}>
        {TOPICS.map((tp) => (
          <Chip
            key={tp}
            label={t(`companion.topics.${tp}` as TranslationKey)}
            onPress={() => onSelectTopic(tp)}
            style={styles.chip}
          />
        ))}
      </BleedRow>

      <ChunkyCard
        style={styles.talkRow}
        onPress={() => router.push("/companion" as Href)}
        accessibilityLabel={t("companion.talkCta")}
      >
        <Ionicons name="chatbubbles" size={20} color={colors.star[300]} />
        <AppText variant="body" color={colors.text.primary} style={styles.talkText}>
          {t("companion.talkCta")}
        </AppText>
        <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
      </ChunkyCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  chips: {
    gap: spacing.sm,
  },
  chip: {
    minHeight: 44,
  },
  talkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  talkText: {
    flex: 1,
    minWidth: 0,
  },
});
