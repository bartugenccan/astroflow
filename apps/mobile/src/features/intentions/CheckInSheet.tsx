import React, { useState } from "react";
import { StyleSheet, View, TextInput } from "react-native";
import * as Haptics from "expo-haptics";
import { MotiView } from "moti";
import { Ionicons } from "@expo/vector-icons";
import { SpringBottomSheet } from "../../components/ui/SpringBottomSheet";
import { GoldButton } from "../../components/ui/GoldButton";
import { AppText } from "../../components/ui/AppText";
import { DotRating } from "../../components/ui/DotRating";
import { CelestialLoader } from "../../components/ui/CelestialLoader";
import { astrologyApi } from "../../services/astrologyApi";
import { CheckInResult } from "../../services/types";
import { useTranslation } from "../../i18n";
import { colors, spacing, radii, fonts } from "../../lib/design-system";

interface CheckInSheetProps {
  visible: boolean;
  onClose: () => void;
  intentionId: string;
  affirmation: string;
  onResult: (r: CheckInResult) => void;
}

export function CheckInSheet({ visible, onClose, intentionId, affirmation, onResult }: CheckInSheetProps) {
  const { t, locale } = useTranslation();
  const [conviction, setConviction] = useState(0);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);

  const reset = () => {
    setConviction(0);
    setNote("");
    setResult(null);
    setSubmitting(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async () => {
    if (conviction === 0 || submitting) return;
    setSubmitting(true);
    try {
      const r = await astrologyApi.checkInIntention(
        intentionId,
        { conviction, userText: note.trim() || undefined },
        locale,
      );
      setResult(r);
      onResult(r);
      if (r.dayCompleted) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
    } catch {
      // stay on the input step so the user can retry
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SpringBottomSheet visible={visible} onClose={close} title={t("intentions.checkInTitle")}>
      {result ? (
        <View style={styles.replyWrap}>
          {result.dayCompleted ? (
            <MotiView
              from={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", damping: 12 }}
              style={styles.celebrate}
            >
              <Ionicons name="sparkles" size={22} color={colors.gold[200]} />
              <AppText variant="heading" color={colors.gold[200]}>
                {t("intentions.dayComplete")}
              </AppText>
            </MotiView>
          ) : null}

          <AppText variant="serifBody">{result.response}</AppText>

          {result.strongerPhrasing ? (
            <View style={styles.stronger}>
              <AppText variant="label" color={colors.text.gold}>
                {t("intentions.strongerPhrasing")}
              </AppText>
              <AppText variant="body" color={colors.text.primary} style={styles.strongerText}>
                “{result.strongerPhrasing}”
              </AppText>
            </View>
          ) : null}

          {result.followUp ? (
            <AppText variant="body" color={colors.text.secondary}>
              {result.followUp}
            </AppText>
          ) : null}

          <GoldButton label={t("common.done")} onPress={close} style={{ marginTop: spacing.md }} />
        </View>
      ) : (
        <View style={styles.inputWrap}>
          <AppText variant="serifBody" center>
            “{affirmation}”
          </AppText>

          <View style={styles.ratingBlock}>
            <AppText variant="body" center color={colors.text.secondary}>
              {t("intentions.convictionQ")}
            </AppText>
            <DotRating value={conviction} onChange={setConviction} />
          </View>

          <View style={styles.noteBlock}>
            <AppText variant="label" color={colors.text.gold}>
              {t("intentions.noteLabel")}
            </AppText>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t("intentions.notePlaceholder")}
              placeholderTextColor={colors.text.tertiary}
              style={styles.input}
              multiline
            />
          </View>

          {submitting ? (
            <View style={styles.loading}>
              <CelestialLoader size="sm" />
            </View>
          ) : (
            <GoldButton
              label={t("intentions.submit")}
              onPress={submit}
              disabled={conviction === 0}
            />
          )}
        </View>
      )}
    </SpringBottomSheet>
  );
}

const styles = StyleSheet.create({
  inputWrap: {
    gap: spacing.xl,
  },
  ratingBlock: {
    gap: spacing.md,
    alignItems: "center",
  },
  noteBlock: {
    gap: spacing.sm,
  },
  input: {
    minHeight: 80,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    backgroundColor: colors.ink[800],
    padding: spacing.lg,
    color: colors.text.primary,
    fontFamily: fonts.sans,
    fontSize: 15,
    textAlignVertical: "top",
  },
  loading: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  replyWrap: {
    gap: spacing.lg,
  },
  celebrate: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  stronger: {
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    backgroundColor: colors.ink[800],
  },
  strongerText: {
    fontStyle: "italic",
  },
});
