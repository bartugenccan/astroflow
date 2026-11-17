import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { AppText } from "../../../components/ui/AppText";
import { ChunkyButton } from "../../../components/ui/ChunkyButton";
import { ChunkyCard } from "../../../components/ui/ChunkyCard";
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
import { useAffirmationAudio } from "../../affirmations/useAffirmationAudio";
import { planAffirmationCategory } from "../wishModel";
import { READ_REPS } from "../practiceModel";
import { PracticeShell } from "./PracticeShell";
import { WhyCard } from "./WhyCard";
import { AsterPrompt, FinishStep, MethodHeading, WishSwitcher } from "./PracticeParts";

/** A take shorter than this is a slip of the thumb, not a reading. */
const MIN_TAKE_MS = 1500;

/**
 * Read aloud: the manifestation's affirmation, big and handwritten, said out
 * loud three times — each "I read it" fills a ring. Optionally record yourself
 * saying it (a finished take counts as one reading) and listen back; the audio
 * stays on the phone, in the same store as the affirmations library, and is
 * never transcribed or uploaded. Picking an affirmation in the library swaps
 * the sentence being read. Finishing is one AFFIRMATION for Aster, and the
 * first recording of the day one VOICE_RECORD. Without microphone access the
 * three taps still work.
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
  const m = useMotion();
  const [wish, setWish] = useState(initial);
  const [count, setCount] = useState(0);
  const [step, setStep] = useState(1);
  const [library, setLibrary] = useState(false);
  const plan = usePlanStore((s) => s.plan);
  const [category, setCategory] = useState<AffirmationCategory | null>(null);
  const [addCategory, setAddCategory] = useState<AffirmationCategory | null>(null);
  const suggested = planAffirmationCategory(plan);
  /** An affirmation picked in the library; null = the manifest's own sentence. */
  const [chosen, setChosen] = useState<{ id: string; text: string } | null>(null);
  const text = chosen?.text ?? wish.affirmation;
  const recId = chosen?.id ?? `wish-${wish.id}`;
  const audio = useAffirmationAudio();
  const [micNote, setMicNote] = useState<string | null>(null);
  const recordedThisFlow = useRef(false);

  // Leaving mid-take: stop the recorder so the mic is released.
  const audioRef = useRef(audio);
  audioRef.current = audio;
  useEffect(
    () => () => {
      if (audioRef.current.recordingId) audioRef.current.stopRecording();
    },
    [],
  );

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

  const stopTake = async () => {
    const took = audio.durationMs;
    // Too short to be a reading: don't let it replace the last good take.
    const slip = took < MIN_TAKE_MS;
    await audio.stopRecording({ discard: slip });
    if (slip) {
      setMicNote(t("practice.methods.read.tooShort"));
      return;
    }
    haptics.tap();
    if (!recordedThisFlow.current) {
      recordedThisFlow.current = true;
      useMascotStore.getState().report("VOICE_RECORD");
    }
    readOnce();
  };

  const startTake = async () => {
    setMicNote(null);
    if (audio.playingId) audio.togglePlay(audio.playingId);
    const res = await audio.startRecording(recId);
    if (res === "denied") setMicNote(t("practice.methods.read.micDenied"));
    else if (res === "error") setMicNote(t("practice.methods.read.recordFailed"));
    else if (res === "started") haptics.tap();
  };

  const recording = audio.recordingId === recId;
  /** Recording or getting the mic ready: the screen narrows to the sentence and the take. */
  const focused = recording || audio.starting;
  const hasTake = audio.hasRecording(recId);
  const playing = audio.playingId === recId;
  const failure = micNote && audio.failure ? audio.failure : null;
  const listenButton = hasTake ? (
    <ChunkyButton
      label={playing ? t("practice.methods.read.pause") : t("practice.methods.read.listen")}
      variant="ghost"
      size="sm"
      onPress={() => audio.togglePlay(recId)}
      icon={<Ionicons name={playing ? "pause" : "play"} size={16} color={colors.text.accent} />}
    />
  ) : null;

  const body =
    step === 1 ? (
      <>
        <MethodHeading method="read" />
        {/* While a take runs, everything that isn't the sentence steps aside. */}
        {focused ? null : (
          <Animated.View entering={m.enter("fade")} exiting={m.exit("fade")} style={styles.group}>
            <WishSwitcher
              wishes={wishes}
              current={wish}
              onChange={(w) => {
                if (audio.recordingId) audio.stopRecording();
                setWish(w);
                setChosen(null);
                setCount(0);
              }}
              tone="candy"
            />
            <WhyCard method="read" />
            <AsterPrompt text={t("practice.methods.read.prompt")} />
          </Animated.View>
        )}
        <PaperCard lines={4} plain tilt={-0.5}>
          <AppText variant="scriptLarge" center>
            {text}
          </AppText>
        </PaperCard>
        <RepRings done={count} total={READ_REPS} />
        {focused ? (
          <RecordingPanel starting={!recording} ms={audio.durationMs} />
        ) : (
          <Animated.View entering={m.enter("fade")} style={styles.group}>
            <View style={styles.voice}>
              <ChunkyButton
                label={hasTake ? t("practice.methods.read.rerecord") : t("practice.methods.read.record")}
                variant="night"
                size="sm"
                onPress={startTake}
                haptic="none"
                icon={<Ionicons name="mic" size={16} color={palette.night.on} />}
              />
              {listenButton}
            </View>
            {micNote ? (
              <View style={styles.noteBlock} accessibilityLiveRegion="polite">
                <AppText variant="bodySmall" center color={colors.text.secondary}>
                  {micNote}
                </AppText>
                {failure ? (
                  <AppText variant="labelLong" center color={colors.text.tertiary} selectable>
                    {t("practice.methods.read.failCode", {
                      step: failure.step,
                      detail: failure.detail.slice(0, 80),
                    })}
                  </AppText>
                ) : null}
              </View>
            ) : hasTake ? (
              <AppText variant="bodySmall" center color={colors.text.secondary}>
                {t("practice.methods.read.recordedNote")}
              </AppText>
            ) : null}
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
          </Animated.View>
        )}
      </>
    ) : (
      <FinishStep page={text}>
        <AppText variant="body" center>
          {t("practice.finish.readDone")}
        </AppText>
        {listenButton}
      </FinishStep>
    );

  // The one action at the bottom is always the right one for the moment: while
  // a take runs it is Stop, so it never hides below a long page.
  const footer =
    step === 1 ? (
      focused ? (
        <ChunkyButton
          label={t("practice.methods.read.stop")}
          variant="danger"
          onPress={stopTake}
          loading={!recording}
          disabled={!recording}
          haptic="none"
          icon={<Ionicons name="stop" size={20} color={palette.danger.on} />}
        />
      ) : (
        <ChunkyButton label={t("practice.methods.read.tap")} variant="candy" onPress={readOnce} haptic="none" />
      )
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
          onUse={(a) => {
            if (audio.recordingId) audio.stopRecording();
            setChosen(a);
            setCount(0);
            setLibrary(false);
          }}
        />
      </SpringBottomSheet>
      <AddAffirmationSheet category={addCategory} onClose={() => setAddCategory(null)} />
    </>
  );
}

