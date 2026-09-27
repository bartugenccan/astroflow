import React, { useState } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import Animated, {
  FadeInDown,
  FadeOut,
  LinearTransition,
  useReducedMotion,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { SectionHeader } from "../../components/ui/SectionHeader";
import { CelestialLoader } from "../../components/ui/CelestialLoader";
import { StarDivider } from "../../components/ui/StarDivider";
import { PressableScale } from "../../components/ui/PressableScale";
import { BackButton } from "../../components/ui/BackButton";
import { TermInfo } from "../../components/TermInfo";
import { EnterView } from "../../lib/motion";
import { useUiStore } from "../../store/useUiStore";
import { astrologyApi } from "../../services/astrologyApi";
import { YearAhead } from "../../services/types";
import { yearAheadKey } from "../../services/interpretationCache";
import { useCachedAsync } from "../../hooks/useCachedAsync";
import { useBirthDto } from "../../hooks/useBirthDto";
import { primaryHouseTag } from "../reading/houseThemes";
import { formatDayMonthYear, formatMonthYear } from "../../lib/dates";
import { useTranslation, TranslationKey, TFunction, Locale } from "../../i18n";
import { colors, spacing, radii } from "../../lib/design-system";

/**
 * "Your Birthday Chart" — the Solar Return, written for someone who has never
 * heard the phrase. It's its own route (`/year-ahead`), reached from the Today
 * "Your year" card, so it no longer hides as the third segment of a tab.
 *
 * The screen opens by saying what a solar return is, names the technique once
 * (with an ⓘ into the glossary) for people who want the real term, then reads
 * the year in plain language. The return chart itself stays behind a
 * "show me why" toggle at the bottom.
 */
export function YearAheadScreen() {
  const { t, locale } = useTranslation();
  const dto = useBirthDto();
  const [whyOpen, setWhyOpen] = useState(false);
  const openTerm = useUiStore((s) => s.openTerm);

  const year = useCachedAsync(
    dto ? yearAheadKey(dto, locale) : null,
    () => astrologyApi.getYearAhead(dto!, locale),
  );

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <BackButton />
        <EnterView style={styles.headerRow}>
          <AppText variant="label" color={colors.text.gold}>
            {t("yearAhead.eyebrow")}
          </AppText>
          <AppText variant="title">{t("yearAhead.title")}</AppText>
          <View style={styles.techRow}>
            <AppText variant="numeric" color={colors.text.tertiary}>
              {t("yearAhead.techName")}
            </AppText>
            <TermInfo term="solarReturn" />
          </View>
        </EnterView>

        {/* What this is, before anything else — a reading you can't place
            isn't worth much. */}
        <EnterView index={1}>
          <HairlineCard style={styles.whatCard}>
            <View style={styles.whatHead}>
              <Ionicons name="sunny-outline" size={18} color={colors.gold[300]} />
              <AppText variant="heading" color={colors.text.primary}>
                {t("yearAhead.whatTitle")}
              </AppText>
            </View>
            <AppText variant="body">{t("yearAhead.whatBody")}</AppText>
            <PressableScale
              onPress={() => openTerm("solarReturn")}
              style={styles.learnMore}
              scaleTo={0.96}
            >
              <AppText variant="heading" color={colors.gold[300]} style={styles.learnMoreText}>
                {t("yearAhead.learnMore")}
              </AppText>
              <Ionicons name="arrow-forward" size={14} color={colors.gold[300]} />
            </PressableScale>
          </HairlineCard>
        </EnterView>

        {year.loading ? (
          <HairlineCard>
            <View style={styles.loaderBox}>
              <CelestialLoader label={t("yearAhead.loading")} />
            </View>
          </HairlineCard>
        ) : year.data ? (
          <Reading
            data={year.data}
            locale={locale}
            t={t}
            whyOpen={whyOpen}
            onToggleWhy={() => setWhyOpen((w) => !w)}
          />
        ) : (
          <HairlineCard style={styles.errorCard}>
            <AppText variant="body">{t("yearAhead.error")}</AppText>
            <PressableScale onPress={year.reload} style={styles.learnMore}>
              <AppText variant="heading" color={colors.gold[300]} style={styles.learnMoreText}>
                {t("common.retry")}
              </AppText>
            </PressableScale>
          </HairlineCard>
        )}
      </ScrollView>
    </ScreenWrapper>
  );
}

