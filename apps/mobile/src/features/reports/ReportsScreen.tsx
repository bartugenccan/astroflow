import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { BackButton } from "../../components/ui/BackButton";
import { GoldButton } from "../../components/ui/GoldButton";
import { HairlineCard } from "../../components/ui/HairlineCard";
import { PressableScale } from "../../components/ui/PressableScale";
import { CelestialLoader } from "../../components/ui/CelestialLoader";
import { Glyph } from "../../components/Glyph";
import { PaywallSheet } from "../../components/PaywallSheet";
import { EnterView } from "../../lib/motion";
import { colors, motion, radii, spacing } from "../../lib/design-system";
import { formatDayMonthYear } from "../../lib/dates";
import { TranslationKey, useTranslation } from "../../i18n";
import { useAppStore } from "../../store/useAppStore";
import type { ReportKind, ReportMeta } from "../../services/types";
import { REPORTS_PER_DAY, ReportError, useReports } from "./useReports";

const KINDS: { kind: ReportKind; glyph: string; pages: number }[] = [
  { kind: "natal", glyph: "Sun", pages: 30 },
  { kind: "transit", glyph: "Saturn", pages: 30 },
];

/**
 * "My reports": start a birth-chart or transit PDF, watch it being written,
 * then open, share or delete it. Opened with `?kind=` from the chart and
 * transit screens, which highlights that report.
 */
export function ReportsScreen() {
  const { t, locale } = useTranslation();
  const params = useLocalSearchParams<{ kind?: string }>();
  const focus: ReportKind | null = params.kind === "natal" || params.kind === "transit" ? params.kind : null;
  const isPremium = useAppStore((s) => s.isPremium);
  const [paywall, setPaywall] = useState(false);
  const { reports, creating, making, error, create, open, remove, activeJob, hasFile } = useReports();

  const onCreate = (kind: ReportKind) => {
    if (!isPremium) {
      setPaywall(true);
      return;
    }
    create(kind);
  };

  const onDelete = (meta: ReportMeta) => {
    Alert.alert(kindTitle(t, meta.kind), t("reports.deleteConfirm"), [
      { text: t("reports.cancel"), style: "cancel" },
      { text: t("reports.delete"), style: "destructive", onPress: () => remove(meta) },
    ]);
  };

  const finished = (reports ?? []).filter((r) => r.status === "ready" || r.status === "failed");

  return (
    <ScreenWrapper>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <BackButton />
        <EnterView style={styles.header}>
          <AppText variant="label" color={colors.text.gold}>
            {t("reports.eyebrow")}
          </AppText>
          <AppText variant="title">{t("reports.title")}</AppText>
          <AppText variant="body">{t("reports.intro")}</AppText>
        </EnterView>

        {error ? (
          <EnterView>
            <ErrorBanner error={error} />
          </EnterView>
        ) : null}

        {KINDS.map(({ kind, glyph, pages }, i) => {
          const job = activeJob(kind);
          return (
            <EnterView key={kind} index={i + 1}>
              <HairlineCard style={[styles.kindCard, focus === kind && styles.kindCardFocus]}>
                <View style={styles.kindHead}>
                  <View style={styles.kindGlyph}>
                    <Glyph name={glyph} size={22} color={colors.gold[300]} />
                  </View>
                  <View style={styles.flex}>
                    <AppText variant="heading">{t(kind === "natal" ? "reports.natalTitle" : "reports.transitTitle")}</AppText>
                    <AppText variant="bodySmall" color={colors.text.tertiary}>
                      {t("reports.pages", { n: pages })}
                    </AppText>
                  </View>
                  {!isPremium ? <Ionicons name="lock-closed" size={16} color={colors.gold[300]} /> : null}
                </View>
                <AppText variant="bodySmall">{t(kind === "natal" ? "reports.natalDesc" : "reports.transitDesc")}</AppText>
                {job ? (
                  <JobProgress job={job} />
                ) : (
                  <GoldButton
                    label={t("reports.create")}
                    onPress={() => onCreate(kind)}
                    loading={creating === kind}
                    disabled={creating !== null && creating !== kind}
                    icon={<Ionicons name="document-text-outline" size={18} color={colors.text.onGold} />}
                  />
                )}
              </HairlineCard>
            </EnterView>
          );
        })}

        <EnterView index={3} style={styles.listHeader}>
          <AppText variant="label" color={colors.text.gold}>
            {t("reports.myReports")}
          </AppText>
        </EnterView>

        {reports === null ? (
          <CelestialLoader size="sm" />
        ) : finished.length === 0 ? (
          <AppText variant="bodySmall" color={colors.text.tertiary}>
            {t("reports.empty")}
          </AppText>
        ) : (
          finished.map((meta, i) => (
            <EnterView key={meta.id} index={i + 4}>
              <ReportRow
                meta={meta}
                locale={locale}
                busy={!!making[meta.id]}
                saved={hasFile(meta.id)}
                onOpen={() => open(meta)}
                onRetry={() => onCreate(meta.kind)}
                onDelete={() => onDelete(meta)}
              />
            </EnterView>
          ))
        )}
      </ScrollView>
      <PaywallSheet visible={paywall} onClose={() => setPaywall(false)} variant="premium" />
    </ScreenWrapper>
  );
}

