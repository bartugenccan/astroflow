import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { AsterMascot } from "../../components/aster/AsterMascot";
import { AppText } from "../../components/ui/AppText";
import { Chip } from "../../components/ui/Chip";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { SpotlightModal } from "../../components/ui/SpotlightModal";
import { StarBurst } from "../intentions/StarBurst";
import { Celebration, tierOf, useMascotStore, NO_EQUIPPED } from "../../store/useMascotStore";
import { useAccountPromptStore } from "../../store/useAccountPromptStore";
import { useTranslation, TranslationKey } from "../../i18n";
import { haptics } from "../../lib/haptics";
import { useMotion } from "../../lib/motion";
import { colors, depth, motion, palette, radii, spacing, surface, Tone } from "../../lib/design-system";
import { milestoneLabel, stageName } from "./asterCopy";
import { unlockLines } from "./unlockCopy";
import { DiscoveryContent } from "./JourneyDiscovery";
import { ProtectAsterSheet } from "./ProtectAsterSheet";

/**
 * App-wide celebrations, fed by useMascotStore's queue, one at a time, in
 * three tiers (see `tierOf`):
 *
 *   pill   — everyday wins (Işık, a milestone, a shield, a manifest come true,
 *            the account linked): a small pill at the top. It never blocks the
 *            screen, leaves on its own, and a tap or an upward flick sends it off.
 *   moment — Aster hatching or growing a stage: the only full-screen beat. Short,
 *            and a tap anywhere continues.
 *   sheet  — a journey return: what Aster found, in a centred spotlight card.
 *
 * With reduce-motion on, entrances are plain fades and Aster holds still.
 * When the queue is empty and an account prompt is waiting (after a hatch, the
 * first journey, three days in orbit), Aster asks to be protected.
 */
export function CelebrationHost() {
  const router = useRouter();
  const current = useMascotStore((s) => s.queue[0]);
  const dismiss = useMascotStore((s) => s.dismiss);
  const promptOpen = useAccountPromptStore((s) => s.open);
  const closePrompt = useAccountPromptStore((s) => s.close);
  const offer = useAccountPromptStore((s) => s.offer);

  const done = useCallback(() => {
    const item = useMascotStore.getState().queue[0];
    dismiss();
    if (item?.type === "hatch") {
      const resting = useMascotStore.getState().state?.eclipse?.active ?? false;
      offer("hatch", { resting });
    }
  }, [dismiss, offer]);

  const tier = current ? tierOf(current.type) : null;

  return (
    <>
      {current && tier === "pill" ? <RewardPill key={current.id} item={current} onDone={done} /> : null}
      {current && tier === "moment" ? <GrowthMoment key={current.id} item={current} onDone={done} /> : null}
      {current && tier === "sheet" && current.journey ? (
        <JourneySheet
          key={current.id}
          item={current}
          onDone={done}
          onSeeInChart={(link) => {
            done();
            router.push(link as Href);
          }}
        />
      ) : null}
      <ProtectAsterSheet visible={!!promptOpen && !current} onClose={closePrompt} />
    </>
  );
}

// ─── Pill ─────────────────────────────────────────────────────────────────────

interface PillCopy {
  tone: Tone;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  long: boolean;
}

function pillCopy(item: Celebration, t: ReturnType<typeof useTranslation>["t"]): PillCopy {
  switch (item.type) {
    case "milestone":
      return {
        tone: "mint",
        icon: "trophy",
        title: t("aster.celebrate.milestoneTitle"),
        body: item.milestoneName ? milestoneLabel(t, item.milestoneName) : "",
        long: true,
      };
    case "shield":
      return {
        tone: "sky",
        icon: "shield-checkmark",
        title: t("aster.celebrate.shieldTitle"),
        body: t("aster.celebrate.shieldBody", { n: item.shieldsUsed ?? 1 }),
        long: true,
      };
    case "manifested":
      return {
        tone: "star",
        icon: "star",
        title: t("aster.celebrate.manifestedTitle"),
        body: item.wishText ? `“${item.wishText}”` : t("aster.celebrate.manifestedBody"),
        long: true,
      };
    case "accountLinked":
      return {
        tone: "mint",
        icon: "cloud-done",
        title: t("aster.celebrate.linkedTitle"),
        body: t("aster.celebrate.stardust", { n: item.delta?.stardustGained || 50 }),
        long: true,
      };
    default:
      return {
        tone: "star",
        icon: "sparkles",
        title: t("aster.celebrate.rewardTitle", { n: item.amount ?? item.delta?.xpGained ?? 0 }),
        body: t("aster.celebrate.rewardBody"),
        long: false,
      };
  }
}

/** Flick the pill up past this many px to send it off. */
const FLICK_PX = 18;

