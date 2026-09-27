import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { motion } from "../../lib/design-system";
import { TarotCardBack } from "./TarotCardBack";
import { TarotCardFace } from "./TarotCardFace";

interface Props {
  cardId: string;
  reversed: boolean;
  width: number;
  height: number;
  /** Turn face-up (animates from the back). */
  revealed: boolean;
  /** Delay before this card turns, for a left-to-right reveal. */
  delay?: number;
  /** Fires as the card passes edge-on — the moment to play the flip sound. */
  onTurn?: () => void;
}

/**
 * A card that turns over in 3D: the back rotates away to edge-on, the face
 * rotates in from the other side. Opacity swaps at the midpoint too, so it
 * reads correctly on Android builds that ignore `backfaceVisibility`.
 */
export function TarotFlipCard({ cardId, reversed, width, height, revealed, delay = 0, onTurn }: Props) {
  const reduced = useReducedMotion();
  const p = useSharedValue(revealed ? 1 : 0);

  useEffect(() => {
    const target = revealed ? 1 : 0;
    if (p.value === target) return;
    if (reduced) {
      p.value = withTiming(target, { duration: motion.duration.fast });
      if (revealed) onTurn?.();
      return;
    }
    p.value = withDelay(delay, withSpring(target, motion.spring.gentle));
    if (revealed && onTurn) {
      const timer = setTimeout(onTurn, delay + 120);
      return () => clearTimeout(timer);
    }
  }, [revealed]); // eslint-disable-line react-hooks/exhaustive-deps

  const back = useAnimatedStyle(() => ({
    opacity: p.value < 0.5 ? 1 : 0,
    transform: [{ perspective: 900 }, { rotateY: `${interpolate(p.value, [0, 1], [0, 180])}deg` }],
  }));
  const face = useAnimatedStyle(() => ({
    opacity: p.value >= 0.5 ? 1 : 0,
    transform: [{ perspective: 900 }, { rotateY: `${interpolate(p.value, [0, 1], [-180, 0])}deg` }],
  }));

  return (
    <View style={{ width, height }}>
      <Animated.View style={[styles.side, back]}>
        <TarotCardBack width={width} height={height} />
      </Animated.View>
      <Animated.View style={[styles.side, face]}>
        <TarotCardFace cardId={cardId} reversed={reversed} width={width} height={height} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  side: {
    ...StyleSheet.absoluteFill,
    backfaceVisibility: "hidden",
  },
});
