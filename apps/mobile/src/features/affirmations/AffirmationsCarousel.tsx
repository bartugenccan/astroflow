import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  type ScrollViewInstance,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, withSpring } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { Chip } from "../../components/ui/Chip";
import { BleedRow } from "../../components/ui/BleedRow";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { IconButton } from "../../components/ui/IconButton";
import { PressableScale } from "../../components/ui/PressableScale";
import { StatPill } from "../../components/ui/StatPill";
import { SpringBottomSheet } from "../../components/ui/SpringBottomSheet";
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
import type { Affirmation, AffirmationCategory } from "../../services/types";
import { useTranslation, type TranslationKey } from "../../i18n";
import { colors, depth, motion, palette, radii, spacing, surface, typography, type Tone } from "../../lib/design-system";

export const CATEGORY_ICON: Record<AffirmationCategory, keyof typeof Ionicons.glyphMap> = {
  money: "cash",
  love: "heart",
  career: "briefcase",
  health: "leaf",
  confidence: "flash",
  calm: "water",
};

export const CATEGORY_TONE: Record<AffirmationCategory, Tone> = {
  money: "star",
  love: "candy",
  career: "sky",
  health: "mint",
  confidence: "primary",
  calm: "sky",
};

export function isAffirmationCategory(v: unknown): v is AffirmationCategory {
  return typeof v === "string" && (AFFIRMATION_CATEGORIES as string[]).includes(v);
}

const PEEK = 28;
const CARD_MIN_H = 236;

interface AffirmationsCarouselProps {
  category: AffirmationCategory;
  onCategoryChange: (c: AffirmationCategory) => void;
  /** Today's plan's pick, shown as a gentle hint when it is the open category. */
  suggested: AffirmationCategory | null;
  /** Open the "add your own" sheet (rendered at the screen root). */
  onAdd: (category: AffirmationCategory) => void;
}

/**
 * Affirmations as a swipeable row of chunky cards: today's pick first, then
 * the rest of the category, then "add your own". Read, repeat, record in your
 * own voice, tick for today — ticking one feeds Aster. Prev/next buttons and
 * page dots give a non-swipe way through.
 */