function RewardPill({ item, onDone }: { item: Celebration; onDone: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const m = useMotion();
  const stage = useMascotStore((s) => s.state?.stage ?? item.delta?.stage ?? 1);
  const accessories = useMascotStore((s) => s.state?.equipped ?? NO_EQUIPPED);
  const copy = pillCopy(item, t);
  const tone = palette[copy.tone];

  // One buzz per pill, not per merged reward.
  useEffect(() => {
    haptics.success();
  }, []);

  // Leaves on its own; a merged reward restarts the clock.
  useEffect(() => {
    const timer = setTimeout(onDone, copy.long ? motion.duration.toastLong : motion.duration.toast);
    return () => clearTimeout(timer);
  }, [onDone, copy.long, item.bump]);

  // A merged reward gives the pill a small nudge so the new total registers.
  const nudge = useSharedValue(1);
  useEffect(() => {
    if (!item.bump || m.reduced) return;
    nudge.value = withSequence(withSpring(1.06, motion.spring.press), withSpring(1, motion.spring.pop));
  }, [item.bump, m.reduced, nudge]);
  const nudgeStyle = useAnimatedStyle(() => ({ transform: [{ scale: nudge.value }] }));

  const dy = useSharedValue(0);
  const flick = Gesture.Pan()
    .onUpdate((e) => {
      dy.value = Math.min(0, e.translationY);
    })
    .onEnd((e) => {
      if (e.translationY < -FLICK_PX || e.velocityY < -500) runOnJS(onDone)();
      else dy.value = withSpring(0, motion.spring.press);
    });
  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dy.value }],
    opacity: 1 + dy.value / 80,
  }));

  return (
    <Animated.View
      entering={m.enter("drop")}
      exiting={m.exit("lift")}
      pointerEvents="box-none"
      style={[styles.pillWrap, { top: insets.top + spacing.sm }]}
    >
      <GestureDetector gesture={flick}>
        <Animated.View style={[styles.pillShell, dragStyle]}>
          <Animated.View style={nudgeStyle}>
            <Pressable
              onPress={onDone}
              accessibilityRole="button"
              accessibilityLiveRegion="polite"
              accessibilityLabel={copy.body ? `${copy.title}. ${copy.body}` : copy.title}
              accessibilityHint={t("aster.celebrate.dismissHint")}
              style={[styles.pill, { borderColor: tone.face, borderBottomColor: tone.slab }]}
            >
              <View style={styles.pillAster}>
                <AsterMascot stage={stage} mood="happy" action="idle" size={34} accessories={accessories} />
              </View>
              <View style={styles.pillText}>
                <View style={styles.row}>
                  <Ionicons name={copy.icon} size={16} color={tone.face} />
                  <AppText variant="heading" color={tone.face} numberOfLines={1} style={styles.flex}>
                    {copy.title}
                  </AppText>
                </View>
                {copy.body ? (
                  <AppText variant="bodySmall" color={colors.text.secondary} numberOfLines={1}>
                    {copy.body}
                  </AppText>
                ) : null}
              </View>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

// ─── Moment (hatch / grow) ────────────────────────────────────────────────────

/** A tap on the scrim continues only after this beat, so the moment can't be skipped by accident. */
const TAP_AFTER_MS = 700;
/** Egg wobble before it cracks; a grow waits a short beat. */
const HATCH_BEAT_MS = 600;
const GROW_BEAT_MS = 450;

function GrowthMoment({ item, onDone }: { item: Celebration; onDone: () => void }) {
  const { t } = useTranslation();
  const m = useMotion();
  const accessories = useMascotStore((s) => s.state?.equipped ?? NO_EQUIPPED);
  const finalStage = item.delta?.stage ?? 1;
  const startStage = item.type === "hatch" ? 0 : item.delta?.previousStage ?? finalStage;
  const [stage, setStage] = useState(m.reduced ? finalStage : startStage);
  const [burst, setBurst] = useState(0);
  const [action, setAction] = useState<"hatch" | "cheer" | "idle">(
    m.reduced ? "idle" : item.type === "hatch" ? "hatch" : "idle",
  );
  const [canTap, setCanTap] = useState(false);

  useEffect(() => {
    const tap = setTimeout(() => setCanTap(true), TAP_AFTER_MS);
    if (stage === finalStage) {
      haptics.celebrate();
      setBurst(1);
      return () => clearTimeout(tap);
    }
    // Hatch: a short wobble, then crack open. Grow: a beat, then the new size.
    const grow = setTimeout(
      () => {
        setStage(finalStage);
        setAction("cheer");
        setBurst((b) => b + 1);
        haptics.celebrate();
      },
      item.type === "hatch" ? HATCH_BEAT_MS : GROW_BEAT_MS,
    );
    return () => {
      clearTimeout(tap);
      clearTimeout(grow);
    };
    // Run once per celebration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const opened = item.type === "levelUp" ? unlockLines(t, finalStage) : [];
  const hatch = item.type === "hatch";
  const tone: Tone = hatch ? "star" : "primary";
  const title = hatch ? t("aster.celebrate.hatchTitle") : t("aster.celebrate.levelTitle");
  const body = hatch
    ? t("aster.celebrate.hatchBody")
    : t("aster.celebrate.levelBody", { stage: stageName(t, finalStage) });
  const xp = item.delta?.xpGained ?? 0;

  return (
    <SpotlightModal
      onDismiss={onDone}
      canDismiss={canTap}
      crown={
        <>
          <StarBurst playKey={burst} radius={80} count={10} />
          <AsterMascot
            stage={stage}
            mood="glowing"
            action={action}
            playKey={burst}
            size={140}
            accessories={stage > 0 ? accessories : []}
          />
        </>
      }
    >
      <AppText variant="title" center color={palette[tone].face}>
        {title}
      </AppText>
      <AppText variant="body" center color={colors.text.primary}>
        {body}
      </AppText>
      {xp > 0 ? (
        <View style={styles.chips}>
          <Chip label={t("aster.celebrate.rewardTitle", { n: xp })} icon="sparkles" tone="star" />
        </View>
      ) : null}
      {opened.length ? (
        <View style={styles.unlocks} accessibilityRole="list">
          <AppText variant="label" color={palette.mint.face}>
            {t("skypath.unlocks.title")}
          </AppText>
          {opened.map((line) => (
            <View key={line.key} style={styles.unlockRow}>
              <View style={[styles.unlockIcon, { backgroundColor: palette[line.tone].soft }]}>
                <Ionicons name={line.icon} size={16} color={palette[line.tone].face} />
              </View>
              <AppText variant="bodySmall" color={colors.text.primary} style={styles.flex}>
                {line.label}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}
      <ChunkyButton
        label={t("aster.celebrate.continue")}
        onPress={onDone}
        variant={tone}
        size="md"
        haptic="none"
        style={styles.cta}
      />
    </SpotlightModal>
  );
}



// ─── Sheet (journey return) ───────────────────────────────────────────────────

/** Aster is home: what it found, the constellation drawing itself, the door into the chart. */
function JourneySheet({
  item,
  onDone,
  onSeeInChart,
}: {
  item: Celebration;
  onDone: () => void;
  onSeeInChart: (link: string) => void;
}) {
  const { t } = useTranslation();
  const m = useMotion();
  const accessories = useMascotStore((s) => s.state?.equipped ?? NO_EQUIPPED);
  const claim = item.journey!;

  useEffect(() => {
    haptics.success();
  }, []);

  return (
    <SpotlightModal
      onDismiss={onDone}
      crown={
        <AsterMascot
          stage={claim.delta.stage}
          mood="glowing"
          action={m.reduced ? "idle" : "cheer"}
          size={110}
          accessories={accessories}
        />
      }
    >
      <View style={styles.journey}>
        <View style={styles.journeyHead}>
          <AppText variant="label" color={palette.star.face}>
            {t("aster.discovery.eyebrow")}
          </AppText>
          {claim.delta.xpGained > 0 ? (
            <Chip label={t("aster.celebrate.rewardTitle", { n: claim.delta.xpGained })} icon="sparkles" tone="star" />
          ) : null}
        </View>
        <DiscoveryContent
          discovery={claim.discovery}
          constellationKey={claim.constellationKey}
          duplicate={claim.duplicate}
          bonusStardust={claim.bonusStardust}
          shieldGranted={claim.shieldGranted}
          drawDelay={m.reduced ? 0 : motion.duration.slow}
          onSeeInChart={() => onSeeInChart(claim.discovery.link)}
          onLater={onDone}
        />
      </View>
    </SpotlightModal>
  );
}

const styles = StyleSheet.create({
  // Pill
  pillWrap: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 1900,
    elevation: 1900,
    alignItems: "center",
  },
  pillShell: { maxWidth: 380, width: "100%" },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 52,
    paddingVertical: spacing.xs + 2,
    paddingLeft: spacing.xs + 2,
    paddingRight: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: surface.sheet,
    borderWidth: 2,
    borderBottomWidth: depth.sm + 2,
  },
  pillAster: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: surface.raised,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  pillText: { flex: 1, gap: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  flex: { flex: 1 },

  // Moment
  unlocks: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: palette.mint.soft,
  },
  unlockRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  unlockIcon: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm },
  cta: { marginTop: spacing.sm },

  // Journey sheet
  journey: { gap: spacing.md },
  journeyHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
});
