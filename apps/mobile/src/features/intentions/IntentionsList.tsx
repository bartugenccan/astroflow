import React from "react";
import { StyleSheet, View } from "react-native";
import { useRouter, useFocusEffect, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { ChunkyProgress } from "../../components/ui/ChunkyProgress";
import { CelestialLoader } from "../../components/ui/CelestialLoader";
import { AsterMascot } from "../../components/aster/AsterMascot";
import { EnterView } from "../../lib/motion";
import { astrologyApi } from "../../services/astrologyApi";
import type { Intention } from "../../services/types";
import { useAsync } from "../../hooks/useAsync";
import { useAppStore, FREE_INTENTIONS } from "../../store/useAppStore";
import { useMascotStore } from "../../store/useMascotStore";
import { useTranslation, TranslationKey } from "../../i18n";
import { areaTone, colors, palette, radii, spacing } from "../../lib/design-system";

const AREA_ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  love: "heart",
  career: "briefcase",
  money: "cash",
  energy: "flash",
  strength: "barbell",
  reading: "book",
  calm: "water",
  confidence: "star",
};

interface IntentionsListProps {
  /** Called instead of navigating when a free user is at the intention limit.
   *  The owner renders the paywall at its screen root (sheets must not live
   *  inside a ScrollView). */
  onPaywall: () => void;
  /** Open a check-in for an intention. Without it, the card's button opens the detail screen. */
  onCheckIn?: (intention: Intention) => void;
  /** Delay offset for the staggered entrance when embedded below other content. */
  enterIndex?: number;
  /** Bump to reload (e.g. after a check-in sheet closes). */
  reloadKey?: number;
}

/**
 * The intentions list + "New intention" — no screen chrome, no ScrollView.
 * Each intention is a chunky card in its life area's colour with a segmented
 * daily progress bar, its streak and a big check-in button. Empty: Aster's
 * egg asleep, waiting for the first intention.
 */
