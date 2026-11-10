import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { runAfterTransition } from "../../lib/afterInteractions";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useFocusEffect, useLocalSearchParams, useRouter, type Href } from "expo-router";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { IconButton } from "../../components/ui/IconButton";
import { PressableScale } from "../../components/ui/PressableScale";
import { SectionLink } from "../../components/ui/SectionLink";
import { SpringBottomSheet } from "../../components/ui/SpringBottomSheet";
import { StateView } from "../../components/ui/StateView";
import { MoonPhase } from "../../components/MoonPhase";
import { PaywallSheet } from "../../components/PaywallSheet";
import { EnterView } from "../../lib/motion";
import {
  AddAffirmationSheet,
  AffirmationsCarousel,
  isAffirmationCategory,
} from "../affirmations/AffirmationsCarousel";
import { astrologyApi } from "../../services/astrologyApi";
import { useAsync } from "../../hooks/useAsync";
import { useBirthDto } from "../../hooks/useBirthDto";
import { localDay } from "../../store/useAffirmationStore";
import { useReflectionStore } from "../../store/useReflectionStore";
import { useMascotStore } from "../../store/useMascotStore";
import { usePlanStore } from "../../store/usePlanStore";
import { useAppStore, FREE_INTENTIONS } from "../../store/useAppStore";
import type { AffirmationCategory, PracticeMethod } from "../../services/types";
import { useTranslation, type TranslationKey } from "../../i18n";
import { colors, radii, spacing, surface } from "../../lib/design-system";
import { useMascot } from "../aster/useMascot";
import { WishSky } from "./WishSky";
import { PracticeHero } from "./PracticeHero";
import { LunarSheet, ShelfSheet } from "./ManifestSheets";
import { EveningReflectionSheet } from "./RitualSheets";
import { lunarInfo, planAffirmationCategory } from "./wishModel";
import { isMethod, pickPractice } from "./practiceModel";

/**
 * Manifest. One screen, one thing to do: today's guided practice (scripting,
 * reading aloud, 3-6-9 or visualise + gratitude, or the Moon ritual in its
 * window), with the four methods one tap away. Below it the manifestation
 * stars, and a short list of links for everything else — the Moon's cycle,
 * the came-true shelf, affirmations and how manifesting works — each in its
 * own sheet, so nothing is lost and nothing crowds.
 *
 * Deep links: `?affirm=<category>` opens the affirmations on that category,
 * `?ritual=evening|moon` the matching ritual, `?practice=<method>` a practice.
 */
