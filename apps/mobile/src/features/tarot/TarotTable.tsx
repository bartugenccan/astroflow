import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  Easing,
  SharedValue,
  cancelAnimation,
  runOnJS,
  runOnUI,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withDecay,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { AppText } from "../../components/ui/AppText";
import { GoldButton } from "../../components/ui/GoldButton";
import { TranslationKey, useTranslation } from "../../i18n";
import { colors, motion, radii, spacing } from "../../lib/design-system";
import type { TarotCategory, TarotDrawnCard } from "../../services/types";
import { TAROT_CARD_RATIO } from "./cardImages";
import { FAN_STEP_DEG, FAN_VISIBLE_DEG, SPREAD_SIZE, TAROT_DECK } from "./deck";
import { DeckState, dealAll, freshDeck, shufflePass } from "./shuffle";
import { TarotCardBack } from "./TarotCardBack";
import type { TarotSounds } from "./useTarotSounds";

type Mode = "stack" | "shuffle" | "fan" | "gone";

/** Every card of the deck is on the table. */
const CARD_COUNT = TAROT_DECK.length;
/** Rotation that brings the last card to 12 o'clock (the first sits there at 0). */
const MAX_SPIN = (CARD_COUNT - 1) * FAN_STEP_DEG;
/** Riffle timings (ms). One cycle = split + merge + per-card stagger + settle. */
const SPLIT_MS = 200;
const MERGE_MS = 220;
const STAGGER_MS = 3;
const SETTLE_MS = 120;
const CYCLE_MS = SPLIT_MS + MERGE_MS + CARD_COUNT * STAGGER_MS + SETTLE_MS;
/** Pause while the shuffled deck squares up before the hand opens. */
const GATHER_MS = 160;
/** When the hand has finished opening, it sways once to show that it turns. */
const NUDGE_DELAY_MS = 950;
const NUDGE_DEG = 16;
const RAD = 180 / Math.PI;

interface Geometry {
  width: number;
  height: number;
  cx: number;
  /** Card size in the hand. */
  W: number;
  H: number;
  /** Distance from a card's centre down to the shared pivot. */
  R: number;
  pivotY: number;
  topRadius: number;
  lift: number;
  /** Where a card sits (centre) before any transform. */
  baseLeft: number;
  baseTop: number;
  stackY: number;
  slotScale: number;
  slotW: number;
  slotH: number;
  slotCx: number[];
  slotCy: number;
}

function geometry(width: number): Geometry {
  const H = Math.max(100, Math.min(136, width * 0.34));
  const W = H * TAROT_CARD_RATIO;
  const pivotExtra = H * 0.18;
  const R = H / 2 + pivotExtra;
  const slotScale = 0.82;
  const slotW = W * slotScale;
  const slotH = H * slotScale;
  const slotsHeight = slotH + 28;
  const lift = 26;
  const topRadius = R + H / 2;
  const pivotY = slotsHeight + spacing.xl + lift + topRadius;
  const cx = width / 2;
  const gap = spacing.lg;
  return {
    width,
    // Cards turned towards 90° lie almost flat, reaching half a card below the pivot.
    height: pivotY + W / 2 + spacing.sm,
    cx,
    W,
    H,
    R,
    pivotY,
    topRadius,
    lift,
    baseLeft: cx - W / 2,
    baseTop: pivotY - R - H / 2,
    stackY: -H * 0.22,
    slotScale,
    slotW,
    slotH,
    slotCx: [cx - slotW - gap, cx, cx + slotW + gap],
    slotCy: slotH / 2,
  };
}

/** Angle of card `i` in the open fan, given how far the fan is turned. */
const fanAngle = (i: number, spin: number) => {
  "worklet";
  return i * FAN_STEP_DEG - spin;
};

/** 1 when on screen, fading to 0 as the card turns past `FAN_VISIBLE_DEG` towards 90°. */
const visibility = (angle: number) => {
  "worklet";
  const a = Math.abs(angle);
  if (a <= FAN_VISIBLE_DEG) return 1;
  return Math.max(0, (90 - a) / (90 - FAN_VISIBLE_DEG));
};

/** Paint order in the open fan: the card at 12 o'clock on top, falling away to both sides. */
const fanZ = (angle: number) => {
  "worklet";
  return 1000 - Math.round(Math.abs(angle) * 4);
};

interface Props {
  category: TarotCategory;
  sounds: TarotSounds;
  onComplete: (cards: TarotDrawnCard[]) => void;
  onChangeTheme: () => void;
}

