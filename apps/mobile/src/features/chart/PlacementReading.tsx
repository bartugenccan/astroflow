import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { ShimmerLines } from "../../components/ui/Shimmer";
import { PressableScale } from "../../components/ui/PressableScale";
import { TermInfo } from "../../components/TermInfo";
import { Glyph } from "../../components/Glyph";
import { PlacementInterpretation } from "../../services/types";
import { useTranslation } from "../../i18n";
import { colors, spacing, radii } from "../../lib/design-system";

interface Props {
  reading?: PlacementInterpretation;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  /** Show the plain-language retrograde note above the reading. */
  retrograde?: boolean;
}

/** The AI paragraph shown in the chart's planet detail sheet. */
export function PlacementReading({ reading, loading, error, onRetry, retrograde }: Props) {
  const { t } = useTranslation();

  // Keep one stable outer container across all three states so the loaded text
  // replaces the shimmer in place — swapping the top-level element would change
  // the sheet's content height and snap the ScrollView back to the top.
  return (
    <View style={styles.wrap}>
      {retrograde ? (
        <View style={styles.retroNote}>
          <View style={styles.retroGlyph}>
            <Glyph name="Retrograde" size={16} color={colors.semantic.challenging} />
          </View>
          <View style={styles.retroText}>
            <View style={styles.retroTitleRow}>
              <AppText
                variant="labelLong"
                color={colors.semantic.challenging}
                style={styles.shrink}
              >
                {t("astro.retrogradeLong")}
              </AppText>
              <TermInfo term="retrograde" size={14} />
            </View>
            <AppText variant="bodySmall" color={colors.text.secondary}>
              {t("astro.retrogradeHint")}
            </AppText>
          </View>
        </View>
      ) : null}
      {loading && !reading ? (
        <ShimmerLines lines={4} />
      ) : error && !reading ? (
        <PressableScale style={styles.retry} onPress={onRetry} accessibilityRole="button">
          <Ionicons name="refresh" size={16} color={colors.gold[300]} />
          <AppText variant="body" color={colors.gold[300]}>
            {t("reading.retry")}
          </AppText>
        </PressableScale>
      ) : (
        <AppText variant="serifBody" style={styles.text}>
          {reading?.text ?? ""}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: spacing.md,
    alignSelf: "stretch",
  },
  retroNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
  },
  retroGlyph: {
    paddingTop: 1,
  },
  retroText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  retroTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  shrink: {
    flexShrink: 1,
    minWidth: 0,
  },
  text: {
    textAlign: "center",
    marginTop: spacing.sm,
  },
  retry: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
});
