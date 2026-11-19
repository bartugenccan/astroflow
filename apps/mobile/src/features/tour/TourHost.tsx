import React, { useEffect, useRef, useState } from "react";
import { BackHandler, StyleSheet, useWindowDimensions, View, type ViewStyle } from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";
import Svg, { Defs, Mask, Rect } from "react-native-svg";
import { useRouter, useSegments, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AsterCameo } from "../../components/ui/AsterCameo";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { AppText } from "../../components/ui/AppText";
import { useTranslation, type TranslationKey } from "../../i18n";
import { colors, motion, palette, radii, spacing } from "../../lib/design-system";
import { useMotion } from "../../lib/motion";
import { useAppStore } from "../../store/useAppStore";
import { useHintStore } from "../../store/useHintStore";
import { useMascotStore } from "../../store/useMascotStore";
import { useTourStore } from "../../store/useTourStore";
import { useUiStore } from "../../store/useUiStore";
import { track } from "../../services/analytics";
import { tourTarget, type TourRect, type TourTargetId } from "./tourTargets";

type StepKey = "aster" | "quests" | "manifest" | "sky" | "tarot" | "notifications" | "end";

interface TourStep {
  key: StepKey;
  /** The tab the step happens on. */
  route: string;
  /** What gets the spotlight; null = Aster alone, centred. */
  target: TourTargetId | null;
}

/** Short on purpose: seven stops, one line each. */
const STEPS: TourStep[] = [
  { key: "aster", route: "/(tabs)", target: "today.aster" },
  { key: "quests", route: "/(tabs)", target: "today.quests" },
  { key: "manifest", route: "/(tabs)/manifest", target: "tab:manifest" },
  { key: "sky", route: "/(tabs)/sky", target: "tab:sky" },
  { key: "tarot", route: "/(tabs)/tarot", target: "tab:tarot" },
  { key: "notifications", route: "/(tabs)/profile", target: "profile.notifications" },
  { key: "end", route: "/(tabs)/profile", target: null },
];

const TEXT: Record<Exclude<StepKey, "aster">, TranslationKey> = {
  quests: "tour.steps.quests",
  manifest: "tour.steps.manifest",
  sky: "tour.steps.sky",
  tarot: "tour.steps.tarot",
  notifications: "tour.steps.notifications",
  end: "tour.steps.end",
};

/** The tabs must have been calm this long before the tour starts. */
const START_DELAY_MS = 1500;
/** How often a step looks for its target, and for how long before it goes on without the spotlight. */
const POLL_MS = 120;
const FIND_TIMEOUT_MS = 1600;
/** After scrolling a target into view, before measuring it. */
const REVEAL_SETTLE_MS = 450;
/** Room around the spotlighted target, and the card's distance from it. */
const HOLE_PAD = 8;
const CARD_GAP = 16;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Aster's app tour: once after onboarding (and once for existing users after
 * the update that brought it), replayable from Profile. Seven short stops —
 * Aster, today's goals, the Manifest / Sky / Tarot tabs, notifications in
 * Profile, goodbye — each a dimmed screen with a spotlight on the real thing
 * and Aster explaining it in one line.
 *
 * Built to fail safe: it starts only on the tabs when nothing else is on
 * screen (no sheet, no celebration), marks itself shown as it starts (a kill
 * halfway never makes it loop), and a step whose target can't be found or
 * measured still shows its line, just without the spotlight. Next and Skip
 * are always there; Android back skips. The dim swallows every touch, so the
 * user can't wander off mid-tour. Under Reduce Motion it only fades.
 */
