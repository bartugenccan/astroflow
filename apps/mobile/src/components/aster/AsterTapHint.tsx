import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../ui/AppText";
import { palette, radii, spacing } from "../../lib/design-system";

interface Props {
  /** Diameter of the ring that pulses out from behind Aster. */
  size: number;
  label: string;
  /** Pause the loops when the screen is off (another tab, app in background). */
  active?: boolean;
  /**
   * Which layer to draw: the ring goes before Aster (behind it), the pill
   * after Aster (on top). Render the component twice, one per layer.
   */
  part: "ring" | "pill";
}

/**
 * "Tap me" coach mark for Aster: a gold ring breathing out from behind the
 * mascot (Aster is luminous, so a glow is allowed) and a chunky pill with a
 * pointing hand that nudges up and down. Purely visual — the parent owns the
 * press and decides when the hint is gone. With reduce-motion on, both stay
 * still and the pill alone carries the message.
 */
export function AsterTapHint({ size, label, active = true, part }: Props) {
  const reduced = useReducedMotion();
  const ring = useSharedValue(0);
  const nudge = useSharedValue(0);

  useEffect(() => {
    if (reduced || !active) {
      cancelAnimation(ring);
      cancelAnimation(nudge);
      ring.value = 0;
      nudge.value = 0;
      return;
    }
    ring.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600, easing: Easing.out(Easing.cubic) }),
        withDelay(500, withTiming(0, { duration: 0 })),
      ),
      -1,
    );
    nudge.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 420, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 420, easing: Easing.inOut(Easing.quad) }),
        withDelay(900, withTiming(0, { duration: 0 })),
      ),
      -1,
    );
    return () => {
      cancelAnimation(ring);
      cancelAnimation(nudge);
    };
  }, [reduced, active, ring, nudge]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - ring.value),
    transform: [{ scale: 0.72 + 0.38 * ring.value }],
  }));
  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateY: nudge.value }] }));

  if (part === "ring") {
    return reduced ? null : (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            { width: size, height: size, borderRadius: size / 2, marginLeft: -size / 2, marginTop: -size / 2 },
            ringStyle,
          ]}
        />
    );
  }
  return (
      <Animated.View pointerEvents="none" style={[styles.pillWrap, pillStyle]}>
        <View style={styles.pill}>
          <Ionicons name="hand-left" size={14} color={palette.star.on} />
          <AppText variant="label" color={palette.star.on}>
            {label}
          </AppText>
        </View>
      </Animated.View>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: "absolute",
    left: "50%",
    top: "50%",
    borderWidth: 3,
    borderColor: palette.star.face,
    backgroundColor: palette.star.soft,
  },
  pillWrap: {
    position: "absolute",
    right: -spacing.sm,
    bottom: spacing.md,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    backgroundColor: palette.star.face,
    borderBottomWidth: 3,
    borderBottomColor: palette.star.slab,
  },
});