interface ReadingProps {
  data: YearAhead;
  locale: Locale;
  t: TFunction;
  whyOpen: boolean;
  onToggleWhy: () => void;
}

function Reading({ data, locale, t, whyOpen, onToggleWhy }: ReadingProps) {
  const reduced = useReducedMotion();
  return (
    <>
      {/* The window this reading covers, and the birthday that opens it. */}
      <EnterView index={2} style={styles.windowBox}>
        <AppText variant="numeric" color={colors.gold[300]} center>
          {formatDayMonthYear(locale, data.start)} —{" "}
          {formatDayMonthYear(locale, data.end)}
        </AppText>
        <AppText variant="bodySmall" center>
          {t("yearAhead.ageLine", { age: data.age })}
        </AppText>
      </EnterView>

      <StarDivider />

      {/* Headline + overview: the answer, before any reasoning. */}
      <EnterView index={3} style={styles.section}>
        <SectionHeader eyebrow={t("yearAhead.aboutTitle")} />
        <HairlineCard style={styles.headlineCard}>
          <AppText variant="serifBody" color={colors.text.primary}>
            {data.headline}
          </AppText>
          <AppText variant="body">{data.overview}</AppText>
        </HairlineCard>
      </EnterView>

      {data.strengths.length > 0 ? (
        <ThemeSection
          eyebrow={t("yearAhead.strongTitle")}
          themes={data.strengths}
          tone={colors.semantic.harmonic}
          t={t}
        />
      ) : null}

      {data.tender.length > 0 ? (
        <ThemeSection
          eyebrow={t("yearAhead.tenderTitle")}
          themes={data.tender}
          tone={colors.semantic.challenging}
          t={t}
        />
      ) : null}

      {data.turningPoints.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader eyebrow={t("yearAhead.turningTitle")} />
          <HairlineCard>
            {data.turningPoints.map((tp, i) => (
              <EnterView key={tp.month} index={i} delay={200}>
                <View style={styles.turningRow}>
                  <AppText
                    variant="numeric"
                    color={colors.gold[300]}
                    style={styles.turningMonth}
                    numberOfLines={1}
                  >
                    {formatMonthYear(locale, tp.month)}
                  </AppText>
                  <AppText variant="body" style={styles.turningLabel}>
                    {tp.label}
                  </AppText>
                </View>
              </EnterView>
            ))}
          </HairlineCard>
          <AppText variant="bodySmall" color={colors.text.tertiary}>
            {t("yearAhead.turningHint")}
          </AppText>
        </View>
      ) : null}

      {/* Everything technical lives below this line, and only on request. */}
      <Animated.View
        layout={reduced ? undefined : LinearTransition.springify().damping(18)}
        style={styles.section}
      >
        <PressableScale onPress={onToggleWhy} style={styles.whyToggle} scaleTo={0.95}>
          <AppText variant="label" color={colors.gold[300]}>
            {whyOpen ? t("yearAhead.hideWhy") : t("yearAhead.showWhy")}
          </AppText>
          <Ionicons
            name={whyOpen ? "chevron-up" : "chevron-down"}
            size={14}
            color={colors.gold[300]}
          />
        </PressableScale>

        {whyOpen ? (
          <Animated.View
            entering={reduced ? undefined : FadeInDown.springify().damping(18)}
            exiting={reduced ? undefined : FadeOut.duration(160)}
            style={styles.section}
          >
            <HairlineCard>
              <AppText variant="body">{data.why}</AppText>
            </HairlineCard>
            <ChartDetail data={data} locale={locale} t={t} />
          </Animated.View>
        ) : null}
      </Animated.View>
    </>
  );
}

