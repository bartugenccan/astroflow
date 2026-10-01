import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { GoldButton } from "../../components/ui/GoldButton";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { ShimmerLines } from "../../components/ui/Shimmer";
import type { ElectionFactor, ElectionHourWindow, ElectionVerdict } from "../../services/types";
import { TranslationKey, useTranslation } from "../../i18n";
import { colors, radii, spacing } from "../../lib/design-system";

export function verdictColor(v: ElectionVerdict): string {
  if (v === "excellent") return colors.semantic.harmonic;
  if (v === "good") return colors.gold[300];
  if (v === "mixed") return colors.semantic.neutral;
  return colors.semantic.challenging;
}

export function VerdictBadge({ verdict }: { verdict: ElectionVerdict }) {
  const { t } = useTranslation();
  const color = verdictColor(verdict);
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <AppText variant="bodySmall" color={color}>
        {t(`election.verdict.${verdict}` as TranslationKey)}
      </AppText>
    </View>
  );
}

/** Each computed reason, green for what helps and rose for what hurts, with its weight. */
export function FactorList({ factors }: { factors: ElectionFactor[] }) {
  return (
    <View style={styles.factors}>
      {factors.map((f, i) => {
        const color =
          f.tone === "good" ? colors.semantic.harmonic : f.tone === "bad" ? colors.semantic.challenging : colors.semantic.neutral;
        return (
          <View key={`${f.key}-${i}`} style={styles.factor}>
            <Ionicons
              name={f.tone === "good" ? "add-circle" : f.tone === "bad" ? "remove-circle" : "ellipse-outline"}
              size={18}
              color={color}
            />
            <AppText variant="body" color={colors.text.primary} style={styles.factorText}>
              {f.label}
            </AppText>
            <AppText variant="numeric" color={color} style={styles.impact}>
              {f.impact > 0 ? `+${f.impact}` : f.impact}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

/** The day's strongest stretches by the event chart, best first. */
export function HourWindows({ hours, place }: { hours: ElectionHourWindow[]; place: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.hours}>
      {hours.map((h, i) => (
        <View key={h.from} style={[styles.hour, i === 0 && styles.hourBest]}>
          <View style={styles.hourHead}>
            <Ionicons name={i === 0 ? "star" : "time-outline"} size={14} color={i === 0 ? colors.text.onGold : colors.gold[300]} />
            <AppText variant="heading" color={i === 0 ? colors.text.onGold : colors.text.primary}>
              {h.from}–{h.to}
            </AppText>
          </View>
          <AppText variant="bodySmall" color={i === 0 ? colors.text.onGold : colors.text.secondary}>
            {h.highlights.join(" · ")}
          </AppText>
        </View>
      ))}
      <AppText variant="bodySmall" color={colors.text.tertiary}>
        {t("election.hoursNote", { place })}
      </AppText>
    </View>
  );
}

/** A reading section that shimmers until the AI text arrives. */
export function ReadingSection({ title, text, loading }: { title?: string; text?: string; loading: boolean }) {
  return (
    <View style={styles.section}>
      {title ? (
        <AppText variant="label" color={colors.text.gold}>
          {title}
        </AppText>
      ) : null}
      {text ? (
        <AppText variant="body" color={colors.text.primary} style={styles.sectionBody}>
          {text}
        </AppText>
      ) : loading ? (
        <ShimmerLines lines={3} />
      ) : null}
    </View>
  );
}

export function SectionTitle({ children }: { children: string }) {
  return (
    <AppText variant="label" color={colors.text.gold} style={styles.sectionTitle}>
      {children}
    </AppText>
  );
}

export function ErrorCard({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <HairlineCard style={styles.error}>
      <AppText variant="body">{t("election.resultError")}</AppText>
      <GoldButton label={t("common.retry")} variant="ghost" onPress={onRetry} />
    </HairlineCard>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  factors: { gap: spacing.md },
  factor: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  factorText: { flex: 1, minWidth: 0 },
  impact: { minWidth: 30, textAlign: "right", fontSize: 15 },
  hours: { gap: spacing.sm },
  hour: {
    gap: 2,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    backgroundColor: colors.ink[800],
  },
  hourBest: {
    backgroundColor: colors.gold[400],
    borderColor: colors.gold[400],
  },
  hourHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  section: { gap: spacing.sm },
  sectionBody: { lineHeight: 24 },
  sectionTitle: { marginTop: spacing.sm },
  error: { gap: spacing.md },
});
