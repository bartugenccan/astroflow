import React, { useState } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { Chip } from "../../components/ui/Chip";
import { SpotlightCard } from "../../components/ui/SpotlightCard";
import { useMascotStore } from "../../store/useMascotStore";
import { PASSES, TAROT_SPREAD_STAGE, spreadUnlocked } from "../../lib/mascotRules";
import type { TarotSpreadKey } from "../../services/types";
import { stageName } from "../aster/asterCopy";
import { PressableScale } from "../../components/ui/PressableScale";
import { AsterCameo } from "../../components/ui/AsterCameo";
import { EnterView } from "../../lib/motion";
import { TranslationKey, useTranslation } from "../../i18n";
import { colors, palette, radii, spacing, surface, typography } from "../../lib/design-system";
import type { TarotCategory } from "../../services/types";
import type { SavedTarotReading } from "../../store/useTarotStore";
import { TAROT_CATEGORIES, tarotCardInfo } from "./deck";
import { TarotCardFace } from "./TarotCardFace";

const CATEGORY_ICON: Record<TarotCategory, keyof typeof Ionicons.glyphMap> = {
  general: "sparkles-outline",
  love: "heart-outline",
  career: "briefcase-outline",
  money: "cash-outline",
  health: "leaf-outline",
  spiritual: "moon-outline",
};

interface Props {
  /** The question came in through a deep link (the plan's tarot step). */
  prefilled?: boolean;
  initialCategory: TarotCategory | null;
  initialQuestion: string;
  /** Today's reading, if one was drawn — offered at the top to reopen. */
  today: SavedTarotReading | null;
  /** True when the free reading for today is used (and the user isn't Premium). */
  atLimit: boolean;
  onOpenToday: () => void;
  onStart: (category: TarotCategory, question: string, spread: TarotSpreadKey) => void;
  /** Daily limit reached: the two ways on (Premium, or a one-off taste for Stardust). */
  onPremium: () => void;
}

