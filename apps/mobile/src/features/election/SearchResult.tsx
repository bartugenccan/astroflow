import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { CelestialLoader } from "../../components/ui/CelestialLoader";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { PressableScale } from "../../components/ui/PressableScale";
import { EnterView } from "../../lib/motion";
import { formatDayMonthYear, formatLongDay } from "../../lib/dates";
import { useCachedAsync } from "../../hooks/useCachedAsync";
import { astrologyApi } from "../../services/astrologyApi";
import { electionKey } from "../../services/interpretationCache";
import type { CreateBirthProfileDto, ElectionSearchQuery } from "../../services/types";
import { useTranslation } from "../../i18n";
import { colors, radii, spacing } from "../../lib/design-system";
import { scoreColor } from "../forecast/BestDaysGrid";
import { ElectionCalendar } from "./ElectionCalendar";
import { ErrorCard, ReadingSection, SectionTitle, VerdictBadge } from "./ElectionParts";

interface Props {
  dto: CreateBirthProfileDto;
  query: ElectionSearchQuery;
  /** Open the full breakdown of one day. */
  onOpenDate: (date: string) => void;
}

/**
 * "Which dates are good?" — the five strongest days (spaced apart, each with
 * its best hours), the periods to stay away from, and every scanned day on a
 * heat calendar. Tapping any day opens its full check.
 */
export function SearchResult({ dto, query, onOpenDate }: Props) {
  const { t, locale } = useTranslation();
  const result = useCachedAsync(electionKey("result", dto, query, locale), () =>
    astrologyApi.electionSearch(dto, query, locale),
  );
  const reading = useCachedAsync(electionKey("reading", dto, query, locale), () =>
    astrologyApi.electionSearchReading(dto, query, locale),
  );
  const topDates = useMemo(() => new Set(result.data?.top.map((p) => p.date) ?? []), [result.data]);

  if (result.loading && !result.data) {
    return (
      <View style={styles.loading}>
        <CelestialLoader size="lg" label={t("election.computing")} />
      </View>
    );
  }
  if (!result.data) return <ErrorCard onRetry={result.reload} />;
  const r = result.data;

  return (
    <View style={styles.root}>
      <EnterView style={styles.head}>
        <AppText variant="title">{r.event.label}</AppText>
        <AppText variant="bodySmall" color={colors.gold[200]}>
          {formatDayMonthYear(locale, r.from)} – {formatDayMonthYear(locale, r.to)} · {r.place.name}
        </AppText>
        {r.event.fromText ? (
          <AppText variant="bodySmall" color={colors.text.tertiary}>
            {t("election.interpretedAs", { text: r.event.fromText, event: r.event.label })}
          </AppText>
        ) : null}
      </EnterView>

      <EnterView index={1}>
        <HairlineCard style={styles.card}>
          <ReadingSection text={reading.data?.summary} loading={reading.loading} />
          {reading.data?.tips.map((tip, i) => (
            <View key={i} style={styles.tip}>
              <Ionicons name="sparkles" size={14} color={colors.gold[300]} style={styles.tipIcon} />
              <AppText variant="body" color={colors.text.primary} style={styles.tipText}>
                {tip}
              </AppText>
            </View>
          ))}
        </HairlineCard>
      </EnterView>

      <EnterView index={2} style={styles.block}>
        <SectionTitle>{t("election.topTitle")}</SectionTitle>
        {r.top.map((p, i) => {
          const good = p.factors.find((f) => f.tone === "good");
          return (
            <PressableScale key={p.date} onPress={() => onOpenDate(p.date)} scaleTo={0.98}>
              <HairlineCard style={[styles.pick, i === 0 && styles.pickFirst]}>
                <View style={[styles.rank, { backgroundColor: scoreColor(p.score, 0.6) }]}>
                  <AppText variant="numeric" color={colors.text.primary} style={styles.rankScore}>
                    {p.score}
                  </AppText>
                </View>
                <View style={styles.pickText}>
                  <AppText variant="heading" numberOfLines={1}>
                    {formatLongDay(p.date, locale)}
                  </AppText>
                  <View style={styles.pickMeta}>
                    <VerdictBadge verdict={p.verdict} />
                    {p.bestHour ? (
                      <View style={styles.hour}>
                        <Ionicons name="time-outline" size={13} color={colors.gold[300]} />
                        <AppText variant="bodySmall" color={colors.gold[200]}>
                          {p.bestHour.from}–{p.bestHour.to}
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                  {good ? (
                    <AppText variant="bodySmall" numberOfLines={2}>
                      {good.label}
                    </AppText>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} />
              </HairlineCard>
            </PressableScale>
          );
        })}
      </EnterView>

      {r.avoid.length ? (
        <EnterView index={3} style={styles.block}>
          <SectionTitle>{t("election.avoidTitle")}</SectionTitle>
          <HairlineCard style={styles.avoidCard}>
            {r.avoid.map((a, i) => (
              <View key={`${a.kind}-${a.from}-${i}`} style={styles.avoid}>
                <Ionicons
                  name={a.kind === "eclipse" ? "contrast-outline" : "refresh-circle-outline"}
                  size={18}
                  color={colors.semantic.challenging}
                />
                <View style={styles.pickText}>
                  <AppText variant="body" color={colors.text.primary}>
                    {a.label.split(" · ")[0]}
                  </AppText>
                  <AppText variant="bodySmall">
                    {formatDayMonthYear(locale, a.from)} – {formatDayMonthYear(locale, a.to)}
                  </AppText>
                </View>
              </View>
            ))}
          </HairlineCard>
        </EnterView>
      ) : null}

      <EnterView index={4} style={styles.block}>
        <SectionTitle>{t("election.calendarTitle")}</SectionTitle>
        <AppText variant="bodySmall" color={colors.text.tertiary}>
          {t("election.calendarLegend")} · {t("election.tapForDetail")}
        </AppText>
        <ElectionCalendar days={r.days} topDates={topDates} onDayPress={onOpenDate} />
      </EnterView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.lg },
  loading: { paddingVertical: spacing.xxxl, alignItems: "center" },
  head: { gap: spacing.xs },
  card: { gap: spacing.md },
  tip: { flexDirection: "row", gap: spacing.sm },
  tipIcon: { marginTop: 4 },
  tipText: { flex: 1, minWidth: 0 },
  block: { gap: spacing.sm },
  pick: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  pickFirst: {
    borderColor: colors.gold[400],
  },
  rank: {
    width: 50,
    height: 50,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  rankScore: { fontSize: 18 },
  pickText: { flex: 1, minWidth: 0, gap: 4 },
  pickMeta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: spacing.sm },
  hour: { flexDirection: "row", alignItems: "center", gap: 3 },
  avoidCard: { gap: spacing.md },
  avoid: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
});
