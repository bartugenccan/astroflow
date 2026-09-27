import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated from "react-native-reanimated";
import { PressableScale } from "../../components/ui/PressableScale";
import { AppText } from "../../components/ui/AppText";
import { Glyph } from "../../components/Glyph";
import { AspectInterpretation } from "../../services/types";
import { aspectName, aspectPhrase, aspectStrength } from "../../lib/astroLanguage";
import { useTranslation, TranslationKey } from "../../i18n";
import { colors, spacing } from "../../lib/design-system";
import { useExpandMotion } from "./HouseRow";

function tint(type: string): string {
  if (type === "harmonic") return colors.semantic.harmonic;
  if (type === "challenging") return colors.semantic.challenging;
  return colors.semantic.neutral;
}

/** Collapsible aspect row — glyph pair + tap to reveal the reading. */
export function AspectRow({ aspect }: { aspect: AspectInterpretation }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { chevronStyle, layout, entering, exiting } = useExpandMotion(open);
  const color = tint(aspect.type);

  return (
    <Animated.View layout={layout} style={styles.wrap}>
      <PressableScale
        onPress={() => setOpen((o) => !o)}
        scaleTo={0.98}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <View style={styles.header}>
          <View style={styles.glyphs}>
            <Glyph name={aspect.planet1} size={18} color={colors.gold[300]} />
            <Glyph name={aspect.aspect} size={14} color={color} />
            <Glyph name={aspect.planet2} size={18} color={colors.gold[300]} />
          </View>
          <View style={styles.meta}>
            {/* Both planets are the reader's own, so neither is "yours". */}
            <AppText variant="body" color={colors.text.primary}>
              {aspectPhrase(
                t,
                aspect.aspect,
                t(`planets.${aspect.planet1}` as TranslationKey),
                t(`planets.${aspect.planet2}` as TranslationKey),
                false,
              )}
            </AppText>
            <AppText variant="bodySmall" color={colors.text.tertiary}>
              {aspectStrength(t, aspect.orb)}
            </AppText>
          </View>
          <Animated.View style={chevronStyle}>
            <Ionicons name="chevron-down" size={16} color={colors.text.tertiary} />
          </Animated.View>
        </View>
      </PressableScale>

      {open ? (
        <Animated.View entering={entering} exiting={exiting}>
          <AppText variant="numeric" color={colors.text.tertiary} style={styles.body}>
            {aspectName(t, aspect.aspect)} · {aspect.orb.toFixed(1)}°
          </AppText>
          <AppText variant="body" color={colors.text.secondary} style={styles.body}>
            {aspect.text}
          </AppText>
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  glyphs: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    width: 72,
    flexShrink: 0,
  },
  meta: {
    flex: 1,
    minWidth: 0,
  },
  body: {
    marginTop: spacing.sm,
  },
});