/**
 * The reading table: the full 78-card deck riffles while "Shuffle" runs (with
 * the card sound looping) and, on "Stop", opens into a hand fan — every card
 * pivoting on one point at the bottom so their feet stay together while their
 * tops spread. The whole deck is in the hand, so the fan is wider than the
 * screen: dragging sideways turns it around the pivot, the card at 12 o'clock
 * rises, and tapping any card draws it into the next of the three slots.
 */
export function TarotTable({ category, sounds, onComplete, onChangeTheme }: Props) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [g, setG] = useState<Geometry | null>(null);
  const [mode, setMode] = useState<Mode>("stack");
  const [picks, setPicks] = useState<number[]>([]);
  /** The reader has turned the fan themselves — the hand hint can go. */
  const [hasSpun, setHasSpun] = useState(false);
  /** Cards turned out of view on each side. */
  const [hidden, setHidden] = useState({ left: 0, right: 0 });

  const deck = useRef<DeckState>(freshDeck());
  const fan = useRef<TarotDrawnCard[]>([]);
  const picksRef = useRef<number[]>([]);
  const shuffleTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  /** How far the fan is turned (degrees); the middle card starts at 12 o'clock. */
  const spin = useSharedValue(MAX_SPIN / 2);
  const spinStart = useSharedValue(0);
  const spunOnce = useSharedValue(false);
  const picked = useSharedValue<number[]>([]);
  const fanOpen = useSharedValue(0);
  /** The card currently at 12 o'clock (raised), or -1 while the fan is closed. */
  const focused = useDerivedValue(() =>
    fanOpen.value === 1 ? Math.round(Math.min(Math.max(spin.value, 0), MAX_SPIN) / FAN_STEP_DEG) : -1,
  );

  useEffect(() => {
    picked.value = picks;
  }, [picks, picked]);

  useEffect(() => {
    fanOpen.value = mode === "fan" && picks.length < SPREAD_SIZE ? 1 : 0;
  }, [mode, picks.length, fanOpen]);

  useEffect(
    () => () => {
      if (shuffleTimer.current) clearInterval(shuffleTimer.current);
      timers.current.forEach(clearTimeout);
      sounds.stopShuffle();
    },
    // Unmount-only cleanup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    setG((prev) => (prev && prev.width === w ? prev : geometry(w)));
  }, []);

  const startShuffle = useCallback(() => {
    deck.current = shufflePass(deck.current);
    setMode("shuffle");
    sounds.startShuffle();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    shuffleTimer.current = setInterval(() => {
      deck.current = shufflePass(deck.current);
      Haptics.selectionAsync();
    }, CYCLE_MS);
  }, [sounds]);

  const stopShuffle = useCallback(() => {
    if (shuffleTimer.current) clearInterval(shuffleTimer.current);
    shuffleTimer.current = null;
    sounds.stopShuffle();
    fan.current = dealAll(deck.current);
    const center = MAX_SPIN / 2;
    spin.value = center;
    if (!reduced) {
      // Once the hand is open, sway it one way, then the other, and back to centre.
      const ease = { easing: Easing.inOut(Easing.quad) };
      spin.value = withDelay(
        NUDGE_DELAY_MS,
        withSequence(
          withTiming(center + NUDGE_DEG, { duration: 500, ...ease }),
          withTiming(center - NUDGE_DEG, { duration: 800, ...ease }),
          withTiming(center, { duration: 500, ...ease }),
        ),
      );
    }
    setMode("fan");
    sounds.playFan();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [sounds, spin, reduced]);

  const pick = useCallback(
    (index: number) => {
      const prev = picksRef.current;
      if (prev.length >= SPREAD_SIZE || prev.includes(index)) return;
      const next = [...prev, index];
      picksRef.current = next;
      setPicks(next);
      sounds.playPick();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (next.length === SPREAD_SIZE) {
        const drawn = next.map((i) => fan.current[i]);
        timers.current.push(
          setTimeout(() => setMode("gone"), 650),
          setTimeout(() => onComplete(drawn), reduced ? 900 : 1300),
        );
      }
    },
    [sounds, onComplete, reduced],
  );

  const focusTick = useCallback(() => {
    Haptics.selectionAsync();
  }, []);

  // A light tick each time a new card passes 12 o'clock while the fan turns.
  useAnimatedReaction(
    () => focused.value,
    (cur, prev) => {
      if (cur >= 0 && prev !== null && prev >= 0 && cur !== prev) runOnJS(focusTick)();
    },
  );

  // Live "cards out of view" counts — updates only when a card crosses the edge.
  const onHidden = useCallback((packed: number) => {
    setHidden({ left: Math.floor(packed / 1000), right: packed % 1000 });
  }, []);

  useAnimatedReaction(
    () => {
      const s = spin.value;
      const left = Math.max(0, Math.ceil((s - FAN_VISIBLE_DEG) / FAN_STEP_DEG));
      const right = Math.max(0, CARD_COUNT - 1 - Math.floor((s + FAN_VISIBLE_DEG) / FAN_STEP_DEG));
      return left * 1000 + right;
    },
    (packed, prev) => {
      if (packed !== prev) runOnJS(onHidden)(packed);
    },
  );

  const gesture = useMemo(() => {
    if (!g) return Gesture.Tap().enabled(false);

    /** The top-most card under the finger (as painted), or -1. */
    const hitTest = (x: number, y: number): number => {
      "worklet";
      if (fanOpen.value !== 1) return -1;
      const dx = x - g.cx;
      const dy = g.pivotY - y; // up is positive
      const angle = Math.atan2(dx, dy) * RAD;
      const s = spin.value;
      const reach = Math.atan2(g.W / 2, g.R - g.H / 2) * RAD + FAN_STEP_DEG;
      const from = Math.max(0, Math.floor((angle + s - reach) / FAN_STEP_DEG));
      const to = Math.min(CARD_COUNT - 1, Math.ceil((angle + s + reach) / FAN_STEP_DEG));
      let best = -1;
      let bestZ = -1;
      for (let i = from; i <= to; i++) {
        if (picked.value.includes(i)) continue;
        const a = fanAngle(i, s);
        if (visibility(a) < 0.5) continue;
        // The point in the card's own frame (x along its width, y up its length from the pivot).
        const r = a / RAD;
        const lx = dx * Math.cos(r) - dy * Math.sin(r);
        const ly = dx * Math.sin(r) + dy * Math.cos(r);
        const top = g.R + g.H / 2 + (i === focused.value ? g.lift : 0);
        if (Math.abs(lx) <= g.W / 2 && ly >= g.R - g.H / 2 && ly <= top) {
          const z = i === focused.value ? 2000 : fanZ(a);
          if (z > bestZ) {
            bestZ = z;
            best = i;
          }
        }
      }
      return best;
    };

    const toDegrees = 1 / g.topRadius;
    const pan = Gesture.Pan()
      .minDistance(6)
      .onBegin(() => {
        // Touching a turning fan stops it, like a hand on the cards.
        cancelAnimation(spin);
        spinStart.value = spin.value;
      })
      .onUpdate((e) => {
        if (fanOpen.value !== 1) return;
        const turned = e.translationX * toDegrees * RAD;
        spin.value = Math.min(Math.max(spinStart.value - turned, 0), MAX_SPIN);
        if (!spunOnce.value && Math.abs(turned) > 4) {
          spunOnce.value = true;
          runOnJS(setHasSpun)(true);
        }
      })
      .onEnd((e) => {
        if (fanOpen.value !== 1 || reduced) return;
        spin.value = withDecay({
          velocity: -e.velocityX * toDegrees * RAD,
          deceleration: 0.996,
          clamp: [0, MAX_SPIN],
        });
      });
    const tap = Gesture.Tap().onEnd((e) => {
      const idx = hitTest(e.x, e.y);
      if (idx >= 0) runOnJS(pick)(idx);
    });
    return Gesture.Race(pan, tap);
  }, [g, fanOpen, spin, spinStart, spunOnce, picked, focused, pick, reduced]);

  const inHand = mode === "fan" || mode === "gone";
  const choosing = mode === "fan" && picks.length < SPREAD_SIZE;
  const positions = [0, 1, 2].map((i) =>
    t(`tarot.positions.${category}.p${i}` as TranslationKey),
  );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <AppText variant="heading" center>
          {inHand ? t("tarot.pickTitle") : t("tarot.deckTitle")}
        </AppText>
        <AppText variant="bodySmall" center color={colors.text.tertiary}>
          {inHand
            ? t("tarot.pickCount", { n: picks.length })
            : mode === "shuffle"
              ? t("tarot.shuffling")
              : t("tarot.deckHint")}
        </AppText>
      </View>

      <GestureDetector gesture={gesture}>
        <View onLayout={onLayout} style={[styles.table, g && { height: g.height }]}>
          {g ? (
            <>
              <Slots g={g} visible={inHand} labels={positions} picks={picks.length} />
              {Array.from({ length: CARD_COUNT }).map((_, i) => (
                <FanCard
                  key={i}
                  index={i}
                  g={g}
                  mode={mode}
                  slot={picks.indexOf(i)}
                  spin={spin}
                  focused={focused}
                  reduced={reduced}
                />
              ))}
              <SpinHint g={g} visible={choosing && !hasSpun} reduced={reduced} label={t("tarot.spinHint")} />
              <SideCounter g={g} side="left" count={hidden.left} visible={choosing} reduced={reduced} />
              <SideCounter g={g} side="right" count={hidden.right} visible={choosing} reduced={reduced} />
            </>
          ) : null}
        </View>
      </GestureDetector>

      <View style={styles.actions}>
        {mode === "stack" ? (
          <>
            <GoldButton label={t("tarot.shuffle")} onPress={startShuffle} />
            <GoldButton label={t("tarot.changeTheme")} variant="ghost" onPress={onChangeTheme} />
          </>
        ) : mode === "shuffle" ? (
          <GoldButton label={t("tarot.stop")} onPress={stopShuffle} />
        ) : choosing ? (
          <AppText variant="bodySmall" center color={colors.text.secondary}>
            {t("tarot.pickHint")}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

// ── The three slots the drawn cards fly into ──────────────────────────────────

function Slots({
  g,
  visible,
  labels,
  picks,
}: {
  g: Geometry;
  visible: boolean;
  labels: string[];
  picks: number;
}) {
  const shown = useSharedValue(0);
  useEffect(() => {
    shown.value = withTiming(visible ? 1 : 0, { duration: motion.duration.base });
  }, [visible, shown]);
  const style = useAnimatedStyle(() => ({ opacity: shown.value }));

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      {g.slotCx.map((x, i) => (
        <View
          key={i}
          style={[
            styles.slot,
            {
              left: x - g.slotW / 2,
              top: 0,
              width: g.slotW,
              height: g.slotH,
              borderColor: i === picks ? colors.gold[300] : colors.border.hairlineStrong,
            },
          ]}
        />
      ))}
      {g.slotCx.map((x, i) => (
        <View
          key={`l${i}`}
          style={[styles.slotLabel, { left: x - g.slotW / 2 - 12, top: g.slotH + 6, width: g.slotW + 24 }]}
        >
          <AppText variant="label" center numberOfLines={1} color={i < picks ? colors.text.gold : colors.text.tertiary}>
            {labels[i]}
          </AppText>
        </View>
      ))}
    </Animated.View>
  );
}

// ── "The deck turns" cues ─────────────────────────────────────────────────────

/** A hand gliding along the fan until the reader turns it for the first time. */
function SpinHint({
  g,
  visible,
  reduced,
  label,
}: {
  g: Geometry;
  visible: boolean;
  reduced: boolean;
  label: string;
}) {
  const shown = useSharedValue(0);
  const glide = useSharedValue(0);

  useEffect(() => {
    // Appears after the opening sway, so it doesn't compete with it.
    shown.value = visible
      ? withDelay(reduced ? 0 : NUDGE_DELAY_MS + 600, withTiming(1, { duration: motion.duration.slow }))
      : withTiming(0, { duration: motion.duration.base });
  }, [visible, reduced, shown]);

  useEffect(() => {
    if (reduced || !visible) {
      cancelAnimation(glide);
      glide.value = 0;
      return;
    }
    const ease = { duration: 900, easing: Easing.inOut(Easing.sin) };
    glide.value = withRepeat(withSequence(withTiming(1, ease), withTiming(-1, ease)), -1);
  }, [visible, reduced, glide]);

  const wrapStyle = useAnimatedStyle(() => ({ opacity: shown.value }));
  const handStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: glide.value * 36 }, { rotate: `${glide.value * 12}deg` }],
  }));

  const size = 132;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.hint,
        { left: g.cx - size / 2, top: g.pivotY - g.R - g.H * 0.15, width: size },
        wrapStyle,
      ]}
    >
      <View style={styles.hintRow}>
        <Ionicons name="chevron-back" size={16} color={colors.gold[200]} />
        <Animated.View style={[styles.hand, handStyle]}>
          <Ionicons name="hand-left-outline" size={26} color={colors.gold[100]} />
        </Animated.View>
        <Ionicons name="chevron-forward" size={16} color={colors.gold[200]} />
      </View>
      <AppText variant="bodySmall" center color={colors.gold[100]} style={styles.hintText}>
        {label}
      </AppText>
    </Animated.View>
  );
}

