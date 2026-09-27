import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { MotiView } from "moti";
import { motion } from "./design-system";

type SpringName = keyof typeof motion.spring;

/**
 * Motion helpers bound to the design-system tokens and the OS "Reduce Motion"
 * setting. With reduce-motion on, springs collapse to short fades and infinite
 * loops stay still — everything still *arrives*, it just doesn't travel.
 */
export function useMotion() {
  const reduced = useReducedMotion();

  /** Moti transition for a spring token (or a short fade when reduced). */
  const spring = (name: SpringName = "gentle", delay = 0) =>
    reduced
      ? ({ type: "timing", duration: motion.duration.fast, delay: 0 } as const)
      : ({ type: "spring", ...motion.spring[name], delay } as const);

  /** Moti transition for a timed animation. */
  const timing = (duration: number = motion.duration.base, delay = 0) =>
    ({
      type: "timing",
      duration: reduced ? Math.min(duration, motion.duration.fast) : duration,
      delay: reduced ? 0 : delay,
    }) as const;

  /** Delay for the n-th item of a staggered list (capped so long lists don't drag). */
  const stagger = (index: number, base = 0) =>
    reduced ? 0 : base + Math.min(index, 8) * motion.stagger;

  return { reduced, spring, timing, stagger };
}

interface EnterViewProps {
  children: React.ReactNode;
  /** Position in a staggered group — each step adds `motion.stagger` ms. */
  index?: number;
  /** Extra delay before the stagger starts. */
  delay?: number;
  /** Direction the element rises from. */
  from?: "below" | "above" | "none";
  /** Travel distance in px. */
  distance?: number;
  /** Start slightly smaller and settle at full size. */
  scale?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * The shared entrance: fade + short rise (+ optional scale settle) on the
 * `gentle` spring, staggered by `index`. Use it for every block that appears on
 * a screen so entrances feel like one system instead of ad-hoc timings.
 */
export function EnterView({
  children,
  index = 0,
  delay = 0,
  from = "below",
  distance = 14,
  scale = false,
  style,
}: EnterViewProps) {
  const m = useMotion();
  const dy = m.reduced || from === "none" ? 0 : from === "below" ? distance : -distance;
  const s0 = scale && !m.reduced ? 0.96 : 1;

  return (
    <MotiView
      from={{ opacity: 0, translateY: dy, scale: s0 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      transition={m.spring("gentle", m.stagger(index, delay))}
      style={style}
    >
      {children}
    </MotiView>
  );
}
