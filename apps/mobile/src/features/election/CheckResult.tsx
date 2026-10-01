import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { CelestialLoader } from "../../components/ui/CelestialLoader";
import { CountUp } from "../../components/ui/CountUp";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { PressableScale } from "../../components/ui/PressableScale";
import { ScoreRing } from "../../components/ScoreRing";
import { EnterView } from "../../lib/motion";
import { formatLongDay } from "../../lib/dates";
import { useCachedAsync } from "../../hooks/useCachedAsync";
import { astrologyApi } from "../../services/astrologyApi";
import { electionKey } from "../../services/interpretationCache";
import type { CreateBirthProfileDto, ElectionCheckQuery } from "../../services/types";
import { useTranslation } from "../../i18n";
import { colors, spacing } from "../../lib/design-system";
import { scoreColor } from "../forecast/BestDaysGrid";
import {
  ErrorCard,
  FactorList,
  HourWindows,
  ReadingSection,
  SectionTitle,
  VerdictBadge,
  verdictColor,
} from "./ElectionParts";

interface Props {
  dto: CreateBirthProfileDto;
  query: ElectionCheckQuery;
  /** Open another date with the same event and place. */
  onOpenDate: (date: string) => void;
}

/**
 * "Is this date good?" — the computed verdict lands first (score, best hours,
 * what helps and hurts), the plain-language reading fills in when the AI
 * answers, and clearly better days nearby are one tap away.
 */
export function CheckResult({ dto, query, onOpenDate }: Props) {
  const { t, locale } = useTranslation();
  const result = useCachedAsync(electionKey("result", dto, query, locale), () =>
    astrologyApi.electionCheck(dto, query, locale),
  );
  const reading = useCachedAsync(electionKey("reading", dto, query, locale), () =>
    astrologyApi.electionCheckReading(dto, query, locale),
  );

  if (result.loading && !result.data) {
    return (
      <View style={styles.loading}>
        <CelestialLoader size="lg" label={t("election.computing")} />
      </View>
    );
  }
  if (!result.data) return <ErrorCard onRetry={result.reload} />;

  const r = result.data;
  const color = verdictColor(r.verdict);

  return (
    <View style={styles.root}>
      {/* Verdict */}
      <EnterView scale>
        <HairlineCard elevated style={styles.hero}>
          <ScoreRing
            score={r.score}
            size={112}
            stroke={7}
            center={<CountUp value={r.score} variant="title" color={color} />}
          />
          <View style={styles.heroText}>
            <AppText variant="label" color={colors.text.tertiary}>
              {t("election.scoreLabel")}
            </AppText>
            <VerdictBadge verdict={r.verdict} />
            <AppText variant="heading">{r.event.label}</AppText>
            <AppText variant="bodySmall" color={colors.gold[200]}>
              {formatLongDay(r.date, locale)}
            </AppText>
            <View style={styles.place}>
              <Ionicons name="location-outline" size={13} color={colors.text.tertiary} />
              <AppText variant="bodySmall" color={colors.text.tertiary} numberOfLines={1}>
                {r.place.name}
              </AppText>
            </View>
          </View>
        </HairlineCard>
      </EnterView>
      {r.event.fromText ? (
        <AppText variant="bodySmall" color={colors.text.tertiary}>
          {t("election.interpretedAs", { text: r.event.fromText, event: r.event.label })}
        </AppText>
      ) : null}

      {/* Plain-language reading */}
      <EnterView index={1}>
        <HairlineCard style={styles.card}>
          <AppText variant="serifBody" color={colors.text.primary}>
            {reading.data?.summary ?? ""}
          </AppText>
          {!reading.data && reading.loading ? <ReadingSection loading /> : null}
          <ReadingSection title={t("election.sections.why")} text={reading.data?.why} loading={reading.loading} />
          <ReadingSection title={t("election.sections.advice")} text={reading.data?.advice} loading={reading.loading} />
          <ReadingSection title={t("election.sections.caution")} text={reading.data?.caution} loading={reading.loading} />
        </HairlineCard>
      </EnterView>

      {/* Hours */}
      <EnterView index={2} style={styles.block}>
        <SectionTitle>{t("election.bestHours")}</SectionTitle>
        <HourWindows hours={r.hours} place={r.place.name} />
      </EnterView>

      {/* Factors */}
      <EnterView index={3} style={styles.block}>
        <SectionTitle>{t("election.factorsTitle")}</SectionTitle>
        <HairlineCard>
          <FactorList factors={r.factors} />
        </HairlineCard>
      </EnterView>

      {/* Better days nearby */}
      <EnterView index={4} style={styles.block}>
        <SectionTitle>{t("election.alternatives")}</SectionTitle>
        {r.alternatives.length ? (
          r.alternatives.map((a) => (
            <PressableScale key={a.date} onPress={() => onOpenDate(a.date)} scaleTo={0.98}>
              <HairlineCard style={styles.alt}>
                <View style={[styles.altScore, { backgroundColor: scoreColor(a.score, 0.55) }]}>
                  <AppText variant="numeric" color={colors.text.primary}>
                    {a.score}
                  </AppText>
                </View>
                <View style={styles.altText}>
                  <AppText variant="heading" numberOfLines={1}>
                    {formatLongDay(a.date, locale)}
                  </AppText>
                  <VerdictBadge verdict={a.verdict} />
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
              </HairlineCard>
            </PressableScale>
          ))
        ) : (
          <AppText variant="bodySmall" color={colors.text.secondary}>
            {t("election.alternativesNone")}
          </AppText>
        )}
      </EnterView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.lg },
  loading: { paddingVertical: spacing.xxxl, alignItems: "center" },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  heroText: { flex: 1, minWidth: 0, gap: spacing.xs },
  place: { flexDirection: "row", alignItems: "center", gap: 4 },
  card: { gap: spacing.lg },
  block: { gap: spacing.sm },
  alt: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  altScore: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  altText: { flex: 1, minWidth: 0, gap: spacing.xs },
});
