import { useEffect } from "react";
import {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { motion } from "../../lib/design-system";
import type { AsterAction } from "./types";

const EYE_RY = 9;
const sin = Easing.inOut(Easing.sin);

/**
 * All of Aster's motion, on the UI thread:
 *  - idle: slow breathing (scale) and floating (y), plus random blinks;
 *  - cheer: squash → stretch jump → squash landing, twice;
 *  - hatch: wobble with growing intensity, then a pop;
 *  - breathe: 4 s in · 4 s hold · 4 s out guided-breath loop;
 *  - talk: mouth flaps while idle-breathing.
 * Reduce-motion keeps Aster still (blinks and mouth included).
 */
export function useAsterMotion(action: AsterAction, playKey: number) {
  const reduced = useReducedMotion();
  const breath = useSharedValue(1);
  const floatY = useSharedValue(0);
  const jumpY = useSharedValue(0);
  const squashX = useSharedValue(1);
  const squashY = useSharedValue(1);
  const tilt = useSharedValue(0);
  const eyeRy = useSharedValue(EYE_RY);
  const mouthRy = useSharedValue(3);
  const glow = useSharedValue(0);

  // Ambient loops (breathing / floating) — or the guided breath.
  useEffect(() => {
    cancelAnimation(breath);
    cancelAnimation(floatY);
    if (reduced) {
      breath.value = 1;
      floatY.value = 0;
      return;
    }
    if (action === "breathe") {
      breath.value = 1;
      breath.value = withRepeat(
        withSequence(
          withTiming(1.22, { duration: 4000, easing: sin }),
          withTiming(1.22, { duration: 4000 }),
          withTiming(1, { duration: 4000, easing: sin }),
        ),
        -1,
      );
      floatY.value = withTiming(0, { duration: 300 });
      return;
    }
    const slow = action === "sleep";
    breath.value = withRepeat(
      withSequence(
        withTiming(slow ? 1.05 : 1.035, { duration: slow ? 2600 : 1600, easing: sin }),
        withTiming(1, { duration: slow ? 2600 : 1600, easing: sin }),
      ),
      -1,
    );
    floatY.value = slow
      ? withTiming(0, { duration: 400 })
      : withRepeat(
          withSequence(
            withTiming(-5, { duration: 2000, easing: sin }),
            withTiming(0, { duration: 2000, easing: sin }),
          ),
          -1,
        );
    return () => {
      cancelAnimation(breath);
      cancelAnimation(floatY);
    };
  }, [action, reduced, breath, floatY]);

  // One-shot actions, replayed whenever playKey changes.
  useEffect(() => {
    if (reduced) return;
    if (action === "cheer") {
      const hop = () =>
        withSequence(
          withTiming(0, { duration: 90 }),
          withTiming(-34, { duration: 230, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 210, easing: Easing.in(Easing.quad) }),
        );
      jumpY.value = withSequence(hop(), hop(), withSpring(0, motion.spring.squash));
      const squash = () =>
        withSequence(
          withTiming(0.84, { duration: 90 }),
          withTiming(1.12, { duration: 160 }),
          withTiming(1, { duration: 280 }),
        );
      squashY.value = withSequence(squash(), squash(), withSpring(1, motion.spring.squash));
      squashX.value = withSequence(
        withTiming(1.14, { duration: 90 }),
        withTiming(0.92, { duration: 160 }),
        withTiming(1, { duration: 280 }),
        withTiming(1.14, { duration: 90 }),
        withTiming(0.92, { duration: 160 }),
        withTiming(1, { duration: 280 }),
        withSpring(1, motion.spring.squash),
      );
      glow.value = withSequence(withTiming(1, { duration: 200 }), withDelay(600, withTiming(0, { duration: 500 })));
    } else if (action === "hatch") {
      const w = (deg: number, ms: number) =>
        withSequence(withTiming(deg, { duration: ms }), withTiming(-deg, { duration: ms * 2 }), withTiming(0, { duration: ms }));
      tilt.value = withSequence(w(6, 90), withDelay(250, w(9, 70)), withDelay(200, w(13, 55)));
      squashY.value = withDelay(
        1400,
        withSequence(withTiming(0.86, { duration: 120 }), withSpring(1, motion.spring.bouncy)),
      );
      glow.value = withDelay(1400, withSequence(withTiming(1, { duration: 160 }), withTiming(0, { duration: 700 })));
    }
  }, [action, playKey, reduced, jumpY, squashX, squashY, tilt, glow]);

  // Random blinks.
  useEffect(() => {
    if (reduced || action === "sleep") {
      eyeRy.value = EYE_RY;
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    const blink = () => {
      eyeRy.value = withSequence(
        withTiming(1, { duration: 70 }),
        withTiming(EYE_RY, { duration: 110 }),
      );
      timer = setTimeout(blink, 2200 + Math.random() * 3200);
    };
    timer = setTimeout(blink, 1200 + Math.random() * 1500);
    return () => clearTimeout(timer);
  }, [action, reduced, eyeRy]);

  // Talking mouth.
  useEffect(() => {
    cancelAnimation(mouthRy);
    if (action !== "talk" || reduced) {
      mouthRy.value = withTiming(3, { duration: 120 });
      return;
    }
    mouthRy.value = withRepeat(
      withSequence(withTiming(7, { duration: 140 }), withTiming(2.5, { duration: 160 })),
      -1,
    );
    return () => cancelAnimation(mouthRy);
  }, [action, reduced, mouthRy]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatY.value + jumpY.value },
      { rotate: `${tilt.value}deg` },
      { scaleX: breath.value * squashX.value },
      { scaleY: breath.value * squashY.value },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + glow.value * 0.65,
    transform: [{ scale: 0.9 + glow.value * 0.25 + (breath.value - 1) * 2 }],
  }));

  const eyeProps = useAnimatedProps(() => ({ ry: eyeRy.value }));
  const mouthProps = useAnimatedProps(() => ({ ry: mouthRy.value }));

  return { bodyStyle, glowStyle, eyeProps, mouthProps, reduced };
}
