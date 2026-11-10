import React, { useEffect, useState } from "react";
import { StyleSheet, View, StyleProp, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
  withRepeat,
  cancelAnimation,
  useReducedMotion,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { PressableScale } from "../../components/ui/PressableScale";
import { IconButton } from "../../components/ui/IconButton";
import { StarBurst } from "../intentions/StarBurst";
import { useTranslation } from "../../i18n";
import { colors, spacing, radii, motion, surface, palette, depth, type Tone } from "../../lib/design-system";

interface AffirmationCardProps {
  text: string;
  /** The category's tone — the card's outline and slab. */
  tone: Tone;
  /** The day's highlighted affirmation — bigger type, gold card. */
  featured?: boolean;
  reps: number;
  done: boolean;
  isRecording: boolean;
  isPlaying: boolean;
  hasRecording: boolean;
  onRepeat: () => void;
  onToggleDone: () => void;
  onRecord: () => void;
  onPlay: () => void;
  onDeleteRecording: () => void;
  /** Only the user's own affirmations can be deleted. */
  onDelete?: () => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * One affirmation to practise, as a chunky card in the carousel: read it, tap
 * "Repeat" each time you say it (the counter pops), record it in your own
 * voice and play it back, and tick it off for today (a small star burst).
 */
export function AffirmationCard({
  text,
  tone,
  featured = false,
  reps,
  done,
  isRecording,
  isPlaying,
  hasRecording,
  onRepeat,
  onToggleDone,
  onRecord,
  onPlay,
  onDeleteRecording,
  onDelete,
  style,
}: AffirmationCardProps) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [burst, setBurst] = useState(0);
  const p = palette[featured ? "star" : tone];

  // Counter pop on every repeat.
  const pop = useSharedValue(1);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  const repeat = () => {
    if (!reduced) {
      pop.value = withSequence(withSpring(1.35, motion.spring.snappy), withSpring(1, motion.spring.gentle));
    }
    onRepeat();
  };

  // Recording dot breathes while the mic is live.
  const rec = useSharedValue(1);
  useEffect(() => {
    if (isRecording && !reduced) {
      rec.value = withRepeat(withTiming(0.35, { duration: 600 }), -1, true);
    } else {
      cancelAnimation(rec);
      rec.value = 1;
    }
  }, [isRecording, reduced, rec]);
  const recStyle = useAnimatedStyle(() => ({ opacity: rec.value }));

  const toggleDone = () => {
    if (!done) setBurst((b) => b + 1);
    onToggleDone();
  };

  return (
    <View
      style={[
        styles.card,
        { borderColor: done ? palette.mint.face : p.face, borderBottomColor: done ? palette.mint.slab : p.slab },
        featured && { backgroundColor: palette.star.soft },
        style,
      ]}
    >
      <View style={styles.textRow}>
        <AppText variant={featured ? "title" : "lead"} color={colors.text.primary} style={styles.text}>
          “{text}”
        </AppText>
        {onDelete ? (
          <IconButton icon="close" size={40} tone="night" onPress={onDelete} accessibilityLabel={t("affirmations.ui.delete")} />
        ) : null}
      </View>

      <View style={styles.actions}>
        {/* Repeat counter */}
        <PressableScale
          onPress={repeat}
          scaleTo={0.94}
          haptic="light"
          style={styles.repeatBtn}
          accessibilityRole="button"
          accessibilityLabel={
            reps > 0 ? `${t("affirmations.ui.repeat")}, ${t("affirmations.ui.repeatedToday", { n: reps })}` : t("affirmations.ui.repeat")
          }
        >
          <Ionicons name="repeat" size={18} color={colors.star[300]} />
          <AppText variant="button" color={colors.star[300]} numberOfLines={1} style={styles.shrink}>
            {t("affirmations.ui.repeat")}
          </AppText>
          {reps > 0 ? (
            <Animated.View style={[styles.repsBadge, popStyle]}>
              <AppText variant="numeric" color={colors.text.onAccent}>
                {reps}
              </AppText>
            </Animated.View>
          ) : null}
        </PressableScale>

        <View style={styles.spacer} />

        {/* Voice */}
        {hasRecording && !isRecording ? (
          <IconButton
            icon={isPlaying ? "pause" : "play"}
            tone="night"
            size={44}
            onPress={onPlay}
            accessibilityLabel={isPlaying ? t("affirmations.ui.pause") : t("affirmations.ui.play")}
          />
        ) : null}
        <PressableScale
          onPress={onRecord}
          scaleTo={0.88}
          style={[styles.roundBtn, isRecording && styles.roundLive]}
          accessibilityRole="button"
          accessibilityLabel={
            isRecording
              ? t("affirmations.ui.recording")
              : hasRecording
                ? t("affirmations.ui.reRecord")
                : t("affirmations.ui.record")
          }
        >
          {isRecording ? (
            <Animated.View style={[styles.recDot, recStyle]} />
          ) : (
            <Ionicons name="mic" size={20} color={colors.star[200]} />
          )}
        </PressableScale>

        {/* Done for today */}
        <View>
          <PressableScale
            onPress={toggleDone}
            scaleTo={0.85}
            haptic={done ? "selection" : "light"}
            style={[styles.roundBtn, done && styles.doneBtn]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: done }}
            accessibilityLabel={done ? t("affirmations.ui.doneToday") : t("affirmations.ui.markDone")}
          >
            <Ionicons name="checkmark" size={22} color={done ? palette.mint.on : colors.star[200]} />
          </PressableScale>
          <StarBurst playKey={burst} radius={46} count={8} />
        </View>
      </View>

      {isRecording ? (
        <AppText variant="bodySmall" color={colors.semantic.challenging} accessibilityLiveRegion="polite">
          {t("affirmations.ui.recording")}
        </AppText>
      ) : done ? (
        <AppText variant="bodySmall" color={palette.mint.face}>
          {t("affirmations.ui.doneToday")}
          {reps > 0 ? ` · ${t("affirmations.ui.repeatedToday", { n: reps })}` : ""}
        </AppText>
      ) : null}

      {hasRecording && !isRecording ? (
        <PressableScale
          onPress={onDeleteRecording}
          scaleTo={0.96}
          haptic="light"
          style={styles.linkBtn}
          accessibilityRole="button"
          accessibilityLabel={t("affirmations.ui.deleteRecording")}
        >
          <Ionicons name="trash-outline" size={16} color={colors.text.tertiary} />
          <AppText variant="bodySmall">{t("affirmations.ui.deleteRecording")}</AppText>
        </PressableScale>
      ) : null}
    </View>
  );
}

