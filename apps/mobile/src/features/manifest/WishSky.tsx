import React, { useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Circle, Ellipse } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { ChunkyProgress } from "../../components/ui/ChunkyProgress";
import { IconButton } from "../../components/ui/IconButton";
import { PressableScale } from "../../components/ui/PressableScale";
import { AsterCameo } from "../../components/ui/AsterCameo";
import { AsterMascot } from "../../components/aster/AsterMascot";
import { EnterView } from "../../lib/motion";
import { useMascotStore, NO_EQUIPPED } from "../../store/useMascotStore";
import { useTranslation, type TranslationKey } from "../../i18n";
import type { Intention } from "../../services/types";
import { art, colors, gradients, palette, radii, spacing } from "../../lib/design-system";
import { asterA11y } from "../aster/asterCopy";
import { WishStarGlyph, Twinkle } from "./WishStarGlyph";
import {
  LOOK_SCALE,
  daysUntilOpen,
  isDoneToday,
  placeStars,
  starLook,
  stateLabel,
  toneOf,
  whenLabel,
} from "./wishModel";

const MAX_STAR = 60;
const HIT = 48;
const ASTER_SPOT = { x: 0.1, y: 0.86 };

/** Faint backdrop dots — deterministic so the sky is the same every visit. */
const DUST = Array.from({ length: 46 }, (_, i) => ({
  x: ((i * 7919) % 997) / 997,
  y: ((i * 4703) % 991) / 991,
  r: 0.6 + ((i * 31) % 5) * 0.25,
  o: 0.25 + ((i * 13) % 6) * 0.08,
}));

interface WishSkyProps {
  wishes: Intention[];
  powerIntentionId: string | null;
  onPlant: () => void;
}

/**
 * The night canvas: every active wish is a star at a spot fixed by its id,
 * sized and lit by how it's been tended. Today's power wish wears a slowly
 * turning gold ring. Aster keeps watch from the corner (Aster is a star too).
 */
export function WishSky({ wishes, powerIntentionId, onPlant }: WishSkyProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const mascot = useMascotStore((s) => s.state);
  const [w, setW] = useState(0);
  const h = wishes.length > 4 ? 340 : 280;

  const ordered = useMemo(
    () => wishes.slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [wishes],
  );
  const points = useMemo(
    () => placeStars(ordered.map((it) => it.id), ordered.length > 6 ? 0.16 : 0.22, [ASTER_SPOT]),
    [ordered],
  );

  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  if (wishes.length === 0) {
    return (
      <ChunkyCard padded={false} style={styles.canvas}>
        <SkyBackdrop width={w} height={300} />
        <View style={styles.empty} onLayout={onLayout}>
          <AsterCameo
            text={t("wish.sky.emptyTitle")}
            size={112}
            layout="column"
            action={mascot?.hatched ? "talk" : "idle"}
          />
          <AppText variant="body" center>
            {mascot?.hatched ? t("wish.sky.emptyBodyHatched") : t("wish.sky.emptyBody")}
          </AppText>
          <ChunkyButton
            label={t("wish.sky.plant")}
            variant="star"
            onPress={onPlant}
            icon={<Ionicons name="add" size={20} color={palette.star.on} />}
            style={styles.stretch}
          />
        </View>
      </ChunkyCard>
    );
  }

  return (
    <ChunkyCard padded={false} style={[styles.canvas, { height: h }]}>
      <View
        style={StyleSheet.absoluteFill}
        onLayout={onLayout}
        accessible={false}
        accessibilityLabel={t("wish.sky.a11y", { n: wishes.length })}
      >
        <SkyBackdrop width={w} height={h} />

        {w > 0
          ? ordered.map((it, i) => {
              const p = points[i];
              const look = starLook(it);
              const size = Math.round(MAX_STAR * LOOK_SCALE[look]);
              const box = Math.max(HIT, size + 16);
              const left = Math.min(Math.max(0, p.x * w - box / 2), w - box);
              const top = Math.min(Math.max(0, p.y * h - box / 2), h - box - 18);
              const power = it.id === powerIntentionId && look !== "waiting";
              const caption =
                look === "waiting"
                  ? t("wish.sky.opens", { when: whenLabel(t, daysUntilOpen(it)) })
                  : power
                    ? t("wish.sky.powerDay")
                    : null;
              return (
                <View key={it.id} style={[styles.starSlot, { left, top, width: box }]}>
                  <EnterView index={i} scale from="none">
                    <PressableScale
                      onPress={() => router.push(`/intentions/${it.id}` as Href)}
                      scaleTo={0.9}
                      style={[styles.starHit, { width: box, height: box }]}
                      accessibilityRole="button"
                      accessibilityLabel={t("wish.sky.starA11y", { goal: it.goalText, state: stateLabel(t, look) })}
                      accessibilityHint={t("wish.sky.starHint")}
                    >
                      {power ? <PowerRing size={size + 14} /> : null}
                      <Twinkle look={look} phase={(i * 0.37) % 1}>
                        <WishStarGlyph look={look} size={size} />
                      </Twinkle>
                    </PressableScale>
                  </EnterView>
                  {caption ? (
                    <View
                      style={[styles.caption, power ? styles.captionPower : styles.captionSeed]}
                      importantForAccessibility="no-hide-descendants"
                    >
                      <AppText variant="label" color={power ? palette.star.on : palette.mint.on} numberOfLines={1}>
                        {caption}
                      </AppText>
                    </View>
                  ) : null}
                </View>
              );
            })
          : null}

        <PressableScale
          onPress={() => router.push("/aster" as Href)}
          scaleTo={0.92}
          style={[styles.aster, { left: ASTER_SPOT.x * w - 32, top: ASTER_SPOT.y * h - 36 }]}
          accessibilityRole="button"
          accessibilityLabel={`${asterA11y(t, mascot)}. ${t("wish.openNest")}`}
        >
          <AsterMascot
            stage={mascot?.stage ?? 0}
            mood={mascot?.mood ?? "sleepy"}
            accessories={mascot?.equipped ?? NO_EQUIPPED}
            size={60}
          />
        </PressableScale>
      </View>
    </ChunkyCard>
  );
}

