import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PracticeShell } from "../manifest/practice/PracticeShell";
import { AppText } from "../../components/ui/AppText";
import { AsterCameo } from "../../components/ui/AsterCameo";
import { Chip } from "../../components/ui/Chip";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { ShimmerLines } from "../../components/ui/Shimmer";
import { StateView } from "../../components/ui/StateView";
import { PressableScale } from "../../components/ui/PressableScale";
import { TermInfo } from "../../components/TermInfo";
import { Glyph } from "../../components/Glyph";
import { useMascotStore } from "../../store/useMascotStore";
import { SKY_PATH, lessonStatus } from "../../lib/mascotRules";
import { haptics } from "../../lib/haptics";
import { useTranslation, type TranslationKey } from "../../i18n";
import { colors, palette, radii, spacing, depth } from "../../lib/design-system";
import type { SkyLessonKey } from "../../services/types";
import { stageName } from "../aster/asterCopy";
import { LESSON_TONE, useLesson, type LessonStep } from "./lessonContent";

type Echo = "yes" | "some" | "no";

interface LessonFlowProps {
  lessonKey: SkyLessonKey;
  /** Leave the lesson (✕, or "Done" at the end). */
  onExit: () => void;
  /** Onboarding: finishing goes straight on instead of showing the next chapter. */
  onFinished?: () => void;
}

/**
 * One Harita Yolu chapter as a Duolingo lesson: a "why it matters" page, a
 * few short pages read from your own chart (one idea each, a glyph, an ⓘ for
 * every word that needs one), a one-tap "does this sound like you?", then the
 * finish. Finishing an open chapter records it on the server (SKY_LESSON,
 * +20 Işık, two a day) and Aster's pill celebrates; a chapter already done can
 * be read again with no reward.
 */
export function LessonFlow({ lessonKey, onExit, onFinished }: LessonFlowProps) {
  const { t, locale } = useTranslation();
  const tone = LESSON_TONE[lessonKey];
  const lesson = useLesson(lessonKey, t, locale);
  const completeLesson = useMascotStore((s) => s.completeLesson);
  const mascot = useMascotStore((s) => s.state);
  const [index, setIndex] = useState(0);
  const [echo, setEcho] = useState<Echo | null>(null);
  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState<null | { xp: number }>(null);
  const [saveFailed, setSaveFailed] = useState(false);

  const chapter = mascot?.skyPath?.find((c) => c.key === lessonKey);
  const progress = {
    stage: mascot?.stage ?? 0,
    done: (mascot?.skyPath ?? []).filter((c) => c.status === "done").map((c) => c.key as string),
    early: (mascot?.skyPath ?? []).filter((c) => c.early).map((c) => c.key as string),
  };
  const status = chapter?.status ?? lessonStatus(lessonKey, progress);
  const locked = status === "lockedPrev" || status === "lockedStage";

  const steps = lesson.steps;
  const total = steps.length + 1; // + the finish page
  const step: LessonStep | undefined = steps[index];
  const title = t(`skypath.lessons.${lessonKey}.title` as TranslationKey);

  // A fresh lesson starts at its first page.
  useEffect(() => {
    setIndex(0);
    setEcho(null);
    setFinished(null);
  }, [lessonKey]);

  const finish = async () => {
    if (saving) return;
    setSaving(true);
    setSaveFailed(false);
    const res = await completeLesson(lessonKey);
    setSaving(false);
    if (!res) {
      setSaveFailed(true);
      return;
    }
    haptics.success();
    setFinished({ xp: res.delta.xpGained });
  };

  const next = () => {
    if (index < steps.length - 1) {
      setIndex((i) => i + 1);
      return;
    }
    void finish();
  };

  // ── Locked: say why, and leave. ───────────────────────────────────────────
  if (locked) {
    return (
      <PracticeShell step={0} total={1} tone={tone} onClose={onExit} stepKey="locked"
        footer={<ChunkyButton label={t("common.back")} onPress={onExit} variant="night" />}
      >
        <AsterCameo
          text={
            status === "lockedPrev"
              ? t("skypath.path.lockedPrev")
              : t("skypath.path.lockedStage", { stage: stageName(t, chapter?.minStage ?? 2) })
          }
          size={72}
        />
      </PracticeShell>
    );
  }

  // ── Finish page ───────────────────────────────────────────────────────────
  if (finished) {
    const i = SKY_PATH.findIndex((c) => c.key === lessonKey);
    const nextChapter = SKY_PATH[i + 1];
    const nextView = nextChapter ? mascot?.skyPath?.find((c) => c.key === nextChapter.key) : undefined;
    const nextLine = !nextChapter
      ? t("skypath.lesson.doneAll")
      : nextView?.status === "lockedStage"
        ? t("skypath.lesson.doneNextLocked", { stage: stageName(t, nextChapter.minStage) })
        : t("skypath.lesson.doneNext", { name: t(`skypath.lessons.${nextChapter.key}.title` as TranslationKey) });
    return (
      <PracticeShell
        step={total}
        total={total}
        tone={tone}
        onClose={onExit}
        stepKey="done"
        footer={
          <ChunkyButton label={t("common.done")} onPress={onFinished ?? onExit} variant={tone} size="lg" />
        }
      >
        <View style={styles.done}>
          <AsterCameo text={t("skypath.lesson.doneTitle")} size={96} action="cheer" layout="column" />
          {finished.xp > 0 ? (
            <Chip label={t("aster.celebrate.rewardTitle", { n: finished.xp })} icon="sparkles" tone="star" />
          ) : status === "open" ? (
            <AppText variant="bodySmall" center color={colors.text.tertiary}>
              {t("skypath.lesson.noXpToday")}
            </AppText>
          ) : null}
          <ChunkyCard tone={tone} tinted>
            <AppText variant="heading" center>
              {nextLine}
            </AppText>
          </ChunkyCard>
        </View>
      </PracticeShell>
    );
  }

  // ── Loading / error before the chart is in ────────────────────────────────
  if (!step) {
    return (
      <PracticeShell step={0} total={total} tone={tone} onClose={onExit} stepKey="loading">
        {lesson.failed ? (
          <StateView kind="error" message={t("skypath.lesson.error")} onAction={lesson.reload} />
        ) : (
          <StateView kind="loading" message={t("skypath.lesson.loading")} />
        )}
      </PracticeShell>
    );
  }

  const last = index === steps.length - 1;
  const needsEcho = step.kind === "echo" && echo === null;
  const bodyPending = step.kind !== "echo" && !step.body && lesson.pending;

  return (
    <PracticeShell
      step={index + 1}
      total={total}
      tone={tone}
      onClose={onExit}
      onBack={index > 0 ? () => setIndex((i) => i - 1) : undefined}
      stepKey={`${lessonKey}-${step.key}`}
      footer={
        <View style={styles.footer}>
          {saveFailed ? (
            <AppText variant="bodySmall" center color={colors.semantic.error} accessibilityLiveRegion="polite">
              {t("skypath.lesson.error")}
            </AppText>
          ) : null}
          <ChunkyButton
            label={last ? t("skypath.lesson.finish") : t("skypath.lesson.next")}
            onPress={next}
            variant={tone}
            size="lg"
            loading={saving}
            disabled={needsEcho}
          />
        </View>
      }
    >
      <AppText variant="label" color={palette[tone].face}>
        {title}
      </AppText>

      {step.kind === "echo" ? (
        <EchoStep value={echo} onChange={setEcho} />
      ) : (
        <ChunkyCard style={styles.page}>
          <View style={styles.pageHead}>
            {step.glyph ? (
              <View style={[styles.glyph, { backgroundColor: palette[tone].face, borderBottomColor: palette[tone].slab }]}>
                <Glyph name={step.glyph} size={30} color={palette[tone].on} />
              </View>
            ) : step.kind === "why" ? (
              <View style={[styles.glyph, { backgroundColor: palette[tone].soft }]}>
                <Ionicons name="bulb" size={26} color={palette[tone].face} />
              </View>
            ) : null}
            <AppText variant="title" style={styles.flex}>
              {step.title}
            </AppText>
            {step.term ? <TermInfo term={step.term} size={18} /> : null}
          </View>
          {step.chips?.length ? (
            <View style={styles.chips}>
              {step.chips.map((c) => (
                <Chip key={c} label={c} tone={tone} />
              ))}
            </View>
          ) : null}
          {bodyPending ? (
            <ShimmerLines lines={4} />
          ) : (
            <AppText variant="lead" color={colors.text.primary}>
              {step.body || t("skypath.lesson.error")}
            </AppText>
          )}
        </ChunkyCard>
      )}
    </PracticeShell>
  );
}

