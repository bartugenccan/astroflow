import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { BackButton } from "../../components/ui/BackButton";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { ChunkyProgress } from "../../components/ui/ChunkyProgress";
import { StatPill } from "../../components/ui/StatPill";
import { StateView } from "../../components/ui/StateView";
import { Disclosure } from "../../components/ui/Disclosure";
import { PaperCard } from "../../components/ui/Paper";
import { EnterView } from "../../lib/motion";
import { StarBurst } from "../intentions/StarBurst";
import { MethodSheet } from "./practice/MethodSheet";
import { astrologyApi } from "../../services/astrologyApi";
import { useAsync } from "../../hooks/useAsync";
import { useBirthDto } from "../../hooks/useBirthDto";
import { usePlanStore } from "../../store/usePlanStore";
import { isUuid } from "../../lib/ids";
import { useTranslation, type TranslationKey } from "../../i18n";
import type { Intention, PracticeMethod } from "../../services/types";
import { colors, palette, radii, spacing } from "../../lib/design-system";
import { WishStarGlyph, Twinkle } from "./WishStarGlyph";
import { PowerRing } from "./WishSky";
import { WishChartCard } from "./WishChartCard";
import { PowerDaysCalendar } from "./PowerDaysCalendar";
import { CheckInTimeline } from "./CheckInTimeline";
import { WishJourneyCard } from "./WishJourneyCard";
import {
  celebrateManifested,
  daysUntilOpen,
  isDoneToday,
  shortDate,
  starLook,
  stateLabel,
  toneOf,
  whenLabel,
} from "./wishModel";

/**
 * One manifestation: its star and how it shines, today's practice (one big
 * button that opens the four methods), and the pages written for it. Its
 * affirmation, where it lives in the chart and its power days are folded
 * underneath; "It came true!" and "Let go" sit quietly at the end. Coming true
 * celebrates right here — the star bursts and a pill says so.
 * `?checkin=1` (older links) opens the methods straight away.
 */
