import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated from "react-native-reanimated";
import { AppText } from "../../../components/ui/AppText";
import { ChunkyButton } from "../../../components/ui/ChunkyButton";
import { PaperCard } from "../../../components/ui/Paper";
import { SpringBottomSheet } from "../../../components/ui/SpringBottomSheet";
import { useReflectionStore } from "../../../store/useReflectionStore";
import { useMascotStore } from "../../../store/useMascotStore";
import { usePlanStore } from "../../../store/usePlanStore";
import { useTranslation } from "../../../i18n";
import { haptics } from "../../../lib/haptics";
import { useMotion } from "../../../lib/motion";
import type { AffirmationCategory, Intention } from "../../../services/types";
import { colors, palette, radii, spacing, surface } from "../../../lib/design-system";
import { AddAffirmationSheet, AffirmationsCarousel } from "../../affirmations/AffirmationsCarousel";
import { planAffirmationCategory } from "../wishModel";
import { READ_REPS } from "../practiceModel";
import { PracticeShell } from "./PracticeShell";
import { WhyCard } from "./WhyCard";
import { AsterPrompt, FinishStep, MethodHeading, WishSwitcher } from "./PracticeParts";

/**
 * Read aloud: the manifestation's affirmation, big and handwritten, said out
 * loud three times — each "I read it" fills a ring. Nothing is recorded; no
 * microphone. Finishing is one AFFIRMATION for Aster.
 */
export function ReadFlow({
  wishes,
  initial,
  onClose,
}: {
  wishes: Intention[];
  initial: Intention;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [wish, setWish] = useState(initial);
  const [count, setCount] = useState(0);
  const [step, setStep] = useState(1);
  const [library, setLibrary] = useState(false);
  const plan = usePlanStore((s) => s.plan);
  const [category, setCategory] = useState<AffirmationCategory | null>(null);
  const [addCategory, setAddCategory] = useState<AffirmationCategory | null>(null);
  const suggested = planAffirmationCategory(plan);

  useEffect(() => {
    useReflectionStore.getState().markWhySeen("read");
  }, []);

  const readOnce = () => {
    const next = Math.min(READ_REPS, count + 1);
    setCount(next);
    useReflectionStore.getState().markPractice({ method: "read" });
    if (next < READ_REPS) {
      haptics.tap();
      return;
    }
    // Feed Aster once per practice; the reward arrives as the pill.
    useMascotStore.getState().report("AFFIRMATION");
    setStep(2);
  };

  const body =
    step === 1 ? (
      <>
        <MethodHeading method="read" />
        <WishSwitcher
          wishes={wishes}
          current={wish}
          onChange={(w) => {
            setWish(w);
            setCount(0);
          }}
          tone="candy"
        />
        <WhyCard method="read" />
        <AsterPrompt text={t("practice.methods.read.prompt")} />
        <PaperCard lines={4} plain tilt={-0.5}>
          <AppText variant="scriptLarge" center>
            {wish.affirmation}
          </AppText>
        </PaperCard>
        <RepRings done={count} total={READ_REPS} />
        <Pressable
          onPress={() => setLibrary(true)}
          accessibilityRole="button"
          style={styles.link}
          hitSlop={8}
        >
          <Ionicons name="albums" size={16} color={colors.text.accent} />
          <AppText variant="labelLong" color={colors.text.accent}>
            {t("practice.methods.read.other")}
          </AppText>
        </Pressable>
      </>
    ) : (
      <FinishStep page={wish.affirmation}>
        <AppText variant="body" center>
          {t("practice.finish.readDone")}
        </AppText>
      </FinishStep>
    );

  const footer =
    step === 1 ? (
      <ChunkyButton label={t("practice.methods.read.tap")} variant="candy" onPress={readOnce} haptic="none" />
    ) : (
      <ChunkyButton label={t("practice.done")} variant="mint" onPress={onClose} />
    );

  return (
    <>
      <PracticeShell step={step} total={2} tone="candy" stepKey={step} onClose={onClose} footer={footer}>
        {body}
      </PracticeShell>
      <SpringBottomSheet
        visible={library}
        onClose={() => setLibrary(false)}
        title={t("practice.methods.read.otherTitle")}
      >
        <AffirmationsCarousel
          category={category ?? suggested ?? "money"}
          onCategoryChange={setCategory}
          suggested={suggested}
          onAdd={setAddCategory}
        />
      </SpringBottomSheet>
      <AddAffirmationSheet category={addCategory} onClose={() => setAddCategory(null)} />
    </>
  );
}

/** Three rings that fill, one per reading. */
function RepRings({ done, total }: { done: number; total: number }) {
  const { t } = useTranslation();
  const m = useMotion();
  return (
    <View
      style={styles.rings}
      accessible
      accessibilityLabel={t("practice.methods.read.count", { n: done, total })}
      accessibilityLiveRegion="polite"
    >
      {Array.from({ length: total }, (_, i) => {
        const filled = i < done;
        return (
          <View key={i} style={[styles.ring, filled && styles.ringOn]}>
            {filled ? (
              <Animated.View entering={m.enter("pop")}>
                <Ionicons name="checkmark" size={22} color={palette.candy.on} />
              </Animated.View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const RING = 44;

const styles = StyleSheet.create({
  rings: { flexDirection: "row", justifyContent: "center", gap: spacing.md },
  ring: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 3,
    borderColor: palette.candy.face,
    backgroundColor: surface.raised,
    alignItems: "center",
    justifyContent: "center",
  },
  ringOn: { backgroundColor: palette.candy.face, borderColor: palette.candy.slab },
  link: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
  },
});
