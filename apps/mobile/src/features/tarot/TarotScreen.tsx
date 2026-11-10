import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { IconButton } from "../../components/ui/IconButton";
import { PaywallSheet } from "../../components/PaywallSheet";
import { EnterView } from "../../lib/motion";
import { useTranslation } from "../../i18n";
import { spacing } from "../../lib/design-system";
import type { TarotCategory, TarotDrawnCard, TarotSpreadKey } from "../../services/types";
import { useMascotStore } from "../../store/useMascotStore";
import { FREE_DAILY_TAROT, useAppStore } from "../../store/useAppStore";
import { tarotToday, useTarotStore } from "../../store/useTarotStore";
import { CategoryStep } from "./CategoryStep";
import { ReadingStep } from "./ReadingStep";
import { TarotTable } from "./TarotTable";
import { useTarotSounds } from "./useTarotSounds";

type Phase = "category" | "table" | "reading";

/** Same cap as the question field. */
const MAX_QUESTION = 200;

/** `?q=` arrives decoded from expo-router; tolerate arrays, blanks and junk. */
function questionParam(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (typeof value !== "string") return null;
  const q = value.replace(/\s+/g, " ").trim().slice(0, MAX_QUESTION);
  return q.length > 0 ? q : null;
}

/**
 * Tarot tab: theme → shuffle / stop → pick three from the fan → the cards
 * turn over and each gets a detailed reading. One free spread a day; the
 * day's spread stays reopenable from the first step.
 *
 * Deep link: `/(tabs)/tarot?q=<question>` (the plan's TAROT step) opens the
 * first step with the question already written in.
 */
export function TarotScreen() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ q?: string | string[] }>();
  const sounds = useTarotSounds();
  const soundOn = useTarotStore((s) => s.soundOn);
  const setSoundOn = useTarotStore((s) => s.setSoundOn);
  const lastReading = useTarotStore((s) => s.lastReading);
  const startReading = useTarotStore((s) => s.startReading);
  const isPremium = useAppStore((s) => s.isPremium);
  const tarotDate = useAppStore((s) => s.tarotDate);
  const tarotCount = useAppStore((s) => s.tarotCount);
  const recordTarotReading = useAppStore((s) => s.recordTarotReading);

  const [phase, setPhase] = useState<Phase>("category");
  const [category, setCategory] = useState<TarotCategory | null>(null);
  const [spreadKey, setSpreadKey] = useState<TarotSpreadKey>("three");
  const passes = useMascotStore((s) => s.state?.passesToday?.tarot ?? 0);
  const [question, setQuestion] = useState("");
  const [freshDraw, setFreshDraw] = useState(false);
  const [paywall, setPaywall] = useState(false);
  // Remounts the first step so a deep-linked question replaces what was typed.
  const [formKey, setFormKey] = useState(0);
  const [prefilled, setPrefilled] = useState(false);

  const linkedQuestion = questionParam(params.q);
  useEffect(() => {
    if (!linkedQuestion) return;
    setQuestion(linkedQuestion);
    setPrefilled(true);
    setPhase("category");
    setFormKey((k) => k + 1);
    // Consume the param, so the same link opened again later still applies.
    router.setParams({ q: undefined });
  }, [linkedQuestion, router]);

  const today = tarotToday();
  const todays = lastReading && lastReading.date === today ? lastReading : null;
  const usedToday = tarotDate === today ? tarotCount : 0;
  // A bought taste (tarotPass) adds to today's free reading.
  const atLimit = !isPremium && usedToday >= FREE_DAILY_TAROT + passes;

  const onStart = useCallback(
    (c: TarotCategory, q: string, sp: TarotSpreadKey) => {
      setCategory(c);
      setQuestion(q);
      setSpreadKey(sp);
      if (atLimit) {
        setPaywall(true);
        return;
      }
      setPhase("table");
    },
    [atLimit],
  );

  const onComplete = useCallback(
    (cards: TarotDrawnCard[]) => {
      if (!category) return;
      startReading(
        { category, question: question || undefined, cards, ...(spreadKey === "three" ? {} : { spread: spreadKey }) },
        locale,
      );
      recordTarotReading();
      setFreshDraw(true);
      setPhase("reading");
    },
    [category, question, spreadKey, locale, startReading, recordTarotReading],
  );

  const openToday = useCallback(() => {
    setFreshDraw(false);
    setPhase("reading");
  }, []);

  return (
    <ScreenWrapper>
      <View style={styles.root}>
        <EnterView key={phase} from="none" style={styles.phase}>
          {phase === "table" && category ? (
            <View style={styles.tableWrap}>
              <TarotTable
                category={category}
                spread={spreadKey}
                sounds={sounds}
                onComplete={onComplete}
                onChangeTheme={() => setPhase("category")}
              />
            </View>
          ) : phase === "reading" && lastReading ? (
            <ReadingStep
              key={locale}
              spread={lastReading.spread}
              freshDraw={freshDraw}
              onFlip={sounds.playFlip}
              onNewReading={() => setPhase("category")}
            />
          ) : (
            <CategoryStep
              key={formKey}
              prefilled={prefilled}
              initialCategory={category}
              initialQuestion={question}
              today={todays}
              atLimit={atLimit}
              onOpenToday={openToday}
              onStart={onStart}
              onPremium={() => setPaywall(true)}
            />
          )}
        </EnterView>

        <IconButton
          icon={soundOn ? "volume-medium" : "volume-mute"}
          onPress={() => setSoundOn(!soundOn)}
          tone={soundOn ? "star" : "night"}
          size={40}
          style={styles.sound}
          accessibilityLabel={soundOn ? t("tarot.soundOn") : t("tarot.soundOff")}
        />
      </View>

      <PaywallSheet visible={paywall} onClose={() => setPaywall(false)} variant="premium" />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  phase: { flex: 1 },
  tableWrap: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 96,
  },
  sound: {
    position: "absolute",
    top: spacing.md,
    right: spacing.lg,
  },
});
