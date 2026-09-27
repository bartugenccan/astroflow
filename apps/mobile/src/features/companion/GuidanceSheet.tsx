import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SpringBottomSheet } from "../../components/ui/SpringBottomSheet";
import { AppText } from "../../components/ui/AppText";
import { CelestialLoader } from "../../components/ui/CelestialLoader";
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
          <EnterView index={0}>
            <AppText variant="serifBody">{answer.takeaway}</AppText>
          </EnterView>

          {answer.actions.length > 0 ? (
            <View style={styles.actions}>
              <EnterView index={1}>
                <AppText variant="label" color={colors.text.gold}>
                  {t("companion.actionsTitle")}
                </AppText>
              </EnterView>
              {answer.actions.map((a, i) => (
                <EnterView key={i} index={i + 2} style={styles.actionRow}>
                  <View style={styles.bullet}>
                    <Ionicons name="sparkles" size={12} color={colors.gold[300]} />
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
                color={colors.gold[300]}
              />
              <AppText variant="labelLong" color={colors.gold[300]} style={styles.shrink}>
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
    paddingVertical: spacing.xs,
  },
  shrink: {
    flexShrink: 1,
  },
});
