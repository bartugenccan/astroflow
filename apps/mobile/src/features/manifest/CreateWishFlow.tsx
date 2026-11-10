import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { StateView } from "../../components/ui/StateView";
import { PaywallSheet } from "../../components/PaywallSheet";
import { StarBurst } from "../intentions/StarBurst";
import { astrologyApi } from "../../services/astrologyApi";
import { useAsync } from "../../hooks/useAsync";
import { useBirthDto } from "../../hooks/useBirthDto";
import { useMascotStore } from "../../store/useMascotStore";
import { usePlanStore } from "../../store/usePlanStore";
import { useAppStore, FREE_INTENTIONS } from "../../store/useAppStore";
import { localDay } from "../../store/useAffirmationStore";
import { springOf, useMotion } from "../../lib/motion";
import { useTranslation } from "../../i18n";
import type { LifeArea, LifeAreaContext } from "../../services/types";
import { colors, palette, spacing } from "../../lib/design-system";
import { WishStarGlyph } from "./WishStarGlyph";
import { PracticeShell } from "./practice/PracticeShell";
import { AffirmStep, AreaStep, WhenStep, WriteStep, type Plant } from "./create/CreateSteps";
import { isLifeArea, lunarInfo } from "./wishModel";

const TOTAL = 4;
/** The star's short rise runs alongside the request; it never holds the user back longer than this. */
const PLANT_MIN_MS = 700;

/**
 * Writing a manifestation, in four lesson steps: the life area (with where it
 * lives in the chart) → the manifestation on paper, in the present tense → its
 * affirmation (written from the chart, editable; it's what gets read aloud) →
 * when to start and how many practices a day. Then the star rises for a
 * moment and the Manifest tab shows it in the sky. The first one hatches Aster
 * — the server does it and the celebration queues.
 *
 * Deep link: `?area=love|career|money|energy` preselects the area.
 */