/** Step one: pick the theme (and optionally write the question) before the deck comes out. */
export function CategoryStep({
  prefilled = false,
  initialCategory,
  initialQuestion,
  today,
  atLimit,
  onOpenToday,
  onStart,
  onPremium,
}: Props) {
  const { t, locale } = useTranslation();
  const [category, setCategory] = useState<TarotCategory | null>(initialCategory);
  const [question, setQuestion] = useState(initialQuestion);
  const [spread, setSpread] = useState<TarotSpreadKey>("three");
  const stage = useMascotStore((s) => s.state?.stage ?? 0);
  const stardust = useMascotStore((s) => s.state?.stardust ?? 0);
  const passItem = useMascotStore((s) => s.state?.catalog?.find((i) => i.id === "tarotPass"));
  const passBought = useMascotStore((s) => (s.state?.passesToday?.tarot ?? 0) >= PASSES.tarot.amount);
  const purchase = useMascotStore((s) => s.purchase);
  const [buying, setBuying] = useState(false);
  const passPrice = passItem?.price ?? 150;
  const buyPass = async () => {
    setBuying(true);
    await purchase("tarotPass");
    setBuying(false);
  };

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <EnterView style={styles.header}>
        <AppText variant="label" color={colors.text.accent}>
          {t("tarot.eyebrow")}
        </AppText>
        <AppText variant="title">{t("tarot.title")}</AppText>
        <AppText variant="body">{t("tarot.intro")}</AppText>
      </EnterView>

      <EnterView index={1} scale>
        <AsterCameo
          text={prefilled && question ? t("tarot.asterPrefilled") : t("tarot.asterAsk")}
          size={60}
        />
      </EnterView>

      {today ? (
        <EnterView index={1}>
          <PressableScale
            onPress={onOpenToday}
            scaleTo={0.98}
            style={styles.today}
            accessibilityRole="button"
            accessibilityLabel={`${t("tarot.todayReading")}. ${t("tarot.todayReadingOpen")}`}
          >
            <View style={styles.todayCards}>
              {today.spread.cards.map((c, i) => (
                <View key={c.cardId} style={[styles.todayCard, { marginLeft: i === 0 ? 0 : -18 }]}>
                  <TarotCardFace cardId={c.cardId} reversed={c.reversed} width={38} height={65} />
                </View>
              ))}
            </View>
            <View style={styles.todayText}>
              <AppText variant="label" color={colors.text.accent}>
                {t("tarot.todayReading")}
              </AppText>
              <AppText variant="heading" numberOfLines={1}>
                {today.synthesis?.title ??
                  today.spread.cards.map((c) => tarotCardInfo(c.cardId)?.name[locale]).join(" · ")}
              </AppText>
              <AppText variant="bodySmall" color={colors.text.tertiary}>
                {t("tarot.todayReadingOpen")}
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={18} color={palette.star.face} />
          </PressableScale>
        </EnterView>
      ) : null}

      <EnterView index={2}>
        <AppText variant="heading">{t("tarot.categoryTitle")}</AppText>
      </EnterView>

      <View style={styles.grid}>
        {TAROT_CATEGORIES.map((c, i) => {
          const active = c === category;
          return (
            <EnterView key={c} index={3 + i} style={styles.cell}>
              <PressableScale
                onPress={() => setCategory(c)}
                scaleTo={0.96}
                haptic={active ? "none" : "selection"}
                style={[styles.tile, active && styles.tileActive]}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${t(`tarot.categories.${c}.name` as TranslationKey)}. ${t(
                  `tarot.categories.${c}.desc` as TranslationKey,
                )}`}
              >
                <View style={[styles.icon, active && styles.iconActive]}>
                  <Ionicons
                    name={CATEGORY_ICON[c]}
                    size={20}
                    color={active ? palette.star.on : palette.star.face}
                  />
                </View>
                <AppText variant="heading" numberOfLines={1}>
                  {t(`tarot.categories.${c}.name` as TranslationKey)}
                </AppText>
                <AppText variant="bodySmall" color={colors.text.tertiary} numberOfLines={2}>
                  {t(`tarot.categories.${c}.desc` as TranslationKey)}
                </AppText>
              </PressableScale>
            </EnterView>
          );
        })}
      </View>

      <EnterView index={9} style={styles.questionBlock}>
        <AppText variant="label" color={colors.text.tertiary}>
          {t("tarot.questionLabel")}
        </AppText>
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder={t("tarot.questionPlaceholder")}
          placeholderTextColor={colors.text.tertiary}
          maxLength={200}
          multiline
          style={[styles.input, prefilled && question ? styles.inputPrefilled : null]}
          accessibilityLabel={t("tarot.questionLabel")}
        />
      </EnterView>

      <EnterView index={10} style={styles.questionBlock}>
        <AppText variant="label" color={colors.text.tertiary}>
          {t("tarot.spreadPick.label")}
        </AppText>
        <View style={styles.spreads} accessibilityRole="radiogroup">
          {(["three", "decision"] as TarotSpreadKey[]).map((k) => {
            const open = spreadUnlocked(k, stage);
            return (
              <Chip
                key={k}
                label={
                  open
                    ? t(`tarot.spreadPick.${k}` as TranslationKey)
                    : `${t(`tarot.spreadPick.${k}` as TranslationKey)} · ${t("tarot.spreadPick.lockedAt", {
                        stage: stageName(t, TAROT_SPREAD_STAGE[k]),
                      })}`
                }
                icon={open ? (k === "three" ? "albums" : "git-branch") : "lock-closed"}
                tone={k === "three" ? "primary" : "star"}
                selected={spread === k}
                onPress={open ? () => setSpread(k) : undefined}
              />
            );
          })}
        </View>
      </EnterView>

      {atLimit ? (
        <SpotlightCard
          tone="star"
          icon="moon"
          eyebrow={t("tarot.limitEyebrow")}
          title={t("tarot.limitTitle")}
          body={t("tarot.limitNote")}
          cta={{ label: t("paywall.unlockPremium"), onPress: onPremium }}
          secondary={
            passItem && !passBought
              ? {
                  label:
                    stardust >= passPrice
                      ? t("tarot.passCta", { n: passPrice })
                      : t("tarot.passShort", { n: passPrice, have: stardust }),
                  onPress: () => void buyPass(),
                  disabled: stardust < passPrice || buying,
                }
              : undefined
          }
        />
      ) : (
        <ChunkyButton
          label={t("tarot.start")}
          disabled={!category}
          onPress={() => category && onStart(category, question.trim(), spread)}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: 140,
    gap: spacing.lg,
  },
  header: { gap: spacing.xs },
  spreads: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  today: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: palette.star.face,
    borderBottomWidth: 5,
    borderBottomColor: palette.star.slab,
    backgroundColor: palette.star.soft,
  },
  todayCards: { flexDirection: "row" },
  // Hard-offset slab under each mini card — no blur.
  todayCard: {
    shadowColor: surface.slab,
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 3 },
  },
  todayText: { flex: 1, minWidth: 0, gap: 2 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  cell: {
    width: "47.5%",
    flexGrow: 1,
  },
  tile: {
    minHeight: 124,
    padding: spacing.lg,
    gap: spacing.xs,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border.chunky,
    borderBottomWidth: 5,
    borderBottomColor: surface.slab,
    backgroundColor: surface.card,
  },
  tileActive: {
    borderColor: palette.star.face,
    borderBottomColor: palette.star.slab,
    backgroundColor: palette.star.soft,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
    backgroundColor: palette.star.soft,
  },
  iconActive: {
    backgroundColor: palette.star.face,
  },
  questionBlock: { gap: spacing.sm },
  input: {
    minHeight: 80,
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border.chunky,
    borderBottomWidth: 4,
    borderBottomColor: surface.slab,
    backgroundColor: surface.raised,
    color: colors.text.primary,
    fontFamily: typography.body.fontFamily,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    textAlignVertical: "top",
  },
  inputPrefilled: {
    borderColor: palette.star.face,
    borderBottomColor: palette.star.slab,
  },
});