export function WishDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const dto = useBirthDto();
  const params = useLocalSearchParams<{ id: string; checkin?: string }>();
  // Route params can come from a deep link; only a well-formed id reaches the API.
  const id = isUuid(params.id) ? params.id : null;
  const loaded = useAsync(
    () => (id ? astrologyApi.getIntention(id) : Promise.reject(new Error("invalid id"))),
    [id],
  );
  const powerId = usePlanStore((s) => s.plan?.powerIntentionId ?? null);

  const [local, setLocal] = useState<Intention | null>(null);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState<"manifest" | "archive" | null>(null);
  const [historyKey, setHistoryKey] = useState(0);
  const [burstKey, setBurstKey] = useState(0);

  // A fresh read from the server replaces the optimistic copy.
  useEffect(() => setLocal(null), [loaded.data]);
  const intention = local ?? loaded.data;
  const isActive = intention?.status === "active";

  // Back from a practice: the star may have brightened and there is a new page.
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      loaded.reload();
      setHistoryKey((k) => k + 1);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  // Older links from the plan: open the methods once the manifestation is here.
  const autoOpened = useRef(false);
  useEffect(() => {
    if (autoOpened.current || params.checkin !== "1" || !intention || !isActive) return;
    autoOpened.current = true;
    setPicking(true);
  }, [params.checkin, intention, isActive]);

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/manifest" as Href);
  };

  const practise = (method: PracticeMethod) => {
    if (!intention) return;
    setPicking(false);
    router.push(`/practice?method=${method}&id=${encodeURIComponent(intention.id)}` as Href);
  };

  const confirmManifest = () => {
    if (!intention) return;
    Alert.alert(t("wish.detail.cameTrueTitle"), t("wish.detail.cameTrueBody"), [
      { text: t("wish.detail.notYet"), style: "cancel" },
      {
        text: t("wish.detail.cameTrueYes"),
        onPress: async () => {
          setBusy("manifest");
          try {
            const res = await astrologyApi.manifestIntention(intention.id);
            // Celebrate right here: the star turns radiant and bursts; the pill says it.
            setLocal({
              ...intention,
              ...res,
              status: "manifested",
              manifestedAt: res.manifestedAt ?? new Date().toISOString(),
            });
            setBurstKey((k) => k + 1);
            celebrateManifested(res, intention.goalText);
            if (dto) usePlanStore.getState().refresh(dto);
          } catch {
            Alert.alert(t("wish.detail.actionError"));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  const confirmLetGo = () => {
    if (!intention) return;
    Alert.alert(t("wish.detail.letGoTitle"), t("wish.detail.letGoBody"), [
      { text: t("wish.detail.keep"), style: "cancel" },
      {
        text: t("wish.detail.letGoYes"),
        onPress: async () => {
          setBusy("archive");
          try {
            await astrologyApi.archiveIntention(intention.id);
            if (dto) usePlanStore.getState().refresh(dto);
            leave();
          } catch {
            Alert.alert(t("wish.detail.actionError"));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  const areaName = intention ? t(`wish.areas.${intention.lifeArea}.name` as TranslationKey) : t("wish.detail.title");

  return (
    <ScreenWrapper>
      <View style={styles.topBar}>
        <BackButton onPress={leave} />
        <AppText variant="heading" numberOfLines={1} style={styles.topTitle}>
          {areaName}
        </AppText>
        <View style={styles.topSpacer} />
      </View>

      {!intention ? (
        loaded.error || !id ? (
          <StateView
            kind="error"
            message={t("wish.detail.error")}
            onAction={id ? loaded.reload : leave}
            actionLabel={id ? undefined : t("wish.create.back")}
            style={styles.center}
          />
        ) : (
          <StateView kind="loading" style={styles.center} />
        )
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <WishHero intention={intention} power={isActive && powerId === intention.id} burstKey={burstKey} />

          {isActive ? (
            <EnterView index={1}>
              <TodayCard intention={intention} onPractise={() => setPicking(true)} />
            </EnterView>
          ) : null}

          <EnterView index={2}>
            <WishJourneyCard intention={intention} active={isActive} />
          </EnterView>

          <EnterView index={3}>
            <CheckInTimeline intentionId={intention.id} reloadKey={historyKey} />
          </EnterView>

          <EnterView index={3} style={styles.folds}>
            <Disclosure
              title={t("wish.detail.affirmation")}
              summary={intention.affirmation}
              icon="megaphone"
              tone="candy"
            >
              <PaperCard lines={3} plain tilt={-0.4}>
                <AppText variant="scriptLarge" center>
                  {intention.affirmation}
                </AppText>
              </PaperCard>
              {isActive ? (
                <ChunkyButton
                  label={t("practice.methods.read.name")}
                  variant="candy"
                  size="md"
                  onPress={() => practise("read")}
                />
              ) : null}
            </Disclosure>
            {dto ? (
              <Disclosure
                title={t("wish.detail.chartTitle")}
                summary={isActive ? t("wish.detail.powerTitle") : undefined}
                icon="planet"
                tone="sky"
              >
                <WishChartCard dto={dto} area={intention.lifeArea} natalHouse={intention.natalHouse} />
                {isActive ? <PowerDaysCalendar intentionId={intention.id} dto={dto} /> : null}
              </Disclosure>
            ) : null}
          </EnterView>

          {isActive ? (
            <EnterView index={4} style={styles.actions}>
              <ChunkyButton
                label={t("wish.detail.cameTrue")}
                variant="ghost"
                size="md"
                onPress={confirmManifest}
                loading={busy === "manifest"}
                disabled={busy !== null}
                icon={<Ionicons name="star" size={18} color={palette.star.face} />}
                style={styles.flex}
              />
              <ChunkyButton
                label={t("wish.detail.letGo")}
                variant="ghost"
                size="md"
                onPress={confirmLetGo}
                loading={busy === "archive"}
                disabled={busy !== null}
                icon={<Ionicons name="cloud-outline" size={18} color={colors.text.primary} />}
                style={styles.flex}
              />
            </EnterView>
          ) : null}
        </ScrollView>
      )}

      <MethodSheet visible={picking} onClose={() => setPicking(false)} onPick={practise} />
    </ScreenWrapper>
  );
}

function WishHero({ intention: it, power, burstKey: bk }: { intention: Intention; power: boolean; burstKey: number }) {
  const { t, locale } = useTranslation();
  const look = it.status === "manifested" ? "radiant" : starLook(it);
  const hint =
    it.status === "manifested"
      ? t("wish.detail.cameTrueOn", { date: shortDate(locale, it.manifestedAt) })
      : look === "waiting"
        ? t("wish.stateHint.waiting", { when: whenLabel(t, daysUntilOpen(it)) })
        : t(`wish.stateHint.${look}` as TranslationKey);
  return (
    <EnterView scale style={styles.hero}>
      <View style={styles.bigStar}>
        {power ? <PowerRing size={178} /> : null}
        <Twinkle look={look}>
          <WishStarGlyph look={look} size={156} />
        </Twinkle>
        <StarBurst playKey={bk} radius={110} count={12} />
      </View>
      <View style={[styles.statePill, { backgroundColor: look === "waiting" ? palette.mint.face : palette.star.face }]}>
        <AppText variant="label" color={look === "waiting" ? palette.mint.on : palette.star.on}>
          {it.status === "manifested" ? t("wish.moon.cameTrue") : stateLabel(t, look)}
          {power ? ` · ${t("wish.sky.powerDay")}` : ""}
        </AppText>
      </View>
      <AppText variant="title" center accessibilityRole="header">
        {it.goalText}
      </AppText>
      <AppText variant="body" center>
        {hint}
      </AppText>
      <AppText variant="bodySmall" center>
        {t("wish.detail.planted", { date: shortDate(locale, it.createdAt) })}
      </AppText>
    </EnterView>
  );
}

function TodayCard({ intention: it, onPractise }: { intention: Intention; onPractise: () => void }) {
  const { t } = useTranslation();
  const tone = toneOf(it);
  const done = isDoneToday(it);
  return (
    <ChunkyCard style={styles.today}>
      <View style={styles.todayHead}>
        <AppText variant="heading" style={styles.flex}>
          {t("wish.detail.today")}
        </AppText>
        <StatPill
          icon="flame"
          value={it.streak.currentStreak}
          tone="candy"
          muted={it.streak.currentStreak === 0}
          accessibilityLabel={t("wish.detail.streak", { n: it.streak.currentStreak })}
        />
      </View>
      <View style={styles.progressRow}>
        <ChunkyProgress
          value={it.progress.count / Math.max(1, it.progress.target)}
          tone={done ? "mint" : tone}
          segments={it.progress.target}
          height={14}
          style={styles.flex}
          accessibilityLabel={t("wish.sky.progress", { count: it.progress.count, target: it.progress.target })}
        />
        <AppText variant="numeric">
          {it.progress.count}/{it.progress.target}
        </AppText>
      </View>
      {done ? (
        <View style={styles.doneRow}>
          <Ionicons name="checkmark-circle" size={20} color={palette.mint.face} />
          <AppText variant="heading" color={palette.mint.face} style={styles.shrink}>
            {t("wish.detail.doneToday")}
          </AppText>
        </View>
      ) : null}
      <ChunkyButton
        label={done ? t("practice.again") : t("wish.detail.checkIn")}
        variant={done ? "night" : tone}
        size={done ? "md" : "lg"}
        onPress={onPractise}
        icon={<Ionicons name="create" size={20} color={done ? palette.night.on : palette[tone].on} />}
      />
    </ChunkyCard>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  topTitle: { flex: 1, textAlign: "center" },
  topSpacer: { width: 44 },
  center: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: 120, gap: spacing.xl },
  hero: { alignItems: "center", gap: spacing.sm },
  bigStar: { width: 180, height: 180, alignItems: "center", justifyContent: "center" },
  statePill: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill },
  today: { gap: spacing.md },
  todayHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  progressRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  doneRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, minHeight: 44 },
  folds: { gap: spacing.md },
  actions: { flexDirection: "row", gap: spacing.md },
  flex: { flex: 1, minWidth: 0 },
  shrink: { flexShrink: 1 },
});
