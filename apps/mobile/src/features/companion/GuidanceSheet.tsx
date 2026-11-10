import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SpringBottomSheet } from "../../components/ui/SpringBottomSheet";
import { AppText } from "../../components/ui/AppText";
import { StateView } from "../../components/ui/StateView";
import { PressableScale } from "../../components/ui/PressableScale";
import { astrologyApi } from "../../services/astrologyApi";
import { CreateBirthProfileDto, GuidanceAnswer, GuidanceTopic } from "../../services/types";
import { cachedCall, guidanceKey } from "../../services/interpretationCache";
import { useTranslation, TranslationKey } from "../../i18n";
import { EnterView } from "../../lib/motion";
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
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!topic || !dto) return;
    let active = true;
    setAnswer(null);
    setWhyOpen(false);
    setFailed(false);
    setLoading(true);
    const date = new Date().toISOString().slice(0, 10);
    cachedCall(guidanceKey(dto, topic, date, locale), () =>
      astrologyApi.getGuidance(dto, topic, locale),
    )
      .then((a) => active && setAnswer(a))
      .catch(() => active && setFailed(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [topic, dto, locale, attempt]);

  return (
    <SpringBottomSheet
      visible={topic !== null}
      onClose={onClose}
      title={topic ? t(`companion.topics.${topic}` as TranslationKey) : undefined}
    >
      {failed && !loading ? (
        <StateView kind="error" compact onAction={() => setAttempt((n) => n + 1)} />
      ) : loading || !answer ? (
        <StateView kind="loading" compact message={t("companion.thinking")} />
      ) : (
        <View style={styles.answer}>
          <EnterView index={0}>
            <AppText variant="lead">{answer.takeaway}</AppText>
          </EnterView>

          {answer.actions.length > 0 ? (
            <View style={styles.actions}>
              <EnterView index={1}>
                <AppText variant="label" color={colors.text.accent}>
                  {t("companion.actionsTitle")}
                </AppText>
              </EnterView>
              {answer.actions.map((a, i) => (
                <EnterView key={i} index={i + 2} style={styles.actionRow}>
                  <View style={styles.bullet}>
                    <Ionicons name="sparkles" size={12} color={colors.star[300]} />
                  </View>
                  <AppText variant="body" color={colors.text.primary} style={styles.actionText}>
                    {a}
                  </AppText>
                </EnterView>
              ))}
            </View>
          ) : null}

          <EnterView index={answer.actions.length + 2}>
            <PressableScale
              onPress={() => setWhyOpen((w) => !w)}
              scaleTo={0.94}
              hitSlop={8}
              style={styles.whyToggle}
              accessibilityRole="button"
              accessibilityState={{ expanded: whyOpen }}
            >
              <Ionicons
                name={whyOpen ? "chevron-up" : "chevron-down"}
                size={12}
                color={colors.star[300]}
              />
              <AppText variant="labelLong" color={colors.star[300]} style={styles.shrink}>
                {whyOpen ? t("companion.hideWhy") : t("companion.showWhy")}
              </AppText>
            </PressableScale>
          </EnterView>
          {whyOpen ? (
            <EnterView distance={8}>
              <AppText variant="body">{answer.why}</AppText>
            </EnterView>
          ) : null}
        </View>
      )}
    </SpringBottomSheet>
  );
}

const styles = StyleSheet.create({
  answer: {
    gap: spacing.lg,
  },
  actions: {
    gap: spacing.sm,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  bullet: {
    height: 22,
    justifyContent: "center",
  },
  actionText: {
    flex: 1,
    minWidth: 0,
  },
  whyToggle: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    minHeight: 44,
  },
  shrink: {
    flexShrink: 1,
  },
});