export function ManifestScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ affirm?: string; ritual?: string; practice?: string }>();
  const dto = useBirthDto();
  const plan = usePlanStore((s) => s.plan);
  const planLoading = usePlanStore((s) => s.loading);
  const isPremium = useAppStore((s) => s.isPremium);
  useMascot();

  const [reloadKey, setReloadKey] = useState(0);
  const wishes = useAsync(() => astrologyApi.listIntentions(), [reloadKey]);
  const shelf = useAsync(() => astrologyApi.listIntentions("manifested"), [reloadKey]);
  const lunar = useMemo(() => lunarInfo(new Date()), [reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const [sheet, setSheet] = useState<null | "lunar" | "shelf" | "affirm" | "evening">(null);
  const [addCategory, setAddCategory] = useState<AffirmationCategory | null>(null);
  const [paywall, setPaywall] = useState(false);
  const [category, setCategory] = useState<AffirmationCategory | null>(null);
  // Only a pull-to-refresh shows the spinner; focus reloads stay quiet.
  const [pulling, setPulling] = useState(false);
  useEffect(() => {
    if (!wishes.loading) setPulling(false);
  }, [wishes.loading]);

  const ritualDone = useReflectionStore((s) => (lunar.windowKey ? lunar.windowKey in s.rituals : false));
  const today = useReflectionStore((s) => s.practice[localDay()]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  // Coming back from a practice, a manifestation or the wizard: stars and the shelf change.
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      // After the tab has eased in, so the re-render misses the animation.
      return runAfterTransition(reload);
    }, [reload]),
  );

  // The plan personalises the Moon line, the power manifestation and the affirmations.
  useEffect(() => {
    if (dto && !usePlanStore.getState().plan) usePlanStore.getState().refresh(dto);
  }, [dto]);

  // A shield bridged a missed day while loading — let Aster tell the user.
  const shielded = (wishes.data ?? []).reduce((n, it) => n + (it.streak.shieldsUsed ?? 0), 0);
  useEffect(() => {
    if (shielded > 0) useMascotStore.getState().applyDelta(null, { shieldsUsed: shielded });
  }, [shielded]);

  const active = wishes.data ?? [];

  const startPractice = useCallback(
    (method: PracticeMethod) => {
      setSheet(null);
      router.push(`/practice?method=${method}` as Href);
    },
    [router],
  );

  // ─── Deep links ────────────────────────────────────────────────────────────
  useEffect(() => {
    const a = params.affirm;
    if (a === undefined) return;
    if (isAffirmationCategory(a)) {
      setCategory(a);
      setSheet("affirm");
    }
    router.setParams({ affirm: undefined });
  }, [params.affirm, router]);

  useEffect(() => {
    const r = params.ritual;
    if (r === undefined) return;
    if (r === "evening") setSheet("evening");
    else if (r === "moon") router.push("/ritual" as Href);
    router.setParams({ ritual: undefined });
  }, [params.ritual, router]);

  useEffect(() => {
    const p = params.practice;
    if (p === undefined) return;
    router.setParams({ practice: undefined });
    if (isMethod(p)) startPractice(p);
  }, [params.practice, router, startPractice]);

  // ─── Actions ───────────────────────────────────────────────────────────────
  const onNew = () => {
    if (!isPremium && active.length >= FREE_INTENTIONS) {
      setPaywall(true);
      return;
    }
    router.push("/intentions/create" as Href);
  };

  const onRefresh = () => {
    setPulling(true);
    reload();
    if (dto) usePlanStore.getState().refresh(dto);
  };

  const suggestion = wishes.data
    ? pickPractice({
        lunar,
        ritualDone,
        hour: new Date().getHours(),
        day: today,
        wishes: active,
        powerIntentionId: plan?.powerIntentionId ?? null,
      })
    : null;

  const suggested = planAffirmationCategory(plan);
  const openCategory: AffirmationCategory = category ?? suggested ?? "money";
  const cameTrue = shelf.data?.length ?? 0;

  return (
    <ScreenWrapper>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={pulling} onRefresh={onRefresh} tintColor={colors.star[300]} />}
      >
        {/* Header: the title, and the Moon as a chip (its whole cycle is one tap away). */}
        <EnterView style={styles.header}>
          <AppText variant="display" accessibilityRole="header" style={styles.flex}>
            {t("wish.title")}
          </AppText>
          <PressableScale
            onPress={() => setSheet("lunar")}
            scaleTo={0.94}
            style={styles.moonChip}
            accessibilityRole="button"
            accessibilityLabel={`${t("practice.lunar.title")}: ${t(`moonPhase.${lunar.phaseKey}` as TranslationKey)}`}
          >
            <MoonPhase size={22} />
            <AppText variant="labelLong" color={colors.text.primary} numberOfLines={1}>
              {t(`moonPhase.${lunar.phaseKey}` as TranslationKey)}
            </AppText>
          </PressableScale>
        </EnterView>

        {/* 1 — Today's practice (the one primary action) and the four methods. */}
        {suggestion ? (
          <EnterView index={1}>
            <PracticeHero
              suggestion={suggestion}
              day={today}
              onStart={startPractice}
              onMoon={() => router.push("/ritual" as Href)}
            />
          </EnterView>
        ) : null}

        {/* 2 — The manifestation stars (an empty sky invites the first one). */}
        <EnterView index={2} style={styles.section}>
          {active.length > 0 ? (
            <View style={styles.sectionHead}>
              <AppText variant="heading" style={styles.flex}>
                {t("wish.sky.tendTitle")}
              </AppText>
              <IconButton icon="add" onPress={onNew} size={44} tone="star" accessibilityLabel={t("wish.sky.newWish")} />
            </View>
          ) : null}
          {wishes.loading && !wishes.data ? (
            <ChunkyCard style={styles.stateCard}>
              <StateView kind="loading" compact message={t("wish.sky.loading")} />
            </ChunkyCard>
          ) : wishes.error && !wishes.data ? (
            <ChunkyCard style={styles.stateCard}>
              <StateView kind="error" compact message={t("wish.sky.error")} onAction={wishes.reload} />
            </ChunkyCard>
          ) : (
            <WishSky wishes={active} powerIntentionId={plan?.powerIntentionId ?? null} onPlant={onNew} />
          )}
        </EnterView>

        {/* 3 — Everything else, one tap away. */}
        <EnterView index={3} style={styles.links}>
          <SectionLink
            label={t("practice.learn.open")}
            icon="school"
            tone="primary"
            bare
            onPress={() => router.push("/learn" as Href)}
          />
          <View style={styles.sep} />
          <SectionLink
            label={t("practice.methods.read.otherTitle")}
            icon="heart"
            tone="candy"
            bare
            onPress={() => setSheet("affirm")}
          />
          <View style={styles.sep} />
          <SectionLink
            label={t("wish.shelf.title")}
            icon="trophy"
            tone="star"
            value={shelf.data ? cameTrue : undefined}
            bare
            onPress={() => setSheet("shelf")}
          />
        </EnterView>
      </ScrollView>

      <LunarSheet
        visible={sheet === "lunar"}
        onClose={() => setSheet(null)}
        lunar={lunar}
        plan={planLoading && !plan ? null : plan}
        onRitual={
          ritualDone
            ? undefined
            : () => {
                setSheet(null);
                router.push("/ritual" as Href);
              }
        }
      />
      <ShelfSheet
        visible={sheet === "shelf"}
        onClose={() => setSheet(null)}
        wishes={shelf.data}
        loading={shelf.loading}
        error={!!shelf.error}
        onRetry={shelf.reload}
      />
      <SpringBottomSheet
        visible={sheet === "affirm"}
        onClose={() => setSheet(null)}
        title={t("practice.methods.read.otherTitle")}
      >
        <AffirmationsCarousel
          category={openCategory}
          onCategoryChange={setCategory}
          suggested={suggested}
          onAdd={setAddCategory}
        />
      </SpringBottomSheet>
      <EveningReflectionSheet visible={sheet === "evening"} onClose={() => setSheet(null)} />
      <AddAffirmationSheet category={addCategory} onClose={() => setAddCategory(null)} />
      <PaywallSheet visible={paywall} onClose={() => setPaywall(false)} variant="premium" />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: 140, gap: spacing.xl },
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  moonChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minHeight: 44,
    maxWidth: 170,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: surface.raised,
  },
  section: { gap: spacing.md },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  links: { borderRadius: radii.lg, backgroundColor: surface.card, overflow: "hidden" },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border.hairline, marginLeft: spacing.lg + 34 + spacing.md },
  stateCard: { borderRadius: radii.xl },
});