/** "‹ 23 cards" / "23 cards ›" — how much of the deck is turned out of view on that side. */
function SideCounter({
  g,
  side,
  count,
  visible,
  reduced,
}: {
  g: Geometry;
  side: "left" | "right";
  count: number;
  visible: boolean;
  reduced: boolean;
}) {
  const { t } = useTranslation();
  const shown = useSharedValue(0);
  const breathe = useSharedValue(0);
  const active = visible && count > 0;

  useEffect(() => {
    // At the very start/end of the deck the side dims instead of vanishing.
    shown.value = withTiming(active ? 1 : visible ? 0.25 : 0, { duration: motion.duration.base });
  }, [active, visible, shown]);

  useEffect(() => {
    if (reduced || !active) {
      cancelAnimation(breathe);
      breathe.value = 0;
      return;
    }
    breathe.value = withRepeat(withTiming(1, { duration: 700, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [active, reduced, breathe]);

  const wrapStyle = useAnimatedStyle(() => ({ opacity: shown.value }));
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: breathe.value * (side === "left" ? -3 : 3) }],
  }));

  const arrow = (
    <Animated.View style={arrowStyle}>
      <Ionicons name={side === "left" ? "chevron-back" : "chevron-forward"} size={14} color={colors.gold[300]} />
    </Animated.View>
  );

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.counter, side === "left" ? { left: 0 } : { right: 0 }, { top: g.pivotY + 4 }, wrapStyle]}
    >
      {side === "left" ? arrow : null}
      <AppText variant="bodySmall" color={colors.text.secondary}>
        {t("tarot.cardsLeft", { n: count })}
      </AppText>
      {side === "right" ? arrow : null}
    </Animated.View>
  );
}

