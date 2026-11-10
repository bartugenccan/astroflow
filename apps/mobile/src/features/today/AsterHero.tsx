import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AsterMascot } from "../../components/aster/AsterMascot";
import { PressableScale } from "../../components/ui/PressableScale";
import { AppText } from "../../components/ui/AppText";
import { SpeechBubble } from "../../components/ui/SpeechBubble";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { ChunkyProgress } from "../../components/ui/ChunkyProgress";
import { Chip } from "../../components/ui/Chip";
import { useScreenActive } from "../../components/ScreenActive";
import { useTranslation } from "../../i18n";
import { colors, palette, radii, spacing, surface } from "../../lib/design-system";
import { requestReminderPermission } from "../../services/notifications";
import type { MascotState } from "../../services/types";
import { useMascotStore, NO_EQUIPPED } from "../../store/useMascotStore";
import { useAccountPromptStore } from "../../store/useAccountPromptStore";
import { asterA11y } from "../aster/asterCopy";
import { countdown } from "./planCopy";

/** Aster is the heart of Today (Finch-style): big, centred, on a soft stage. */
const ASTER_SIZE = 150;

/** "2026-11-14" → "14 November" in the reader's language (a local calendar day). */
export function formatDay(day: string | null, locale: string): string {
  if (!day) return "";
  const [y, m, d] = day.slice(0, 10).split("-").map(Number);
  if (!y) return day;
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  return date.toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", { day: "numeric", month: "long" });
}

/**
 * Aster on Today, front and centre: Aster on a soft stage with a speech bubble
 * (the greeting and the day's headline), a thin Light bar toward the next
 * stage, then one status line and one action driven by today's journey.
 * Tapping Aster opens the nest.
 *
 *   eclipse   → Aster sleeps; "Resting until …" + wake.
 *   locked    → energy toward the journey threshold.
 *   ready     → "Send Aster on a journey".
 *   away      → Aster's empty slot + a live countdown.
 *   returned  → "Aster is back!" opens the discovery celebration.
 *   claimed   → a link that reopens today's discovery.
 */
