import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown, ZoomIn } from "react-native-reanimated";
import { AsterMascot } from "../../components/aster/AsterMascot";
import { AppText } from "../../components/ui/AppText";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { StarBurst } from "../intentions/StarBurst";
import { Celebration, useMascotStore } from "../../store/useMascotStore";
import { useTranslation, TranslationKey } from "../../i18n";
import { ABILITIES } from "../../lib/mascotRules";
import { colors, depth, palette, radii, spacing, surface } from "../../lib/design-system";
import { milestoneLabel, stageName } from "./asterCopy";

/**
 * App-wide celebrations, fed by useMascotStore's queue. Big moments (hatching,
 * growing a stage, milestones, a shield saving the streak) take the screen
 * with Aster jumping; plain Işık rewards are a short toast that dismisses
 * itself. One at a time, in order.
 */
export function CelebrationHost() {
  const current = useMascotStore((s) => s.queue[0]);
  const dismiss = useMascotStore((s) => s.dismiss);
  if (!current) return null;
  if (current.type === "reward") return <RewardToast key={current.id} item={current} onDone={dismiss} />;
  return <BigMoment key={current.id} item={current} onDone={dismiss} />;
}

function RewardToast({ item, onDone }: { item: Celebration; onDone: () => void }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const accessories = useMascotStore((s) => s.state?.equipped ?? []);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    const timer = setTimeout(onDone, 2200);
    return () => clearTimeout(timer);
  }, [onDone]);

  const n = item.delta?.xpGained ?? 0;
  return (
    <Animated.View
      entering={SlideInDown.springify().damping(14)}
      exiting={SlideOutDown.duration(200)}
      pointerEvents="box-none"
      style={[styles.toastWrap, { bottom: insets.bottom + 96 }]}
    >
      <View
        style={styles.toast}
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${t("aster.celebrate.rewardTitle", { n })}. ${t("aster.celebrate.rewardBody")}`}
      >
        <AsterMascot
          stage={item.delta?.stage ?? 1}
          mood="glowing"
          action="cheer"
          size={56}
          accessories={accessories}
        />
        <View style={styles.toastText}>
          <View style={styles.row}>
            <Ionicons name="sparkles" size={18} color={palette.star.face} />
            <AppText variant="stat" color={palette.star.face}>
              {t("aster.celebrate.rewardTitle", { n })}
            </AppText>
          </View>
          <AppText variant="bodySmall" color={colors.text.secondary}>
            {t("aster.celebrate.rewardBody")}
          </AppText>
        </View>
      </View>
    </Animated.View>
  );
}

function BigMoment({ item, onDone }: { item: Celebration; onDone: () => void }) {
  const { t } = useTranslation();
  const accessories = useMascotStore((s) => s.state?.equipped ?? []);
  const finalStage = item.delta?.stage ?? 1;
  const startStage = item.type === "hatch" ? 0 : item.type === "levelUp" ? item.delta?.previousStage ?? finalStage : finalStage;
  const [stage, setStage] = useState(startStage);
  const [burst, setBurst] = useState(0);
  const [action, setAction] = useState<"hatch" | "cheer">(item.type === "hatch" ? "hatch" : "cheer");

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    if (stage === finalStage) {
      setBurst(1);
      return;
    }
    // Hatch: wobble the egg, then crack open. Level-up: a beat, then grow.
    const timer = setTimeout(
      () => {
        setStage(finalStage);
        setAction("cheer");
        setBurst((b) => b + 1);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => undefined);
      },
      item.type === "hatch" ? 1600 : 700,
    );
    return () => clearTimeout(timer);
    // Run once per celebration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const newAbility = item.type === "levelUp" || item.type === "hatch"
    ? ABILITIES.find((a) => a.minStage === finalStage && a.available)
    : undefined;

  let title = "";
  let body = "";
  let tone: "star" | "mint" | "primary" | "sky" = "star";
  if (item.type === "hatch") {
    title = t("aster.celebrate.hatchTitle");
    body = t("aster.celebrate.hatchBody");
  } else if (item.type === "levelUp") {
    title = t("aster.celebrate.levelTitle");
    body = t("aster.celebrate.levelBody", { stage: stageName(t, finalStage) });
    tone = "primary";
  } else if (item.type === "milestone") {
    title = t("aster.celebrate.milestoneTitle");
    body = item.milestoneName ? milestoneLabel(t, item.milestoneName) : "";
    tone = "mint";
  } else if (item.type === "shield") {
    title = t("aster.celebrate.shieldTitle");
    body = t("aster.celebrate.shieldBody", { n: item.shieldsUsed ?? 1 });
    tone = "sky";
  }

  return (
    <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(160)} style={styles.backdrop}>
      <Animated.View
        entering={ZoomIn.springify().damping(12)}
        style={styles.card}
        accessibilityViewIsModal
        accessibilityLiveRegion="assertive"
      >
        <View style={styles.asterWrap}>
          <StarBurst playKey={burst} radius={110} count={14} />
          <AsterMascot
            stage={stage}
            mood="glowing"
            action={action}
            playKey={burst}
            size={180}
            accessories={stage > 0 ? accessories : []}
          />
        </View>
        <AppText variant="display" center color={palette[tone].face}>
          {title}
        </AppText>
        {body ? (
          <AppText variant="lead" center>
            {body}
          </AppText>
        ) : null}
        {item.delta && item.delta.xpGained > 0 ? (
          <View style={[styles.row, styles.center]}>
            <Ionicons name="sparkles" size={18} color={palette.star.face} />
            <AppText variant="heading" color={palette.star.face}>
              {t("aster.celebrate.rewardTitle", { n: item.delta.xpGained })}
            </AppText>
          </View>
        ) : null}
        {newAbility ? (
          <View style={styles.ability}>
            <Ionicons name="lock-open" size={18} color={palette.mint.face} />
            <AppText variant="heading" color={colors.text.primary} style={styles.flex}>
              {t("aster.celebrate.newAbility", {
                ability: t(`aster.abilities.${newAbility.key}.title` as TranslationKey),
              })}
            </AppText>
          </View>
        ) : null}
        <ChunkyButton label={t("aster.celebrate.continue")} onPress={onDone} variant={tone} style={styles.cta} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    zIndex: 2000,
    elevation: 2000,
    backgroundColor: "rgba(12,7,36,0.82)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: surface.sheet,
    borderRadius: radii.xl,
    borderWidth: 2,
    borderColor: colors.border.chunky,
    borderBottomWidth: depth.lg + 2,
    borderBottomColor: surface.slab,
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: "stretch",
  },
  asterWrap: { alignItems: "center", justifyContent: "center", marginTop: -spacing.xxxl - 40 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  center: { justifyContent: "center" },
  ability: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: palette.mint.soft,
  },
  flex: { flex: 1 },
  cta: { marginTop: spacing.sm },
  toastWrap: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 1900,
    elevation: 1900,
    alignItems: "center",
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    width: "100%",
    maxWidth: 420,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: surface.sheet,
    borderWidth: 2,
    borderColor: palette.star.face,
    borderBottomWidth: depth.md + 2,
    borderBottomColor: palette.star.slab,
  },
  toastText: { flex: 1, gap: 2 },
});
