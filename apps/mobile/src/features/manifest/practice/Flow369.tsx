import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../../components/ui/AppText";
import { ChunkyButton } from "../../../components/ui/ChunkyButton";
import { Chip } from "../../../components/ui/Chip";
import { GoldToggle } from "../../../components/ui/GoldToggle";
import { InkLine, PaperCard, PaperInput, PAPER_LINE } from "../../../components/ui/Paper";
import { useReflectionStore } from "../../../store/useReflectionStore";
import { localDay } from "../../../store/useAffirmationStore";
import { useAppStore } from "../../../store/useAppStore";
import { useTranslation, type TranslationKey } from "../../../i18n";
import { haptics } from "../../../lib/haptics";
import type { CheckInResult, Intention, PracticeSlot } from "../../../services/types";
import { colors, palette, paper, radii, spacing, surface } from "../../../lib/design-system";
import { ConvictionPicker } from "../../intentions/ConvictionPicker";
import { useReminderToggle } from "../../reminders/useReminderToggle";
import { SLOTS, SLOT_REPS, slotFor } from "../practiceModel";
import { PracticeShell } from "./PracticeShell";
import { WhyCard } from "./WhyCard";
import { AsterPrompt, FinishStep, MethodHeading, WishSwitcher } from "./PracticeParts";
import { sendPage } from "./practiceActions";

/** A line counts once it holds at least this share of the sentence. */
const LINE_FILL = 0.5;
const MIN_SENTENCE = 6;

/**
 * 3-6-9: one short sentence, written 3 times in the morning, 6 at noon and 9
 * in the evening. Lines are traced over a faint copy of the sentence — or, on
 * real paper, ticked off one by one. Each session is one check-in (three a
 * day, matching Aster's CHECKIN cap), and the reminders can be turned on here.
 */
