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
import { ChunkyButton } from "../../components/ui/ChunkyButton";
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
import { colors, depth, spacing, radii, motion, palette, surface } from "../../lib/design-system";

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
        <AppText variant="lead" style={styles.short}>
          {termText(t, id, "short")}
        </AppText>
      </View>

      {yours ? (
        <Animated.View entering={reduced ? undefined : FadeInDown.delay(80)} style={styles.yours}>
          <AppText variant="label" color={colors.text.accent}>
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
                <Ionicons name={d.icon} size={14} color={colors.star[300]} />
                <AppText variant="labelLong" color={colors.text.accent}>
                  {t(`glossary.ui.${d.titleKey}`)}
                </AppText>
              </View>
              <AppText variant="body">{termText(t, id, d.field)}</AppText>
            </Animated.View>
          ))}
        </Animated.View>
      ) : null}

      <ChunkyButton
        label={expanded ? t("glossary.ui.showLess") : t("glossary.ui.goDeeper")}
        onPress={() => setExpanded((v) => !v)}
        variant="night"
        size="md"
        uppercase={false}
        haptic="light"
        iconRight
        icon={
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.star[300]}
          />
        }
      />

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
                accessibilityRole="button"
                accessibilityLabel={termText(t, r, "title")}
              >
                <TermMark mark={GLOSSARY_BY_ID[r].mark} size={14} />
                <AppText
                  variant="bodySmall"
                  color={colors.text.primary}
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
    borderRadius: radii.pill,
    backgroundColor: palette.star.soft,
    alignItems: "center",
    justifyContent: "center",
  },
  short: {
    flex: 1,
    minWidth: 0,
  },
  yours: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: palette.star.face,
    borderBottomWidth: depth.sm + 1,
    borderBottomColor: palette.star.slab,
    backgroundColor: palette.star.soft,
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
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: surface.raised,
    borderWidth: 2,
    borderColor: colors.border.chunky,
    borderBottomWidth: depth.sm + 1,
    borderBottomColor: surface.slab,
  },
});
