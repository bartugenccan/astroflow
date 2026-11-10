import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import { AppText } from "../../components/ui/AppText";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { PressableScale } from "../../components/ui/PressableScale";
import { SpringBottomSheet } from "../../components/ui/SpringBottomSheet";
import { SectionLink } from "../../components/ui/SectionLink";
import { ChunkyProgress } from "../../components/ui/ChunkyProgress";
import { useMascotStore } from "../../store/useMascotStore";
import { skyPathView, ABILITIES } from "../../lib/mascotRules";
import { useMotion } from "../../lib/motion";
import { haptics } from "../../lib/haptics";
import { useTranslation, type TranslationKey } from "../../i18n";
import { colors, depth, palette, radii, spacing, surface } from "../../lib/design-system";
import type { SkyPathChapter } from "../../services/types";
import { stageName } from "../aster/asterCopy";
import { LESSON_ICON, LESSON_TONE } from "./lessonContent";

const NODE = 72;
/** Horizontal sway of the zig-zag, as a share of the row width. */
const SWAY = [0, 0.22, 0.32, 0.22, 0, -0.22, -0.32, -0.22];
/** One chapter's slot: the disc and its label card underneath. */
const ROW_H = 184;

/**
 * Harita Yolu — the chart as a Duolingo path. One node per chapter, swaying
 * down the page; the open one is big and says START, finished ones carry a
 * tick and read again, locked ones say exactly what opens them (the chapter
 * above, or Aster's stage and the Işık still to earn — or Stardust, now).
 * The full wheel is never locked: it sits one tap away under the path.
 */
