import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { GoldButton } from "../../components/ui/GoldButton";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { PressableScale } from "../../components/ui/PressableScale";
import { ShimmerLines } from "../../components/ui/Shimmer";
import { SpringBottomSheet } from "../../components/ui/SpringBottomSheet";
import { EnterView } from "../../lib/motion";
import { TranslationKey, useTranslation } from "../../i18n";
import { colors, fonts, radii, spacing } from "../../lib/design-system";
import { useBirthDto } from "../../hooks/useBirthDto";
import type { TarotCardReading, TarotDrawnCard, TarotSpread, TarotSynthesis } from "../../services/types";
import { TAROT_CARD_RATIO } from "./cardImages";
import { tarotCardInfo } from "./deck";
import { TarotCardFace } from "./TarotCardFace";
import { TarotFlipCard } from "./TarotFlipCard";
import { Part, useTarotReading } from "./useTarotReading";

interface Props {
  spread: TarotSpread;
  /** True right after the draw — the cards turn over one by one. False when reopening. */
  freshDraw: boolean;
  onFlip: () => void;
  onNewReading: () => void;
}

const SECTIONS = ["essence", "inPosition", "forYou", "shadow", "advice"] as const;

/**
 * The drawn spread: the three cards turn over side by side, then each card gets
 * its own chapter — the art, then a detailed reading right beneath it — and the
 * spread closes with the cards read together.
 */
export function ReadingStep({ spread, freshDraw, onFlip, onNewReading }: Props) {
  const { t, locale } = useTranslation();
  const dto = useBirthDto();
  const { width } = useWindowDimensions();
  const { cards, synthesis, retryCard, retrySynthesis } = useTarotReading(dto, spread, locale);
  const [revealed, setRevealed] = useState(!freshDraw);
  const [zoom, setZoom] = useState<TarotDrawnCard | null>(null);

  useEffect(() => {
    if (!freshDraw) return;
    const timer = setTimeout(() => setRevealed(true), 250);
    return () => clearTimeout(timer);
  }, [freshDraw]);

  const content = width - spacing.xl * 2;
  const smallW = Math.min(110, (content - spacing.md * 2) / 3);
  const smallH = smallW / TAROT_CARD_RATIO;
  const bigW = Math.min(230, content * 0.62);
  const bigH = bigW / TAROT_CARD_RATIO;
  const categoryName = t(`tarot.categories.${spread.category}.name` as TranslationKey);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <EnterView style={styles.header}>
          <AppText variant="label" color={colors.text.gold}>
            {t("tarot.eyebrow")} · {categoryName}
          </AppText>
          <AppText variant="title">{synthesis.data?.title ?? t("tarot.title")}</AppText>
          {spread.question ? (
            <AppText variant="serifBody" color={colors.text.secondary}>
              “{spread.question}”
            </AppText>
          ) : null}
        </EnterView>

        {/* The spread, side by side */}
        <View style={styles.spreadRow}>
          {spread.cards.map((c, i) => (
            <PressableScale
              key={c.cardId}
              onPress={() => setZoom(c)}
              scaleTo={0.96}
              style={styles.spreadItem}
              accessibilityLabel={tarotCardInfo(c.cardId)?.name[locale]}
            >
              <TarotFlipCard
                cardId={c.cardId}
                reversed={c.reversed}
                width={smallW}
                height={smallH}
                revealed={revealed}
                delay={i * 380}
                onTurn={onFlip}
              />
              <AppText variant="label" center numberOfLines={2} color={colors.text.tertiary} style={{ width: smallW + 16 }}>
                {cards[i].data?.positionName ?? t(`tarot.positions.${spread.category}.p${i}` as TranslationKey)}
              </AppText>
            </PressableScale>
          ))}
        </View>
        <AppText variant="bodySmall" center color={colors.text.tertiary}>
          {t("tarot.tapToEnlarge")}
        </AppText>

        {/* One chapter per card: art, then its reading right beneath */}
        {spread.cards.map((c, i) => (
          <CardChapter
            key={c.cardId}
            drawn={c}
            index={i}
            part={cards[i]}
            fallbackPosition={t(`tarot.positions.${spread.category}.p${i}` as TranslationKey)}
            width={bigW}
            height={bigH}
            onZoom={() => setZoom(c)}
            onRetry={() => retryCard(i)}
          />
        ))}

        <SynthesisCard part={synthesis} onRetry={retrySynthesis} />

        <GoldButton label={t("tarot.newReading")} variant="ghost" onPress={onNewReading} />
      </ScrollView>

      <SpringBottomSheet
        visible={zoom !== null}
        onClose={() => setZoom(null)}
        title={zoom ? tarotCardInfo(zoom.cardId)?.name[locale] : undefined}
      >
        {zoom ? (
          <View style={styles.zoom}>
            <TarotCardFace
              cardId={zoom.cardId}
              reversed={zoom.reversed}
              width={Math.min(300, content * 0.8)}
              height={Math.min(300, content * 0.8) / TAROT_CARD_RATIO}
            />
            {zoom.reversed ? <OrientationPill reversed /> : null}
          </View>
        ) : null}
      </SpringBottomSheet>
    </View>
  );
}

