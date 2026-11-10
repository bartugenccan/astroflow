import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from "react-native-reanimated";
import { AppText } from "./AppText";
import { PressableScale } from "./PressableScale";
import { useMotion } from "../../lib/motion";
import { colors, motion, palette, spacing, type Tone } from "../../lib/design-system";

interface QuestRowProps {
  title: string;
  /** One quiet line under the title (why it's here). */
  subtitle?: string;
  done: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: Tone;
  /** Işık it gives Aster. */
  xp?: number;
  xpLabel?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
}

/**
 * One of today's goals, Finch-style: a round tick on the left that fills with
 * a small pop the moment it's done, the title (struck through once done) and
 * the Light it feeds Aster. The whole row is the button while it's open.
 */
export function QuestRow({
  title,
  subtitle,
  done,
  icon,
  tone = "primary",
  xp,
  xpLabel,
  onPress,
  accessibilityLabel,
}: QuestRowProps) {
  const m = useMotion();
  const p = palette[tone];
  const scale = useSharedValue(1);
  const was = useRef(done);

  // Pop only when it *becomes* done here, not when a finished list mounts.
  useEffect(() => {
    if (done && !was.current && !m.reduced) {
      scale.value = withSequence(withSpring(1.2, motion.spring.press), withSpring(1, motion.spring.pop));
    }
    was.current = done;
  }, [done, m.reduced, scale]);
  const tickStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const pressable = !!onPress && !done;
  return (
    <PressableScale
      onPress={pressable ? onPress : undefined}
      disabled={!pressable}
      scaleTo={0.98}
      style={styles.row}
      accessibilityRole={pressable ? "button" : "text"}
      accessibilityState={{ checked: done, disabled: !pressable }}
      accessibilityLabel={accessibilityLabel ?? title}
    >
      <Animated.View
        style={[styles.tick, done ? styles.tickDone : { borderColor: p.face }, tickStyle]}
        importantForAccessibility="no-hide-descendants"
      >
        <Ionicons name={done ? "checkmark" : icon} size={done ? 20 : 18} color={done ? palette.mint.on : p.face} />
      </Animated.View>
      <View style={styles.body}>
        <AppText
          variant="heading"
          numberOfLines={2}
          color={done ? colors.text.tertiary : colors.text.primary}
          style={done && styles.struck}
        >
          {title}
        </AppText>
        {subtitle && !done ? (
          <AppText variant="bodySmall" numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {xp && !done ? (
        <View style={styles.xp}>
          <Ionicons name="sparkles" size={12} color={palette.star.face} />
          <AppText variant="numeric" color={palette.star.face}>
            {xpLabel ?? `+${xp}`}
          </AppText>
        </View>
      ) : null}
      {pressable ? <Ionicons name="chevron-forward" size={16} color={colors.text.tertiary} /> : null}
    </PressableScale>
  );
}

const TICK = 40;

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 60, paddingVertical: spacing.sm },
  tick: {
    width: TICK,
    height: TICK,
    borderRadius: TICK / 2,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  tickDone: { backgroundColor: palette.mint.face, borderColor: palette.mint.slab },
  body: { flex: 1, minWidth: 0, gap: 2 },
  struck: { textDecorationLine: "line-through" },
  xp: { flexDirection: "row", alignItems: "center", gap: 2 },
});
