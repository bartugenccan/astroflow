import React from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "../../components/ui/AppText";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { PressableScale } from "../../components/ui/PressableScale";
import { SpringBottomSheet } from "../../components/ui/SpringBottomSheet";
import { useTranslation, type TranslationKey } from "../../i18n";
import type { DailyPlan, Intention, PracticeMethod } from "../../services/types";
import { colors, palette, radii, spacing, surface } from "../../lib/design-system";
import { CameTrueShelf } from "./CameTrueShelf";
import { LunarCycleHero } from "./LunarCycleHero";
import { METHOD_LOOK } from "./practiceModel";
import type { LunarInfo } from "./wishModel";

/** The Moon's cycle, moved off the tab into its own sheet (the chip in the header opens it). */
export function LunarSheet({
  visible,
  onClose,
  lunar,
  plan,
  onRitual,
}: {
  visible: boolean;
  onClose: () => void;
  lunar: LunarInfo;
  plan: DailyPlan | null;
  /** Inside a new/full moon window: open the ritual. */
  onRitual?: () => void;
}) {
  const { t } = useTranslation();
  return (
    <SpringBottomSheet visible={visible} onClose={onClose} title={t("practice.lunar.title")}>
      <View style={styles.gap}>
        <LunarCycleHero lunar={lunar} plan={plan} />
        {lunar.window && onRitual ? (
          <ChunkyButton label={t("wish.ritual.moonCta")} variant="star" onPress={onRitual} />
        ) : null}
      </View>
    </SpringBottomSheet>
  );
}

/** The evidence wall: manifestations that came true. */
export function ShelfSheet({
  visible,
  onClose,
  wishes,
  loading,
  error,
  onRetry,
}: {
  visible: boolean;
  onClose: () => void;
  wishes: Intention[] | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  return (
    <SpringBottomSheet visible={visible} onClose={onClose} title={t("wish.shelf.title")}>
      <CameTrueShelf wishes={wishes} loading={loading} error={error} onRetry={onRetry} hideTitle />
    </SpringBottomSheet>
  );
}

const LEARN: readonly { key: string; method?: PracticeMethod; icon: keyof typeof Ionicons.glyphMap; tone: keyof typeof palette }[] = [
  { key: "what", icon: "sparkles", tone: "primary" },
  { key: "script", method: "script", icon: METHOD_LOOK.script.icon, tone: METHOD_LOOK.script.tone },
  { key: "read", method: "read", icon: METHOD_LOOK.read.icon, tone: METHOD_LOOK.read.tone },
  { key: "s369", method: "369", icon: METHOD_LOOK["369"].icon, tone: METHOD_LOOK["369"].tone },
  { key: "visualize", method: "visualize", icon: METHOD_LOOK.visualize.icon, tone: METHOD_LOOK.visualize.tone },
  { key: "moon", icon: "moon", tone: "star" },
];

/**
 * "How manifesting works": six short cards — what it is, the four methods and
 * the Moon's rhythm. A method's card starts that practice.
 */
export function LearnContent({ onStart }: { onStart: (method: PracticeMethod) => void }) {
  const { t } = useTranslation();
  return (
      <View style={styles.gap}>
        {LEARN.map((c) => {
          const tone = palette[c.tone];
          const title = t(`practice.learn.cards.${c.key}.title` as TranslationKey);
          const body = t(`practice.learn.cards.${c.key}.body` as TranslationKey);
          const content = (
            <>
              <View style={[styles.icon, { backgroundColor: tone.face }]} importantForAccessibility="no-hide-descendants">
                <Ionicons name={c.icon} size={18} color={tone.on} />
              </View>
              <View style={styles.text}>
                <AppText variant="heading">{title}</AppText>
                <AppText variant="body">{body}</AppText>
              </View>
              {c.method ? <Ionicons name="play-circle" size={26} color={tone.face} /> : null}
            </>
          );
          return c.method ? (
            <PressableScale
              key={c.key}
              onPress={() => onStart(c.method!)}
              scaleTo={0.98}
              style={styles.card}
              accessibilityRole="button"
              accessibilityLabel={`${title}. ${body}`}
              accessibilityHint={t("practice.start")}
            >
              {content}
            </PressableScale>
          ) : (
            <View key={c.key} style={styles.card} accessible accessibilityLabel={`${title}. ${body}`}>
              {content}
            </View>
          );
        })}
        <AppText variant="bodySmall" center color={colors.text.tertiary}>
          {t("practice.footnote")}
        </AppText>
      </View>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: surface.card,
  },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, gap: 4 },
});