export function AffirmationsCarousel({ category, onCategoryChange, suggested, onAdd }: AffirmationsCarouselProps) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const scrollRef = useRef<ScrollViewInstance>(null);
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);

  const customs = useAffirmationStore((s) => s.customs);
  const days = useAffirmationStore((s) => s.days);
  const removeCustom = useAffirmationStore((s) => s.removeCustom);
  const repeat = useAffirmationStore((s) => s.repeat);
  const toggleDone = useAffirmationStore((s) => s.toggleDone);
  const audio = useAffirmationAudio();

  const today = days[localDay()] ?? { done: [] as string[], reps: {} as Record<string, number> };

  const list = useMemo(
    () => [
      ...customs.filter((c) => c.category === category),
      ...BUILTIN_AFFIRMATIONS.filter((a) => a.category === category),
    ],
    [customs, category],
  );
  const featured = affirmationOfTheDay(list.filter((a) => !a.custom));
  const ordered = featured ? [featured, ...list.filter((a) => a.id !== featured.id)] : list;
  const total = ordered.length + 1; // + "add your own"
  const streak = categoryStreak(days, customs, category);

  const cardW = Math.max(0, width - PEEK);
  const interval = cardW + spacing.md;

  useEffect(() => {
    setPage(0);
    scrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [category]);

  const goTo = (n: number) => {
    const next = Math.max(0, Math.min(total - 1, n));
    setPage(next);
    scrollRef.current?.scrollTo({ x: next * interval, animated: !reduced });
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (interval <= 0) return;
    setPage(Math.max(0, Math.min(total - 1, Math.round(e.nativeEvent.contentOffset.x / interval))));
  };

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

  const categoryName = (c: AffirmationCategory) => t(`affirmations.categories.${c}.name` as TranslationKey);

  return (
    <View style={styles.root} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.header}>
        <View style={styles.headText}>
          <AppText variant="title" accessibilityRole="header">
            {t("affirmations.ui.title")}
          </AppText>
          <AppText variant="bodySmall">{t("affirmations.ui.subtitle")}</AppText>
        </View>
        <StatPill
          icon="flame"
          value={streak}
          tone="candy"
          muted={streak === 0}
          accessibilityLabel={streak > 0 ? t("affirmations.ui.streak", { n: streak }) : t("affirmations.ui.noStreak")}
        />
      </View>

      <BleedRow contentContainerStyle={styles.chips} accessibilityRole="tablist">
        {AFFIRMATION_CATEGORIES.map((c) => (
          <Chip
            key={c}
            label={categoryName(c)}
            icon={CATEGORY_ICON[c]}
            tone={CATEGORY_TONE[c]}
            selected={c === category}
            onPress={() => onCategoryChange(c)}
          />
        ))}
      </BleedRow>

      <View style={styles.meta}>
        {suggested === category ? (
          <View style={styles.suggested}>
            <Ionicons name="sparkles" size={14} color={palette.star.on} />
            <AppText variant="label" color={palette.star.on} numberOfLines={1}>
              {t("affirmations.ui.suggested", { category: categoryName(category) })}
            </AppText>
          </View>
        ) : null}
        <AppText variant="bodySmall">{t(`affirmations.categories.${category}.desc` as TranslationKey)}</AppText>
      </View>

      {width > 0 ? (
        <BleedRow
          key={category}
          ref={scrollRef}
          endExtra={PEEK}
          snapToInterval={interval}
          decelerationRate="fast"
          disableIntervalMomentum
          onMomentumScrollEnd={onScrollEnd}
          contentContainerStyle={styles.track}
          accessibilityLabel={t("affirmations.ui.categoryA11y", { category: categoryName(category) })}
        >
          {ordered.map((a, i) => (
            <View
              key={a.id}
              style={{ width: cardW }}
              accessibilityLabel={t("affirmations.ui.page", { n: i + 1, total })}
            >
              {i === 0 && featured ? (
                <AppText variant="label" color={colors.text.accent} style={styles.pick}>
                  {t("affirmations.ui.todayPick")}
                </AppText>
              ) : (
                <View style={styles.pickSpacer} />
              )}
              <AffirmationCard
                text={textOf(a)}
                tone={CATEGORY_TONE[category]}
                featured={i === 0 && !!featured}
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
                style={styles.cardFill}
              />
            </View>
          ))}
          <View style={{ width: cardW }}>
            <View style={styles.pickSpacer} />
            <PressableScale
              onPress={() => onAdd(category)}
              scaleTo={0.97}
              style={styles.addCard}
              accessibilityRole="button"
              accessibilityLabel={t("affirmations.ui.addOwn")}
              accessibilityHint={t("affirmations.ui.addCardBody")}
            >
              <View style={styles.addIcon}>
                <Ionicons name="add" size={28} color={palette.primary.on} />
              </View>
              <AppText variant="heading" center>
                {t("affirmations.ui.addOwn")}
              </AppText>
              <AppText variant="bodySmall" center>
                {t("affirmations.ui.addCardBody")}
              </AppText>
            </PressableScale>
          </View>
        </BleedRow>
      ) : (
        <View style={{ minHeight: CARD_MIN_H }} />
      )}

      <View style={styles.nav}>
        <IconButton
          icon="chevron-back"
          tone="night"
          size={44}
          onPress={() => goTo(page - 1)}
          disabled={page === 0}
          accessibilityLabel={t("affirmations.ui.prev")}
        />
        <View
          style={styles.dots}
          accessible
          accessibilityLabel={t("affirmations.ui.page", { n: page + 1, total })}
        >
          {Array.from({ length: total }, (_, i) => (
            <Dot key={i} active={i === page} tone={CATEGORY_TONE[category]} />
          ))}
        </View>
        <IconButton
          icon="chevron-forward"
          tone="night"
          size={44}
          onPress={() => goTo(page + 1)}
          disabled={page >= total - 1}
          accessibilityLabel={t("affirmations.ui.next")}
        />
      </View>

      <AppText variant="bodySmall" center>
        {t("affirmations.ui.recordHint")}
      </AppText>
    </View>
  );
}

function Dot({ active, tone }: { active: boolean; tone: Tone }) {
  const reduced = useReducedMotion();
  const style = useAnimatedStyle(() => ({
    width: reduced ? (active ? 20 : 8) : withSpring(active ? 20 : 8, motion.spring.snappy),
  }));
  return (
    <Animated.View
      style={[styles.dot, { backgroundColor: active ? palette[tone].face : colors.border.hairlineStrong }, style]}
    />
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
          accessibilityLabel={t("affirmations.ui.addTitle")}
        />
        <ChunkyButton label={t("affirmations.ui.save")} onPress={save} disabled={!draft.trim()} />
      </View>
    </SpringBottomSheet>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  headText: { flex: 1, minWidth: 0, gap: spacing.xs },
  chips: { gap: spacing.sm },
  meta: { gap: spacing.sm },
  suggested: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: palette.star.face,
  },
  track: { gap: spacing.md, paddingBottom: spacing.sm },
  pick: { height: 22 },
  pickSpacer: { height: 22 },
  cardFill: { minHeight: CARD_MIN_H, flexGrow: 1 },
  addCard: {
    minHeight: CARD_MIN_H,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radii.xl,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.border.hairlineStrong,
    backgroundColor: palette.night.soft,
  },
  addIcon: {
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.primary.face,
    borderBottomWidth: depth.sm,
    borderBottomColor: palette.primary.slab,
  },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  dots: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1, flexWrap: "wrap", justifyContent: "center" },
  dot: { height: 8, borderRadius: radii.pill },
  sheetBody: { gap: spacing.lg },
  input: {
    ...typography.body,
    color: colors.text.primary,
    minHeight: 110,
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border.chunky,
    backgroundColor: surface.raised,
    textAlignVertical: "top",
  },
});
