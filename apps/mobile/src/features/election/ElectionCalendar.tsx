import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "../../components/ui/AppText";
import { PressableScale } from "../../components/ui/PressableScale";
import { formatMonthYear } from "../../lib/dates";
import { useTranslation } from "../../i18n";
import { colors, radii, shadows, spacing } from "../../lib/design-system";
import { scoreColor } from "../forecast/BestDaysGrid";

interface Props {
  days: { date: string; score: number }[];
  topDates: Set<string>;
  onDayPress: (date: string) => void;
}

const WEEKDAYS: Record<string, string[]> = {
  en: ["M", "T", "W", "T", "F", "S", "S"],
  tr: ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"],
};

/** Month-by-month heat map of every scanned day (Monday-first), best picks ringed in gold. */
export function ElectionCalendar({ days, topDates, onDayPress }: Props) {
  const { locale } = useTranslation();

  const months = useMemo(() => {
    const byMonth = new Map<string, { date: string; score: number }[]>();
    for (const d of days) {
      const key = d.date.slice(0, 7);
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key)!.push(d);
    }
    return [...byMonth.entries()];
  }, [days]);

  return (
    <View style={styles.root}>
      {months.map(([ym, list]) => {
        const [y, m] = ym.split("-").map(Number);
        // Pad to the weekday of the 1st (Monday = 0), then the scanned days by date.
        const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7;
        const byDay = new Map(list.map((d) => [Number(d.date.slice(8, 10)), d]));
        const total = new Date(y, m, 0).getDate();
        const cells: ({ day: number; item?: { date: string; score: number } } | null)[] = [
          ...Array.from({ length: lead }, () => null),
          ...Array.from({ length: total }, (_, i) => ({ day: i + 1, item: byDay.get(i + 1) })),
        ];
        return (
          <View key={ym} style={styles.month}>
            <AppText variant="heading">{formatMonthYear(locale, ym)}</AppText>
            <View style={styles.grid}>
              {(WEEKDAYS[locale] ?? WEEKDAYS.en).map((w, i) => (
                <View key={`w${i}`} style={styles.cell}>
                  <AppText variant="label" center color={colors.text.tertiary}>
                    {w}
                  </AppText>
                </View>
              ))}
              {cells.map((c, i) => (
                <View key={i} style={styles.cell}>
                  {c ? (
                    c.item ? (
                      <PressableScale
                        onPress={() => onDayPress(c.item!.date)}
                        scaleTo={0.9}
                        haptic="selection"
                        style={[
                          styles.day,
                          { backgroundColor: scoreColor(c.item.score, 0.5) },
                          topDates.has(c.item.date) && styles.top,
                        ]}
                      >
                        <AppText variant="bodySmall" center color={colors.text.primary}>
                          {c.day}
                        </AppText>
                      </PressableScale>
                    ) : (
                      <View style={[styles.day, styles.past]}>
                        <AppText variant="bodySmall" center color={colors.text.tertiary}>
                          {c.day}
                        </AppText>
                      </View>
                    )
                  ) : null}
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.xl },
  month: { gap: spacing.sm },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
  },
  day: {
    flex: 1,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  past: {
    opacity: 0.35,
  },
  top: {
    borderWidth: 1.5,
    borderColor: colors.gold[400],
    ...shadows.goldGlow,
  },
});
