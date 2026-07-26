import React, { useEffect, useState } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SpringBottomSheet } from "../../components/ui/SpringBottomSheet";
import { AppText } from "../../components/ui/AppText";
import { CelestialLoader } from "../../components/ui/CelestialLoader";
import { astrologyApi } from "../../services/astrologyApi";
import { CreateBirthProfileDto, GuidanceAnswer, GuidanceTopic } from "../../services/types";
import { cachedCall, guidanceKey } from "../../services/interpretationCache";
import { useTranslation, TranslationKey } from "../../i18n";
import { colors, spacing } from "../../lib/design-system";

interface GuidanceSheetProps {
  topic: GuidanceTopic | null;
  dto: CreateBirthProfileDto | null;
  onClose: () => void;
}

/**
 * The guidance answer for a "What's on your mind?" chip. Rendered at the SCREEN
 * ROOT (never inside a ScrollView) so the sheet's absolute positioning anchors
 * to the viewport, not scroll content.
 */
export function GuidanceSheet({ topic, dto, onClose }: GuidanceSheetProps) {
  const { t, locale } = useTranslation();
  const [answer, setAnswer] = useState<GuidanceAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);

  useEffect(() => {
    if (!topic || !dto) return;
    let active = true;
    setAnswer(null);
    setWhyOpen(false);
    setLoading(true);
    const date = new Date().toISOString().slice(0, 10);
    cachedCall(guidanceKey(dto, topic, date, locale), () =>
      astrologyApi.getGuidance(dto, topic, locale),
    )
      .then((a) => active && setAnswer(a))
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [topic, dto, locale]);

  return (
    <SpringBottomSheet
      visible={topic !== null}
      onClose={onClose}
      title={topic ? t(`companion.topics.${topic}` as TranslationKey) : undefined}
    >
      {loading || !answer ? (
        <View style={styles.loading}>
          <CelestialLoader label={t("companion.thinking")} />
        </View>
      ) : (
        <View style={styles.answer}>
          <AppText variant="serifBody">{answer.takeaway}</AppText>

          {answer.actions.length > 0 ? (
            <View style={styles.actions}>
              <AppText variant="label" color={colors.text.gold}>
                {t("companion.actionsTitle")}
              </AppText>
              {answer.actions.map((a, i) => (
                <View key={i} style={styles.actionRow}>
                  <Ionicons name="ellipse" size={5} color={colors.gold[300]} />
                  <AppText variant="body" color={colors.text.primary} style={styles.actionText}>
                    {a}
                  </AppText>
                </View>
              ))}
            </View>
          ) : null}

          <Pressable onPress={() => setWhyOpen((w) => !w)} style={styles.whyToggle}>
            <AppText variant="label" color={colors.gold[300]}>
              {whyOpen ? t("companion.hideWhy") : t("companion.showWhy")}
            </AppText>
          </Pressable>
          {whyOpen ? <AppText variant="body">{answer.why}</AppText> : null}
        </View>
      )}
    </SpringBottomSheet>
  );
}

const styles = StyleSheet.create({
  loading: {
    alignItems: "center",
    paddingVertical: spacing.xl,
  },
  answer: {
    gap: spacing.lg,
  },
  actions: {
    gap: spacing.sm,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  actionText: {
    flex: 1,
  },
  whyToggle: {
    alignSelf: "flex-start",
  },
});
