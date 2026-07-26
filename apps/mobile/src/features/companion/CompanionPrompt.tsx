import React from "react";
import { StyleSheet, View, Pressable, ScrollView } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { GuidanceTopic } from "../../services/types";
import { useTranslation, TranslationKey } from "../../i18n";
import { colors, spacing, radii } from "../../lib/design-system";

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
      <AppText variant="label" color={colors.text.gold}>
        {t("companion.whatsOnYourMind")}
      </AppText>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {TOPICS.map((tp) => (
          <Pressable key={tp} style={styles.chip} onPress={() => onSelectTopic(tp)}>
            <AppText variant="bodySmall" color={colors.text.primary}>
              {t(`companion.topics.${tp}` as TranslationKey)}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable onPress={() => router.push("/companion" as Href)}>
        <HairlineCard style={styles.talkRow}>
          <Ionicons name="sparkles-outline" size={18} color={colors.gold[300]} />
          <AppText variant="body" color={colors.text.secondary} style={styles.talkText}>
            {t("companion.talkCta")}
          </AppText>
          <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} />
        </HairlineCard>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  chips: {
    gap: spacing.sm,
    paddingRight: spacing.xl,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    backgroundColor: colors.ink[800],
  },
  talkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  talkText: {
    flex: 1,
  },
});
