import React, { forwardRef } from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { AppText } from "../../components/ui/AppText";
import { Glyph } from "../../components/Glyph";
import { MoonPhase } from "../../components/MoonPhase";
import { StarDivider } from "../../components/ui/StarDivider";
import { ScoreRing } from "../../components/ScoreRing";
import { useTranslation } from "../../i18n";
import { DailyInsight } from "../../services/types";
import { colors, gradients, fonts, spacing, radii } from "../../lib/design-system";

// Logical card size (9:16). Captured at 3× → 1080×1920 PNG.
export const CARD_W = 360;
export const CARD_H = 640;
/** Bottom band reserved for the watermark so long copy never runs under it. */
const WATERMARK_ZONE = 96;

/**
 * Locale-correct uppercase (Turkish "i" → "İ"). The card's text styles don't
 * use `textTransform` because the platform's casing is locale-less.
 */
function upper(text: string, locale: string): string {
  return text.toLocaleUpperCase(locale === "tr" ? "tr-TR" : "en-US");
}

export type ShareCardData =
  | { variant: "daily"; insight: DailyInsight; date: Date }
  | { variant: "bigThree"; sunSign: string; moonSign: string; risingSign: string; name: string }
  | { variant: "compatibility"; name: string; otherName: string; score: number; headline: string };

/**
 * Full-resolution shareable card (9:16). Built from the same RN primitives as
 * the app (AppText fonts + SVG Glyphs), so captureRef renders it faithfully —
 * NOT Skia, which wouldn't capture the text/glyph layers.
 */
export const ShareableCard = forwardRef<View, { data: ShareCardData }>(
  function ShareableCard({ data }, ref) {
    const { t, locale } = useTranslation();

    return (
      <View ref={ref} collapsable={false} style={styles.card}>
        <LinearGradient colors={gradients.sky} style={StyleSheet.absoluteFill} />
        <View style={styles.frame} />

        <View style={styles.body}>
          {data.variant === "daily" ? (
            <DailyContent insight={data.insight} date={data.date} locale={locale} t={t} />
          ) : data.variant === "bigThree" ? (
            <BigThreeContent
              sunSign={data.sunSign}
              moonSign={data.moonSign}
              risingSign={data.risingSign}
              name={data.name}
              locale={locale}
              t={t}
            />
          ) : (
            <CompatibilityContent
              name={data.name}
              otherName={data.otherName}
              score={data.score}
              headline={data.headline}
              locale={locale}
            />
          )}
        </View>

        {/* Watermark — the growth surface */}
        <View style={styles.watermark}>
          <Glyph name="Sun" size={18} color={colors.gold[300]} />
          <AppText style={styles.brand} numberOfLines={1}>
            {t("share.watermark")}
          </AppText>
          <AppText style={styles.tagline} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {t("share.tagline")}
          </AppText>
        </View>
      </View>
    );
  },
);

function DailyContent({
  insight,
  date,
  locale,
  t,
}: {
  insight: DailyInsight;
  date: Date;
  locale: string;
  t: (k: any, p?: any) => string;
}) {
  const dateLabel = date.toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return (
    <>
      <AppText style={styles.eyebrow} numberOfLines={2}>
        {upper(t("share.dailyEyebrow"), locale)}
      </AppText>
      <AppText style={styles.date} numberOfLines={1}>
        {dateLabel}
      </AppText>
      <View style={styles.moon}>
        <MoonPhase size={64} date={date} />
      </View>
      <AppText style={styles.title} numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.7}>
        {insight.title}
      </AppText>
      <StarDivider />
      <AppText style={styles.summary} numberOfLines={6} adjustsFontSizeToFit minimumFontScale={0.8}>
        {insight.summary}
      </AppText>
    </>
  );
}

function BigThreeContent({
  sunSign,
  moonSign,
  risingSign,
  name,
  locale,
  t,
}: {
  sunSign: string;
  moonSign: string;
  risingSign: string;
  name: string;
  locale: string;
  t: (k: any, p?: any) => string;
}) {
  const rows: { glyph: string; label: string; sign: string }[] = [
    { glyph: "Sun", label: t("bigThree.sun"), sign: sunSign },
    { glyph: "Moon", label: t("bigThree.moon"), sign: moonSign },
    { glyph: "Ascendant", label: t("bigThree.rising"), sign: risingSign },
  ];
  return (
    <>
      {name ? (
        <AppText style={styles.eyebrow} numberOfLines={2}>
          {upper(name, locale)}
        </AppText>
      ) : null}
      <AppText style={styles.title} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.7}>
        {t("share.bigThreeTitle")}
      </AppText>
      <StarDivider />
      <View style={styles.bigThreeList}>
        {rows.map((r) => (
          <View key={r.glyph} style={styles.bigThreeRow}>
            <View style={styles.glyphRing}>
              <Glyph name={r.glyph} size={30} color={colors.gold[300]} />
            </View>
            <View style={styles.b3Text}>
              <AppText style={styles.b3Label} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {upper(r.label, locale)}
              </AppText>
              <AppText style={styles.b3Sign} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                {t(`signs.${r.sign}` as any)}
              </AppText>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

function CompatibilityContent({
  name,
  otherName,
  score,
  headline,
  locale,
}: {
  name: string;
  otherName: string;
  score: number;
  headline: string;
  locale: string;
}) {
  return (
    <>
      <AppText style={styles.eyebrow} numberOfLines={2}>
        {upper(`${name} & ${otherName}`, locale)}
      </AppText>
      <View style={styles.moon}>
        <ScoreRing score={score} size={180} animate={false} />
      </View>
      {headline ? (
        <AppText style={styles.summary} numberOfLines={6} adjustsFontSizeToFit minimumFontScale={0.8}>
          {headline}
        </AppText>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
    overflow: "hidden",
    backgroundColor: colors.ink[950],
  },
  frame: {
    ...StyleSheet.absoluteFill,
    margin: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
  },
  body: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    paddingBottom: WATERMARK_ZONE,
    gap: spacing.md,
  },
  eyebrow: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 12,
    letterSpacing: 2,
    color: colors.gold[300],
    textAlign: "center",
  },
  date: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.text.tertiary,
    textAlign: "center",
  },
  moon: {
    marginVertical: spacing.lg,
    alignItems: "center",
  },
  title: {
    fontFamily: fonts.serif,
    fontSize: 30,
    lineHeight: 36,
    color: colors.text.primary,
    textAlign: "center",
  },
  summary: {
    fontFamily: fonts.serifItalic,
    fontSize: 18,
    lineHeight: 27,
    color: colors.text.secondary,
    textAlign: "center",
  },
  bigThreeList: {
    marginTop: spacing.xl,
    gap: spacing.xl,
  },
  bigThreeRow: {
    maxWidth: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  glyphRing: {
    width: 56,
    height: 56,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
  },
  b3Label: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.text.tertiary,
  },
  b3Text: {
    flexShrink: 1,
    minWidth: 0,
  },
  b3Sign: {
    fontFamily: fonts.serif,
    fontSize: 24,
    color: colors.text.primary,
  },
  watermark: {
    position: "absolute",
    bottom: spacing.xxl,
    left: spacing.xxl,
    right: spacing.xxl,
    alignItems: "center",
    gap: 2,
  },
  brand: {
    fontFamily: fonts.serif,
    fontSize: 18,
    color: colors.gold[300],
    letterSpacing: 0.5,
  },
  tagline: {
    fontFamily: fonts.sans,
    fontSize: 11,
    color: colors.text.tertiary,
    letterSpacing: 1,
  },
});