function ThemeSection({
  eyebrow,
  themes,
  tone,
  t,
}: {
  eyebrow: string;
  themes: YearAhead["strengths"];
  tone: string;
  t: TFunction;
}) {
  return (
    <View style={styles.section}>
      <SectionHeader eyebrow={eyebrow} />
      <View style={styles.themeList}>
        {themes.map((th, i) => (
          <EnterView key={`${eyebrow}-${th.area}`} index={i} delay={120}>
            <HairlineCard style={styles.themeCard}>
              <AppText variant="label" color={tone}>
                {t(`lifeAreas.${th.area}` as TranslationKey)}
              </AppText>
              <AppText variant="body" color={colors.text.primary}>
                {th.text}
              </AppText>
            </HairlineCard>
          </EnterView>
        ))}
      </View>
    </View>
  );
}

/**
 * The return chart, described rather than listed. Every technical term is
 * paired with what it actually means, so this stays readable for someone who
 * opened it out of curiosity rather than expertise.
 */
function ChartDetail({
  data,
  locale,
  t,
}: {
  data: YearAhead;
  locale: Locale;
  t: TFunction;
}) {
  const { chart } = data;
  const rows = [
    {
      key: "rising",
      term: "rising" as const,
      label: t("yearAhead.chartRising"),
      value: t(`signs.${chart.ascendantSign}` as TranslationKey),
    },
    {
      key: "focus",
      term: "house" as const,
      label: t("yearAhead.chartFocus"),
      value: chart.sunHouse ? primaryHouseTag(locale, chart.sunHouse) : "—",
    },
    {
      key: "mood",
      term: "moon" as const,
      label: t("yearAhead.chartMood"),
      value: chart.moonSign
        ? t(`signs.${chart.moonSign}` as TranslationKey)
        : "—",
    },
  ];

  return (
    <View style={styles.section}>
      <SectionHeader eyebrow={t("yearAhead.chartTitle")} />
      <HairlineCard>
        {rows.map((r) => (
          <View key={r.key} style={styles.detailRow}>
            <View style={styles.detailLabelWrap}>
              <AppText variant="bodySmall" style={styles.detailLabel}>
                {r.label}
              </AppText>
              <TermInfo term={r.term} size={13} />
            </View>
            <AppText variant="body" color={colors.text.primary} style={styles.detailValue}>
              {r.value}
            </AppText>
          </View>
        ))}

        {chart.houseEmphasis.length > 0 ? (
          <View style={styles.emphasisBox}>
            <AppText variant="bodySmall">{t("yearAhead.chartEmphasis")}</AppText>
            <View style={styles.chipRow}>
              {chart.houseEmphasis.slice(0, 3).map((h) => (
                <View key={h.house} style={styles.chip}>
                  <AppText variant="bodySmall" color={colors.gold[300]}>
                    {primaryHouseTag(locale, h.house)}
                  </AppText>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </HairlineCard>

      <AppText variant="bodySmall" color={colors.text.tertiary}>
        {t("yearAhead.chartFootnote", {
          date: formatDayMonthYear(locale, chart.returnDateLocal),
        })}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
    gap: spacing.xl,
  },
  headerRow: {
    gap: spacing.xs,
    marginTop: -spacing.md,
  },
  techRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  whatCard: {
    gap: spacing.md,
  },
  whatHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  learnMore: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
    paddingVertical: spacing.xs,
  },
  learnMoreText: {
    fontSize: 15,
  },
  errorCard: {
    gap: spacing.sm,
  },
  windowBox: {
    gap: spacing.xs,
    alignItems: "center",
  },
  section: {
    gap: spacing.md,
  },
  headlineCard: {
    gap: spacing.md,
  },
  themeList: {
    gap: spacing.md,
  },
  themeCard: {
    gap: spacing.xs,
  },
  turningRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  turningMonth: {
    width: 76,
  },
  turningLabel: {
    flex: 1,
    minWidth: 0,
  },
  whyToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
    paddingVertical: spacing.xs,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  detailLabelWrap: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  detailLabel: {
    flexShrink: 1,
  },
  detailValue: {
    flexShrink: 1,
    maxWidth: "45%",
    textAlign: "right",
  },
  emphasisBox: {
    gap: spacing.sm,
    paddingTop: spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  loaderBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
  },
});
