import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { CelestialLoader } from "../../components/ui/CelestialLoader";
import { RunningEdgeLight } from "../../components/ui/RunningLightBorder";
import { StateView } from "../../components/ui/StateView";
import { TwinkleSky } from "../../components/ui/TwinkleSky";
import { energyLabel } from "../../lib/astroLanguage";
import { colors, palette, radii, spacing } from "../../lib/design-system";
import { useTranslation, type TranslationKey } from "../../i18n";
import { usePlanStore } from "../../store/usePlanStore";
import type { DailyInsight } from "../../services/types";

interface SkyTodayCardProps {
  insight: DailyInsight | null;
  failed: boolean;
  onRetry: () => void;
  /** Opens the whole day: the reading, the bi-wheel and every moving planet. */
  onOpen: () => void;
}

/**
 * "The sky today" on Today: the day's reading and the way into the full sky
 * in one card. It used to be a plain reading card with a small link row under
 * it, below the fold and easy to miss; now it is a window onto the night sky
 * (stars twinkling, a sky-blue light running round the frame) with where the
 * Moon is, the day's energy, the headline and a real button. Same slot as
 * before, so Aster and today's goals keep their place above it.
 */
export function SkyTodayCard({ insight, failed, onRetry, onOpen }: SkyTodayCardProps) {
  const { t } = useTranslation();
  const moonSign = usePlanStore((s) => s.plan?.moon?.sign ?? null);
  const moonLine = moonSign
    ? t("skypath.sky.moonIn", { sign: t(`signs.${moonSign}` as TranslationKey) })
    : null;

  return (
    <ChunkyCard
      tone="sky"
      tinted
      depth="lg"
      style={styles.card}
      onPress={insight ? onOpen : undefined}
      accessibilityLabel={insight ? `${t("today.skyLink")}. ${insight.title}` : t("today.skyLink")}
      accessibilityHint={t("today.skyLinkHint")}
    >
      <TwinkleSky color={palette.sky.face} seed="today-sky" intensity="bright" />
      <RunningEdgeLight tone="sky" />
      <View style={styles.top}>
        <View style={styles.badge}>
          <Ionicons name="planet" size={22} color={palette.sky.on} />
        </View>
        <View style={styles.flex}>
          <AppText variant="label" color={palette.sky.face} numberOfLines={1}>
            {t("today.skyLink")}
          </AppText>
          {moonLine ? (
            <AppText variant="bodySmall" color={colors.text.secondary} numberOfLines={1}>
              {moonLine}
            </AppText>
          ) : null}
        </View>
      </View>
      {insight ? (
        <View style={styles.chip}>
          <AppText variant="label" color={colors.star[300]} numberOfLines={1}>
            {energyLabel(t, insight.energyState)}
          </AppText>
        </View>
      ) : null}

      {failed && !insight ? (
        <StateView kind="error" compact message={t("today.insightError")} onAction={onRetry} />
      ) : !insight ? (
        <View style={styles.loading}>
          <CelestialLoader label={t("common.loading")} />
        </View>
      ) : (
        <>
          <AppText variant="heading">{insight.title}</AppText>
          <AppText variant="body" numberOfLines={3}>
            {insight.summary}
          </AppText>
          <ChunkyButton
            label={t("today.openSky")}
            onPress={onOpen}
            variant="sky"
            size="md"
            icon={<Ionicons name="telescope" size={18} color={palette.sky.on} />}
            accessibilityHint={t("today.skyLinkHint")}
            style={styles.cta}
          />
        </>
      )}
    </ChunkyCard>
  );
}

const styles = StyleSheet.create({
  // overflow hidden clips the TwinkleSky backdrop to the rounded card.
  card: { gap: spacing.sm, overflow: "hidden" },
  top: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  flex: { flex: 1, minWidth: 0 },
  badge: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: palette.sky.face,
    alignItems: "center",
    justifyContent: "center",
  },
  chip: {
    alignSelf: "flex-start",
    backgroundColor: palette.star.soft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  loading: { minHeight: 140, alignItems: "center", justifyContent: "center" },
  cta: { marginTop: spacing.xs },
});