export function Flow369({
  wishes,
  initial,
  onClose,
}: {
  wishes: Intention[];
  initial: Intention;
  onClose: () => void;
}) {
  const { t, locale } = useTranslation();
  const [wish, setWish] = useState(initial);
  const slot = useMemo(() => slotFor(new Date().getHours()), []);
  const reps = SLOT_REPS[slot];
  const today = useReflectionStore((s) => s.practice[localDay()]);
  const [step, setStep] = useState(1);
  const [sentence, setSentence] = useState("");
  const [lines, setLines] = useState<string[]>(() => Array.from({ length: reps }, () => ""));
  const [ticked, setTicked] = useState<boolean[]>(() => Array.from({ length: reps }, () => false));
  const [realPaper, setRealPaper] = useState(false);
  const [conviction, setConviction] = useState(0);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);

  useEffect(() => {
    useReflectionStore.getState().markWhySeen("369");
  }, []);

  const target = sentence.trim();
  const lineOk = (i: number) =>
    realPaper ? ticked[i] : lines[i].trim().length >= Math.max(3, Math.floor(target.length * LINE_FILL));
  const written = Array.from({ length: reps }, (_, i) => lineOk(i)).filter(Boolean).length;
  const slotName = t(`practice.methods.369.slots.${slot}` as TranslationKey);

  const submit = async () => {
    if (!conviction || sending) return;
    setSending(true);
    setFailed(false);
    try {
      const r = await sendPage(wish.id, { text: target, conviction }, locale);
      useReflectionStore.getState().markPractice({ method: "369", slot });
      setResult(r);
      setStep(4);
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  };

  let body: React.ReactNode;
  let footer: React.ReactNode;

  if (step === 1) {
    body = (
      <>
        <MethodHeading method="369" />
        <SessionDots done={today?.s369} current={slot} />
        <WishSwitcher wishes={wishes} current={wish} onChange={setWish} />
        <WhyCard method="369" />
        <AsterPrompt text={t("practice.methods.369.firstHint")} />
        <PaperCard lines={2} tilt={-0.4}>
          <PaperInput
            value={sentence}
            onChangeText={setSentence}
            placeholder={t("practice.methods.369.firstLine")}
            minLines={2}
            maxLength={140}
            accessibilityLabel={t("practice.methods.369.firstLine")}
          />
        </PaperCard>
        {wish.affirmation ? (
          <View style={styles.row}>
            <Chip
              label={t("practice.methods.369.useAffirmation")}
              icon="sparkles"
              tone="star"
              onPress={() => {
                haptics.tap();
                setSentence(wish.affirmation);
              }}
            />
          </View>
        ) : null}
      </>
    );
    footer = (
      <ChunkyButton
        label={t("practice.continue")}
        variant="star"
        disabled={target.length < MIN_SENTENCE}
        onPress={() => setStep(2)}
      />
    );
  } else if (step === 2) {
    body = (
      <>
        <AppText variant="title" accessibilityRole="header">
          {t("practice.methods.369.prompt", { n: reps })}
        </AppText>
        <View style={styles.modeRow}>
          <AppText variant="body" color={colors.text.primary} style={styles.flex}>
            {t("practice.methods.369.paperMode")}
          </AppText>
          <GoldToggle
            value={realPaper}
            onChange={setRealPaper}
            accessibilityLabel={t("practice.methods.369.paperMode")}
          />
        </View>
        <AppText variant="bodySmall" color={colors.text.tertiary}>
          {realPaper ? t("practice.methods.369.paperModeHint") : t("practice.methods.369.traceHint")}
        </AppText>
        <PaperCard lines={reps} tilt={-0.3}>
          {Array.from({ length: reps }, (_, i) => (
            <View key={i} style={styles.line}>
              <AppText variant="numeric" color={paper.inkSoft} style={styles.num}>
                {i + 1}
              </AppText>
              {realPaper ? (
                <Pressable
                  style={styles.flex}
                  onPress={() => {
                    if (ticked[i]) return;
                    haptics.tap();
                    setTicked((cur) => cur.map((v, j) => (j === i ? true : v)));
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={
                    ticked[i]
                      ? t("practice.methods.369.lineDoneA11y", { n: i + 1 })
                      : t("practice.methods.369.lineA11y", { n: i + 1 })
                  }
                >
                  {ticked[i] ? (
                    <InkLine>
                      <AppText variant="script" numberOfLines={1}>
                        {target}
                      </AppText>
                    </InkLine>
                  ) : (
                    <AppText variant="script" color={paper.inkTrace} numberOfLines={1}>
                      {target}
                    </AppText>
                  )}
                </Pressable>
              ) : (
                <PaperInput
                  value={lines[i]}
                  onChangeText={(v) => setLines((cur) => cur.map((x, j) => (j === i ? v : x)))}
                  placeholder={target}
                  placeholderTextColor={paper.inkTrace}
                  minLines={1}
                  multiline={false}
                  scrollEnabled
                  maxLength={target.length + 40}
                  style={styles.flex}
                  accessibilityLabel={t("practice.methods.369.lineA11y", { n: i + 1 })}
                />
              )}
              {lineOk(i) ? <Ionicons name="checkmark" size={18} color={palette.mint.slab} /> : null}
            </View>
          ))}
        </PaperCard>
        <AppText variant="numeric" center accessibilityLiveRegion="polite">
          {`${written}/${reps}`}
        </AppText>
      </>
    );
    footer = (
      <ChunkyButton
        label={t("practice.continue")}
        variant="star"
        disabled={written < reps}
        onPress={() => setStep(3)}
      />
    );
  } else if (step === 3) {
    body = (
      <>
        <ConvictionPicker value={conviction} onChange={setConviction} compact />
        {failed ? (
          <AppText variant="bodySmall" center color={colors.semantic.error} accessibilityLiveRegion="polite">
            {t("practice.sendError")}
          </AppText>
        ) : null}
      </>
    );
    footer = (
      <ChunkyButton
        label={t("practice.done")}
        variant="star"
        loading={sending}
        disabled={!conviction}
        onPress={submit}
      />
    );
  } else {
    body = (
      <FinishStep page={target} note={result?.response} stronger={result?.strongerPhrasing}>
        <AppText variant="body" center>
          {t("practice.finish.s369Done", { slot: slotName, n: reps })}
        </AppText>
        <SessionDots done={{ ...today?.s369, [slot]: true }} current={slot} />
        <ReminderRow />
      </FinishStep>
    );
    footer = <ChunkyButton label={t("practice.done")} variant="mint" onPress={onClose} />;
  }

  return (
    <PracticeShell step={step} total={4} tone="star" stepKey={step} onClose={onClose} footer={footer}>
      {body}
    </PracticeShell>
  );
}

/** The day's three sessions: morning, noon, evening. */
function SessionDots({ done, current }: { done?: Partial<Record<PracticeSlot, boolean>>; current: PracticeSlot }) {
  const { t } = useTranslation();
  const count = SLOTS.filter((s) => done?.[s]).length;
  return (
    <View style={styles.dots} accessible accessibilityLabel={t("practice.methods.369.sessions", { done: count })}>
      {SLOTS.map((s) => {
        const on = !!done?.[s];
        return (
          <View key={s} style={[styles.dot, on && styles.dotOn, s === current && !on && styles.dotNow]}>
            {on ? <Ionicons name="checkmark" size={14} color={palette.star.on} /> : null}
            <AppText variant="label" color={on ? palette.star.on : colors.text.secondary}>
              {`${t(`practice.methods.369.slots.${s}` as TranslationKey)} · ${SLOT_REPS[s]}`}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

/** Turn the 3-6-9 reminders on right where they make sense. */
function ReminderRow() {
  const { t } = useTranslation();
  const on = useAppStore((s) => !!s.reminders.practice369);
  const toggle = useReminderToggle();
  return (
    <View style={styles.modeRow}>
      <AppText variant="body" color={colors.text.primary} style={styles.flex}>
        {t("practice.remind369")}
      </AppText>
      <GoldToggle value={on} onChange={(v) => toggle("practice369", v)} accessibilityLabel={t("practice.remind369")} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row" },
  modeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: surface.card,
  },
  line: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: PAPER_LINE },
  num: { width: 18, marginLeft: -26, textAlign: "right" },
  dots: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  dot: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: surface.raised,
  },
  dotOn: { backgroundColor: palette.star.face },
  dotNow: { borderWidth: 2, borderColor: palette.star.face },
});
