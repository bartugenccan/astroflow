import React from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "../../components/ui/AppText";
import { StateView } from "../../components/ui/StateView";
import { ShimmerLines } from "../../components/ui/Shimmer";
import { PressableScale } from "../../components/ui/PressableScale";
import { TermInfo } from "../../components/TermInfo";
import { Glyph } from "../../components/Glyph";
import { PlacementInterpretation } from "../../services/types";
import { useTranslation } from "../../i18n";
import { colors, spacing, radii } from "../../lib/design-system";
import { DeepText } from "../../components/ui/DeepText";

interface Props {
  reading?: PlacementInterpretation;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  /** Show the plain-language retrograde note above the reading. */
  retrograde?: boolean;
  /** Centred suits a short line under a glyph; a reading inside a card reads better left-aligned. */
  align?: "center" | "left";
}

/** The AI paragraph shown in the chart's planet detail sheet. */
export function PlacementReading({ reading, loading, error, onRetry, retrograde, align = "center" }: Props) {
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
        <StateView kind="error" compact message={t("reading.error")} onAction={onRetry} />
      ) : (
        <DeepText
          variant="lead"
          text={reading?.text ?? ""}
          style={[styles.text, align === "left" && styles.textLeft]}
          align={align}
        />
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
  textLeft: {
    textAlign: "left",
  },
});
