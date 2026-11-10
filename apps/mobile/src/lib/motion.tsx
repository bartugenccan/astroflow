import React from "react";
import { StyleProp, ViewStyle } from "react-native";
import {
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  FadeOut,
  FadeOutDown,
  FadeOutUp,
  LinearTransition,
  ZoomIn,
  useReducedMotion,
  type WithSpringConfig,
} from "react-native-reanimated";
import { MotiView, type MotiTransitionProp, type TransitionConfig } from "moti";
import { motion } from "./design-system";

export type SpringName = keyof typeof motion.spring;

/** Reanimated `withSpring` config for a token (worklet-safe plain object). */
export function springOf(name: SpringName): WithSpringConfig {
  return { ...motion.spring[name] };
}

/**
 * rise — from below (blocks)      drop — from above (a pill)
 * pop  — scale in (rewards, ticks) fade — opacity only
 * next — from the right (the next step of a lesson)
 * ink  — a short sweep from the left (a line written on paper)
 */
type EnterKind = "rise" | "drop" | "pop" | "fade" | "next" | "ink";
type ExitKind = "sink" | "lift" | "fade";

/**
 * Reanimated layout-animation builders bound to the tokens. Entrances ride the
 * `enter` (or `pop`) spring; exits are short timed fades (`duration.exit`).
 * With reduce-motion on, everything becomes a quick cross-fade.
 */
export function enterAnim(kind: EnterKind = "rise", reduced = false, delay = 0) {
  if (reduced) return FadeIn.duration(motion.duration.fast);
  const s = kind === "pop" ? motion.spring.pop : motion.spring.enter;
  const builder =
    kind === "rise" ? FadeInDown : kind === "drop" ? FadeInUp : kind === "pop" ? ZoomIn : FadeIn;
  if (kind === "fade") return FadeIn.duration(motion.duration.base).delay(delay);
  if (kind === "ink") return FadeInLeft.duration(motion.duration.base).delay(delay);
  if (kind === "next") {
    return FadeInRight.springify().damping(s.damping).stiffness(s.stiffness).mass(s.mass).delay(delay);
  }
  return builder.springify().damping(s.damping).stiffness(s.stiffness).mass(s.mass).delay(delay);
}

/** Layout transition for siblings that move when a block grows, shrinks or leaves. */
export function layoutAnim(reduced = false) {
  if (reduced) return undefined;
  const s = motion.spring.enter;
  return LinearTransition.springify().damping(s.damping).stiffness(s.stiffness).mass(s.mass);
}

export function exitAnim(kind: ExitKind = "fade", reduced = false) {
  const d = reduced ? 120 : motion.duration.exit;
  if (kind === "sink") return FadeOutDown.duration(d);
  if (kind === "lift") return FadeOutUp.duration(d);
  return FadeOut.duration(d);
}

/**
 * Typed Moti transition. With RN 0.88 + Reanimated 4.7, Moti 0.30 infers its
 * animate prop as `any`, so a plain config literal no longer satisfies
 * `MotiTransitionProp` (the per-key index signature swallows `type`). The
 * config itself is still a valid TransitionConfig; this checks it against
 * that and hands Moti the type it expects. Runtime behaviour is unchanged.
 */
export function mt(config: TransitionConfig): MotiTransitionProp {
  return config as unknown as MotiTransitionProp;
}

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
      ? mt({ type: "timing", duration: motion.duration.fast, delay: 0 })
      : mt({ type: "spring", ...motion.spring[name], delay });

  /** Moti transition for a timed animation. */
  const timing = (duration: number = motion.duration.base, delay = 0) =>
    mt({
      type: "timing",
      duration: reduced ? Math.min(duration, motion.duration.fast) : duration,
      delay: reduced ? 0 : delay,
    });

  /**
   * Delay for the n-th block of a screen. Only the first few blocks stagger
   * (`motion.staggerMax`); later ones arrive together so a long screen never
   * drags in piece by piece.
   */
  const stagger = (index: number, base = 0) =>
    reduced ? 0 : base + Math.min(index, motion.staggerMax) * motion.stagger;

  /** `withSpring` config for a token; under reduce-motion a stiff, non-bouncy spring. */
  const springConfig = (name: SpringName = "enter"): WithSpringConfig =>
    reduced ? { damping: 40, stiffness: 400, mass: 1 } : springOf(name);

  return {
    reduced,
    spring,
    timing,
    stagger,
    springConfig,
    enter: (kind: EnterKind = "rise", delay = 0) => enterAnim(kind, reduced, delay),
    exit: (kind: ExitKind = "fade") => exitAnim(kind, reduced),
  };
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
      transition={m.spring("enter", m.stagger(index, delay))}
      style={style}
    >
      {children}
    </MotiView>
  );
}