export function IntentionsList({ onPaywall, onCheckIn, enterIndex = 0, reloadKey = 0 }: IntentionsListProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const isPremium = useAppStore((s) => s.isPremium);
  const hatched = useMascotStore((s) => s.state?.hatched ?? false);
  const intentions = useAsync(() => astrologyApi.listIntentions(), [reloadKey]);

  // Refresh when coming back from create/detail (check-ins change streaks).
  useFocusEffect(
    React.useCallback(() => {
      intentions.reload();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  // A shield bridged a missed day while loading — let Aster tell the user.
  const shielded = (intentions.data ?? []).reduce((n, it) => n + (it.streak.shieldsUsed ?? 0), 0);
  React.useEffect(() => {
    if (shielded > 0) useMascotStore.getState().applyDelta(null, { shieldsUsed: shielded });
  }, [shielded]);

  const count = intentions.data?.length ?? 0;

  const onNew = () => {
    if (!isPremium && count >= FREE_INTENTIONS) {
      onPaywall();
      return;
    }
    router.push("/intentions/create" as Href);
  };

  if (intentions.loading && !intentions.data) {
    return (
      <View style={styles.loaderBox}>
        <CelestialLoader size="sm" />
      </View>
    );
  }

  if (count === 0) {
    return (
      <EnterView index={enterIndex}>
        <ChunkyCard tone="candy" tinted style={styles.empty}>
          <AsterMascot stage={hatched ? 1 : 0} mood="sleepy" size={130} />
          <AppText variant="title" center>
            {t("manifest.emptyTitle")}
          </AppText>
          <AppText variant="body" center>
            {t("manifest.emptyBody")}
          </AppText>
          <ChunkyButton
            label={t("manifest.newIntention")}
            variant="candy"
            onPress={onNew}
            icon={<Ionicons name="add" size={20} color={palette.candy.on} />}
            style={styles.stretch}
          />
        </ChunkyCard>
      </EnterView>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.list}>
        {intentions.data!.map((it, i) => (
          <EnterView key={it.id} index={enterIndex + i}>
            <IntentionCard
              intention={it}
              onOpen={() => router.push(`/intentions/${it.id}` as Href)}
              onCheckIn={() => (onCheckIn ? onCheckIn(it) : router.push(`/intentions/${it.id}` as Href))}
            />
          </EnterView>
        ))}
      </View>
      <EnterView index={enterIndex + count}>
        <ChunkyButton
          label={t("manifest.newIntention")}
          variant="ghost"
          size="md"
          onPress={onNew}
          icon={<Ionicons name="add" size={18} color={colors.text.primary} />}
        />
      </EnterView>
    </View>
  );
}

function IntentionCard({
  intention: it,
  onOpen,
  onCheckIn,
}: {
  intention: Intention;
  onOpen: () => void;
  onCheckIn: () => void;
}) {
  const { t } = useTranslation();
  const tone = areaTone[it.category] ?? areaTone[it.lifeArea] ?? "primary";
  const p = palette[tone];
  const doneToday = it.progress.count >= it.progress.target;
  const categoryKey = `intentions.categories.${it.category}` as TranslationKey;
  const categoryLabel = t(categoryKey);

  return (
    <ChunkyCard onPress={onOpen} style={styles.card} accessibilityLabel={it.goalText}>
      <View style={styles.cardHead}>
        <View style={[styles.areaIcon, { backgroundColor: p.face }]}>
          <Ionicons name={AREA_ICON[it.category] ?? AREA_ICON[it.lifeArea] ?? "sparkles"} size={20} color={p.on} />
        </View>
        <View style={styles.flex}>
          {categoryLabel !== categoryKey ? (
            <AppText variant="label" color={p.face}>
              {categoryLabel}
            </AppText>
          ) : null}
          <AppText variant="heading" numberOfLines={3}>
            {it.goalText}
          </AppText>
        </View>
        <View
          style={[styles.streak, it.streak.currentStreak > 0 && { backgroundColor: palette.candy.soft }]}
          accessible
          accessibilityLabel={t("aster.streak", { n: it.streak.currentStreak })}
        >
          <Ionicons
            name="flame"
            size={16}
            color={it.streak.currentStreak > 0 ? palette.candy.face : colors.text.tertiary}
          />
          <AppText variant="heading" color={it.streak.currentStreak > 0 ? palette.candy.face : colors.text.tertiary}>
            {it.streak.currentStreak}
          </AppText>
        </View>
      </View>

      <AppText variant="lead" numberOfLines={2} style={styles.aff}>
        “{it.affirmation}”
      </AppText>

      <View style={styles.progressRow}>
        <ChunkyProgress
          value={it.progress.count / Math.max(1, it.progress.target)}
          tone={doneToday ? "mint" : tone}
          segments={it.progress.target}
          height={12}
          style={styles.flex}
          accessibilityLabel={t("intentions.progressLabel", { count: it.progress.count, target: it.progress.target })}
        />
        <AppText variant="numeric">
          {it.progress.count}/{it.progress.target}
        </AppText>
      </View>

      {doneToday ? (
        <View style={styles.doneRow}>
          <Ionicons name="checkmark-circle" size={20} color={palette.mint.face} />
          <AppText variant="heading" color={palette.mint.face}>
            {t("manifest.doneToday")}
          </AppText>
        </View>
      ) : (
        <ChunkyButton
          label={t("manifest.checkIn")}
          variant={tone}
          size="md"
          onPress={onCheckIn}
          icon={<Ionicons name="checkmark" size={18} color={p.on} />}
        />
      )}
    </ChunkyCard>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.lg },
  loaderBox: { alignItems: "center", paddingVertical: spacing.xl },
  list: { gap: spacing.lg },
  card: { gap: spacing.md },
  cardHead: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  areaIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  flex: { flex: 1, minWidth: 0, gap: 2 },
  streak: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  aff: { fontSize: 16, lineHeight: 23 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  doneRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs, minHeight: 44 },
  empty: { alignItems: "center", gap: spacing.md },
  stretch: { alignSelf: "stretch" },
});
