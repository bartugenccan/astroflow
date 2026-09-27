import React, { useMemo, useState } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { CelestialLoader } from "../../components/ui/CelestialLoader";
import { SpringBottomSheet } from "../../components/ui/SpringBottomSheet";
import { PressableScale } from "../../components/ui/PressableScale";
import { Segmented } from "../../components/ui/Segmented";
import { CountUp } from "../../components/ui/CountUp";
import { PaywallSheet } from "../../components/PaywallSheet";
import { PremiumGate } from "../../components/PremiumGate";
import { GoldButton } from "../../components/ui/GoldButton";
import { EnterView } from "../../lib/motion";
import { BestDaysGrid } from "./BestDaysGrid";
import { ScoreBar } from "./ScoreBar";
import { astrologyApi } from "../../services/astrologyApi";
import { BestDayScore, ForecastPeriod, LifeArea } from "../../services/types";
import { bestDaysKey, forecastKey } from "../../services/interpretationCache";
import { useCachedAsync } from "../../hooks/useCachedAsync";
import { useBirthDto } from "../../hooks/useBirthDto";
import { useAppStore } from "../../store/useAppStore";
import { useTranslation, TranslationKey, Locale } from "../../i18n";
import { colors, spacing, radii, motion } from "../../lib/design-system";

const AREAS: LifeArea[] = ["love", "career", "money", "energy"];

/** "2026-09-27" → "Sunday, 27 September" / "27 Eylül Pazar". Non-ISO strings pass through. */
function formatDay(iso: string | undefined, locale: Locale, withWeekday = true): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12);
  try {
    return d.toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
      ...(withWeekday ? { weekday: "long" as const } : {}),
      day: "numeric",
      month: "long",
    });
  } catch {
    return iso;
  }
}

interface ForecastScreenProps {
  /** Rendered first inside the scroll — the Future tab pins the Solar Return here. */
  headerSlot?: React.ReactNode;
}

