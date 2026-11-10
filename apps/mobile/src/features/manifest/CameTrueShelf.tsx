import React, { useMemo, useState } from "react";
import { LayoutChangeEvent, ScrollView, StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import Svg, { Line } from "react-native-svg";
import { AppText } from "../../components/ui/AppText";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { PressableScale } from "../../components/ui/PressableScale";
import { StateView } from "../../components/ui/StateView";
import { useTranslation } from "../../i18n";
import type { Intention } from "../../services/types";
import { colors, radii, spacing } from "../../lib/design-system";
import { WishStarGlyph, Twinkle } from "./WishStarGlyph";
import { shortDate } from "./wishModel";

const STEP = 84;
const H = 132;
const STAR = 44;

interface CameTrueShelfProps {
  wishes: Intention[] | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  /** Inside a sheet that already says "Came true": keep only the subtitle. */
  hideTitle?: boolean;
}

/**
 * The evidence wall: wishes that came true, joined into a small gold
 * constellation with the day each one became real. Tapping a star opens it.
 */
export function CameTrueShelf({ wishes, loading, error, onRetry, hideTitle = false }: CameTrueShelfProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [w, setW] = useState(0);
  const list = wishes ?? [];

  // Oldest on the left, so the constellation grows to the right.
  const stars = useMemo(
    () =>
      list
        .slice()
        .sort((a, b) => (a.manifestedAt ?? "").localeCompare(b.manifestedAt ?? ""))
        .map((it, i) => {
          let h = 0;
          for (let k = 0; k < it.id.length; k++) h = (h * 31 + it.id.charCodeAt(k)) >>> 0;
          return { it, x: STEP / 2 + i * STEP, y: 26 + (h % 34) };
        }),
    [list],
  );
  const width = Math.max(w, stars.length * STEP);

  let body: React.ReactNode;
  if (loading && !wishes) {
    body = <StateView kind="loading" compact message={t("wish.shelf.loading")} />;
  } else if (error && !wishes) {
    body = <StateView kind="error" compact message={t("wish.shelf.error")} onAction={onRetry} />;
  } else if (list.length === 0) {
    body = (
      <View style={styles.empty}>
        <WishStarGlyph look="seed" size={40} />
        <AppText variant="bodySmall" style={styles.flex}>
          {t("wish.shelf.empty")}
        </AppText>
      </View>
    );
  } else {
    body = (
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ width, height: H }}>
          <Svg width={width} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
            {stars.slice(1).map((s, i) => (
              <Line
                key={s.it.id}
                x1={stars[i].x}
                y1={stars[i].y + STAR / 2}
                x2={s.x}
                y2={s.y + STAR / 2}
                stroke={colors.star[500]}
                strokeWidth={2}
                strokeDasharray="4 5"
                strokeLinecap="round"
                opacity={0.7}
              />
            ))}
          </Svg>
          {stars.map((s, i) => {
            const date = shortDate(locale, s.it.manifestedAt);
            return (
              <PressableScale
                key={s.it.id}
                onPress={() => router.push(`/intentions/${s.it.id}` as Href)}
                scaleTo={0.9}
                style={[styles.star, { left: s.x - STEP / 2, top: s.y }]}
                accessibilityRole="button"
                accessibilityLabel={t("wish.shelf.starA11y", { goal: s.it.goalText, date })}
              >
                <Twinkle look="radiant" phase={(i * 0.29) % 1}>
                  <WishStarGlyph look="radiant" size={STAR} />
                </Twinkle>
                <AppText variant="numeric" color={colors.star[200]} numberOfLines={1}>
                  {date}
                </AppText>
              </PressableScale>
            );
          })}
        </View>
      </ScrollView>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        {hideTitle ? null : (
          <AppText variant="title" accessibilityRole="header">
            {t("wish.shelf.title")}
          </AppText>
        )}
        <AppText variant="bodySmall">{t("wish.shelf.subtitle")}</AppText>
      </View>
      <ChunkyCard
        padded={false}
        style={styles.card}
      >
        <View onLayout={(e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width)}>{body}</View>
      </ChunkyCard>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.md },
  header: { gap: spacing.xs },
  card: { overflow: "hidden", borderRadius: radii.xl, paddingVertical: spacing.sm },
  empty: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg },
  flex: { flex: 1 },
  star: { position: "absolute", width: STEP, alignItems: "center", gap: 2, minHeight: 48 },
});
