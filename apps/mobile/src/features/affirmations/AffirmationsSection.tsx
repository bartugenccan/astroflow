import React, { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { Chip } from "../../components/ui/Chip";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { GoldButton } from "../../components/ui/GoldButton";
import { SpringBottomSheet } from "../../components/ui/SpringBottomSheet";
import { EnterView } from "../../lib/motion";
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
import { useMascotStore } from "../../store/useMascotStore";
import { Affirmation, AffirmationCategory } from "../../services/types";
import { useTranslation, TranslationKey } from "../../i18n";
import { colors, fonts, palette, radii, spacing, surface, Tone } from "../../lib/design-system";

export const CATEGORY_ICON: Record<AffirmationCategory, keyof typeof Ionicons.glyphMap> = {
  money: "cash",
  love: "heart",
  career: "briefcase",
  health: "leaf",
  confidence: "flash",
  calm: "water",
};

const CATEGORY_TONE: Record<AffirmationCategory, Tone> = {
  money: "star",
  love: "candy",
  career: "sky",
  health: "mint",
  confidence: "primary",
  calm: "sky",
};

interface AffirmationsSectionProps {
  enterIndex?: number;
  /** Open the "add your own" sheet (rendered by the screen, outside its ScrollView). */
  onAdd: (category: AffirmationCategory) => void;
}

/**
 * Affirmations by life area — read, repeat, record in your own voice, tick
 * for today. Rendered inside the Manifest tab's scroll view, so it has no
 * ScrollView or sheet of its own. Ticking one done feeds Aster.
 */
export function AffirmationsSection({ enterIndex = 0, onAdd }: AffirmationsSectionProps) {
  const { t } = useTranslation();
  const [category, setCategory] = useState<AffirmationCategory>("money");

  const customs = useAffirmationStore((s) => s.customs);
  const days = useAffirmationStore((s) => s.days);
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

  const textOf = (a: Affirmation) => (a.custom ? (a.text ?? "") : t(a.builtinKey as TranslationKey));

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

  const markDone = (id: string) => {
    const nowDone = toggleDone(id);
    // Saying an affirmation feeds Aster (twice a day at most, server-side).
    if (nowDone) useMascotStore.getState().report("AFFIRMATION");
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
      onToggleDone={() => markDone(a.id)}
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
      <EnterView index={enterIndex} style={styles.header}>
        <AppText variant="title">{t("manifest.affirmationsTitle")}</AppText>
        <AppText variant="body">{t("affirmations.ui.intro")}</AppText>
      </EnterView>

      <EnterView index={enterIndex + 1}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {AFFIRMATION_CATEGORIES.map((c) => (
            <Chip
              key={c}
              label={t(`affirmations.categories.${c}.name` as TranslationKey)}
              icon={CATEGORY_ICON[c]}
              tone={CATEGORY_TONE[c]}
              selected={c === category}
              onPress={() => setCategory(c)}
            />
          ))}
        </ScrollView>
      </EnterView>

      <EnterView key={`meta-${category}`} index={enterIndex + 2} style={styles.meta}>
        <AppText variant="bodySmall" style={styles.metaText}>
          {t(`affirmations.categories.${category}.desc` as TranslationKey)}
        </AppText>
        <View style={styles.streak}>
          <Ionicons name="flame" size={16} color={streak > 0 ? palette.candy.face : colors.text.tertiary} />
          <AppText variant="heading" color={streak > 0 ? palette.candy.face : colors.text.tertiary}>
            {streak}
          </AppText>
        </View>
      </EnterView>

      {featured ? (
        <EnterView key={`featured-${category}`} index={enterIndex + 3} scale>
          <AppText variant="label" color={colors.text.accent} style={styles.featuredLabel}>
            {t("affirmations.ui.todayPick")}
          </AppText>
          {card(featured, true)}
        </EnterView>
      ) : null}

      <View style={styles.list}>
        {rest.map((a, i) => (
          <EnterView key={`${category}-${a.id}`} index={enterIndex + 4 + i}>
            {card(a)}
          </EnterView>
        ))}
      </View>

      <View style={styles.addWrap}>
        <ChunkyButton
          label={t("affirmations.ui.addOwn")}
          variant="ghost"
          size="md"
          uppercase={false}
          onPress={() => onAdd(category)}
          icon={<Ionicons name="add" size={18} color={colors.text.primary} />}
        />
        <AppText variant="bodySmall" center>
          {t("affirmations.ui.recordHint")}
        </AppText>
      </View>
    </View>
  );
}

/** "Add your own affirmation" — rendered at the screen root. */
export function AddAffirmationSheet({
  category,
  onClose,
}: {
  category: AffirmationCategory | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const addCustom = useAffirmationStore((s) => s.addCustom);
  const [draft, setDraft] = useState("");

  const save = () => {
    if (!category || !draft.trim()) return;
    addCustom(category, draft);
    setDraft("");
    onClose();
  };

  return (
    <SpringBottomSheet visible={category !== null} onClose={onClose} title={t("affirmations.ui.addTitle")}>
      <View style={styles.sheetBody}>
        {category ? (
          <Chip
            label={t(`affirmations.categories.${category}.name` as TranslationKey)}
            icon={CATEGORY_ICON[category]}
            tone={CATEGORY_TONE[category]}
          />
        ) : null}
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
        <GoldButton label={t("affirmations.ui.save")} onPress={save} disabled={!draft.trim()} />
      </View>
    </SpringBottomSheet>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.lg },
  header: { gap: spacing.xs },
  chips: { gap: spacing.sm, paddingRight: spacing.xl },
  meta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  metaText: { flex: 1, minWidth: 0 },
  streak: { flexDirection: "row", alignItems: "center", gap: 2 },
  featuredLabel: { marginBottom: spacing.sm },
  list: { gap: spacing.md },
  addWrap: { gap: spacing.sm },
  sheetBody: { gap: spacing.lg },
  input: {
    minHeight: 110,
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border.chunky,
    backgroundColor: surface.raised,
    color: colors.text.primary,
    fontFamily: fonts.sansMedium,
    fontSize: 16,
    textAlignVertical: "top",
  },
});