export function AsterHero({
  state,
  onOpenDiscovery,
  speech,
}: {
  state: MascotState | null;
  /** Reopen today's claimed discovery (the sheet lives at screen level). */
  onOpenDiscovery: () => void;
  /** What Aster says in the bubble (greeting + the day's headline). */
  speech?: string;
}) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const launchJourney = useMascotStore((s) => s.launchJourney);
  const claimJourney = useMascotStore((s) => s.claimJourney);
  const endEclipse = useMascotStore((s) => s.endEclipse);
  const refresh = useMascotStore((s) => s.refresh);
  const offer = useAccountPromptStore((s) => s.offer);

  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  const [askNotify, setAskNotify] = useState(false);
  /** The `returnsAt` whose countdown has run out on screen. */
  const [arrivedFor, setArrivedFor] = useState<string | null>(null);
  const refreshedFor = useRef<string | null>(null);

  const journey = state?.journey;
  const eclipse = state?.eclipse;
  const resting = !!eclipse?.active;
  const status = journey?.status ?? "locked";
  const returnsAt = journey?.returnsAt ?? null;
  const backAlready =
    status === "away" && !!returnsAt && (arrivedFor === returnsAt || Date.parse(returnsAt) <= Date.now());
  const onArrived = useCallback(() => setArrivedFor(returnsAt), [returnsAt]);

  // Ask the server once Aster should be home. (The ticking itself lives in
  // `JourneyCountdown`, so only that line re-renders every second.)
  useEffect(() => {
    if (backAlready && returnsAt && refreshedFor.current !== returnsAt) {
      refreshedFor.current = returnsAt;
      refresh();
    }
  }, [backAlready, returnsAt, refresh]);

  const stage = state?.stage ?? 0;
  const mood = state?.mood ?? "sleepy";
  const energy = state?.energy ?? 0;
  const minEnergy = journey?.minEnergy ?? 60;

  const send = async () => {
    if (busy) return;
    setBusy(true);
    setFailed(null);
    const firstEver = (journey?.completed ?? 0) === 0;
    const ok = await launchJourney(locale);
    setBusy(false);
    if (!ok) {
      setFailed(t("aster.journey.sendFailed"));
      return;
    }
    // The very first journey: offer a "ping me when you're back" — softly, in Aster's voice.
    if (firstEver) setAskNotify(true);
  };

  const claim = async () => {
    if (busy) return;
    setBusy(true);
    setFailed(null);
    const res = await claimJourney();
    setBusy(false);
    if (!res) {
      setFailed(t("aster.journey.claimFailed"));
      return;
    }
    if (res.state.journey.completed === 1) {
      offer("firstJourney", { resting: res.state.eclipse.active });
    }
  };

  const wake = async () => {
    if (busy) return;
    setBusy(true);
    setFailed(null);
    const ok = await endEclipse();
    setBusy(false);
    if (!ok) setFailed(t("aster.eclipse.failed"));
  };

  // ── What the row says and offers ───────────────────────────────────────────
  let line = "";
  let action: React.ReactNode = null;
  let asterAction: "idle" | "sleep" | "cheer" = "idle";
  let away = false;

  if (resting) {
    asterAction = "sleep";
    line = t("aster.eclipse.resting", { date: formatDay(eclipse?.end ?? null, locale) });
    action = <ChunkyButton label={t("aster.eclipse.wake")} size="sm" variant="night" loading={busy} onPress={wake} />;
  } else if (status === "locked") {
    line = t("aster.journey.locked");
    action = (
      <View style={styles.progressRow}>
        <ChunkyProgress
          value={Math.min(1, energy / Math.max(1, minEnergy))}
          tone="mint"
          height={10}
          style={styles.flex}
          accessibilityLabel={t("aster.journey.lockedA11y", { energy, min: minEnergy })}
        />
        <AppText variant="numeric" color={palette.mint.face}>
          {t("aster.journey.lockedProgress", { energy: Math.min(energy, minEnergy), min: minEnergy })}
        </AppText>
      </View>
    );
  } else if (status === "ready") {
    asterAction = "cheer";
    line = t("aster.journey.ready");
    action = (
      <ChunkyButton
        label={t("aster.journey.send")}
        size="sm"
        variant="primary"
        loading={busy}
        onPress={send}
        icon={<Ionicons name="rocket" size={16} color={palette.primary.on} />}
      />
    );
  } else if (status === "away" && !backAlready) {
    away = true;
    line = t("aster.journey.away");
    action = (
      <View style={styles.countdown} accessibilityLiveRegion="none">
        <Ionicons name="time" size={16} color={palette.sky.face} />
        <JourneyCountdown returnsAt={returnsAt} onArrived={onArrived} />
      </View>
    );
  } else if (status === "returned" || backAlready) {
    away = status !== "returned";
    asterAction = "cheer";
    line = t("aster.journey.returned");
    action = (
      <ChunkyButton
        label={t("aster.journey.claim")}
        size="sm"
        variant="star"
        loading={busy}
        disabled={status !== "returned"}
        onPress={claim}
        icon={<Ionicons name="gift" size={16} color={palette.star.on} />}
      />
    );
  } else if (status === "claimed" && journey?.discovery) {
    line = journey.discovery.title;
    action = (
      <PressableScale
        onPress={onOpenDiscovery}
        scaleTo={0.96}
        style={styles.link}
        accessibilityRole="button"
        accessibilityLabel={t("aster.journey.claimedA11y", { title: journey.discovery.title })}
      >
        <Ionicons name="sparkles" size={16} color={colors.star[300]} />
        <AppText variant="heading" color={colors.star[300]}>
          {t("aster.journey.claimed")}
        </AppText>
        <Ionicons name="chevron-forward" size={16} color={colors.star[300]} />
      </PressableScale>
    );
  } else if (status === "claimed") {
    line = t("aster.journey.claimed");
  } else {
    line = t("aster.journey.locked");
  }

  const xp = state?.xp ?? 0;
  const floor = state?.stageFloorXp ?? 0;
  const next = state?.nextStageXp ?? null;
  const toNext = next === null ? 1 : Math.max(0, Math.min(1, (xp - floor) / Math.max(1, next - floor)));

  return (
    <View style={styles.scene}>
      {speech ? (
        <SpeechBubble tail="bottom" style={styles.bubble}>
          <AppText variant="body" color={palette.cloud.on} numberOfLines={3}>
            {speech}
          </AppText>
        </SpeechBubble>
      ) : null}

      <PressableScale
        onPress={() => router.push("/aster" as Href)}
        scaleTo={0.95}
        haptic="light"
        accessibilityRole="button"
        accessibilityLabel={away ? t("aster.journey.slotA11y") : asterA11y(t, state)}
        accessibilityHint={t("wish.openNest")}
        style={styles.stage}
      >
        <View style={styles.floor} />
        {away ? (
          <View style={styles.emptySlot}>
            <Ionicons name="telescope" size={40} color={colors.text.tertiary} />
          </View>
        ) : (
          <AsterMascot
            stage={stage}
            mood={resting ? "sleepy" : mood}
            action={asterAction}
            accessories={state?.equipped ?? NO_EQUIPPED}
            size={ASTER_SIZE}
          />
        )}
      </PressableScale>

      {state?.hatched ? (
        <View style={styles.xpRow}>
          <Ionicons name="sparkles" size={14} color={palette.star.face} />
          <ChunkyProgress
            value={toNext}
            tone="star"
            height={10}
            style={styles.flex}
            accessibilityLabel={t("aster.light")}
          />
        </View>
      ) : null}

      <View style={styles.status}>
        <AppText variant="heading" center numberOfLines={2}>
          {line}
        </AppText>
        {action}
      </View>

      {failed ? (
        <AppText variant="bodySmall" center color={colors.semantic.error} accessibilityLiveRegion="polite">
          {failed}
        </AppText>
      ) : null}

      {askNotify ? (
        <View style={styles.notify} accessibilityLiveRegion="polite">
          <AppText variant="body" color={colors.text.primary}>
            {t("aster.journey.notifyAsk")}
          </AppText>
          <View style={styles.notifyRow}>
            <Chip
              label={t("aster.journey.notifyYes")}
              icon="notifications"
              tone="primary"
              onPress={() => {
                setAskNotify(false);
                requestReminderPermission().catch(() => undefined);
              }}
            />
            <Chip label={t("aster.journey.notifyNo")} tone="night" onPress={() => setAskNotify(false)} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  scene: { alignItems: "center", gap: spacing.md },
  bubble: { alignSelf: "stretch" },
  stage: { width: ASTER_SIZE + 40, height: ASTER_SIZE + 24, alignItems: "center", justifyContent: "center" },
  floor: {
    position: "absolute",
    bottom: 4,
    width: ASTER_SIZE,
    height: 28,
    borderRadius: 14,
    backgroundColor: surface.raised,
  },
  xpRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, alignSelf: "stretch", paddingHorizontal: spacing.xl },
  status: { alignItems: "center", gap: spacing.sm, alignSelf: "stretch" },
  emptySlot: {
    width: ASTER_SIZE - 20,
    height: ASTER_SIZE - 20,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.border.hairlineStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  progressRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, alignSelf: "stretch" },
  flex: { flex: 1 },
  countdown: { flexDirection: "row", alignItems: "center", gap: spacing.xs, minHeight: 32 },
  link: { flexDirection: "row", alignItems: "center", gap: spacing.xs, minHeight: 44 },
  notify: {
    alignSelf: "stretch",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: palette.primary.soft,
  },
  notifyRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
});

/**
 * "Back in 2h 14m": ticks once a second on its own, so the hero (and the Aster
 * SVGs inside it) doesn't re-render with it. Rests while the screen is off
 * view and catches up the moment it's back.
 */
function JourneyCountdown({ returnsAt, onArrived }: { returnsAt: string | null; onArrived: () => void }) {
  const { t } = useTranslation();
  const active = useScreenActive();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!returnsAt || !active) return;
    const tick = () => {
      const at = Date.now();
      setNow(at);
      if (Date.parse(returnsAt) <= at) onArrived();
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [returnsAt, active, onArrived]);

  return (
    <AppText variant="heading" color={palette.sky.face}>
      {t("aster.journey.backIn", { time: countdown(t, returnsAt, now) })}
    </AppText>
  );
}
