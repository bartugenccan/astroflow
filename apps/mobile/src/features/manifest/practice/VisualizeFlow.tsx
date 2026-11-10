import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";
import { AppText } from "../../../components/ui/AppText";
import { AsterMascot } from "../../../components/aster/AsterMascot";
import { ChunkyButton } from "../../../components/ui/ChunkyButton";
import { ChunkyProgress } from "../../../components/ui/ChunkyProgress";
import { PaperCard, PaperInput } from "../../../components/ui/Paper";
import { useReflectionStore } from "../../../store/useReflectionStore";
import { localDay } from "../../../store/useAffirmationStore";
import { useMascotStore, NO_EQUIPPED } from "../../../store/useMascotStore";
import { useTranslation, type TranslationKey } from "../../../i18n";
import { useMotion } from "../../../lib/motion";
import type { Intention } from "../../../services/types";
import { colors, palette, paper, spacing } from "../../../lib/design-system";
import { useBreathClock } from "../../aster/useBreathClock";
import { VISUALIZE_SECONDS } from "../practiceModel";
import { PracticeShell } from "./PracticeShell";
import { WhyCard } from "./WhyCard";
import { FinishStep, MethodHeading, WishSwitcher } from "./PracticeParts";

const CUES = ["c1", "c2", "c3", "c4", "c5", "c6"] as const;
/** From this hour the gratitude page also closes the day (one evening ritual, not two). */
const EVENING_FROM = 17;

/**
 * Visualise + gratitude: a minute of breathing with Aster while short cues
 * walk through the manifestation as if it is real, then three lines of
 * gratitude on paper. The lines stay on the phone. Finishing is one BREATH
 * for Aster; in the evening it also closes the day.
 */
export function VisualizeFlow({
  wishes,
  initial,
  onClose,
}: {
  wishes: Intention[];
  initial: Intention;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const m = useMotion();
  const [wish, setWish] = useState(initial);
  const [step, setStep] = useState(1);
  const clock = useBreathClock(step === 2, VISUALIZE_SECONDS);
  const [items, setItems] = useState(["", "", ""]);
  const stage = useMascotStore((s) => s.state?.stage ?? 1);
  const accessories = useMascotStore((s) => s.state?.equipped ?? NO_EQUIPPED);

  useEffect(() => {
    useReflectionStore.getState().markWhySeen("visualize");
  }, []);

  // The minute is over: on to gratitude.
  useEffect(() => {
    if (clock.done && step === 2) setStep(3);
  }, [clock.done, step]);

  const filled = items.filter((x) => x.trim()).length;

  const finish = () => {
    const store = useReflectionStore.getState();
    const lines = items.map((x) => x.trim()).filter(Boolean);
    store.saveGratitude(lines);
    store.markPractice({ method: "visualize" });
    const mascot = useMascotStore.getState();
    mascot.report("BREATH");
    const evening = new Date().getHours() >= EVENING_FROM;
    if (evening && !(localDay() in store.days)) {
      store.closeDay(lines);
      mascot.report("EVENING_REFLECTION");
    }
    setStep(4);
  };

  const cue = CUES[Math.min(CUES.length - 1, Math.floor((clock.elapsed / VISUALIZE_SECONDS) * CUES.length))];

  let body: React.ReactNode;
  let footer: React.ReactNode;

  if (step === 1) {
    body = (
      <>
        <MethodHeading method="visualize" />
        <WishSwitcher wishes={wishes} current={wish} onChange={setWish} tone="sky" />
        <WhyCard method="visualize" />
        <View style={styles.center}>
          <AsterMascot stage={Math.max(1, stage)} mood="happy" action="idle" size={140} accessories={accessories} />
        </View>
        <AppText variant="lead" center>
          {t("practice.methods.visualize.intro")}
        </AppText>
      </>
    );
    footer = <ChunkyButton label={t("practice.start")} variant="sky" onPress={() => setStep(2)} />;
  } else if (step === 2) {
    body = (
      <View style={styles.breath}>
        <AppText variant="labelLong" center color={colors.text.secondary} numberOfLines={2}>
          {`“${wish.goalText}”`}
        </AppText>
        <View style={styles.stage}>
          <AsterMascot
            stage={Math.max(1, stage)}
            mood="happy"
            action={m.reduced ? "idle" : "breathe"}
            size={190}
            accessories={accessories}
          />
        </View>
        <Animated.View key={cue} entering={m.enter("fade")}>
          <AppText variant="title" center accessibilityLiveRegion="polite">
            {t(`practice.methods.visualize.cues.${cue}` as TranslationKey)}
          </AppText>
        </Animated.View>
        <AppText variant="heading" center color={palette.sky.face}>
          {clock.phase === "exhale" ? t("practice.methods.visualize.exhale") : clock.phase === "inhale" ? t("practice.methods.visualize.inhale") : " "}
        </AppText>
        <ChunkyProgress value={clock.elapsed / VISUALIZE_SECONDS} tone="sky" height={12} />
      </View>
    );
    footer = (
      <ChunkyButton
        label={t("practice.methods.visualize.skip")}
        variant="ghost"
        size="md"
        onPress={() => setStep(3)}
      />
    );
  } else if (step === 3) {
    body = (
      <>
        <AppText variant="title" accessibilityRole="header">
          {t("practice.methods.visualize.gratitudeTitle")}
        </AppText>
        <PaperCard lines={6} tilt={-0.4}>
          {items.map((v, i) => (
            <View key={i} style={styles.gLine}>
              <AppText variant="script" color={paper.inkSoft}>
                {`${i + 1}.`}
              </AppText>
              <PaperInput
                value={v}
                onChangeText={(x) => setItems((cur) => cur.map((y, j) => (j === i ? x : y)))}
                placeholder={t("practice.methods.visualize.gratitudePlaceholder")}
                minLines={1}
                maxLength={160}
                style={styles.flex}
                accessibilityLabel={`${t("practice.methods.visualize.gratitudeTitle")} ${i + 1}`}
              />
            </View>
          ))}
        </PaperCard>
        <AppText variant="bodySmall" color={colors.text.tertiary}>
          {t("practice.methods.visualize.privacy")}
        </AppText>
      </>
    );
    footer = <ChunkyButton label={t("practice.done")} variant="sky" disabled={filled === 0} onPress={finish} />;
  } else {
    body = (
      <FinishStep page={items.map((x) => x.trim()).filter(Boolean)}>
        <AppText variant="body" center>
          {t("practice.finish.visualizeDone")}
        </AppText>
      </FinishStep>
    );
    footer = <ChunkyButton label={t("practice.done")} variant="mint" onPress={onClose} />;
  }

  return (
    <PracticeShell step={step} total={4} tone="sky" stepKey={step} onClose={onClose} footer={footer}>
      {body}
    </PracticeShell>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { alignItems: "center" },
  breath: { gap: spacing.lg, paddingTop: spacing.md },
  stage: { height: 230, alignItems: "center", justifyContent: "center" },
  gLine: { flexDirection: "row", alignItems: "flex-start", gap: spacing.xs },
});
