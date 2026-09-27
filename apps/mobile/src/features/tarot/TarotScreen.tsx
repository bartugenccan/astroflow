import React, { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { PressableScale } from "../../components/ui/PressableScale";
import { PaywallSheet } from "../../components/PaywallSheet";
import { EnterView } from "../../lib/motion";
import { useTranslation } from "../../i18n";
import { colors, spacing } from "../../lib/design-system";
import type { TarotCategory, TarotDrawnCard } from "../../services/types";
import { FREE_DAILY_TAROT, useAppStore } from "../../store/useAppStore";
import { tarotToday, useTarotStore } from "../../store/useTarotStore";
import { CategoryStep } from "./CategoryStep";
import { ReadingStep } from "./ReadingStep";
import { TarotTable } from "./TarotTable";
import { useTarotSounds } from "./useTarotSounds";

type Phase = "category" | "table" | "reading";

/**
 * Tarot tab: theme → shuffle / stop → pick three from the fan → the cards
 * turn over and each gets a detailed reading. One free spread a day; the
 * day's spread stays reopenable from the first step.
 */
export function TarotScreen() {
  const { t, locale } = useTranslation();
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
  const [question, setQuestion] = useState("");
  const [freshDraw, setFreshDraw] = useState(false);
  const [paywall, setPaywall] = useState(false);

  const today = tarotToday();
  const todays = lastReading && lastReading.date === today ? lastReading : null;
  const usedToday = tarotDate === today ? tarotCount : 0;
  const atLimit = !isPremium && usedToday >= FREE_DAILY_TAROT;

  const onStart = useCallback(
    (c: TarotCategory, q: string) => {
      setCategory(c);
      setQuestion(q);
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
      startReading({ category, question: question || undefined, cards }, locale);
      recordTarotReading();
      setFreshDraw(true);
      setPhase("reading");
    },
    [category, question, locale, startReading, recordTarotReading],
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
              initialCategory={category}
              initialQuestion={question}
              today={todays}
              atLimit={atLimit}
              onOpenToday={openToday}
              onStart={onStart}
            />
          )}
        </EnterView>

        <PressableScale
          onPress={() => setSoundOn(!soundOn)}
          scaleTo={0.9}
          style={styles.sound}
          accessibilityRole="switch"
          accessibilityState={{ checked: soundOn }}
          accessibilityLabel={soundOn ? t("tarot.soundOn") : t("tarot.soundOff")}
          hitSlop={10}
        >
          <Ionicons
            name={soundOn ? "volume-medium-outline" : "volume-mute-outline"}
            size={20}
            color={soundOn ? colors.gold[300] : colors.text.tertiary}
          />
        </PressableScale>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink[800],
    borderWidth: 1,
    borderColor: colors.border.hairline,
  },
});