// ── One card's chapter ────────────────────────────────────────────────────────

function CardChapter({
  drawn,
  index,
  part,
  fallbackPosition,
  width,
  height,
  onZoom,
  onRetry,
}: {
  drawn: TarotDrawnCard;
  index: number;
  part: Part<TarotCardReading>;
  fallbackPosition: string;
  width: number;
  height: number;
  onZoom: () => void;
  onRetry: () => void;
}) {
  const { t, locale } = useTranslation();
  const reading = part.data;
  const name = tarotCardInfo(drawn.cardId)?.name[locale] ?? drawn.cardId;

  return (
    <EnterView index={index} style={styles.chapter}>
      <View style={styles.divider}>
        <View style={styles.rule} />
        <AppText variant="label" color={colors.text.gold}>
          {index + 1} · {reading?.positionName ?? fallbackPosition}
        </AppText>
        <View style={styles.rule} />
      </View>

      <PressableScale onPress={onZoom} scaleTo={0.97} style={styles.bigCard} accessibilityLabel={name}>
        <TarotCardFace cardId={drawn.cardId} reversed={drawn.reversed} width={width} height={height} />
      </PressableScale>

      <View style={styles.titleBlock}>
        <AppText variant="title" center>
          {name}
        </AppText>
        <View style={styles.metaRow}>
          <OrientationPill reversed={drawn.reversed} />
          {reading?.astro && reading.astro !== "—" ? (
            <View style={styles.astro}>
              <Ionicons name="planet-outline" size={13} color={colors.moon} />
              <AppText variant="bodySmall" color={colors.moon}>
                {reading.astro}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>

      {reading ? (
        <>
          <AppText variant="serifBody" center color={colors.text.primary}>
            {reading.headline}
          </AppText>
          <View style={styles.keywords}>
            {reading.keywords.map((k) => (
              <View key={k} style={styles.keyword}>
                <AppText variant="bodySmall" color={colors.gold[200]}>
                  {k}
                </AppText>
              </View>
            ))}
          </View>
          <HairlineCard style={styles.sections}>
            {SECTIONS.map((key, i) => (
              <View key={key} style={[styles.section, i > 0 && styles.sectionRule]}>
                <AppText variant="label" color={colors.text.gold}>
                  {t(`tarot.sections.${key}` as TranslationKey)}
                </AppText>
                <AppText variant="body" color={colors.text.primary} style={styles.sectionBody}>
                  {reading[key]}
                </AppText>
              </View>
            ))}
          </HairlineCard>
        </>
      ) : part.error ? (
        <ErrorBlock onRetry={onRetry} />
      ) : (
        <HairlineCard style={styles.sections}>
          <AppText variant="bodySmall" color={colors.text.tertiary}>
            {t("tarot.reading")}
          </AppText>
          <ShimmerLines lines={6} />
        </HairlineCard>
      )}
    </EnterView>
  );
}

// ── The spread as a whole ─────────────────────────────────────────────────────

function SynthesisCard({ part, onRetry }: { part: Part<TarotSynthesis>; onRetry: () => void }) {
  const { t } = useTranslation();
  const s = part.data;
  return (
    <EnterView style={styles.chapter}>
      <View style={styles.divider}>
        <View style={styles.rule} />
        <AppText variant="label" color={colors.text.gold}>
          {t("tarot.synthesisEyebrow")}
        </AppText>
        <View style={styles.rule} />
      </View>
      {s ? (
        <HairlineCard elevated style={styles.sections}>
          <AppText variant="title">{s.title}</AppText>
          <AppText variant="body" color={colors.text.primary} style={styles.sectionBody}>
            {s.story}
          </AppText>
          <View style={styles.sectionRule} />
          <AppText variant="label" color={colors.text.gold}>
            {t("tarot.guidance")}
          </AppText>
          {s.guidance.map((g, i) => (
            <View key={i} style={styles.guidanceRow}>
              <Ionicons name="sparkles" size={14} color={colors.gold[300]} style={styles.guidanceIcon} />
              <AppText variant="body" color={colors.text.primary} style={styles.guidanceText}>
                {g}
              </AppText>
            </View>
          ))}
          <View style={styles.affirmation}>
            <AppText variant="label" color={colors.text.gold}>
              {t("tarot.affirmation")}
            </AppText>
            <AppText variant="serifBody" color={colors.gold[200]}>
              {s.affirmation}
            </AppText>
          </View>
        </HairlineCard>
      ) : part.error ? (
        <ErrorBlock onRetry={onRetry} />
      ) : (
        <HairlineCard style={styles.sections}>
          <ShimmerLines lines={5} />
        </HairlineCard>
      )}
    </EnterView>
  );
}

function OrientationPill({ reversed }: { reversed: boolean }) {
  const { t } = useTranslation();
  return (
    <View style={[styles.pill, reversed && styles.pillReversed]}>
      <Ionicons
        name={reversed ? "arrow-down" : "arrow-up"}
        size={12}
        color={reversed ? colors.semantic.challenging : colors.gold[300]}
      />
      <AppText variant="bodySmall" color={reversed ? colors.semantic.challenging : colors.gold[300]}>
        {reversed ? t("tarot.reversed") : t("tarot.upright")}
      </AppText>
    </View>
  );
}

function ErrorBlock({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <HairlineCard style={styles.sections}>
      <AppText variant="body">{t("tarot.sectionError")}</AppText>
      <GoldButton label={t("common.retry")} variant="ghost" onPress={onRetry} />
    </HairlineCard>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 140,
    gap: spacing.lg,
  },
  header: { gap: spacing.xs },
  spreadRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  spreadItem: {
    alignItems: "center",
    gap: spacing.sm,
  },
  chapter: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  rule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.hairlineStrong,
  },
  bigCard: {
    alignSelf: "center",
    shadowColor: colors.gold[400],
    shadowOpacity: 0.25,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
  },
  titleBlock: {
    alignItems: "center",
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
  },
  astro: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
  },
  pillReversed: {
    borderColor: colors.semantic.challenging,
  },
  keywords: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
  },
  keyword: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.ink[700],
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  sections: {
    gap: spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  sectionRule: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border.hairlineStrong,
    paddingTop: spacing.md,
  },
  sectionBody: {
    fontFamily: fonts.sans,
    lineHeight: 24,
  },
  guidanceRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  guidanceIcon: { marginTop: 4 },
  guidanceText: { flex: 1, minWidth: 0 },
  affirmation: {
    marginTop: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.glow.goldSoft,
    gap: spacing.xs,
  },
  zoom: {
    alignItems: "center",
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
});
