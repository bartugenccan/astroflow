import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
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
import { LinearGradient } from "expo-linear-gradient";
import { AppText } from "../../components/ui/AppText";
import { PressableScale } from "../../components/ui/PressableScale";
import { StarBurst } from "../intentions/StarBurst";
import { useTranslation } from "../../i18n";
import { colors, spacing, radii, motion } from "../../lib/design-system";

interface AffirmationCardProps {
  text: string;
  /** The day's highlighted affirmation — bigger type, gold wash. */
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
}

/**
 * One affirmation you can practise: read it, tap "Repeat" each time you say
 * it (the counter pops), record it in your own voice and play it back, and
 * tick it off for today (a small star burst).
 */
export function AffirmationCard({
  text,
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
}: AffirmationCardProps) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [burst, setBurst] = useState(0);

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
    <View style={[styles.card, featured && styles.featured, done && styles.cardDone]}>
      {featured ? (
        <LinearGradient
          colors={[colors.glow.goldSoft, "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.wash}
          pointerEvents="none"
        />
      ) : null}

      <View style={styles.textRow}>
        <AppText
          variant="serifBody"
          color={colors.text.primary}
          style={[styles.text, featured && styles.textFeatured]}
        >
          “{text}”
        </AppText>
        {onDelete ? (
          <PressableScale
            onPress={onDelete}
            hitSlop={10}
            scaleTo={0.85}
            haptic="light"
            accessibilityRole="button"
            accessibilityLabel={t("affirmations.ui.delete")}
          >
            <Ionicons name="close" size={18} color={colors.text.tertiary} />
          </PressableScale>
        ) : null}
      </View>

      <View style={styles.actions}>
        {/* Repeat counter */}
        <PressableScale onPress={repeat} scaleTo={0.94} haptic="light" style={styles.repeatBtn}>
          <Ionicons name="repeat" size={16} color={colors.gold[300]} />
          <AppText variant="heading" color={colors.gold[300]} style={styles.small}>
            {t("affirmations.ui.repeat")}
          </AppText>
          {reps > 0 ? (
            <Animated.View style={[styles.repsBadge, popStyle]}>
              <AppText variant="numeric" color={colors.text.onGold}>
                {reps}
              </AppText>
            </Animated.View>
          ) : null}
        </PressableScale>

        <View style={styles.spacer} />

        {/* Voice */}
        {hasRecording && !isRecording ? (
          <PressableScale
            onPress={onPlay}
            onLongPress={onDeleteRecording}
            scaleTo={0.88}
            style={styles.iconBtn}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? t("affirmations.ui.pause") : t("affirmations.ui.play")}
            accessibilityHint={t("affirmations.ui.deleteRecording")}
          >
            <Ionicons name={isPlaying ? "pause" : "play"} size={18} color={colors.gold[200]} />
          </PressableScale>
        ) : null}
        <PressableScale
          onPress={onRecord}
          scaleTo={0.88}
          style={[styles.iconBtn, isRecording && styles.iconBtnLive]}
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
            <Ionicons name="mic-outline" size={18} color={colors.gold[200]} />
          )}
        </PressableScale>

        {/* Done for today */}
        <View>
          <PressableScale
            onPress={toggleDone}
            scaleTo={0.85}
            haptic={done ? "selection" : "light"}
            style={[styles.iconBtn, done && styles.doneBtn]}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: done }}
            accessibilityLabel={done ? t("affirmations.ui.doneToday") : t("affirmations.ui.markDone")}
          >
            <Ionicons
              name={done ? "checkmark" : "checkmark-outline"}
              size={20}
              color={done ? colors.text.onGold : colors.gold[200]}
            />
          </PressableScale>
          <StarBurst playKey={burst} radius={46} count={8} />
        </View>
      </View>

      {isRecording ? (
        <AppText variant="bodySmall" color={colors.semantic.challenging}>
          {t("affirmations.ui.recording")}
        </AppText>
      ) : done ? (
        <AppText variant="bodySmall" color={colors.gold[300]}>
          {t("affirmations.ui.doneToday")}
          {reps > 0 ? ` · ${t("affirmations.ui.repeatedToday", { n: reps })}` : ""}
        </AppText>
      ) : null}
    </View>
  );
}

const BTN = 40;

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    backgroundColor: colors.ink[900],
    // No overflow clipping: the done-tick star burst flies past the edge.
  },
  wash: {
    ...StyleSheet.absoluteFill,
    borderRadius: radii.lg,
  },
  featured: {
    borderColor: colors.border.hairlineStrong,
    padding: spacing.xl,
  },
  cardDone: {
    borderColor: colors.gold[600],
  },
  textRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  text: {
    flex: 1,
    minWidth: 0,
    fontSize: 19,
    lineHeight: 28,
  },
  textFeatured: {
    fontSize: 23,
    lineHeight: 32,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  spacer: {
    flex: 1,
  },
  repeatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    height: BTN,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    flexShrink: 1,
  },
  small: {
    fontSize: 14,
    flexShrink: 1,
  },
  repsBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.gold[400],
  },
  iconBtn: {
    width: BTN,
    height: BTN,
    borderRadius: BTN / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    backgroundColor: colors.ink[800],
  },
  iconBtnLive: {
    borderColor: colors.semantic.challenging,
  },
  recDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.semantic.challenging,
  },
  doneBtn: {
    backgroundColor: colors.gold[400],
    borderColor: colors.gold[400],
  },
});