export function ForecastScreen({ headerSlot }: ForecastScreenProps = {}) {
  const { t, locale } = useTranslation();
  const dto = useBirthDto();
  const premium = useAppStore((s) => s.isPremium);

  const [period, setPeriod] = useState<ForecastPeriod>("weekly");
  const [area, setArea] = useState<LifeArea>("love");
  const [selectedDay, setSelectedDay] = useState<BestDayScore | null>(null);
  const [paywall, setPaywall] = useState(false);

  const bestDaysDays = period === "weekly" ? 7 : premium ? 30 : 7;
  const bestDays = useCachedAsync(
    dto ? bestDaysKey(dto, bestDaysDays, locale) : null,
    () => astrologyApi.getBestDays(dto!, bestDaysDays, locale),
  );

  // Monthly forecast prose is premium; don't spend AI when gated.
  const forecastGated = period === "monthly" && !premium;
  const forecast = useCachedAsync(
    dto && !forecastGated ? forecastKey(dto, period, locale) : null,
    () => astrologyApi.getForecast(dto!, period, locale),
  );

  const topDates = useMemo(() => {
    const set = new Set<string>();
    bestDays.data?.top[area]?.forEach((d) => set.add(d.date));
    return set;
  }, [bestDays.data, area]);

  const monthLocked = period === "monthly" && !premium;

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {headerSlot}

        <EnterView index={0} style={styles.headerRow}>
          <AppText variant="label" color={colors.text.gold}>
            {t("forecast.eyebrow")}
          </AppText>
          <AppText variant="title" style={styles.titleText}>
            {t("forecast.title")}
          </AppText>
          <AppText variant="bodySmall" color={colors.text.tertiary}>
            {t("forecast.intro")}
          </AppText>
        </EnterView>

        {/* Weekly / Monthly */}
        <EnterView index={1}>
          <Segmented
            value={period}
            onChange={setPeriod}
            options={[
              { key: "weekly", label: t("forecast.weekly") },
              { key: "monthly", label: t("forecast.monthly") },
            ]}
          />
        </EnterView>

        {/* Best Days */}
        <EnterView index={2} style={styles.section}>
          <SectionHeader eyebrow={t("forecast.bestDaysTitle")} />
          <View style={styles.areaChips}>
            {AREAS.map((a) => (
              <Chip
                key={a}
                label={t(`lifeAreas.${a}` as TranslationKey)}
                active={area === a}
                onPress={() => setArea(a)}
              />
            ))}
          </View>

          <HairlineCard>
            {bestDays.loading ? (
              <View style={styles.loaderBox}>
                <CelestialLoader size="sm" />
              </View>
            ) : bestDays.data ? (
              <>
                <BestDaysGrid
                  scores={bestDays.data.scores}
                  area={area}
                  topDates={topDates}
                  onDayPress={setSelectedDay}
                />
                {monthLocked ? (
                  <PressableScale
                    style={styles.lockRow}
                    onPress={() => setPaywall(true)}
                    scaleTo={0.98}
                    haptic="light"
                    accessibilityRole="button"
                  >
                    <Ionicons name="lock-closed" size={14} color={colors.gold[300]} />
                    <AppText variant="bodySmall" color={colors.gold[300]} style={styles.lockText}>
                      {t("bestDays.lockedHint")}
                    </AppText>
                    <Ionicons name="chevron-forward" size={14} color={colors.gold[300]} />
                  </PressableScale>
                ) : null}
              </>
            ) : (
              <AppText variant="body">{t("forecast.error")}</AppText>
            )}
          </HairlineCard>
        </EnterView>

        {/* Forecast prose */}
        <EnterView index={3} style={styles.section}>
          <SectionHeader eyebrow={t("forecast.overviewTitle")} />
          {forecastGated ? (
            <LockedForecast onUnlock={() => setPaywall(true)} label={t("forecast.lockedMonthlyTitle")} />
          ) : forecast.loading ? (
            <HairlineCard>
              <View style={styles.loaderBox}>
                <CelestialLoader label={t("forecast.loading")} />
              </View>
            </HairlineCard>
          ) : forecast.data ? (
            <>
              <EnterView>
                <HairlineCard>
                  <AppText variant="serifBody">{forecast.data.overview}</AppText>
                </HairlineCard>
              </EnterView>

              {/* Themes: free for premium, gated for non-premium weekly */}
              <View style={styles.themes}>
                <SectionHeader eyebrow={t("forecast.themesTitle")} />
                <PremiumGate
                  locked={!premium}
                  hint={t("forecast.lockedThemesHint")}
                  onUnlock={() => setPaywall(true)}
                >
                  <View style={styles.themeList}>
                    {forecast.data.themes.map((th, i) => (
                      <EnterView key={th.area} index={i + 1}>
                        <HairlineCard style={styles.themeCard}>
                          <AppText variant="label" color={colors.text.gold}>
                            {t(`lifeAreas.${th.area}` as TranslationKey)}
                          </AppText>
                          <AppText variant="body" color={colors.text.primary} style={styles.themeText}>
                            {th.text}
                          </AppText>
                        </HairlineCard>
                      </EnterView>
                    ))}
                  </View>
                </PremiumGate>
              </View>

              {/* Key dates */}
              {forecast.data.keyDates.length > 0 ? (
                <View style={styles.themes}>
                  <SectionHeader eyebrow={t("forecast.keyDatesTitle")} />
                  <HairlineCard style={styles.keyDates}>
                    {forecast.data.keyDates.map((kd, i) => (
                      <EnterView key={`${kd.date}-${i}`} index={i} style={styles.keyDateRow}>
                        <AppText variant="numeric" color={colors.gold[300]} style={styles.keyDateDate}>
                          {formatDay(kd.date, locale, false)}
                        </AppText>
                        <AppText variant="body" style={styles.keyDateLabel}>
                          {kd.label}
                        </AppText>
                      </EnterView>
                    ))}
                  </HairlineCard>
                </View>
              ) : null}
            </>
          ) : (
            <HairlineCard>
              <AppText variant="body">{t("forecast.error")}</AppText>
            </HairlineCard>
          )}
        </EnterView>
      </ScrollView>

      {/* Day detail */}
      <SpringBottomSheet
        visible={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        title={formatDay(selectedDay?.date, locale)}
      >
        {selectedDay ? (
          <View style={styles.daySheet}>
            <EnterView index={0}>
              <AppText variant="bodySmall" color={colors.text.tertiary}>
                {t("bestDays.sheetHint")}
              </AppText>
            </EnterView>
            {AREAS.map((a, i) => {
              const reason = bestDays.data?.top[a]?.find((d) => d.date === selectedDay.date)?.reason;
              const score = selectedDay[a];
              const delay = motion.duration.fast + i * motion.stagger;
              return (
                <EnterView key={`${selectedDay.date}-${a}`} index={i + 1} style={styles.dayRow}>
                  <View style={styles.dayRowHead}>
                    <AppText variant="heading" style={styles.dayArea}>
                      {t(`lifeAreas.${a}` as TranslationKey)}
                    </AppText>
                    <CountUp
                      value={score}
                      delay={delay}
                      variant="heading"
                      color={colors.gold[300]}
                    />
                  </View>
                  <ScoreBar value={score} delay={delay} />
                  <AppText variant="body">{reason ?? t("bestDays.noReason")}</AppText>
                </EnterView>
              );
            })}
          </View>
        ) : null}
      </SpringBottomSheet>

      <PaywallSheet
        visible={paywall}
        onClose={() => setPaywall(false)}
        variant="forecast"
        onUnlocked={() => {
          bestDays.reload();
          forecast.reload();
        }}
      />
    </ScreenWrapper>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.92}
      haptic={active ? "none" : "selection"}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <AppText variant="bodySmall" color={active ? colors.gold[200] : colors.text.tertiary}>
        {label}
      </AppText>
    </PressableScale>
  );
}

