import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { ShimmerLines } from "../../components/ui/Shimmer";
import { PlacementInterpretation } from "../../services/types";
import { useTranslation } from "../../i18n";
import { colors, spacing } from "../../lib/design-system";

interface Props {
  reading?: PlacementInterpretation;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

/** The AI paragraph shown in the chart's planet detail sheet. */
export function PlacementReading({ reading, loading, error, onRetry }: Props) {
  const { t } = useTranslation();

  // Keep one stable outer container across all three states so the loaded text
  // replaces the shimmer in place — swapping the top-level element would change
  // the sheet's content height and snap the ScrollView back to the top.
  return (
    <View style={styles.wrap}>
      {loading && !reading ? (
        <ShimmerLines lines={4} />
      ) : error && !reading ? (
        <Pressable style={styles.retry} onPress={onRetry}>
          <Ionicons name="refresh" size={16} color={colors.gold[300]} />
          <AppText variant="body" color={colors.gold[300]}>
            {t("reading.retry")}
          </AppText>
        </Pressable>
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
