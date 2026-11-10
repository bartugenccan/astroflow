import React, { useCallback, useEffect, useState } from "react";
import { LayoutChangeEvent, LayoutRectangle, ScrollView, StyleSheet, View } from "react-native";
import { MotiView } from "moti";
import { useRouter, type Href } from "expo-router";
import * as Haptics from "expo-haptics";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { ChartReveal, CHART_REVEAL_SIZE, chartRevealPoint } from "../../components/ChartReveal";
import { BigThree } from "../../components/BigThree";
import { AsterMascot } from "../../components/aster/AsterMascot";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { AppText } from "../../components/ui/AppText";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { SpeechBubble } from "../../components/ui/SpeechBubble";
import { StarDivider } from "../../components/ui/StarDivider";
import { StateView } from "../../components/ui/StateView";
import { astrologyApi } from "../../services/astrologyApi";
import { BirthProfileResponse, CreateBirthProfileDto } from "../../services/types";
import { useOnboardingDraft } from "../../store/useOnboardingDraft";
import { EnterView, mt } from "../../lib/motion";
import { asterA11y } from "../aster/asterCopy";
import { useTranslation, TranslationKey, TFunction } from "../../i18n";
import { colors, motion, spacing } from "../../lib/design-system";
import { writeTourCheckpoint } from "./tourCheckpoint";

/** The egg's size once it has rolled out of the chart. */
const EGG = 72;
/** While it sits on the Sun it is about glyph-sized. */
const EGG_ON_SUN = 0.45;

function signName(t: TFunction, sign: string): string {
  const key = `signs.${sign}` as TranslationKey;
  const out = t(key);
  return out === key ? sign : out;
}

/** Aster's first personal line, built from the big three it just computed. */
function revealLine(t: TFunction, profile: BirthProfileResponse, name: string): string {
  const params = {
    sun: signName(t, profile.sunSign),
    moon: signName(t, profile.moonSign),
    rising: signName(t, profile.risingSign),
    name: name || t("screens.reveal.friend"),
  };
  // Without a birth time the rising sign is a guess — Aster doesn't claim it.
  return profile.unknownTime
    ? t("screens.reveal.asterLineNoRising", params)
    : t("screens.reveal.asterLine", params);
}