function kindTitle(t: ReturnType<typeof useTranslation>["t"], kind: ReportKind): string {
  return t(kind === "natal" ? "reports.natalTitle" : "reports.transitTitle");
}

function ErrorBanner({ error }: { error: ReportError }) {
  const { t } = useTranslation();
  const text =
    error === "limit"
      ? t("reports.limit", { n: REPORTS_PER_DAY })
      : error === "paused"
        ? t("reports.paused")
        : error === "offline"
          ? t("reports.offline")
          : t("reports.error");
  return (
    <View style={styles.banner}>
      <Ionicons name="alert-circle-outline" size={18} color={colors.semantic.error} />
      <AppText variant="bodySmall" style={styles.flex}>
        {text}
      </AppText>
    </View>
  );
}

/** Progress through the server job's sections, with the stage being written. */
function JobProgress({ job }: { job: ReportMeta }) {
  const { t } = useTranslation();
  const ratio = job.total > 0 ? Math.min(1, job.progress / job.total) : 0;
  const width = useSharedValue(0);

  useEffect(() => {
    // Never fully empty, so the bar reads as "started" from the first poll.
    width.value = withSpring(Math.max(0.04, ratio), motion.spring.slow);
  }, [ratio, width]);

  const fill = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));
  const stageKey = `reports.stages.${job.stage ?? ""}` as TranslationKey;
  const stage = job.stage && t(stageKey) !== stageKey ? t(stageKey) : t("reports.creating");

  return (
    <View style={styles.job}>
      <View style={styles.jobRow}>
        <AppText variant="bodySmall" color={colors.text.primary} style={styles.flex}>
          {stage}
        </AppText>
        <AppText variant="numeric" color={colors.text.gold}>
          {t("reports.progress", { done: job.progress, total: job.total || "…" })}
        </AppText>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, fill]} />
      </View>
      <AppText variant="bodySmall" color={colors.text.tertiary}>
        {t("reports.leaveNote")}
      </AppText>
    </View>
  );
}

interface ReportRowProps {
  meta: ReportMeta;
  locale: "en" | "tr";
  busy: boolean;
  saved: boolean;
  onOpen: () => void;
  onRetry: () => void;
  onDelete: () => void;
}

function ReportRow({ meta, locale, busy, saved, onOpen, onRetry, onDelete }: ReportRowProps) {
  const { t } = useTranslation();
  const failed = meta.status === "failed";
  return (
    <HairlineCard style={styles.row}>
      <View style={styles.kindHead}>
        <View style={styles.kindGlyph}>
          <Glyph name={meta.kind === "natal" ? "Sun" : "Saturn"} size={18} color={failed ? colors.text.tertiary : colors.gold[300]} />
        </View>
        <View style={styles.flex}>
          <AppText variant="heading">{kindTitle(t, meta.kind)}</AppText>
          <AppText variant="bodySmall" color={failed ? colors.semantic.error : colors.text.tertiary}>
            {failed ? t("reports.failed") : t("reports.createdOn", { date: formatDayMonthYear(locale, meta.createdAt.slice(0, 10)) })}
          </AppText>
        </View>
        <PressableScale onPress={onDelete} style={styles.iconBtn} accessibilityLabel={t("reports.delete")}>
          <Ionicons name="trash-outline" size={18} color={colors.text.tertiary} />
        </PressableScale>
      </View>
      {failed ? (
        <GoldButton variant="ghost" label={t("reports.retry")} onPress={onRetry} />
      ) : busy ? (
        <View style={styles.making}>
          <CelestialLoader size="sm" />
          <AppText variant="bodySmall">{t("reports.making")}</AppText>
        </View>
      ) : (
        <GoldButton
          variant={saved ? "solid" : "ghost"}
          label={saved ? t("reports.open") : t("reports.remake")}
          onPress={onOpen}
          icon={<Ionicons name={saved ? "share-outline" : "refresh"} size={18} color={saved ? colors.text.onGold : colors.gold[300]} />}
        />
      )}
    </HairlineCard>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
    gap: spacing.md,
  },
  header: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(217,138,138,0.35)",
    backgroundColor: "rgba(217,138,138,0.08)",
  },
  kindCard: {
    gap: spacing.md,
  },
  kindCardFocus: {
    borderColor: colors.border.hairlineStrong,
    backgroundColor: colors.ink[800],
  },
  kindHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  kindGlyph: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border.hairlineStrong,
    backgroundColor: colors.ink[900],
  },
  job: {
    gap: spacing.sm,
  },
  jobRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  track: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.ink[700],
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radii.pill,
    backgroundColor: colors.gold[400],
  },
  listHeader: {
    marginTop: spacing.lg,
  },
  row: {
    gap: spacing.md,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  making: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
});
