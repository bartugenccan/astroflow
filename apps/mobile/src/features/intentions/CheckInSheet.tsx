import React, { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SpringBottomSheet } from "../../components/ui/SpringBottomSheet";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { AppText } from "../../components/ui/AppText";
import { SpeechBubble } from "../../components/ui/SpeechBubble";
import { AsterMascot } from "../../components/aster/AsterMascot";
import { EnterView } from "../../lib/motion";
import { ConvictionPicker } from "./ConvictionPicker";
import { astrologyApi } from "../../services/astrologyApi";
import { useMascotStore, NO_EQUIPPED } from "../../store/useMascotStore";
import type { CheckInResult } from "../../services/types";
import { useTranslation } from "../../i18n";
import { colors, depth, palette, radii, spacing, surface, typography } from "../../lib/design-system";

interface CheckInSheetProps {
  visible: boolean;
  onClose: () => void;
  intentionId: string;
  affirmation: string;
  onResult: (r: CheckInResult) => void;
}

/**
 * Check in on a wish: say the affirmation, set how bright it feels (1–5) on a
 * star slider, add a note if you like, and Aster answers. The answer feeds
 * Aster — Işık, level-ups, milestones and shields queue app-wide.
 */
export function CheckInSheet({ visible, onClose, intentionId, affirmation, onResult }: CheckInSheetProps) {
  const { t, locale } = useTranslation();
  const mascot = useMascotStore((s) => s.state);
  const [conviction, setConviction] = useState(0);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);

  const reset = () => {
    setConviction(0);
    setNote("");
    setResult(null);
    setSubmitting(false);
    setFailed(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    if (conviction === 0 || submitting) return;
    setSubmitting(true);
    setFailed(false);
    try {
      const r = await astrologyApi.checkInIntention(
        intentionId,
        { conviction, userText: note.trim() || undefined },
        locale,
      );
      setResult(r);
      onResult(r);
      // Feed Aster: celebrations (Işık, level-up, milestone, shield) queue app-wide.
      useMascotStore.getState().applyDelta(r.mascot, {
        milestoneName: r.milestoneName,
        shieldsUsed: r.streak.shieldsUsed,
      });
    } catch {
      // Stay on the input step so the user can retry.
      setFailed(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SpringBottomSheet visible={visible} onClose={close} title={t("wish.checkin.title")}>
      {result ? (
        <View style={styles.wrap}>
          {result.dayCompleted ? (
            // A quiet tick in place; the Işık arrives once, in the reward pill.
            <EnterView scale style={styles.celebrate}>
              <Ionicons name="checkmark-circle" size={22} color={colors.star[200]} />
              <AppText variant="heading" color={colors.star[200]} style={styles.shrink}>
                {t("wish.checkin.dayComplete")}
              </AppText>
            </EnterView>
          ) : null}

          <EnterView index={1} style={styles.reply}>
            <AsterMascot
              stage={mascot?.stage ?? 1}
              mood={mascot?.mood ?? "happy"}
              accessories={mascot?.equipped ?? NO_EQUIPPED}
              size={72}
              action="cheer"
            />
            <SpeechBubble tail="left" style={styles.flex}>
              <AppText variant="body" color={colors.text.primary}>
                {result.response}
              </AppText>
            </SpeechBubble>
          </EnterView>

          {result.strongerPhrasing ? (
            <EnterView index={2} style={styles.stronger}>
              <AppText variant="label" color={colors.text.accent}>
                {t("wish.checkin.stronger")}
              </AppText>
              <AppText variant="lead">“{result.strongerPhrasing}”</AppText>
            </EnterView>
          ) : null}

          {result.followUp ? <AppText variant="body">{result.followUp}</AppText> : null}

          <ChunkyButton label={t("wish.checkin.done")} onPress={close} />
        </View>
      ) : (
        <View style={styles.wrap}>
          <AppText variant="lead" center>
            “{affirmation}”
          </AppText>

          <ConvictionPicker value={conviction} onChange={setConviction} />

          <View style={styles.block}>
            <AppText variant="labelLong" color={colors.text.accent}>
              {t("wish.checkin.noteLabel")}
            </AppText>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t("wish.checkin.notePlaceholder")}
              placeholderTextColor={colors.text.tertiary}
              style={styles.input}
              multiline
              maxLength={500}
              accessibilityLabel={t("wish.checkin.noteLabel")}
            />
          </View>

          {failed ? (
            <AppText variant="bodySmall" color={colors.semantic.error} accessibilityLiveRegion="polite">
              {t("wish.checkin.error")}
            </AppText>
          ) : null}

          <ChunkyButton
            label={t("wish.checkin.submit")}
            variant="star"
            onPress={submit}
            loading={submitting}
            disabled={conviction === 0}
            icon={<Ionicons name="star" size={18} color={palette.star.on} />}
          />
        </View>
      )}
    </SpringBottomSheet>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xl },
  block: { gap: spacing.md },
  flex: { flex: 1 },
  shrink: { flexShrink: 1 },
  celebrate: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  reply: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  stronger: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border.chunky,
    borderBottomWidth: depth.sm + 1,
    borderBottomColor: surface.slab,
    backgroundColor: surface.card,
  },
  input: {
    ...typography.body,
    color: colors.text.primary,
    minHeight: 80,
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border.chunky,
    backgroundColor: surface.raised,
    textAlignVertical: "top",
  },
});