export function SkyPath() {
  const { t } = useTranslation();
  const router = useRouter();
  const m = useMotion();
  const mascot = useMascotStore((s) => s.state);
  const unlockLesson = useMascotStore((s) => s.unlockLesson);
  const [width, setWidth] = useState(0);
  const [buying, setBuying] = useState<SkyPathChapter | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // The server's view, or (before the first fetch) the rules on an empty path.
  const chapters: SkyPathChapter[] =
    mascot?.skyPath?.length ? mascot.skyPath : skyPathView({ stage: mascot?.stage ?? 0, done: [], early: [] });
  const done = chapters.filter((c) => c.status === "done").length;
  const stardust = mascot?.stardust ?? 0;

  const open = (c: SkyPathChapter) => {
    if (c.status === "lockedStage") {
      haptics.tap();
      setMessage(null);
      setBuying(c);
      return;
    }
    if (c.status === "lockedPrev") {
      haptics.tap();
      return;
    }
    router.push(`/lesson/${c.key}` as Href);
  };

  const buy = async () => {
    if (!buying) return;
    if (stardust < buying.earlyPrice) {
      setMessage(t("skypath.path.notEnough"));
      return;
    }
    setBusy(true);
    const ok = await unlockLesson(buying.key);
    setBusy(false);
    if (ok) {
      haptics.success();
      const key = buying.key;
      setBuying(null);
      router.push(`/lesson/${key}` as Href);
    } else {
      setMessage(t("aster.shop.failed"));
    }
  };

  const letterStage = ABILITIES.find((a) => a.key === "weeklyLetter")?.minStage ?? 4;
  const letterOpen = (mascot?.stage ?? 0) >= letterStage;
  const allDone = done === chapters.length;

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <View style={styles.headText}>
          <AppText variant="heading">{t("skypath.path.title")}</AppText>
          <AppText variant="bodySmall">{t("skypath.path.subtitle")}</AppText>
        </View>
        <AppText variant="label" color={palette.sky.face}>
          {`${done}/${chapters.length}`}
        </AppText>
      </View>
      <ChunkyProgress
        value={chapters.length ? done / chapters.length : 0}
        tone="sky"
        height={10}
        accessibilityLabel={t("skypath.path.progress", { done, total: chapters.length })}
      />

      <View style={styles.path} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {width > 0 ? <PathLine width={width} count={chapters.length} doneCount={done} /> : null}
        {chapters.map((c, i) => (
          <Animated.View
            key={c.key}
            entering={i < 3 ? m.enter("pop", m.stagger(i)) : undefined}
            style={[styles.row, { transform: [{ translateX: width * SWAY[i % SWAY.length] * 0.5 }] }]}
          >
            <PathNode chapter={c} onPress={() => open(c)} />
          </Animated.View>
        ))}
      </View>

      {allDone ? (
        <AppText variant="bodySmall" center color={colors.text.secondary}>
          {t("skypath.path.allDone")}
        </AppText>
      ) : null}

      <View style={styles.links}>
        <SectionLink
          label={letterOpen ? t("skypath.path.letterOpen") : t("skypath.path.letter")}
          value={letterOpen ? undefined : t("skypath.path.letterLocked", { stage: stageName(t, letterStage) })}
          icon={letterOpen ? "mail-open" : "lock-closed"}
          tone="candy"
          bare
          onPress={() => (letterOpen ? router.push("/aster/letter" as Href) : router.push("/aster" as Href))}
        />
        <View style={styles.sep} />
        <SectionLink
          label={t("skypath.path.fullChart")}
          icon="planet"
          tone="star"
          bare
          onPress={() => router.push("/chart" as Href)}
        />
      </View>

      <SpringBottomSheet
        visible={buying !== null}
        onClose={() => setBuying(null)}
        title={t("skypath.path.earlyTitle")}
        icon="sparkles"
        tone="star"
      >
        {buying ? (
          <View style={styles.sheet}>
            <AppText variant="heading">{t(`skypath.lessons.${buying.key}.title` as TranslationKey)}</AppText>
            <AppText variant="body">
              {t("skypath.path.lockedStage", { stage: stageName(t, buying.minStage) })}
              {mascot?.nextUnlocks?.stage === buying.minStage
                ? ` · ${t("skypath.path.xpLeft", { n: mascot.nextUnlocks.xpNeeded })}`
                : ""}
            </AppText>
            <AppText variant="bodySmall" color={colors.text.secondary}>
              {t("skypath.path.earlyBody", { n: buying.earlyPrice, have: stardust })}
            </AppText>
            {message ? (
              <AppText variant="bodySmall" color={palette.candy.face} accessibilityLiveRegion="polite">
                {message}
              </AppText>
            ) : null}
            <ChunkyButton
              label={t("skypath.path.early", { n: buying.earlyPrice })}
              onPress={buy}
              loading={busy}
              variant="star"
              disabled={stardust < buying.earlyPrice}
            />
            <ChunkyButton label={t("skypath.path.earlyCancel")} onPress={() => setBuying(null)} variant="ghost" uppercase={false} haptic="none" />
          </View>
        ) : null}
      </SpringBottomSheet>
    </View>
  );
}

/** The dotted trail behind the nodes; the walked part is lit. */
function PathLine({ width, count, doneCount }: { width: number; count: number; doneCount: number }) {
  const cx = (i: number) => width / 2 + width * SWAY[i % SWAY.length] * 0.5;
  const cy = (i: number) => i * ROW_H + spacing.sm + NODE / 2;
  const seg = (from: number, to: number) => {
    let d = `M ${cx(from)} ${cy(from)}`;
    for (let i = from + 1; i <= to; i++) {
      const midY = (cy(i - 1) + cy(i)) / 2;
      d += ` C ${cx(i - 1)} ${midY}, ${cx(i)} ${midY}, ${cx(i)} ${cy(i)}`;
    }
    return d;
  };
  return (
    <Svg width={width} height={count * ROW_H} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Path d={seg(0, count - 1)} stroke={colors.border.hairlineStrong} strokeWidth={4} strokeDasharray="2 12" strokeLinecap="round" fill="none" />
      {doneCount > 0 ? (
        <Path d={seg(0, Math.min(doneCount, count - 1))} stroke={palette.sky.face} strokeWidth={4} strokeLinecap="round" fill="none" />
      ) : null}
    </Svg>
  );
}

