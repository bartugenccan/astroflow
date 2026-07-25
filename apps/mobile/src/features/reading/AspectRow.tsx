import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { MotiView } from "moti";
import { BouncyButton } from "../../components/ui/BouncyButton";
import { AppText } from "../../components/ui/AppText";
import { Glyph } from "../../components/Glyph";
import { AspectInterpretation } from "../../services/types";
import { useTranslation } from "../../i18n";
import { colors, spacing } from "../../lib/design-system";

function tint(type: string): string {
  if (type === "harmonic") return colors.semantic.harmonic;
  if (type === "challenging") return colors.semantic.challenging;
  return colors.semantic.neutral;
}

/** Collapsible aspect row — glyph pair + tap to reveal the reading. */
export function AspectRow({ aspect }: { aspect: AspectInterpretation }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const color = tint(aspect.type);

  return (
    <View style={styles.wrap}>
      <BouncyButton onPress={() => setOpen((o) => !o)} scaleTo={0.98}>
        <View style={styles.header}>
          <View style={styles.glyphs}>
            <Glyph name={aspect.planet1} size={18} color={colors.gold[300]} />
            <Glyph name={aspect.aspect} size={14} color={color} />
            <Glyph name={aspect.planet2} size={18} color={colors.gold[300]} />
          </View>
          <View style={styles.meta}>
            <AppText variant="body" color={colors.text.primary}>
              {aspect.planet1} {aspect.aspect} {aspect.planet2}
            </AppText>
            <AppText variant="numeric" color={colors.text.tertiary}>
              {aspect.orb.toFixed(1)}° orb
            </AppText>
          </View>
        </View>
      </BouncyButton>

      {open ? (
        <MotiView
          from={{ opacity: 0, translateY: -6 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: "timing", duration: 240 }}
        >
          <AppText variant="body" color={colors.text.secondary} style={styles.body}>
            {aspect.text}
          </AppText>
        </MotiView>
      ) : null}
    </View>
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
  },
  meta: {
    flex: 1,
  },
  body: {
    marginTop: spacing.sm,
  },
});