// ── One card of the deck / fan ────────────────────────────────────────────────

interface FanCardProps {
  index: number;
  g: Geometry;
  mode: Mode;
  /** Slot this card was drawn into, or -1. */
  slot: number;
  spin: SharedValue<number>;
  focused: SharedValue<number>;
  reduced: boolean;
}

const FanCard = React.memo(function FanCard({ index, g, mode, slot, spin, focused, reduced }: FanCardProps) {
  // Resting offset in the deck so the 78 cards read as one thick pile.
  const pileX = index * 0.08;
  const pileY = g.stackY - index * 0.16;

  const x = useSharedValue(pileX);
  const y = useSharedValue(pileY);
  /** Extra rotation: the riffle tilt, or the angle a drawn card leaves the fan at. */
  const tilt = useSharedValue(0);
  /** 0 = in the pile, 1 = at its place in the open fan. */
  const open = useSharedValue(0);
  const lift = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const drawn = slot >= 0;

  useEffect(() => {
    if (drawn) return;
    const spring = motion.spring.snappy;
    if (mode === "stack") {
      x.value = withSpring(pileX, spring);
      y.value = withSpring(pileY, spring);
      tilt.value = withSpring(0, spring);
    } else if (mode === "shuffle") {
      if (reduced) return;
      // Left and right halves split, then riffle back together card by card.
      const side = index % 2 === 0 ? -1 : 1;
      const tail = (CARD_COUNT - index) * STAGGER_MS + SETTLE_MS;
      const riffle = (split: number, rest: number) =>
        withRepeat(
          withSequence(
            withTiming(split, { duration: SPLIT_MS }),
            withDelay(index * STAGGER_MS, withTiming(rest, { duration: MERGE_MS })),
            withDelay(tail, withTiming(rest, { duration: 1 })),
          ),
          -1,
        );
      x.value = riffle(side * g.W * 0.62, pileX);
      tilt.value = riffle(side * -8, 0);
      y.value = riffle(pileY - 10, pileY);
    } else if (mode === "fan") {
      cancelAnimation(x);
      cancelAnimation(y);
      cancelAnimation(tilt);
      // Only the cards that open on screen sweep out; the rest are placed at once.
      const startAngle = fanAngle(index, MAX_SPIN / 2);
      const onScreen = Math.abs(startAngle) < 90;
      if (reduced) {
        x.value = withTiming(0, { duration: motion.duration.fast });
        y.value = withTiming(0, { duration: motion.duration.fast });
        tilt.value = 0;
        open.value = withTiming(1, { duration: motion.duration.fast });
        return;
      }
      // Square the deck up, then open the hand from left to right.
      const order = onScreen ? Math.round((startAngle + 90) / FAN_STEP_DEG) : 0;
      const delay = order * 8;
      x.value = withSequence(withTiming(0, { duration: GATHER_MS }), withDelay(delay, withSpring(0, spring)));
      y.value = withSequence(withTiming(pileY, { duration: GATHER_MS }), withDelay(delay, withSpring(0, spring)));
      tilt.value = withTiming(0, { duration: GATHER_MS });
      open.value = onScreen
        ? withDelay(GATHER_MS + delay, withSpring(1, motion.spring.gentle))
        : withDelay(GATHER_MS, withTiming(1, { duration: 0 }));
    } else if (mode === "gone") {
      y.value = withTiming(g.H * 1.2, { duration: reduced ? motion.duration.fast : motion.duration.slow });
      opacity.value = withTiming(0, { duration: reduced ? motion.duration.fast : motion.duration.slow });
    }
  }, [mode, drawn]); // eslint-disable-line react-hooks/exhaustive-deps

  // Drawn: leave the fan at its current angle and fly up into the slot, upright.
  useEffect(() => {
    if (!drawn) return;
    const tx = g.slotCx[slot] - g.cx;
    const ty = g.slotCy - (g.pivotY - g.R);
    const target = g.slotScale;
    runOnUI(() => {
      "worklet";
      const from = open.value * fanAngle(index, spin.value);
      cancelAnimation(x);
      cancelAnimation(y);
      cancelAnimation(tilt);
      cancelAnimation(open);
      open.value = 0;
      tilt.value = from;
      lift.value = withTiming(0, { duration: motion.duration.fast });
      if (reduced) {
        const quick = { duration: motion.duration.fast };
        x.value = withTiming(tx, quick);
        y.value = withTiming(ty, quick);
        tilt.value = withTiming(0, quick);
        scale.value = withTiming(target, quick);
      } else {
        x.value = withSpring(tx, motion.spring.mystic);
        y.value = withSpring(ty, motion.spring.mystic);
        tilt.value = withSpring(0, motion.spring.mystic);
        scale.value = withSpring(target, motion.spring.mystic);
      }
    })();
  }, [drawn]); // eslint-disable-line react-hooks/exhaustive-deps

  // The card at 12 o'clock rises out of the hand.
  useAnimatedReaction(
    () => focused.value === index && open.value > 0.99,
    (isFocused, was) => {
      if (isFocused === was || slot >= 0) return;
      lift.value = reduced
        ? withTiming(isFocused ? g.lift : 0, { duration: motion.duration.fast })
        : withSpring(isFocused ? g.lift : 0, motion.spring.snappy);
    },
  );

  const style = useAnimatedStyle(() => {
    const angle = open.value * fanAngle(index, spin.value);
    const inFan = !drawn && open.value > 0;
    return {
      opacity: opacity.value * (inFan ? visibility(angle) : 1),
      zIndex: drawn ? 3000 + slot : focused.value === index && inFan ? 2000 : inFan ? fanZ(angle) : index,
      transform: [
        { translateX: x.value },
        { translateY: y.value },
        // Rotate about a point R below the card's centre — the shared pivot.
        { translateY: g.R },
        { rotate: `${tilt.value + angle}deg` },
        { translateY: -g.R },
        { translateY: -lift.value },
        { scale: scale.value * (1 + (lift.value / g.lift) * 0.06) },
      ],
    };
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.card, { left: g.baseLeft, top: g.baseTop, width: g.W, height: g.H }, style]}
    >
      <TarotCardBack width={g.W} height={g.H} />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  root: {
    gap: spacing.md,
  },
  header: {
    gap: spacing.xs,
    paddingHorizontal: spacing.xl,
  },
  table: {
    minHeight: 320,
    marginHorizontal: spacing.lg,
  },
  card: {
    position: "absolute",
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  slot: {
    position: "absolute",
    borderRadius: radii.sm,
    borderWidth: 1,
    borderStyle: "dashed",
    backgroundColor: "rgba(10,14,28,0.35)",
  },
  slotLabel: {
    position: "absolute",
  },
  hint: {
    position: "absolute",
    zIndex: 4000,
    alignItems: "center",
    gap: 2,
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: "rgba(6,8,16,0.72)",
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
  },
  hand: {
    width: 30,
    alignItems: "center",
  },
  hintText: {
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: "rgba(6,8,16,0.72)",
    overflow: "hidden",
  },
  counter: {
    position: "absolute",
    zIndex: 4000,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.ink[800],
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
  actions: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    minHeight: 56,
    justifyContent: "center",
  },
});