export function TourHost() {
  const { t } = useTranslation();
  const router = useRouter();
  const segments = useSegments();
  const { reduced } = useMotion();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const hydrated = useTourStore((s) => s.hydrated);
  const status = useTourStore((s) => s.status);
  const queueTour = useTourStore((s) => s.queue);
  const markShown = useTourStore((s) => s.markShown);
  const hasOnboarded = useAppStore((s) => s.hasOnboarded);
  const sheetOpen = useUiStore((s) => s.sheetOpen);
  const celebrating = useMascotStore((s) => s.queue.length > 0);
  const stage = useMascotStore((s) => s.state?.stage ?? 0);

  /** The running step, or null when the tour isn't on screen. */
  const [step, setStep] = useState<number | null>(null);
  const [hole, setHole] = useState<TourRect | null>(null);
  /** The step's target has been found (or given up on): show its card. */
  const [ready, setReady] = useState(false);
  const stepRef = useRef<number | null>(null);
  stepRef.current = step;

  // Never decided yet (a new user right after onboarding, or an existing user
  // on the first launch with the tour): queue it once.
  useEffect(() => {
    if (hydrated && hasOnboarded && status === null) queueTour();
  }, [hydrated, hasOnboarded, status, queueTour]);

  // Start on the tabs, once nothing else has been on screen for a moment.
  const calm =
    hydrated && status === "pending" && step === null && segments[0] === "(tabs)" && !sheetOpen && !celebrating;
  useEffect(() => {
    if (!calm) return;
    const timer = setTimeout(() => {
      markShown();
      setStep(0);
    }, START_DELAY_MS);
    return () => clearTimeout(timer);
  }, [calm, markShown]);

  // Each step: go to its tab, find the target, bring it into view, measure.
  useEffect(() => {
    if (step === null) return;
    const current = STEPS[step];
    let cancelled = false;
    setReady(false);
    setHole(null);
    router.navigate(current.route as Href);
    track("tour_step_viewed", { step: current.key });
    (async () => {
      if (current.target) {
        const deadline = Date.now() + FIND_TIMEOUT_MS;
        let revealed = false;
        while (!cancelled && Date.now() < deadline) {
          await wait(POLL_MS);
          const target = tourTarget(current.target);
          if (!target) continue;
          if (!revealed) {
            revealed = true;
            target.reveal(!reduced);
            await wait(REVEAL_SETTLE_MS);
          }
          const rect = await target.measure();
          // Inactive tabs are detached and report nothing (or a stale rect off
          // screen) until they're shown: keep looking.
          if (rect && rect.y < height && rect.y + rect.height > 0) {
            if (!cancelled) setHole(padded(rect, width, height));
            break;
          }
        }
      } else {
        await wait(POLL_MS);
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // Only a new step re-runs this; the rest is read as of that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const finish = (skipped: boolean) => {
    const current = stepRef.current;
    if (current === null) return;
    if (skipped) track("tour_skipped", { step: STEPS[current].key });
    else track("tour_completed");
    // The tour already told them to tap Aster: retire the tap coach mark.
    useHintStore.getState().markSeen("asterTap");
    setStep(null);
    setHole(null);
    setReady(false);
  };

  // Android back skips the tour instead of leaving the tab underneath.
  useEffect(() => {
    if (step === null) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      finish(true);
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step === null]);

  if (step === null) return null;

  const current = STEPS[step];
  const last = step === STEPS.length - 1;
  const text = current.key === "aster" ? t(stage === 0 ? "tour.steps.asterEgg" : "tour.steps.aster") : t(TEXT[current.key]);
  const next = () => (last ? finish(false) : setStep(step + 1));

  // The card goes where there is more room: under the target or above it.
  let placement: ViewStyle = { justifyContent: "center" };
  if (hole) {
    const below = height - (hole.y + hole.height);
    placement =
      below >= hole.y
        ? { justifyContent: "flex-start", paddingTop: hole.y + hole.height + CARD_GAP }
        : { justifyContent: "flex-end", paddingBottom: height - hole.y + CARD_GAP };
  }

  return (
    <Animated.View
      entering={FadeIn.duration(motion.duration.base)}
      exiting={FadeOut.duration(motion.duration.exit)}
      style={styles.root}
      accessibilityViewIsModal
      accessibilityLabel={t("tour.overlayA11y")}
    >
      <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <Mask id="tourHole" maskUnits="userSpaceOnUse" x={0} y={0} width={width} height={height}>
            <Rect x={0} y={0} width={width} height={height} fill="white" />
            {hole ? (
              <Rect x={hole.x} y={hole.y} width={hole.width} height={hole.height} rx={radii.lg} fill="black" />
            ) : null}
          </Mask>
        </Defs>
        <Rect x={0} y={0} width={width} height={height} fill={colors.overlay.tour} mask="url(#tourHole)" />
        {hole ? (
          <Rect
            x={hole.x}
            y={hole.y}
            width={hole.width}
            height={hole.height}
            rx={radii.lg}
            fill="none"
            stroke={palette.star.face}
            strokeWidth={3}
          />
        ) : null}
      </Svg>

      <View
        pointerEvents="box-none"
        style={[
          styles.cardArea,
          { paddingLeft: insets.left + spacing.lg, paddingRight: insets.right + spacing.lg },
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg },
          placement,
        ]}
      >
        {ready ? (
          <Animated.View
            key={current.key}
            entering={reduced ? FadeIn.duration(motion.duration.fast) : FadeInDown.duration(motion.duration.base)}
            accessibilityLiveRegion="polite"
          >
            <ChunkyCard style={styles.card}>
              <AsterCameo text={text} size={56} action="talk" />
              <View style={styles.footer}>
                <View
                  style={styles.dots}
                  accessible
                  accessibilityLabel={t("tour.stepA11y", { n: step + 1, total: STEPS.length })}
                >
                  {STEPS.map((s, i) => (
                    <View key={s.key} style={[styles.dot, i === step ? styles.dotOn : null]} />
                  ))}
                </View>
                {!last ? (
                  <ChunkyButton
                    label={t("tour.skip")}
                    onPress={() => finish(true)}
                    variant="ghost"
                    size="sm"
                    uppercase={false}
                    haptic="none"
                  />
                ) : null}
                <ChunkyButton
                  label={last ? t("tour.done") : t("tour.next")}
                  onPress={next}
                  variant="primary"
                  size="sm"
                />
              </View>
            </ChunkyCard>
          </Animated.View>
        ) : null}
      </View>
    </Animated.View>
  );
}

/** The target's rect with breathing room, kept on screen. */
function padded(rect: TourRect, width: number, height: number): TourRect {
  const x = Math.max(0, rect.x - HOLE_PAD);
  const y = Math.max(0, rect.y - HOLE_PAD);
  return {
    x,
    y,
    width: Math.min(width - x, rect.width + HOLE_PAD * 2),
    height: Math.min(height - y, rect.height + HOLE_PAD * 2),
  };
}

const styles = StyleSheet.create({
  root: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: 1000, elevation: 1000 },
  cardArea: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
  card: { gap: spacing.md },
  footer: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dots: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.xs },
  dot: { width: 8, height: 8, borderRadius: radii.pill, backgroundColor: colors.border.chunky },
  dotOn: { width: 18, backgroundColor: palette.star.face },
});