export function RevealScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const draft = useOnboardingDraft();
  const setDraftProfile = useOnboardingDraft((s) => s.setProfile);

  const [profile, setProfile] = useState<BirthProfileResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    const lat = draft.city?.lat ?? draft.manualLat ?? 41.0082;
    const lon = draft.city?.lon ?? draft.manualLon ?? 28.9784;
    const dto: CreateBirthProfileDto = {
      birthDate: draft.birthDate ?? "2000-01-01",
      birthTime: draft.birthTime ?? "12:00",
      latitude: lat,
      longitude: lon,
    };
    setFailed(false);
    astrologyApi
      .saveBirthProfile(dto)
      .then((p) => {
        if (active) setProfile({ ...p, placeName: draft.city?.name, unknownTime: draft.unknownTime });
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const onRevealed = useCallback(() => setRevealed(true), []);
  const ready = !!profile && revealed;

  // Onboarding completes at the end of the intro tour, so a newcomer learns
  // what the app holds (including the birthday chart) before landing in it.
  const enter = () => {
    if (!profile) return;
    setDraftProfile(profile);
    // A reload during the tour resumes it instead of starting onboarding over.
    writeTourCheckpoint({ name: draft.name.trim(), profile, page: 0 });
    router.push("/(onboarding)/tour" as Href);
  };

  const tr = (group: "planets" | "elements", v: string) => {
    const key = `${group}.${v}` as TranslationKey;
    const out = t(key);
    return out === key ? v : out;
  };

  return (
    <ScreenWrapper variant="dense" edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <RevealStage
          ready={ready}
          line={profile ? revealLine(t, profile, draft.name.trim()) : ""}
          onRevealed={onRevealed}
        >
          {!ready ? (
            failed ? (
              <StateView
                kind="error"
                compact
                message={t("screens.reveal.error")}
                onAction={() => setAttempt((n) => n + 1)}
                style={styles.below}
              />
            ) : (
              <MotiView
                from={{ opacity: 0.35 }}
                animate={{ opacity: 1 }}
                transition={mt({ loop: true, type: "timing", duration: 1400 })}
                style={styles.below}
              >
                <AppText variant="lead" center color={colors.text.secondary} accessibilityLiveRegion="polite">
                  {t("onboarding.casting")}
                </AppText>
              </MotiView>
            )
          ) : null}
        </RevealStage>

        {ready && profile ? (
          <View style={styles.result}>
            <EnterView index={4} distance={24} scale>
              <ChunkyCard style={styles.card}>
                <AppText variant="label" color={colors.text.accent} center>
                  {t("onboarding.revealReady")}
                </AppText>
                <BigThree
                  sunSign={profile.sunSign}
                  moonSign={profile.moonSign}
                  risingSign={profile.risingSign}
                />
                <View style={styles.divider}>
                  <StarDivider />
                </View>
                <AppText variant="labelLong" center>
                  {t("onboarding.dominantLabel")}
                </AppText>
                <AppText variant="lead" center>
                  {tr("elements", profile.dominantElement)} •{" "}
                  {tr("planets", profile.dominantPlanet)}
                </AppText>
              </ChunkyCard>
            </EnterView>
            <EnterView index={5}>
              <ChunkyButton label={t("onboarding.enterApp")} onPress={enter} />
            </EnterView>
          </View>
        ) : null}
      </ScrollView>
    </ScreenWrapper>
  );
}

/**
 * The drawn chart, and — once it is ready — the egg Aster rolling out of the
 * Sun's spot on the wheel down to a speech bubble where it says its first
 * personal line. The hatch itself waits for the first wish.
 */
function RevealStage({
  ready,
  line,
  onRevealed,
  children,
}: {
  ready: boolean;
  line: string;
  onRevealed: () => void;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [stageWidth, setStageWidth] = useState(0);
  const [slot, setSlot] = useState<LayoutRectangle | null>(null);
  const [landed, setLanded] = useState(false);

  const roll = useSharedValue(0); // 0 on the Sun → 1 in the slot
  const drop = useSharedValue(0); // vertical travel, bounces on landing
  const size = useSharedValue(0); // 0 → EGG_ON_SUN → 1
  const squash = useSharedValue(1);

  const onLanded = useCallback(() => {
    setLanded(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  }, []);

  const measured = ready && stageWidth > 0 && !!slot;

  useEffect(() => {
    if (!measured) return;
    if (reduced) {
      roll.value = 1;
      drop.value = 1;
      size.value = 1;
      setLanded(true);
      return;
    }
    // Pop out of the Sun's glyph, hold a beat, then roll down to the bubble.
    size.value = withSequence(
      withSpring(EGG_ON_SUN, motion.spring.bouncy),
      withDelay(350, withTiming(1, { duration: 900, easing: Easing.out(Easing.cubic) })),
    );
    roll.value = withDelay(
      550,
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.cubic) }, (done) => {
        if (done) runOnJS(onLanded)();
      }),
    );
    drop.value = withDelay(550, withTiming(1, { duration: 1000, easing: Easing.bounce }));
    squash.value = withDelay(
      1450,
      withSequence(withTiming(0.86, { duration: 90 }), withSpring(1, motion.spring.squash)),
    );
  }, [measured, reduced, roll, drop, size, squash, onLanded]);

  // Path endpoints in the stage's coordinates (top-left of the egg box).
  const sun = chartRevealPoint("Sun");
  const chartLeft = Math.max(0, (stageWidth - CHART_REVEAL_SIZE) / 2);
  const fromX = chartLeft + sun.x - EGG / 2;
  const fromY = sun.y - EGG / 2;
  const toX = slot ? slot.x : fromX;
  // The slot sits at the top of its row, so the bubble growing never moves it.
  const toY = slot ? slot.y : fromY;
  // How far the egg travels sideways decides how many turns it rolls.
  const turns = -Math.max(1, Math.round(Math.abs(toX - fromX) / (Math.PI * EGG))) * 360;

  const eggStyle = useAnimatedStyle(() => ({
    opacity: size.value > 0.01 ? 1 : 0,
    transform: [
      { translateX: fromX + (toX - fromX) * roll.value },
      { translateY: fromY + (toY - fromY) * drop.value },
      { rotate: `${turns * roll.value}deg` },
      { scale: size.value },
      { scaleY: squash.value },
    ],
  }));

  const onStageLayout = (e: LayoutChangeEvent) => setStageWidth(e.nativeEvent.layout.width);
  const onRowLayout = (e: LayoutChangeEvent) => setSlot(e.nativeEvent.layout);

  return (
    <View style={styles.stage} onLayout={onStageLayout}>
      <View style={styles.chart}>
        <ChartReveal onComplete={onRevealed} />
      </View>

      {children}

      {ready ? (
        <View style={styles.asterRow} onLayout={onRowLayout}>
          <View style={styles.eggSlot} />
          <View style={styles.bubble}>
            {landed ? (
              <EnterView from="none" scale>
                <SpeechBubble text={line} tail="left" />
              </EnterView>
            ) : null}
          </View>
        </View>
      ) : null}

      {ready ? (
        <Animated.View pointerEvents="none" style={[styles.egg, eggStyle]}>
          <AsterMascot
            stage={0}
            mood="happy"
            size={EGG}
            action={landed ? "talk" : "idle"}
            accessibilityLabel={asterA11y(t, { stage: 0, mood: "happy" })}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    justifyContent: "center",
    gap: spacing.xl,
  },
  stage: {
    alignSelf: "stretch",
  },
  chart: {
    alignSelf: "center",
    width: CHART_REVEAL_SIZE,
    height: CHART_REVEAL_SIZE,
  },
  below: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  asterRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    minHeight: EGG + spacing.lg,
    marginTop: spacing.lg,
  },
  eggSlot: {
    width: EGG,
    height: EGG,
  },
  bubble: {
    flex: 1,
    minWidth: 0,
  },
  egg: {
    position: "absolute",
    left: 0,
    top: 0,
    width: EGG,
    height: EGG,
  },
  result: {
    gap: spacing.xl,
    alignItems: "stretch",
  },
  card: {
    gap: spacing.lg,
  },
  divider: {
    paddingVertical: spacing.sm,
  },
});
