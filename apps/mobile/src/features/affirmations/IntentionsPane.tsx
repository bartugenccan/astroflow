import React, { useMemo, useState } from "react";
import { StyleSheet, View, ScrollView, TextInput, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { PressableScale } from "../../components/ui/PressableScale";
import { GoldButton } from "../../components/ui/GoldButton";
import { SpringBottomSheet } from "../../components/ui/SpringBottomSheet";
import { PaywallSheet } from "../../components/PaywallSheet";
import { EnterView } from "../../lib/motion";
import { IntentionsList } from "../intentions/IntentionsList";
import { AffirmationCard } from "./AffirmationCard";
import { useAffirmationAudio } from "./useAffirmationAudio";
import {
  AFFIRMATION_CATEGORIES,
  BUILTIN_AFFIRMATIONS,
  affirmationOfTheDay,
  categoryStreak,
  localDay,
  useAffirmationStore,
} from "../../store/useAffirmationStore";
import { Affirmation, AffirmationCategory } from "../../services/types";
import { useTranslation, TranslationKey } from "../../i18n";
import { colors, spacing, radii, fonts } from "../../lib/design-system";

const CATEGORY_ICON: Record<AffirmationCategory, keyof typeof Ionicons.glyphMap> = {
  money: "cash-outline",
  love: "heart-outline",
  career: "briefcase-outline",
  health: "leaf-outline",
  confidence: "flash-outline",
  calm: "water-outline",
};

/**
 * "Intentions" in the For You tab: affirmations by life area on top (read,
 * repeat, record in your own voice, tick for today), the user's longer goals
 * underneath. Owns its ScrollView so the add-affirmation and paywall sheets
 * can render at the pane root, outside the scrolling content.
 */
export function IntentionsPane() {
  const { t } = useTranslation();
  const [category, setCategory] = useState<AffirmationCategory>("money");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [paywall, setPaywall] = useState(false);

  const customs = useAffirmationStore((s) => s.customs);
  const days = useAffirmationStore((s) => s.days);
  const addCustom = useAffirmationStore((s) => s.addCustom);
  const removeCustom = useAffirmationStore((s) => s.removeCustom);
  const repeat = useAffirmationStore((s) => s.repeat);
  const toggleDone = useAffirmationStore((s) => s.toggleDone);
  const audio = useAffirmationAudio();

  const today = days[localDay()] ?? { done: [], reps: {} as Record<string, number> };

  const list = useMemo(
    () => [
      ...customs.filter((c) => c.category === category),
      ...BUILTIN_AFFIRMATIONS.filter((a) => a.category === category),
    ],
    [customs, category],
  );
  const featured = affirmationOfTheDay(list.filter((a) => !a.custom));
  const rest = list.filter((a) => a.id !== featured?.id);
  const streak = categoryStreak(days, customs, category);

  const textOf = (a: Affirmation) =>
    a.custom ? (a.text ?? "") : t(a.builtinKey as TranslationKey);

  const record = async (id: string) => {
    if (audio.recordingId === id) {
      await audio.stopRecording();
      return;
    }
    if (audio.recordingId) await audio.stopRecording();
    const result = await audio.startRecording(id);
    if (result === "denied") Alert.alert(t("affirmations.ui.micDenied"));
  };

  const confirmDeleteRecording = (id: string) => {
    Alert.alert(t("affirmations.ui.deleteRecording"), undefined, [
      { text: t("common.back"), style: "cancel" },
      { text: t("affirmations.ui.delete"), style: "destructive", onPress: () => audio.deleteRecording(id) },
    ]);
  };

  const saveCustom = () => {
    if (!draft.trim()) return;
    addCustom(category, draft);
    setDraft("");
    setAdding(false);
  };

  const card = (a: Affirmation, isFeatured = false) => (
    <AffirmationCard
      key={a.id}
      text={textOf(a)}
      featured={isFeatured}
      reps={today.reps[a.id] ?? 0}
      done={today.done.includes(a.id)}
      isRecording={audio.recordingId === a.id}
      isPlaying={audio.playingId === a.id}
      hasRecording={audio.hasRecording(a.id)}
      onRepeat={() => repeat(a.id)}
      onToggleDone={() => toggleDone(a.id)}
      onRecord={() => record(a.id)}
      onPlay={() => audio.togglePlay(a.id)}
      onDeleteRecording={() => confirmDeleteRecording(a.id)}
      onDelete={
        a.custom
          ? () => {
              if (audio.hasRecording(a.id)) audio.deleteRecording(a.id);
              removeCustom(a.id);
            }
          : undefined
      }
    />
  );

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <EnterView style={styles.header}>
          <AppText variant="label" color={colors.text.gold}>
            {t("affirmations.ui.eyebrow")}
          </AppText>
          <AppText variant="title">{t("affirmations.ui.title")}</AppText>
          <AppText variant="body">{t("affirmations.ui.intro")}</AppText>
        </EnterView>

        {/* Life areas */}
        <EnterView index={1}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {AFFIRMATION_CATEGORIES.map((c) => {
              const active = c === category;
              return (
                <PressableScale
                  key={c}
                  onPress={() => setCategory(c)}
                  scaleTo={0.92}
                  haptic={active ? "none" : "selection"}
                  style={[styles.chip, active && styles.chipActive]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons
                    name={CATEGORY_ICON[c]}
                    size={15}
                    color={active ? colors.text.onGold : colors.gold[300]}
                  />
                  <AppText
                    variant="bodySmall"
                    color={active ? colors.text.onGold : colors.text.primary}
                    numberOfLines={1}
                  >
                    {t(`affirmations.categories.${c}.name` as TranslationKey)}
                  </AppText>
                </PressableScale>
              );
            })}
          </ScrollView>
        </EnterView>

        {/* Area description + streak. Keyed so it re-enters on category change. */}
        <EnterView key={`meta-${category}`} index={2} style={styles.meta}>
          <AppText variant="bodySmall" style={styles.metaText}>
            {t(`affirmations.categories.${category}.desc` as TranslationKey)}
          </AppText>
          <View style={styles.streak}>
            <Ionicons name="flame" size={14} color={colors.gold[300]} />
            {streak > 0 ? (
              <AppText variant="bodySmall" color={colors.gold[200]} style={styles.streakRow}>
                {t("affirmations.ui.streak", { n: streak })}
              </AppText>
            ) : (
              <AppText variant="bodySmall" color={colors.text.tertiary}>
                {t("affirmations.ui.noStreak")}
              </AppText>
            )}
          </View>
        </EnterView>

        {featured ? (
          <EnterView key={`featured-${category}`} index={3} scale>
            <AppText variant="label" color={colors.text.gold} style={styles.featuredLabel}>
              {t("affirmations.ui.todayPick")}
            </AppText>
            {card(featured, true)}
          </EnterView>
        ) : null}

        <View style={styles.list}>
          {rest.map((a, i) => (
            <EnterView key={`${category}-${a.id}`} index={4 + i}>
              {card(a)}
            </EnterView>
          ))}
        </View>

        <EnterView index={4 + rest.length} style={styles.addWrap}>
          <PressableScale onPress={() => setAdding(true)} scaleTo={0.97} style={styles.addBtn}>
            <Ionicons name="add" size={18} color={colors.gold[300]} />
            <AppText variant="heading" color={colors.gold[300]} style={styles.addText}>
              {t("affirmations.ui.addOwn")}
            </AppText>
          </PressableScale>
          <AppText variant="bodySmall" color={colors.text.tertiary} center>
            {t("affirmations.ui.recordHint")}
          </AppText>
        </EnterView>

        {/* Longer goals */}
        <View style={styles.goals}>
          <View style={styles.header}>
            <AppText variant="label" color={colors.text.gold}>
              {t("affirmations.ui.goalsTitle")}
            </AppText>
            <AppText variant="bodySmall">{t("affirmations.ui.goalsSub")}</AppText>
          </View>
          <IntentionsList onPaywall={() => setPaywall(true)} />
        </View>
      </ScrollView>

      <SpringBottomSheet
        visible={adding}
        onClose={() => setAdding(false)}
        title={t("affirmations.ui.addTitle")}
      >
        <View style={styles.sheetBody}>
          <View style={styles.sheetCategory}>
            <Ionicons name={CATEGORY_ICON[category]} size={16} color={colors.gold[300]} />
            <AppText variant="bodySmall" color={colors.gold[300]}>
              {t(`affirmations.categories.${category}.name` as TranslationKey)}
            </AppText>
          </View>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t("affirmations.ui.addPlaceholder")}
            placeholderTextColor={colors.text.tertiary}
            style={styles.input}
            multiline
            maxLength={200}
            autoFocus
          />
          <GoldButton label={t("affirmations.ui.save")} onPress={saveCustom} disabled={!draft.trim()} />
        </View>
      </SpringBottomSheet>

      <PaywallSheet visible={paywall} onClose={() => setPaywall(false)} variant="premium" />
    </View>
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
  chips: {
    gap: spacing.sm,
    paddingRight: spacing.xl,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    backgroundColor: colors.ink[800],
  },
  chipActive: {
    backgroundColor: colors.gold[400],
    borderColor: colors.gold[400],
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  metaText: { flex: 1, minWidth: 0 },
  streak: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexShrink: 1,
    maxWidth: "50%",
  },
  streakRow: {
    flexShrink: 1,
  },
  featuredLabel: { marginBottom: spacing.sm },
  list: { gap: spacing.md },
  addWrap: { gap: spacing.sm },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border.hairlineStrong,
  },
  addText: { fontSize: 15 },
  goals: {
    gap: spacing.lg,
    marginTop: spacing.xl,
  },
  sheetBody: { gap: spacing.lg },
  sheetCategory: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  input: {
    minHeight: 110,
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