function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * The take in progress: a beating red dot, the running time big enough to
 * read from arm's length, and what to do. While the mic is still being set
 * up it says so, so a slow start never looks like a dead button.
 */
function RecordingPanel({ starting, ms }: { starting: boolean; ms: number }) {
  const { t } = useTranslation();
  const m = useMotion();
  const beat = useSharedValue(1);
  useEffect(() => {
    if (starting || m.reduced) {
      cancelAnimation(beat);
      beat.value = 1;
      return;
    }
    beat.value = withRepeat(withTiming(0.35, { duration: 600, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(beat);
  }, [starting, m.reduced, beat]);
  const dotStyle = useAnimatedStyle(() => ({ opacity: beat.value }));

  return (
    <Animated.View entering={m.enter("pop")}>
      <ChunkyCard tone="danger" tinted style={styles.panel}>
        <View
          style={styles.panelHead}
          accessible
          accessibilityLabel={starting ? t("practice.methods.read.starting") : t("practice.methods.read.recordingTitle")}
          accessibilityLiveRegion="polite"
        >
          <Animated.View style={[styles.dot, dotStyle]} />
          <AppText variant="label" color={palette.danger.face}>
            {starting ? t("practice.methods.read.starting") : t("practice.methods.read.recordingTitle")}
          </AppText>
        </View>
        <AppText variant="display" center importantForAccessibility="no">
          {clock(starting ? 0 : ms)}
        </AppText>
        <AppText variant="bodySmall" center color={colors.text.secondary}>
          {t("practice.methods.read.recordingHint")}
        </AppText>
      </ChunkyCard>
    </Animated.View>
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

const DOT = 12;

const styles = StyleSheet.create({
  group: { gap: spacing.lg },
  noteBlock: { gap: spacing.xs },
  panel: { gap: spacing.sm, alignItems: "center" },
  panelHead: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: palette.danger.face },
  rings: { flexDirection: "row", justifyContent: "center", gap: spacing.md },
  voice: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", gap: spacing.sm },
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