export function CreateWishFlow() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const m = useMotion();
  const dto = useBirthDto();
  const params = useLocalSearchParams<{ area?: string }>();
  const isPremium = useAppStore((s) => s.isPremium);
  const stage = useMascotStore((s) => s.state?.stage ?? 0);
  const plan = usePlanStore((s) => s.plan);

  const [step, setStep] = useState(0);
  const [area, setArea] = useState<LifeArea | null>(isLifeArea(params.area) ? params.area : null);
  const [goal, setGoal] = useState("");
  const [affirmation, setAffirmation] = useState("");
  const [affirmState, setAffirmState] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const affirmFor = useRef<string | null>(null);
  const edited = useRef(false);
  const [plant, setPlant] = useState<Plant>("now");
  const [target, setTarget] = useState(1);
  const [phase, setPhase] = useState<"form" | "planting">("form");
  const [saveError, setSaveError] = useState(false);
  const [paywall, setPaywall] = useState(false);

  const lunar = useMemo(() => lunarInfo(new Date()), []);
  const atNewMoon = lunar.window?.phase === "new";

  const areas = useAsync<LifeAreaContext[] | null>(
    () => (dto ? astrologyApi.getLifeAreas(dto) : Promise.resolve(null)),
    [dto],
  );
  const suggestions = useAsync(
    () => (dto ? astrologyApi.getIntentionSuggestions(dto, locale) : Promise.resolve([])),
    [dto, locale],
  );
  const active = useAsync(() => astrologyApi.listIntentions(), []);

  // A deep link can land here past the free limit: say so before any typing.
  const limitShown = useRef(false);
  useEffect(() => {
    if (limitShown.current || isPremium || !active.data) return;
    if (active.data.length >= FREE_INTENTIONS) {
      limitShown.current = true;
      setPaywall(true);
    }
  }, [active.data, isPremium]);

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/manifest" as Href);
  };

  const go = (next: number) => setStep(Math.max(0, Math.min(TOTAL - 1, next)));

  // ─── Affirmation preview ──────────────────────────────────────────────────
  const loadAffirmation = async (force = false) => {
    if (!dto || !area || !goal.trim()) return;
    const key = `${area}|${goal.trim()}`;
    if (!force && (edited.current || affirmFor.current === key)) return;
    affirmFor.current = key;
    edited.current = false;
    setAffirmState("loading");
    try {
      const text = await astrologyApi.previewAffirmation(dto, goal.trim(), area, locale);
      if (affirmFor.current !== key) return;
      setAffirmation(text);
      setAffirmState("ready");
    } catch {
      if (affirmFor.current === key) setAffirmState("error");
    }
  };

  useEffect(() => {
    if (step === 2) loadAffirmation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ─── Saving ───────────────────────────────────────────────────────────────
  const save = async () => {
    if (!dto || !area || !goal.trim() || phase !== "form") return;
    if (!isPremium && (active.data?.length ?? 0) >= FREE_INTENTIONS) {
      setPaywall(true);
      return;
    }
    setSaveError(false);
    setPhase("planting");
    const minShow = new Promise((r) => setTimeout(r, m.reduced ? 0 : PLANT_MIN_MS));
    try {
      const [created] = await Promise.all([
        astrologyApi.createIntention(
          dto,
          {
            goalText: goal.trim(),
            category: area,
            lifeArea: area,
            dailyTarget: target,
            affirmation: affirmation.trim() || undefined,
            plant: atNewMoon ? "now" : plant,
          },
          locale,
        ),
        minShow,
      ]);
      // The first one hatches Aster — that moment (or a small reward pill) plays over the Manifest tab.
      useMascotStore.getState().applyDelta(created.mascot);
      usePlanStore.getState().refresh(dto);
      router.navigate("/(tabs)/manifest" as Href);
    } catch {
      setPhase("form");
      setSaveError(true);
    }
  };

  const canNext =
    step === 0 ? area !== null : step === 1 ? goal.trim().length >= 3 : step === 2 ? affirmState !== "loading" : true;

  if (!dto) {
    return (
      <ScreenWrapper>
        <StateView
          kind="error"
          message={t("wish.create.error")}
          onAction={leave}
          actionLabel={t("wish.create.back")}
          style={styles.fill}
        />
      </ScreenWrapper>
    );
  }

  if (phase === "planting") {
    return (
      <ScreenWrapper variant="still">
        <PlantingStage look={plant === "newMoon" && !atNewMoon ? "waiting" : "spark"} />
      </ScreenWrapper>
    );
  }

  const footer = (
    <View style={styles.footer}>
      {saveError ? (
        <AppText variant="bodySmall" color={colors.semantic.error} center accessibilityLiveRegion="polite">
          {t("wish.create.error")}
        </AppText>
      ) : null}
      {step < TOTAL - 1 ? (
        <ChunkyButton label={t("wish.create.next")} onPress={() => go(step + 1)} disabled={!canNext} />
      ) : (
        <ChunkyButton
          label={t("wish.create.plantCta")}
          variant="star"
          onPress={save}
          icon={<Ionicons name="star" size={18} color={palette.star.on} />}
        />
      )}
    </View>
  );

  return (
    <>
      <PracticeShell
        step={step + 1}
        total={TOTAL}
        tone="star"
        stepKey={step}
        onClose={leave}
        onBack={step > 0 ? () => go(step - 1) : undefined}
        footer={footer}
      >
        {step === 0 ? (
          <AreaStep
            area={area}
            onPick={setArea}
            contexts={areas.data ?? null}
            loading={areas.loading && !areas.data}
            error={!!areas.error}
          />
        ) : null}
        {step === 1 && area ? (
          <WriteStep
            area={area}
            goal={goal}
            onGoal={setGoal}
            suggestions={(suggestions.data ?? []).filter((s) => s.lifeArea === area).map((s) => s.goal)}
          />
        ) : null}
        {step === 2 ? (
          <AffirmStep
            value={affirmation}
            state={affirmState}
            onChange={(v) => {
              edited.current = true;
              setAffirmation(v);
              if (affirmState !== "ready") setAffirmState("ready");
            }}
            onRegenerate={() => loadAffirmation(true)}
          />
        ) : null}
        {step === 3 && area ? (
          <WhenStep
            plant={plant}
            onPlant={setPlant}
            atNewMoon={atNewMoon}
            daysToNew={lunar.daysToNew}
            waxing={lunar.waxing}
            powerDay={
              stage >= 3 ? (plan?.week.find((d) => d.area === area && d.date >= localDay())?.date ?? null) : null
            }
            area={area}
            target={target}
            onTarget={setTarget}
          />
        ) : null}
      </PracticeShell>
      <PaywallSheet visible={paywall} onClose={() => setPaywall(false)} variant="premium" />
    </>
  );
}

/** A short beat: the star rises into place and gives one small burst. */
function PlantingStage({ look }: { look: "spark" | "waiting" }) {
  const { t } = useTranslation();
  const m = useMotion();
  const y = useSharedValue(m.reduced ? 0 : 80);
  const [burst, setBurst] = useState(0);

  const reduced = m.reduced;
  useEffect(() => {
    if (reduced) return;
    y.value = withSpring(0, springOf("pop"));
    const timer = setTimeout(() => setBurst(1), 380);
    return () => clearTimeout(timer);
  }, [reduced, y]);

  const starStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <View style={styles.stage} accessibilityLiveRegion="polite">
      <Animated.View style={starStyle}>
        <WishStarGlyph look={look === "waiting" ? "waiting" : "glowing"} size={120} />
        <StarBurst playKey={burst} radius={80} count={10} />
      </Animated.View>
      <AppText variant="heading" center style={styles.stageText}>
        {t("wish.create.planting")}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  footer: { gap: spacing.sm },
  stage: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.xl },
  stageText: { paddingHorizontal: spacing.xl },
});
