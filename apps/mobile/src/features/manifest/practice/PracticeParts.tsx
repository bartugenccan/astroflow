import React from "react";
import { StyleSheet, View } from "react-native";
import { BleedRow } from "../../../components/ui/BleedRow";
import { Ionicons } from "@expo/vector-icons";
import Animated from "react-native-reanimated";
import { AppText } from "../../../components/ui/AppText";
import { AsterMascot } from "../../../components/aster/AsterMascot";
import { Chip } from "../../../components/ui/Chip";
import { PaperCard } from "../../../components/ui/Paper";
import { SpeechBubble } from "../../../components/ui/SpeechBubble";
import { useMascotStore, NO_EQUIPPED } from "../../../store/useMascotStore";
import { useMotion } from "../../../lib/motion";
import { useTranslation, type TranslationKey } from "../../../i18n";
import type { Intention, PracticeMethod } from "../../../services/types";
import { colors, palette, paper, spacing, type Tone } from "../../../lib/design-system";
import { METHOD_LOOK } from "../practiceModel";

/** The method's name with its icon, above the first step. */
export function MethodHeading({ method }: { method: PracticeMethod }) {
  const { t } = useTranslation();
  const look = METHOD_LOOK[method];
  const tone = palette[look.tone];
  return (
    <View style={styles.heading}>
      <View style={[styles.headIcon, { backgroundColor: tone.face }]} importantForAccessibility="no-hide-descendants">
        <Ionicons name={look.icon} size={18} color={tone.on} />
      </View>
      <AppText variant="title" accessibilityRole="header" style={styles.flex}>
        {t(`practice.methods.${method}.name` as TranslationKey)}
      </AppText>
    </View>
  );
}

/** Aster asking the step's question, small, beside its bubble. */
export function AsterPrompt({ text }: { text: string }) {
  const stage = useMascotStore((s) => s.state?.stage ?? 1);
  const mood = useMascotStore((s) => s.state?.mood ?? "happy");
  const accessories = useMascotStore((s) => s.state?.equipped ?? NO_EQUIPPED);
  return (
    <View style={styles.prompt}>
      <AsterMascot stage={Math.max(1, stage)} mood={mood} action="idle" size={56} accessories={accessories} />
      <SpeechBubble tail="left" style={styles.flex}>
        <AppText variant="body" color={palette.cloud.on}>
          {text}
        </AppText>
      </SpeechBubble>
    </View>
  );
}

/** Which manifestation this practice is for — chips when there is more than one. */
export function WishSwitcher({
  wishes,
  current,
  onChange,
  tone = "star",
}: {
  wishes: Intention[];
  current: Intention;
  onChange: (w: Intention) => void;
  tone?: Tone;
}) {
  const { t } = useTranslation();
  if (wishes.length <= 1) {
    return (
      <AppText variant="labelLong" color={colors.text.secondary} numberOfLines={2}>
        {t("practice.forWish", { goal: current.goalText })}
      </AppText>
    );
  }
  return (
    <View style={styles.switcher}>
      <AppText variant="labelLong" color={colors.text.secondary}>
        {t("practice.pickWish")}
      </AppText>
      <BleedRow contentContainerStyle={styles.chips}>
        {wishes.map((w) => (
          <Chip
            key={w.id}
            label={w.goalText.length > 28 ? `${w.goalText.slice(0, 27)}…` : w.goalText}
            tone={tone}
            selected={w.id === current.id}
            onPress={() => onChange(w)}
          />
        ))}
      </BleedRow>
    </View>
  );
}

/**
 * The last step of every practice: what was written stays on the page, and
 * Aster's reply lands in the margin like a note. Ends on one "Done".
 */
export function FinishStep({
  title,
  page,
  note,
  stronger,
  children,
}: {
  title?: string;
  /** What the user wrote (shown on paper). */
  page?: string | string[];
  /** Aster's reply. */
  note?: string | null;
  /** A stronger phrasing Aster suggests. */
  stronger?: string | null;
  children?: React.ReactNode;
}) {
  const { t } = useTranslation();
  const m = useMotion();
  const stage = useMascotStore((s) => s.state?.stage ?? 1);
  const accessories = useMascotStore((s) => s.state?.equipped ?? NO_EQUIPPED);
  const lines = page === undefined ? [] : Array.isArray(page) ? page.filter(Boolean) : [page];

  return (
    <View style={styles.finish}>
      <View style={styles.finishHead}>
        <AsterMascot
          stage={Math.max(1, stage)}
          mood="glowing"
          action={m.reduced ? "idle" : "cheer"}
          playKey={1}
          size={88}
          accessories={accessories}
        />
        <AppText variant="title" center accessibilityRole="header">
          {title ?? t("practice.finish.title")}
        </AppText>
      </View>

      {lines.length ? (
        <PaperCard lines={Math.min(8, Math.max(2, lines.length + 1))} tilt={-0.6}>
          {lines.map((l, i) => (
            <AppText key={i} variant="script">
              {l}
            </AppText>
          ))}
        </PaperCard>
      ) : null}

      {note ? (
        <Animated.View entering={m.enter("pop", 200)}>
          <PaperCard plain lines={2} tilt={1} style={styles.note}>
            <AppText variant="label" color={paper.inkSoft}>
              {t("practice.finish.asterNote")}
            </AppText>
            <AppText variant="script" color={paper.ink}>
              {note}
            </AppText>
          </PaperCard>
        </Animated.View>
      ) : null}

      {stronger ? (
        <View style={styles.stronger}>
          <AppText variant="label" color={colors.text.accent}>
            {t("practice.finish.stronger")}
          </AppText>
          <AppText variant="lead">“{stronger}”</AppText>
        </View>
      ) : null}

      {children}

      <AppText variant="bodySmall" center color={colors.text.tertiary}>
        {t("practice.footnote")}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  heading: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  prompt: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  switcher: { gap: spacing.sm },
  chips: { gap: spacing.sm },
  finish: { gap: spacing.lg },
  finishHead: { alignItems: "center", gap: spacing.sm },
  note: { marginHorizontal: spacing.lg },
  stronger: { gap: spacing.xs },
});
