import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { BackButton } from "../../components/ui/BackButton";
import { AppText } from "../../components/ui/AppText";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { ChunkyProgress } from "../../components/ui/ChunkyProgress";
import { AsterMascot } from "../../components/aster/AsterMascot";
import { useMascotStore } from "../../store/useMascotStore";
import { useTranslation } from "../../i18n";
import { palette, spacing } from "../../lib/design-system";

const TOTAL = 60; // seconds — five 4·4·4 cycles
const PHASE = 4;
const PHASES = ["inhale", "hold", "exhale"] as const;

/**
 * One guided minute: Aster swells as you breathe in, rests while you hold and
 * shrinks as you breathe out (Aster's "breathe" motion runs the same 4·4·4
 * clock). Finishing feeds Aster once a day.
 */
export function AsterBreatheScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const stage = useMascotStore((s) => s.state?.stage ?? 0);
  const accessories = useMascotStore((s) => s.state?.equipped ?? []);
  const report = useMascotStore((s) => s.report);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const reported = useRef(false);

  useEffect(() => {
    if (!running) return;
    const started = Date.now() - elapsed * 1000;
    const timer = setInterval(() => {
      const s = Math.min(TOTAL, Math.floor((Date.now() - started) / 1000));
      setElapsed((prev) => {
        if (s !== prev && s % PHASE === 0 && s < TOTAL) {
          Haptics.selectionAsync().catch(() => undefined);
        }
        return s;
      });
      if (s >= TOTAL) {
        clearInterval(timer);
        setRunning(false);
        setDone(true);
      }
    }, 250);
    return () => clearInterval(timer);
    // `elapsed` only seeds the clock when (re)starting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  useEffect(() => {
    if (done && !reported.current) {
      reported.current = true;
      report("BREATH");
    }
  }, [done, report]);

  const phase = PHASES[Math.floor(elapsed / PHASE) % PHASES.length];
  const label = done ? t("aster.breathe.done") : running ? t(`aster.breathe.${phase}`) : t("aster.breathe.subtitle");

  return (
    <ScreenWrapper variant="still" edges={["top", "bottom"]}>
      <View style={styles.topBar}>
        <BackButton />
      </View>
      <View style={styles.body}>
        <AppText variant="title" center>
          {t("aster.breathe.title")}
        </AppText>
        <View style={styles.stage}>
          <AsterMascot
            stage={Math.max(1, stage)}
            mood={done ? "glowing" : "happy"}
            accessories={accessories}
            action={running ? "breathe" : done ? "cheer" : "idle"}
            playKey={done ? 1 : 0}
            size={240}
          />
        </View>
        <AppText
          variant={running ? "display" : "lead"}
          center
          color={running ? palette.mint.face : undefined}
          accessibilityLiveRegion="polite"
        >
          {label}
        </AppText>
        {running ? (
          <View style={styles.progress}>
            <ChunkyProgress value={elapsed / TOTAL} tone="mint" />
            <AppText variant="bodySmall" center>
              {t("aster.breathe.remaining", { n: TOTAL - elapsed })}
            </AppText>
          </View>
        ) : null}
      </View>
      <View style={styles.footer}>
        {done ? (
          <ChunkyButton label={t("aster.breathe.finish")} variant="mint" onPress={() => router.back()} />
        ) : !running ? (
          <ChunkyButton label={t("aster.breathe.start")} variant="mint" onPress={() => setRunning(true)} />
        ) : null}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  body: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl, gap: spacing.lg },
  stage: { height: 280, alignItems: "center", justifyContent: "center" },
  progress: { alignSelf: "stretch", gap: spacing.sm },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, minHeight: 80 },
});
