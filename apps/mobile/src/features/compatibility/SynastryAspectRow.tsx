import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withTiming,
  withSpring,
  Easing,
  useReducedMotion,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { PressableScale } from "../../components/ui/PressableScale";
import { Glyph } from "../../components/Glyph";
import { SynastryTopAspect } from "../../services/types";
import { aspectPhrase, aspectStrength } from "../../lib/astroLanguage";
import { useExpandMotion } from "../reading/HouseRow";
import { useTranslation, TranslationKey, TFunction } from "../../i18n";
import { colors, spacing, radii, motion } from "../../lib/design-system";

const NATURE_COLOR: Record<string, string> = {
  harmonic: colors.semantic.harmonic,
  challenging: colors.semantic.challenging,
  neutral: colors.semantic.neutral,
};

/** Half-line draw time; the whole connection draws in ~2× this. */
const HALF_DRAW = 320;

interface SynastryAspectRowProps {
  aspect: SynastryTopAspect;
  /** The other person's name, used to label whose planet is whose. */
  otherName: string;
  /** Delay before the connecting line starts drawing (ms). */
  delay?: number;
}

/** i18n lookup that falls back to "" for planets/aspects we have no copy for. */
function copy(t: TFunction, key: string): string {
  const out = t(key as TranslationKey);
  return out === key ? "" : out;
}

/**
 * One cross-chart contact: your planet — aspect — their planet. The connecting
 * line draws from your planet to theirs, with the aspect dot popping in at the
 * midpoint, so the row reads as "a thread between you".
 *
 * Tapping opens the explanation a newcomer needs to read the one-line phrase:
 * what each of the two planets stands for in a relationship, what the angle
 * between them means, and how to work with it.
 */
export function SynastryAspectRow({ aspect, otherName, delay = 0 }: SynastryAspectRowProps) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const { chevronStyle, layout, entering, exiting } = useExpandMotion(open);
  const tint = NATURE_COLOR[aspect.nature] ?? colors.semantic.neutral;

  const left = useSharedValue(reduced ? 1 : 0);
  const dot = useSharedValue(reduced ? 1 : 0);
  const right = useSharedValue(reduced ? 1 : 0);

  useEffect(() => {
    if (reduced) {
      left.value = 1;
      dot.value = 1;
      right.value = 1;
      return;
    }
    const ease = Easing.out(Easing.quad);
    left.value = withDelay(delay, withTiming(1, { duration: HALF_DRAW, easing: ease }));
    dot.value = withDelay(delay + HALF_DRAW - 60, withSpring(1, motion.spring.snappy));
    right.value = withDelay(
      delay + HALF_DRAW,
      withTiming(1, { duration: HALF_DRAW, easing: ease }),
    );
  }, [delay, reduced, left, dot, right]);

  const leftStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: left.value }] }));
  const rightStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: right.value }] }));
  const dotStyle = useAnimatedStyle(() => ({
    opacity: dot.value,
    transform: [{ scale: dot.value }],
  }));

  const nameA = t(`planets.${aspect.planetA}` as TranslationKey);
  const nameB = t(`planets.${aspect.planetB}` as TranslationKey);
  const roleA = copy(t, `synastry.role${aspect.planetA}`);
  const roleB = copy(t, `synastry.role${aspect.planetB}`);
  const meaning = copy(t, `synastry.mean${aspect.aspect}`);
  const tip = copy(t, `synastry.tip${aspect.aspect}`);

  return (
    <Animated.View layout={layout} style={styles.wrap}>
      <PressableScale
        onPress={() => setOpen((o) => !o)}
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <View style={styles.row}>
          <View style={styles.side}>
            <Glyph name={aspect.planetA} size={22} color={colors.moon} />
            <AppText variant="bodySmall" center numberOfLines={2} style={styles.sideLabel}>
              {t("synastry.you")} · {nameA}
            </AppText>
          </View>
          <View style={styles.middle}>
            <Animated.View style={[styles.aspectLine, { backgroundColor: tint }, leftStyle]} />
            <Animated.View style={[styles.aspectDot, { backgroundColor: tint }, dotStyle]} />
            <Animated.View style={[styles.aspectLine, { backgroundColor: tint }, rightStyle]} />
          </View>
          <View style={styles.side}>
            <Glyph name={aspect.planetB} size={22} color={colors.gold[300]} />
            <AppText variant="bodySmall" center numberOfLines={2} style={styles.sideLabel}>
              {otherName} · {nameB}
            </AppText>
          </View>
        </View>

        {/* The diagram shows the contact; this says what it means. */}
        <View style={styles.phraseRow}>
          <AppText variant="bodySmall" color={tint} center style={styles.phrase}>
            {aspectPhrase(t, aspect.aspect, nameA, nameB, false)}
          </AppText>
          <Animated.View style={chevronStyle}>
            <Ionicons name="chevron-down" size={14} color={colors.text.tertiary} />
          </Animated.View>
        </View>
      </PressableScale>

      {open ? (
        <Animated.View entering={entering} exiting={exiting} style={styles.detail}>
          {roleA ? (
            <Block
              icon={<Glyph name={aspect.planetA} size={16} color={colors.moon} />}
              title={`${t("synastry.you")} · ${nameA}`}
              body={roleA}
            />
          ) : null}
          {roleB ? (
            <Block
              icon={<Glyph name={aspect.planetB} size={16} color={colors.gold[300]} />}
              title={`${otherName} · ${nameB}`}
              body={roleB}
            />
          ) : null}
          {meaning ? (
            <Block
              icon={<Glyph name={aspect.aspect} size={16} color={tint} />}
              title={t("synastry.aspectTitle")}
              body={meaning}
            />
          ) : null}
          {tip ? (
            <View style={[styles.tip, { borderColor: tint }]}>
              <AppText variant="labelLong" color={tint}>
                {t("synastry.tipTitle")}
              </AppText>
              <AppText variant="body" color={colors.text.primary}>
                {tip}
              </AppText>
            </View>
          ) : null}
          <AppText variant="bodySmall" color={colors.text.tertiary}>
            {t("synastry.strength", {
              s: aspectStrength(t, aspect.orb),
              orb: Math.abs(aspect.orb).toFixed(1),
            })}
          </AppText>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

function Block({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <View style={styles.block}>
      <View style={styles.blockHead}>
        {icon}
        <AppText variant="heading" color={colors.text.primary} style={styles.blockTitle}>
          {title}
        </AppText>
      </View>
      <AppText variant="body">{body}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: spacing.sm,
  },
  aspectDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginHorizontal: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  side: {
    width: 76,
    alignItems: "center",
    gap: spacing.xs,
  },
  sideLabel: {
    maxWidth: 76,
  },
  middle: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    // Line up with the glyph centres, not the labels below them.
    height: 22,
  },
  aspectLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth * 2,
    opacity: 0.5,
    // Grow from the left edge so the thread visibly travels A → B.
    transformOrigin: "left",
  },
  phraseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  phrase: {
    flexShrink: 1,
  },
  detail: {
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  block: {
    gap: spacing.xs,
  },
  blockHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  blockTitle: {
    flexShrink: 1,
  },
  tip: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.md,
    borderLeftWidth: 2,
    backgroundColor: colors.ink[800],
  },
});
