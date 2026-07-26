import React, { useMemo, useState } from "react";
import { StyleSheet, View, ScrollView, Pressable } from "react-native";
import { MotiView } from "moti";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { CelestialLoader } from "../../components/ui/CelestialLoader";
import { SpringBottomSheet } from "../../components/ui/SpringBottomSheet";
import { PaywallSheet } from "../../components/PaywallSheet";
import { PremiumGate } from "../../components/PremiumGate";
import { GoldButton } from "../../components/ui/GoldButton";
import { BestDaysGrid } from "./BestDaysGrid";
import { astrologyApi } from "../../services/astrologyApi";
import { BestDayScore, ForecastPeriod, LifeArea } from "../../services/types";
import { bestDaysKey, forecastKey } from "../../services/interpretationCache";
import { useCachedAsync } from "../../hooks/useCachedAsync";
import { useBirthDto } from "../../hooks/useBirthDto";
import { useAppStore } from "../../store/useAppStore";
import { useTranslation, TranslationKey } from "../../i18n";
import { colors, spacing, radii } from "../../lib/design-system";

const AREAS: LifeArea[] = ["love", "career", "money", "energy"];

export function ForecastScreen() {
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
        <View style={styles.headerRow}>
          <AppText variant="label" color={colors.text.gold}>
            {t("forecast.eyebrow")}
          </AppText>
          <AppText variant="title">{t("forecast.title")}</AppText>
        </View>

        {/* Weekly / Monthly segmented control */}
        <Segmented
          value={period}
          onChange={setPeriod}
          options={[
            { key: "weekly", label: t("forecast.weekly") },
            { key: "monthly", label: t("forecast.monthly") },
          ]}
        />

        {/* Best Days */}
        <View style={styles.section}>
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
                  <Pressable style={styles.lockRow} onPress={() => setPaywall(true)}>
                    <AppText variant="bodySmall" color={colors.gold[300]} center>
                      {t("bestDays.lockedHint")}
                    </AppText>
                  </Pressable>
                ) : null}
              </>
            ) : (
              <AppText variant="body">{t("forecast.error")}</AppText>
            )}
          </HairlineCard>
        </View>

        {/* Forecast prose */}
        <View style={styles.section}>
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
              <HairlineCard>
                <AppText variant="serifBody">{forecast.data.overview}</AppText>
              </HairlineCard>

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
                      <MotiView
                        key={th.area}
                        from={{ opacity: 0, translateY: 8 }}
                        animate={{ opacity: 1, translateY: 0 }}
                        transition={{ type: "timing", duration: 300, delay: i * 80 }}
                      >
                        <HairlineCard style={styles.themeCard}>
                          <AppText variant="label" color={colors.text.gold}>
                            {t(`lifeAreas.${th.area}` as TranslationKey)}
                          </AppText>
                          <AppText variant="body" color={colors.text.primary} style={styles.themeText}>
                            {th.text}
                          </AppText>
                        </HairlineCard>
                      </MotiView>
                    ))}
                  </View>
                </PremiumGate>
              </View>

              {/* Key dates */}
              {forecast.data.keyDates.length > 0 ? (
                <View style={styles.themes}>
                  <SectionHeader eyebrow={t("forecast.keyDatesTitle")} />
                  <HairlineCard>
                    {forecast.data.keyDates.map((kd) => (
                      <View key={kd.date} style={styles.keyDateRow}>
                        <AppText variant="numeric" color={colors.gold[300]}>
                          {kd.date}
                        </AppText>
                        <AppText variant="body" style={styles.keyDateLabel}>
                          {kd.label}
                        </AppText>
                      </View>
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
        </View>
      </ScrollView>

      {/* Day detail */}
      <SpringBottomSheet
        visible={selectedDay !== null}
        onClose={() => setSelectedDay(null)}
        title={selectedDay?.date}
      >
        {selectedDay ? (
          <View style={styles.daySheet}>
            {AREAS.map((a) => {
              const reason = bestDays.data?.top[a]?.find((d) => d.date === selectedDay.date)?.reason;
              return (
                <View key={a} style={styles.dayRow}>
                  <View style={styles.dayRowHead}>
                    <AppText variant="heading">{t(`lifeAreas.${a}` as TranslationKey)}</AppText>
                    <AppText variant="heading" color={colors.gold[300]}>
                      {selectedDay[a]}
                    </AppText>
                  </View>
                  <AppText variant="body">{reason ?? t("bestDays.noReason")}</AppText>
                </View>
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

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { key: T; label: string }[];
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            <AppText
              variant="heading"
              color={active ? colors.text.onGold : colors.text.secondary}
            >
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <AppText variant="bodySmall" color={active ? colors.gold[200] : colors.text.tertiary}>
        {label}
      </AppText>
    </Pressable>
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
    paddingTop: spacing.lg,
    paddingBottom: 120,
    gap: spacing.xl,
  },
  headerRow: {
    gap: spacing.xs,
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: colors.ink[800],
    borderRadius: radii.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  segment: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    borderRadius: radii.pill,
  },
  segmentActive: {
    backgroundColor: colors.gold[400],
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
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.hairline,
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
  keyDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  keyDateLabel: {
    flex: 1,
  },
  daySheet: {
    gap: spacing.lg,
  },
  dayRow: {
    gap: spacing.xs,
  },
  dayRowHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lockedForecast: {
    gap: spacing.lg,
    alignItems: "stretch",
    paddingVertical: spacing.md,
  },
});
