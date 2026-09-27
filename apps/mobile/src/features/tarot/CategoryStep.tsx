import React, { useState } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { GoldButton } from "../../components/ui/GoldButton";
import { PressableScale } from "../../components/ui/PressableScale";
import { EnterView } from "../../lib/motion";
import { TranslationKey, useTranslation } from "../../i18n";
import { colors, fonts, radii, spacing } from "../../lib/design-system";
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
  initialCategory: TarotCategory | null;
  initialQuestion: string;
  /** Today's reading, if one was drawn — offered at the top to reopen. */
  today: SavedTarotReading | null;
  /** True when the free reading for today is used (and the user isn't Premium). */
  atLimit: boolean;
  onOpenToday: () => void;
  onStart: (category: TarotCategory, question: string) => void;
}

/** Step one: pick the theme (and optionally write the question) before the deck comes out. */
export function CategoryStep({ initialCategory, initialQuestion, today, atLimit, onOpenToday, onStart }: Props) {
  const { t, locale } = useTranslation();
  const [category, setCategory] = useState<TarotCategory | null>(initialCategory);
  const [question, setQuestion] = useState(initialQuestion);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <EnterView style={styles.header}>
        <AppText variant="label" color={colors.text.gold}>
          {t("tarot.eyebrow")}
        </AppText>
        <AppText variant="title">{t("tarot.title")}</AppText>
        <AppText variant="body">{t("tarot.intro")}</AppText>
      </EnterView>

      {today ? (
        <EnterView index={1}>
          <PressableScale onPress={onOpenToday} scaleTo={0.98} style={styles.today}>
            <View style={styles.todayCards}>
              {today.spread.cards.map((c, i) => (
                <View key={c.cardId} style={[styles.todayCard, { marginLeft: i === 0 ? 0 : -18 }]}>
                  <TarotCardFace cardId={c.cardId} reversed={c.reversed} width={38} height={65} />
                </View>
              ))}
            </View>
            <View style={styles.todayText}>
              <AppText variant="label" color={colors.text.gold}>
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
            <Ionicons name="chevron-forward" size={18} color={colors.gold[300]} />
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
              >
                <View style={[styles.icon, active && styles.iconActive]}>
                  <Ionicons
                    name={CATEGORY_ICON[c]}
                    size={20}
                    color={active ? colors.text.onGold : colors.gold[300]}
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
          style={styles.input}
        />
      </EnterView>

      {atLimit ? (
        <AppText variant="bodySmall" color={colors.text.secondary}>
          {t("tarot.limitNote")}
        </AppText>
      ) : null}

      <GoldButton
        label={t("tarot.start")}
        disabled={!category}
        onPress={() => category && onStart(category, question.trim())}
      />
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
  today: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    backgroundColor: colors.ink[800],
  },
  todayCards: { flexDirection: "row" },
  todayCard: {
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
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
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    backgroundColor: colors.ink[900],
  },
  tileActive: {
    borderColor: colors.gold[400],
    backgroundColor: colors.ink[700],
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
    backgroundColor: colors.ink[700],
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  iconActive: {
    backgroundColor: colors.gold[400],
    borderColor: colors.gold[400],
  },
  questionBlock: { gap: spacing.sm },
  input: {
    minHeight: 72,
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    backgroundColor: colors.ink[800],
    color: colors.text.primary,
    fontFamily: fonts.sansMedium,
    fontSize: 16,
    textAlignVertical: "top",
  },
});
