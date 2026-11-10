import React from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "../../components/ui/AppText";
import { Chip } from "../../components/ui/Chip";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { SpringBottomSheet } from "../../components/ui/SpringBottomSheet";
import { useTranslation, TranslationKey } from "../../i18n";
import { colors, spacing } from "../../lib/design-system";
import type { JourneyDiscovery as Discovery } from "../../services/types";
import { NATURE_TONE, whyPhrase } from "../today/planCopy";
import { ConstellationFigure } from "./ConstellationFigure";

/** A constellation key in the reader's language. */
export function constellationName(t: (k: TranslationKey) => string, key: string): string {
  const k = `aster.constellations.names.${key}` as TranslationKey;
  const label = t(k);
  return label === k ? key : label;
}

interface DiscoveryContentProps {
  discovery: Discovery;
  constellationKey: string | null;
  /** Celebration extras (only known right after a claim). */
  duplicate?: boolean;
  bonusStardust?: number;
  shieldGranted?: boolean;
  /** Draw the constellation on (the celebration) or show it still (reopening). */
  animate?: boolean;
  /** Draw delay, so the figure starts after the card has landed. */
  drawDelay?: number;
  onSeeInChart: () => void;
  onLater?: () => void;
}

/**
 * What Aster brought back from a journey: the constellation drawing itself,
 * the transit it found in your chart, Aster's words about it, and the door
 * into the chart. Shared by the journey celebration and the reopen sheet.
 */
export function DiscoveryContent({
  discovery,
  constellationKey,
  duplicate,
  bonusStardust = 0,
  shieldGranted,
  animate = true,
  drawDelay = 0,
  onSeeInChart,
  onLater,
}: DiscoveryContentProps) {
  const { t } = useTranslation();
  const name = constellationKey ? constellationName(t, constellationKey) : null;
  const known = duplicate !== undefined;

  return (
    <View style={styles.wrap}>
      {constellationKey ? (
        <View style={styles.figure}>
          <ConstellationFigure
            constellation={constellationKey}
            size={168}
            animate={animate}
            delay={drawDelay}
            accessibilityLabel={name ?? undefined}
          />
          {name ? (
            <AppText variant="heading" center color={colors.star[200]}>
              {name}
            </AppText>
          ) : null}
          {known ? (
            <AppText variant="label" center color={colors.text.accent}>
              {duplicate ? t("aster.discovery.foundAgain") : t("aster.discovery.newFind")}
            </AppText>
          ) : null}
        </View>
      ) : null}

      {(duplicate && bonusStardust > 0) || shieldGranted ? (
        <View style={styles.badges}>
          {duplicate && bonusStardust > 0 ? (
            <Chip label={t("aster.discovery.stardust", { n: bonusStardust })} icon="sparkles" tone="star" />
          ) : null}
          {shieldGranted ? <Chip label={t("aster.discovery.shield")} icon="shield-checkmark" tone="primary" /> : null}
        </View>
      ) : null}

      <AppText variant="title" center>
        {discovery.title}
      </AppText>
      <View style={styles.chipRow}>
        <Chip
          label={whyPhrase(t, {
            transitPlanet: discovery.transitPlanet,
            aspect: discovery.aspect,
            natalPoint: discovery.natalPoint,
            nature: discovery.nature,
          })}
          icon="planet"
          tone={NATURE_TONE[discovery.nature] ?? "sky"}
        />
      </View>
      <AppText variant="body">{discovery.body}</AppText>

      <ChunkyButton label={t("aster.discovery.seeInChart")} variant="primary" onPress={onSeeInChart} />
      {onLater ? (
        <ChunkyButton label={t("aster.discovery.later")} variant="ghost" size="md" onPress={onLater} />
      ) : null}
    </View>
  );
}

/** Reopens today's discovery from Today once it has been claimed. */
export function JourneySheet({
  visible,
  onClose,
  discovery,
  constellationKey,
  onSeeInChart,
}: {
  visible: boolean;
  onClose: () => void;
  discovery: Discovery | null;
  constellationKey: string | null;
  onSeeInChart: (link: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <SpringBottomSheet visible={visible && !!discovery} onClose={onClose} title={t("aster.discovery.sheetTitle")}>
      {discovery ? (
        <DiscoveryContent
          discovery={discovery}
          constellationKey={constellationKey}
          drawDelay={250}
          onSeeInChart={() => {
            onClose();
            onSeeInChart(discovery.link);
          }}
        />
      ) : null}
    </SpringBottomSheet>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.md },
  figure: { alignItems: "center", gap: spacing.xs },
  badges: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm },
  chipRow: { alignItems: "center" },
});