function LockedForecast({ onUnlock, label }: { onUnlock: () => void; label: string }) {
  const { t } = useTranslation();
  return (
    <HairlineCard>
      <View style={styles.lockedForecast}>
        <AppText variant="heading" center>
          {label}
        </AppText>
        <GoldButton label={t("paywall.unlockPremium")} onPress={onUnlock} />
      </View>
    </HairlineCard>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: 120,
    gap: spacing.xl,
  },
  headerRow: {
    gap: spacing.xs,
  },
  titleText: {
    fontSize: 24,
    lineHeight: 30,
  },
  section: {
    gap: spacing.md,
  },
  areaChips: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  chipActive: {
    borderColor: colors.gold[400],
    backgroundColor: colors.glow.goldSoft,
  },
  loaderBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
  },
  lockRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.hairline,
  },
  lockText: {
    flexShrink: 1,
    minWidth: 0,
    textAlign: "center",
  },
  themes: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  themeList: {
    gap: spacing.md,
  },
  themeCard: {
    gap: spacing.xs,
  },
  themeText: {
    marginTop: spacing.xs,
  },
  keyDates: {
    gap: spacing.sm,
  },
  keyDateRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  keyDateDate: {
    flexShrink: 0,
    maxWidth: "40%",
    paddingTop: 3,
  },
  keyDateLabel: {
    flex: 1,
    minWidth: 0,
  },
  daySheet: {
    gap: spacing.lg,
  },
  dayRow: {
    gap: spacing.sm,
  },
  dayRowHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  dayArea: {
    flex: 1,
    minWidth: 0,
  },
  lockedForecast: {
    gap: spacing.lg,
    alignItems: "stretch",
    paddingVertical: spacing.md,
  },
});