function SkyBackdrop({ width, height }: { width: number; height: number }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={gradients.sky} style={StyleSheet.absoluteFill} />
      {width > 0 ? (
        <Svg width={width} height={height}>
          <Ellipse cx={width * 0.78} cy={height * 0.25} rx={width * 0.4} ry={height * 0.28} fill={art.nebulaViolet} opacity={0.22} />
          <Ellipse cx={width * 0.18} cy={height * 0.7} rx={width * 0.32} ry={height * 0.22} fill={art.nebulaPink} opacity={0.12} />
          {DUST.map((d, i) => (
            <Circle key={i} cx={d.x * width} cy={d.y * height} r={d.r} fill={colors.text.primary} opacity={d.o} />
          ))}
        </Svg>
      ) : null}
    </View>
  );
}

/**
 * The power-day ring: a still, dashed gold halo. It marks the star without
 * moving — the stars' own twinkle is the only motion in the sky.
 */
export function PowerRing({ size }: { size: number }) {
  const r = size / 2;
  return (
    <View style={[styles.ring, { width: size, height: size, marginLeft: -r, marginTop: -r }]} pointerEvents="none">
      <Svg width={size} height={size}>
        <Circle
          cx={r}
          cy={r}
          r={r - 2}
          stroke={colors.star[300]}
          strokeWidth={2.5}
          strokeDasharray="6 5"
          strokeLinecap="round"
          fill="none"
        />
        <Circle cx={r} cy={2.5} r={3.5} fill={colors.star[200]} />
      </Svg>
    </View>
  );
}

// ─── The list under the sky ──────────────────────────────────────────────────

interface TendListProps {
  wishes: Intention[];
  onCheckIn: (it: Intention) => void;
  onNew: () => void;
  enterIndex?: number;
}

/**
 * The same wishes as readable rows: the star, the words, today's care and a
 * one-tap check-in. The sky is the feeling; this is the doing.
 */
export function TendList({ wishes, onCheckIn, onNew, enterIndex = 0 }: TendListProps) {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <View style={styles.list}>
      {wishes.map((it, i) => {
        const look = starLook(it);
        const tone = toneOf(it);
        const done = isDoneToday(it);
        const waiting = look === "waiting";
        return (
          <EnterView key={it.id} index={enterIndex + i}>
            <ChunkyCard
              onPress={() => router.push(`/intentions/${it.id}` as Href)}
              accessibilityLabel={t("wish.sky.starA11y", { goal: it.goalText, state: stateLabel(t, look) })}
              accessibilityHint={t("wish.sky.starHint")}
              style={styles.row}
            >
              <WishStarGlyph look={look} size={44} />
              <View style={styles.rowBody}>
                <AppText variant="label" color={palette[tone].face}>
                  {t(`wish.areas.${it.lifeArea}.name` as TranslationKey)} · {stateLabel(t, look)}
                </AppText>
                <AppText variant="heading" numberOfLines={2}>
                  {it.goalText}
                </AppText>
                {waiting ? (
                  <AppText variant="bodySmall">
                    {t("wish.sky.opens", { when: whenLabel(t, daysUntilOpen(it)) })}
                  </AppText>
                ) : (
                  <View style={styles.progressRow}>
                    <ChunkyProgress
                      value={it.progress.count / Math.max(1, it.progress.target)}
                      tone={done ? "mint" : tone}
                      segments={it.progress.target}
                      height={10}
                      style={styles.flex}
                      accessibilityLabel={t("wish.sky.progress", { count: it.progress.count, target: it.progress.target })}
                    />
                    <AppText variant="numeric">
                      {it.progress.count}/{it.progress.target}
                    </AppText>
                  </View>
                )}
              </View>
              {waiting ? null : done ? (
                <View style={styles.doneBadge} accessible accessibilityLabel={t("wish.sky.doneToday")}>
                  <Ionicons name="checkmark" size={22} color={palette.mint.on} />
                </View>
              ) : (
                <IconButton
                  icon="checkmark"
                  tone={tone}
                  size={44}
                  onPress={() => onCheckIn(it)}
                  accessibilityLabel={t("wish.sky.checkInA11y", { goal: it.goalText })}
                />
              )}
            </ChunkyCard>
          </EnterView>
        );
      })}
      <EnterView index={enterIndex + wishes.length}>
        <ChunkyButton
          label={t("wish.sky.newWish")}
          variant="night"
          size="md"
          onPress={onNew}
          icon={<Ionicons name="add" size={18} color={palette.night.on} />}
        />
      </EnterView>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { overflow: "hidden", borderRadius: radii.xl },
  empty: {
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  stretch: { alignSelf: "stretch" },
  starSlot: { position: "absolute", alignItems: "center" },
  starHit: { alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", left: "50%", top: "50%" },
  caption: {
    marginTop: -6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    maxWidth: 140,
  },
  captionPower: { backgroundColor: palette.star.face },
  captionSeed: { backgroundColor: palette.mint.face },
  aster: { position: "absolute", width: 64, height: 64, alignItems: "center", justifyContent: "center" },
  list: { gap: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  rowBody: { flex: 1, minWidth: 0, gap: spacing.xs },
  progressRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  flex: { flex: 1 },
  doneBadge: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: palette.mint.face,
    alignItems: "center",
    justifyContent: "center",
  },
});