function EchoStep({ value, onChange }: { value: Echo | null; onChange: (e: Echo) => void }) {
  const { t } = useTranslation();
  const options: { key: Echo; icon: keyof typeof Ionicons.glyphMap; tone: "mint" | "star" | "sky" }[] = [
    { key: "yes", icon: "heart", tone: "mint" },
    { key: "some", icon: "partly-sunny", tone: "star" },
    { key: "no", icon: "help-circle", tone: "sky" },
  ];
  return (
    <View style={styles.echo}>
      <AppText variant="title">{t("skypath.lesson.echoQuestion")}</AppText>
      <View style={styles.echoOptions} accessibilityRole="radiogroup">
        {options.map((o) => {
          const on = value === o.key;
          const p = palette[o.tone];
          return (
            <PressableScale
              key={o.key}
              onPress={() => {
                haptics.select();
                onChange(o.key);
              }}
              scaleTo={0.97}
              style={[
                styles.echoOption,
                { borderColor: on ? p.face : colors.border.chunky, backgroundColor: on ? p.soft : "transparent" },
              ]}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={t(`skypath.lesson.echo.${o.key}` as TranslationKey)}
            >
              <Ionicons name={o.icon} size={22} color={on ? p.face : colors.text.secondary} />
              <AppText variant="heading" color={on ? colors.text.primary : colors.text.secondary}>
                {t(`skypath.lesson.echo.${o.key}` as TranslationKey)}
              </AppText>
            </PressableScale>
          );
        })}
      </View>
      {value ? (
        <AppText variant="bodySmall" color={colors.text.secondary} accessibilityLiveRegion="polite">
          {t("skypath.lesson.echoThanks")}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  page: { gap: spacing.md },
  pageHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  glyph: {
    width: 52,
    height: 52,
    borderRadius: radii.md,
    borderBottomWidth: depth.sm,
    borderBottomColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  footer: { gap: spacing.sm },
  done: { alignItems: "center", gap: spacing.lg, paddingTop: spacing.xl },
  echo: { gap: spacing.lg },
  echoOptions: { gap: spacing.md },
  echoOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 60,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderBottomWidth: 2 + depth.sm,
  },
});
