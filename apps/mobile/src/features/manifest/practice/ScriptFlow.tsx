import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View, type TextInputInstance } from "react-native";
import { AppText } from "../../../components/ui/AppText";
import { ChunkyButton } from "../../../components/ui/ChunkyButton";
import { Chip } from "../../../components/ui/Chip";
import { PaperCard, PaperInput } from "../../../components/ui/Paper";
import { useReflectionStore } from "../../../store/useReflectionStore";
import { useTranslation } from "../../../i18n";
import { haptics } from "../../../lib/haptics";
import type { CheckInResult, Intention } from "../../../services/types";
import { colors, spacing } from "../../../lib/design-system";
import { ConvictionPicker } from "../../intentions/ConvictionPicker";
import { SCRIPT_MIN_CHARS } from "../practiceModel";
import { PracticeShell } from "./PracticeShell";
import { WhyCard } from "./WhyCard";
import { AsterPrompt, FinishStep, MethodHeading, WishSwitcher } from "./PracticeParts";
import { sendPage } from "./practiceActions";

const STARTERS = ["where", "feel", "who"] as const;

/**
 * Script it: write a page as if the manifestation already happened, say how
 * bright it feels, and Aster answers in the margin. The page is a check-in
 * with text (the AI writes Aster's note).
 */
export function ScriptFlow({
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
  const [step, setStep] = useState(1);
  const [text, setText] = useState("");
  const [conviction, setConviction] = useState(0);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const input = useRef<TextInputInstance>(null);

  useEffect(() => {
    useReflectionStore.getState().markWhySeen("script");
  }, []);

  const enough = text.trim().length >= SCRIPT_MIN_CHARS;

  const addStarter = (k: (typeof STARTERS)[number]) => {
    haptics.tap();
    const starter = t(`practice.methods.script.starterText.${k}`);
    setText((cur) => (cur.trim() ? `${cur.trimEnd()} ${starter}` : starter));
    input.current?.focus();
  };

  const submit = async () => {
    if (!conviction || sending) return;
    setSending(true);
    setFailed(false);
    try {
      const r = await sendPage(wish.id, { text, conviction }, locale);
      useReflectionStore.getState().markPractice({ method: "script" });
      setResult(r);
      setStep(3);
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
        <MethodHeading method="script" />
        <WishSwitcher wishes={wishes} current={wish} onChange={setWish} tone="primary" />
        <WhyCard method="script" />
        <AsterPrompt text={t("practice.methods.script.prompt")} />
        <PaperCard lines={7} tilt={-0.4}>
          <PaperInput
            ref={input}
            value={text}
            onChangeText={setText}
            placeholder={t("practice.methods.script.placeholder")}
            minLines={6}
            maxLength={800}
            accessibilityLabel={t("practice.methods.script.prompt")}
          />
        </PaperCard>
        <View style={styles.starters}>
          {STARTERS.map((k) => (
            <Chip
              key={k}
              label={t(`practice.methods.script.starters.${k}`)}
              tone="primary"
              onPress={() => addStarter(k)}
            />
          ))}
        </View>
      </>
    );
    footer = (
      <View style={styles.footer}>
        {!enough && text.length > 0 ? (
          <AppText variant="bodySmall" center color={colors.text.tertiary}>
            {t("practice.methods.script.minHint")}
          </AppText>
        ) : null}
        <ChunkyButton
          label={t("practice.continue")}
          variant="primary"
          disabled={!enough}
          onPress={() => setStep(2)}
        />
      </View>
    );
  } else if (step === 2) {
    body = (
      <>
        <PaperCard lines={3} tilt={-0.4}>
          <AppText variant="script" numberOfLines={4}>
            {text.trim()}
          </AppText>
        </PaperCard>
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
        label={t("practice.methods.script.confirm")}
        variant="star"
        loading={sending}
        disabled={!conviction}
        onPress={submit}
      />
    );
  } else {
    body = <FinishStep page={text.trim()} note={result?.response} stronger={result?.strongerPhrasing} />;
    footer = <ChunkyButton label={t("practice.done")} variant="mint" onPress={onClose} />;
  }

  return (
    <PracticeShell step={step} total={3} tone="primary" stepKey={step} onClose={onClose} footer={footer}>
      {body}
    </PracticeShell>
  );
}

const styles = StyleSheet.create({
  starters: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  footer: { gap: spacing.sm },
});