const BTN = 44;

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
    padding: spacing.xl,
    borderRadius: radii.xl,
    borderWidth: 2,
    borderBottomWidth: depth.lg,
    backgroundColor: surface.card,
    justifyContent: "space-between",
    // No overflow clipping: the done-tick star burst flies past the edge.
  },
  textRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  text: { flex: 1, minWidth: 0 },
  actions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  spacer: { flex: 1 },
  shrink: { flexShrink: 1 },
  repeatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    height: BTN,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderBottomWidth: depth.sm + 1,
    borderColor: colors.border.chunky,
    borderBottomColor: surface.slab,
    backgroundColor: surface.raised,
    flexShrink: 1,
  },
  repsBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: radii.pill,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.star[400],
  },
  roundBtn: {
    width: BTN,
    height: BTN,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderBottomWidth: depth.sm + 1,
    borderColor: colors.border.chunky,
    borderBottomColor: surface.slab,
    backgroundColor: surface.raised,
  },
  roundLive: { borderColor: colors.semantic.challenging },
  linkBtn: { flexDirection: "row", alignItems: "center", gap: spacing.xs, minHeight: 44, alignSelf: "flex-start" },
  recDot: { width: 14, height: 14, borderRadius: radii.pill, backgroundColor: colors.semantic.challenging },
  doneBtn: { backgroundColor: palette.mint.face, borderColor: palette.mint.face, borderBottomColor: palette.mint.slab },
});
