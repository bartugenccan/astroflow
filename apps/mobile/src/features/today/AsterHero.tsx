import React from "react";
import { StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { AsterMascot } from "../../components/aster/AsterMascot";
import { SpeechBubble } from "../../components/ui/SpeechBubble";
import { PressableScale } from "../../components/ui/PressableScale";
import { AppText } from "../../components/ui/AppText";
import { ChunkyProgress } from "../../components/ui/ChunkyProgress";
import { useTranslation } from "../../i18n";
import { palette, spacing } from "../../lib/design-system";
import type { MascotState } from "../../services/types";
import { asterA11y, asterLine, stageName } from "../aster/asterCopy";

/**
 * Aster at the top of Today: the mascot with today's energy under it and a
 * speech bubble. Once Aster has hatched ("Gök fısıltısı" ability), the bubble
 * carries the day's guidance title — Aster summing up the sky in one line.
 * Tapping opens Aster's Nest.
 */
export function AsterHero({ state, whisper }: { state: MascotState | null; whisper?: string | null }) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const stage = state?.stage ?? 0;
  const hatched = state?.hatched ?? false;
  const mood = state?.mood ?? "sleepy";
  const line = hatched && whisper ? whisper : asterLine(locale, mood, hatched);

  return (
    <PressableScale
      onPress={() => router.push("/aster" as Href)}
      scaleTo={0.98}
      style={styles.row}
      accessibilityRole="button"
      accessibilityLabel={`${asterA11y(t, state)}. ${line}`}
    >
      <View style={styles.aster}>
        <AsterMascot stage={stage} mood={mood} accessories={state?.equipped ?? []} size={128} />
        <AppText variant="labelLong" center color={palette.star.face} numberOfLines={1}>
          {stageName(t, stage)}
        </AppText>
        <ChunkyProgress value={(state?.energy ?? 0) / 100} tone="mint" height={8} style={styles.energy} />
      </View>
      <SpeechBubble text={line} tail="left" style={styles.bubble} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  aster: { width: 128, alignItems: "center", gap: 4 },
  energy: { width: 88 },
  bubble: { flex: 1 },
});
