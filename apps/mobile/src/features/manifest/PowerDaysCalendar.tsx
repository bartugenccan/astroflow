import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { PressableScale } from "../../components/ui/PressableScale";
import { StateView } from "../../components/ui/StateView";
import { AsterCameo } from "../../components/ui/AsterCameo";
import { astrologyApi } from "../../services/astrologyApi";
import { useAsync } from "../../hooks/useAsync";
import { aspectPhrase } from "../../lib/astroLanguage";
import { useTranslation, type TranslationKey } from "../../i18n";
import type { CreateBirthProfileDto, PowerDay } from "../../services/types";
import { colors, palette, radii, spacing, surface } from "../../lib/design-system";
import { WishStarGlyph } from "./WishStarGlyph";
import { planetName } from "./WishChartCard";
import { shortDate, weekdayShort, type StarLook } from "./wishModel";

interface PowerDaysCalendarProps {
  intentionId: string;
  dto: CreateBirthProfileDto;
}

/**
 * The wish's next 14 days scored from the user's transits. The strongest
 * open days are its power days (a gold star). Before Glimmer only the first
 * few are open — the rest wait behind Aster's lock, a reason to keep growing.
 */
export function PowerDaysCalendar({ intentionId, dto }: PowerDaysCalendarProps) {
  const { t, locale } = useTranslation();
  const data = useAsync(() => astrologyApi.getPowerDays(intentionId, dto), [intentionId, dto]);
  const [picked, setPicked] = useState<string | null>(null);

  const days = data.data?.days ?? [];
  const maxScore = Math.max(1, ...days.map((d) => d.score ?? 0));
  const best = useMemo(() => {
    const open = days.filter((d) => !d.locked && d.score !== null);
    return new Set(
      open
        .slice()
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 3)
        .map((d) => d.date),
    );
  }, [days]);
  const locked = days.some((d) => d.locked);
  const area = data.data ? t(`wish.areas.${data.data.area}.inline` as TranslationKey) : "";
  const pickedDay = days.find((d) => d.date === picked) ?? null;

  let body: React.ReactNode;
  if (data.loading && !data.data) body = <StateView kind="loading" compact />;
  else if (data.error && !data.data)
    body = <StateView kind="error" compact message={t("wish.detail.powerError")} onAction={data.reload} />;
  else
    body = (
      <>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.grid}>
          {days.map((d) => (
            <DayCell
              key={d.date}
              day={d}
              best={best.has(d.date)}
              level={(d.score ?? 0) / maxScore}
              selected={picked === d.date}
              onPress={() => setPicked(d.date === picked ? null : d.date)}
            />
          ))}
        </ScrollView>
        {pickedDay && !pickedDay.locked ? (
          <View style={styles.reason} accessibilityLiveRegion="polite">
            <AppText variant="label" color={colors.text.accent}>
              {shortDate(locale, pickedDay.date)}
              {best.has(pickedDay.date) ? ` · ${t("wish.detail.powerBest")}` : ""}
            </AppText>
            <AppText variant="body" color={colors.text.primary}>
              {pickedDay.reason
                ? aspectPhrase(
                    t,
                    pickedDay.reason.aspect,
                    planetName(t, pickedDay.reason.transitPlanet),
                    planetName(t, pickedDay.reason.natalPlanet),
                  )
                : t("wish.detail.powerNoReason", { area })}
            </AppText>
          </View>
        ) : (
          <AppText variant="bodySmall">{t("wish.detail.powerPick")}</AppText>
        )}
        {locked ? (
          <View style={styles.lock}>
            <AsterCameo text={t("wish.detail.powerLocked")} size={56} />
            <AppText variant="bodySmall">{t("wish.detail.powerLockedBody")}</AppText>
          </View>
        ) : null}
      </>
    );

  return (
    <ChunkyCard style={styles.card}>
      <View style={styles.head}>
        <Ionicons name="flash" size={18} color={colors.star[300]} />
        <AppText variant="heading" accessibilityRole="header">
          {t("wish.detail.powerTitle")}
        </AppText>
      </View>
      {data.data ? <AppText variant="bodySmall">{t("wish.detail.powerSubtitle", { area })}</AppText> : null}
      {body}
    </ChunkyCard>
  );
}

function DayCell({
  day,
  best,
  level,
  selected,
  onPress,
}: {
  day: PowerDay;
  best: boolean;
  level: number;
  selected: boolean;
  onPress: () => void;
}) {
  const { t, locale } = useTranslation();
  const date = shortDate(locale, day.date);
  const score = Math.round(day.score ?? 0);
  const look: StarLook = best ? "radiant" : level > 0.75 ? "glowing" : level > 0.45 ? "spark" : "seed";
  const label = day.locked
    ? t("wish.detail.powerLockedA11y", { date })
    : best
      ? t("wish.detail.powerBestA11y", { date, score })
      : t("wish.detail.powerDayA11y", { date, score });

  return (
    <PressableScale
      onPress={onPress}
      disabled={day.locked}
      scaleTo={0.92}
      style={[
        styles.cell,
        best && !day.locked && styles.cellBest,
        selected && styles.cellSelected,
        day.locked && styles.cellLocked,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: day.locked }}
      accessibilityLabel={label}
    >
      <AppText variant="numeric" color={colors.text.tertiary} numberOfLines={1}>
        {weekdayShort(locale, day.date)}
      </AppText>
      <AppText variant="heading">{Number(day.date.slice(8, 10))}</AppText>
      {day.locked ? (
        <Ionicons name="lock-closed" size={14} color={colors.star[300]} />
      ) : (
        <WishStarGlyph look={look} size={18} />
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  grid: { gap: spacing.sm, paddingBottom: spacing.xs },
  cell: {
    width: 52,
    minHeight: 76,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.border.chunky,
    borderBottomColor: surface.slab,
    backgroundColor: surface.raised,
  },
  cellBest: { borderColor: colors.star[400], backgroundColor: palette.star.soft },
  cellSelected: { borderColor: colors.text.primary },
  cellLocked: { backgroundColor: palette.night.soft },
  reason: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: palette.star.soft,
  },
  lock: { gap: spacing.sm },
});
