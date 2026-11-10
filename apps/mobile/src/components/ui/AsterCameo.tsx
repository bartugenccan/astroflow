import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { AsterMascot } from "../aster/AsterMascot";
import type { AsterAction } from "../aster/types";
import { SpeechBubble } from "./SpeechBubble";
import { useMascotStore, NO_EQUIPPED } from "../../store/useMascotStore";
import { useTranslation } from "../../i18n";
import { asterA11y } from "../../features/aster/asterCopy";
import { spacing } from "../../lib/design-system";
import type { MascotMood } from "../../services/types";

interface AsterCameoProps {
  /** What Aster says. Omit for Aster alone. */
  text?: string;
  /** Aster's size in px. */
  size?: number;
  action?: AsterAction;
  /** Force a mood (e.g. sleepy for an error); defaults to Aster's real mood. */
  mood?: MascotMood;
  /** Before onboarding finishes there is no state yet: draw the egg. */
  stage?: number;
  /** Bubble beside Aster (row) or above it (column). */
  layout?: "row" | "column";
  style?: StyleProp<ViewStyle>;
}

/**
 * A small Aster with a speech bubble — the companion's face on screens that
 * aren't about Aster (headers, empty states, onboarding steps). Wears what
 * the user dressed it in, so it always feels like *their* Aster.
 */
export function AsterCameo({ text, size = 72, action = "talk", mood, stage, layout = "row", style }: AsterCameoProps) {
  // Only what the cameo draws: an unrelated change to Aster's state (a quest
  // ticking, stardust) leaves every cameo on screen alone.
  const hasState = useMascotStore((s) => s.state !== null);
  const storeStage = useMascotStore((s) => s.state?.stage);
  const storeMood = useMascotStore((s) => s.state?.mood);
  const equipped = useMascotStore((s) => s.state?.equipped ?? NO_EQUIPPED);
  const { t } = useTranslation();
  const resolvedStage = stage ?? storeStage ?? 0;

  return (
    <View style={[layout === "row" ? styles.row : styles.column, style]}>
      <AsterMascot
        stage={resolvedStage}
        mood={mood ?? storeMood ?? "happy"}
        accessories={equipped}
        size={size}
        action={action}
        accessibilityLabel={asterA11y(
          t,
          hasState && storeMood ? { stage: resolvedStage, mood: mood ?? storeMood } : null,
        )}
      />
      {text ? (
        <SpeechBubble
          text={text}
          tail={layout === "row" ? "left" : "bottom"}
          style={layout === "row" ? styles.bubbleRow : styles.bubbleColumn}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  column: { alignItems: "center", gap: spacing.md, flexDirection: "column-reverse" },
  bubbleRow: { flex: 1, minWidth: 0 },
  bubbleColumn: { alignSelf: "stretch" },
});
