import React from "react";
import { StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PressableScale } from "./ui/PressableScale";
import { useUiStore } from "../store/useUiStore";
import { useTranslation } from "../i18n";
import { GlossaryTermId, termText } from "../lib/glossary";
import { colors } from "../lib/design-system";

interface TermInfoProps {
  term: GlossaryTermId;
  size?: number;
  color?: string;
}

/**
 * The small ⓘ that sits next to any piece of jargon. Tapping it opens the
 * app-wide glossary sheet on that term (short answer first, detail on demand).
 */
export function TermInfo({ term, size = 15, color = colors.gold[300] }: TermInfoProps) {
  const openTerm = useUiStore((s) => s.openTerm);
  const { t } = useTranslation();
  return (
    <PressableScale
      onPress={() => openTerm(term)}
      hitSlop={12}
      scaleTo={0.8}
      haptic="light"
      style={styles.hit}
      accessibilityRole="button"
      accessibilityLabel={`${t("glossary.ui.whatIs")} ${termText(t, term, "title")}`}
    >
      <Ionicons name="information-circle-outline" size={size} color={color} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  hit: {
    opacity: 0.9,
  },
});
