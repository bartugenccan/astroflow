import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  LinearTransition,
  useReducedMotion,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { TermMark } from "./TermMark";
import { PressableScale } from "../../components/ui/PressableScale";
import { useTranslation } from "../../i18n";
import { useAppStore } from "../../store/useAppStore";
import { useBirthDto } from "../../hooks/useBirthDto";
import { useCachedAsync } from "../../hooks/useCachedAsync";
import { dtoKey } from "../../services/interpretationCache";
import { astrologyApi } from "../../services/astrologyApi";
import { NatalChartData } from "../../services/types";
import {
  GLOSSARY_BY_ID,
  GlossaryField,
  GlossaryTermId,
  personalLine,
  termText,
} from "../../lib/glossary";
import { colors, spacing, radii, motion } from "../../lib/design-system";

interface TermBodyProps {
  id: GlossaryTermId;
  /** Start with the detail open (the glossary screen does; the sheet doesn't). */
  initiallyExpanded?: boolean;
  /** Tapping a related term. Omit to hide the related chips. */
  onRelated?: (id: GlossaryTermId) => void;
}

const DETAIL: { field: GlossaryField; titleKey: "whatTitle" | "howTitle" | "lifeTitle" | "exampleTitle"; icon: keyof typeof Ionicons.glyphMap }[] = [
  { field: "what", titleKey: "whatTitle", icon: "sparkles-outline" },
  { field: "how", titleKey: "howTitle", icon: "calculator-outline" },
  { field: "life", titleKey: "lifeTitle", icon: "person-outline" },
  { field: "example", titleKey: "exampleTitle", icon: "bulb-outline" },
];

/**
 * A glossary entry in layers: the one-line answer, the reader's own chart,
 * then — on "Go deeper" — what it is, how it's calculated, what it means for a
 * life, and an example. Shared by the term sheet and the glossary screen.
 */
export function TermBody({ id, initiallyExpanded = false, onRelated }: TermBodyProps) {
  const { t, locale } = useTranslation();
  const reduced = useReducedMotion();
  const [expanded, setExpanded] = useState(initiallyExpanded);
  const entry = GLOSSARY_BY_ID[id];

  const profile = useAppStore((s) => s.birthProfile);
  const dto = useBirthDto();
  const key = dto ? dtoKey(dto) : null;
  const { data: chart } = useCachedAsync<NatalChartData>(
    key && `chart|${key}`,
    () => astrologyApi.getNatalChart(dto!),
  );
  const yours = personalLine(id, t, locale, chart, profile);

  const layout = reduced ? undefined : LinearTransition.springify().damping(motion.spring.gentle.damping);

  return (
    <Animated.View layout={layout} style={styles.wrap}>
      <View style={styles.head}>
        <View style={styles.glyph}>
          <TermMark mark={entry.mark} size={22} />
        </View>
        <AppText variant="serifBody" style={styles.short}>
          {termText(t, id, "short")}
        </AppText>
      </View>

      {yours ? (
        <Animated.View entering={reduced ? undefined : FadeInDown.delay(80)} style={styles.yours}>
          <AppText variant="label" color={colors.text.gold}>
            {t("glossary.ui.yoursTitle")}
          </AppText>
          <AppText variant="body" color={colors.text.primary}>
            {yours}
          </AppText>
        </Animated.View>
      ) : null}

      {expanded ? (
        <Animated.View entering={reduced ? undefined : FadeIn} exiting={reduced ? undefined : FadeOut} style={styles.detail}>
          {DETAIL.map((d, i) => (
            <Animated.View
              key={d.field}
              entering={reduced ? undefined : FadeInDown.delay(i * motion.stagger).springify().damping(motion.spring.gentle.damping)}
              style={styles.block}
            >
              <View style={styles.blockHead}>
                <Ionicons name={d.icon} size={14} color={colors.gold[300]} />
                <AppText variant="labelLong" color={colors.text.gold}>
                  {t(`glossary.ui.${d.titleKey}`)}
                </AppText>
              </View>
              <AppText variant="body">{termText(t, id, d.field)}</AppText>
            </Animated.View>
          ))}
        </Animated.View>
      ) : null}

      <PressableScale
        onPress={() => setExpanded((v) => !v)}
        style={styles.toggle}
        scaleTo={0.97}
        accessibilityRole="button"
      >
        <AppText variant="heading" color={colors.gold[300]}>
          {expanded ? t("glossary.ui.showLess") : t("glossary.ui.goDeeper")}
        </AppText>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.gold[300]}
        />
      </PressableScale>

      {onRelated && entry.related.length ? (
        <View style={styles.related}>
          <AppText variant="label">{t("glossary.ui.relatedTitle")}</AppText>
          <View style={styles.chips}>
            {entry.related.map((r) => (
              <PressableScale
                key={r}
                onPress={() => onRelated(r)}
                style={styles.chip}
                scaleTo={0.94}
              >
                <TermMark mark={GLOSSARY_BY_ID[r].mark} size={14} />
                <AppText
                  variant="bodySmall"
                  color={colors.text.secondary}
                  numberOfLines={1}
                  style={styles.chipText}
                >
                  {termText(t, r, "title")}
                </AppText>
              </PressableScale>
            ))}
          </View>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.lg,
  },
  head: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  glyph: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    backgroundColor: colors.ink[800],
    alignItems: "center",
    justifyContent: "center",
  },
  short: {
    flex: 1,
    minWidth: 0,
    fontSize: 19,
    lineHeight: 27,
  },
  yours: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    backgroundColor: colors.glow.goldSoft,
  },
  detail: {
    gap: spacing.lg,
  },
  block: {
    gap: spacing.xs,
  },
  blockHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  related: {
    gap: spacing.sm,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chipText: {
    flexShrink: 1,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    maxWidth: "100%",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.ink[800],
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
});