function PathNode({ chapter, onPress }: { chapter: SkyPathChapter; onPress: () => void }) {
  const { t } = useTranslation();
  const mascot = useMascotStore((s) => s.state);
  const tone = LESSON_TONE[chapter.key];
  const p = palette[tone];
  const title = t(`skypath.lessons.${chapter.key}.title` as TranslationKey);
  const isOpen = chapter.status === "open";
  const isDone = chapter.status === "done";
  const lockedStage = chapter.status === "lockedStage";
  const locked = lockedStage || chapter.status === "lockedPrev";
  const size = isOpen ? NODE + 8 : NODE;

  // What a locked node says: the stage it opens at and the Işık to go (only for the next stage).
  const nextStage = mascot?.nextUnlocks?.stage;
  const xpLeft = lockedStage && nextStage === chapter.minStage ? (mascot?.nextUnlocks?.xpNeeded ?? null) : null;
  const sub = isDone
    ? t("skypath.path.review")
    : isOpen
      ? t(`skypath.lessons.${chapter.key}.sub` as TranslationKey)
      : lockedStage
        ? xpLeft !== null
          ? t("skypath.path.xpLeft", { n: xpLeft })
          : t("skypath.path.lockedStage", { stage: stageName(t, chapter.minStage) })
        : t("skypath.path.lockedPrev");

  const face = locked ? surface.raised : isDone ? p.soft : p.face;
  const ring = locked ? colors.border.chunky : p.face;
  const slab = locked ? surface.slab : p.slab;
  const iconColor = locked ? colors.text.tertiary : isDone ? p.face : p.on;
  const icon = locked
    ? "lock-closed"
    : isDone
      ? "checkmark"
      : (LESSON_ICON[chapter.key] as keyof typeof Ionicons.glyphMap);

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.94}
      style={styles.node}
      accessibilityRole="button"
      accessibilityState={{ disabled: chapter.status === "lockedPrev" }}
      accessibilityLabel={`${title}. ${sub}`}
    >
      <View
        style={[
          styles.disc,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: face, borderColor: ring, borderBottomColor: slab },
        ]}
      >
        <Ionicons name={icon} size={isOpen ? 34 : 28} color={iconColor} />
      </View>
      <View style={[styles.label, isOpen && { borderColor: p.face }]}>
        {isOpen ? (
          <View style={[styles.startPill, { backgroundColor: p.face }]}>
            <AppText variant="label" color={p.on}>
              {t("skypath.path.start")}
            </AppText>
          </View>
        ) : null}
        <AppText variant="heading" center numberOfLines={2} color={locked ? colors.text.secondary : colors.text.primary}>
          {title}
        </AppText>
        <AppText variant="bodySmall" center numberOfLines={2} color={lockedStage ? palette.star.face : colors.text.tertiary}>
          {sub}
        </AppText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  head: { flexDirection: "row", alignItems: "flex-end", gap: spacing.md },
  headText: { flex: 1, minWidth: 0, gap: 2 },
  path: { paddingTop: spacing.sm },
  row: { height: ROW_H, alignItems: "center", paddingTop: spacing.sm },
  node: { alignItems: "center", width: 210, gap: spacing.sm },
  disc: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderBottomWidth: 3 + depth.lg,
  },
  // A small card, so the trail behind never runs through the words.
  label: {
    alignItems: "center",
    gap: 2,
    width: 210,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border.chunky,
    backgroundColor: surface.card,
  },
  startPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 2,
    borderRadius: radii.pill,
    marginBottom: 2,
  },
  links: {
    marginTop: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: colors.border.chunky,
    borderBottomWidth: 2 + depth.md,
    borderBottomColor: surface.slab,
    backgroundColor: surface.card,
    overflow: "hidden",
  },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border.hairline, marginHorizontal: spacing.lg },
  sheet: { gap: spacing.md },
});
