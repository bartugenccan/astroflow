import React, { useCallback, useEffect, useState } from "react";
import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { BackButton } from "../../components/ui/BackButton";
import { AppText } from "../../components/ui/AppText";
import { AsterCameo } from "../../components/ui/AsterCameo";
import { Chip } from "../../components/ui/Chip";
import { ChunkyButton } from "../../components/ui/ChunkyButton";
import { ChunkyCard } from "../../components/ui/ChunkyCard";
import { ChunkyProgress } from "../../components/ui/ChunkyProgress";
import { SpringBottomSheet } from "../../components/ui/SpringBottomSheet";
import { StateView } from "../../components/ui/StateView";
import { EnterView } from "../../lib/motion";
import { ALL_CONSTELLATIONS, ZODIAC_CONSTELLATIONS } from "../../lib/constellations";
import { useTranslation } from "../../i18n";
import { colors, palette, radii, spacing, surface } from "../../lib/design-system";
import { mascotApi } from "../../services/mascotApi";
import type { ConstellationEntry } from "../../services/types";
import { signName } from "../today/planCopy";
import { ConstellationFigure } from "./ConstellationFigure";
import { constellationName } from "./JourneyDiscovery";

const COLUMNS = 3;
const GAP = spacing.md;

/** Constellation key → zodiac sign ("scorpius" → "Scorpio"), or null for a sky figure. */
const SIGN_OF: Record<string, string> = Object.fromEntries(
  Object.entries(ZODIAC_CONSTELLATIONS).map(([sign, key]) => [key, sign]),
);

/**
 * Aster's constellation album: every figure Aster can bring home from a
 * journey, 24 in all. Found ones draw their stars; the rest wait as "?"
 * silhouettes. A zodiac constellation opens that sign in your chart.
 */
export function ConstellationAlbumScreen() {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [entries, setEntries] = useState<ConstellationEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<ConstellationEntry | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    mascotApi
      .getConstellations()
      .then((list) => {
        // Keep the album's canonical order (zodiac first) and fill in any key the server omits.
        const byKey = new Map(list.map((e) => [e.key, e]));
        setEntries(
          ALL_CONSTELLATIONS.map(
            (key) => byKey.get(key) ?? { key, found: false, count: 0, firstFoundAt: null },
          ),
        );
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const contentWidth = Math.min(width, 560) - spacing.xl * 2;
  const tileSize = Math.floor((contentWidth - GAP * (COLUMNS - 1)) / COLUMNS);
  const found = entries?.filter((e) => e.found).length ?? 0;
  const total = entries?.length ?? ALL_CONSTELLATIONS.length;
  const dateLoc = locale === "tr" ? "tr-TR" : "en-US";

  let body: React.ReactNode;
  if (!entries) {
    body = failed && !loading ? (
      <StateView kind="error" message={t("aster.constellations.loadError")} onAction={load} />
    ) : (
      <StateView kind="loading" />
    );
  } else {
    body = (
      <>
        <EnterView style={styles.head}>
          <AppText variant="display">{t("aster.constellations.title")}</AppText>
          <AppText variant="body">{t("aster.constellations.subtitle")}</AppText>
          <View style={styles.progressRow}>
            <ChunkyProgress
              value={total ? found / total : 0}
              tone="star"
              height={12}
              style={styles.flex}
              accessibilityLabel={t("aster.constellations.progress", { found, total })}
            />
            <AppText variant="heading" color={palette.star.face}>
              {`${found}/${total}`}
            </AppText>
          </View>
        </EnterView>

        {found === 0 ? (
          <EnterView index={1}>
            <AsterCameo text={t("aster.constellations.empty")} size={72} />
          </EnterView>
        ) : null}

        <EnterView index={2} style={styles.grid}>
          {entries.map((e) => {
            const name = constellationName(t, e.key);
            return (
              <ChunkyCard
                key={e.key}
                onPress={() => setSelected(e)}
                padded={false}
                depth="sm"
                tone={e.found ? "night" : "raised"}
                accessibilityLabel={e.found ? name : t("aster.constellations.unknownA11y")}
                style={[styles.tile, { width: tileSize }]}
                containerStyle={{ width: tileSize }}
              >
                {e.found ? (
                  <ConstellationFigure constellation={e.key} size={tileSize - 24} animate={false} />
                ) : (
                  <View style={[styles.unknown, { width: tileSize - 24, height: tileSize - 24 }]}>
                    <Ionicons name="help" size={Math.round(tileSize * 0.32)} color={colors.text.tertiary} />
                  </View>
                )}
                <AppText
                  variant="labelLong"
                  center
                  numberOfLines={1}
                  color={e.found ? colors.text.primary : colors.text.tertiary}
                  style={styles.tileName}
                >
                  {e.found ? name : "?"}
                </AppText>
              </ChunkyCard>
            );
          })}
        </EnterView>
      </>
    );
  }

  const sign = selected ? SIGN_OF[selected.key] ?? null : null;

  return (
    <ScreenWrapper>
      <View style={styles.topBar}>
        <BackButton />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {body}
      </ScrollView>

      <SpringBottomSheet
        visible={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.found ? constellationName(t, selected.key) : t("aster.constellations.unknown")}
      >
        {selected ? (
          <View style={styles.detail}>
            {selected.found ? (
              <>
                <View style={styles.bigFigure}>
                  <ConstellationFigure
                    key={selected.key}
                    constellation={selected.key}
                    size={220}
                    delay={250}
                    accessibilityLabel={constellationName(t, selected.key)}
                  />
                </View>
                <View style={styles.tags}>
                  <Chip
                    label={sign ? t("aster.constellations.zodiacTag") : t("aster.constellations.skyTag")}
                    icon={sign ? "planet" : "star"}
                    tone={sign ? "primary" : "sky"}
                  />
                  <Chip
                    label={
                      selected.count <= 1
                        ? t("aster.constellations.countOne")
                        : t("aster.constellations.count", { n: selected.count })
                    }
                    icon="repeat"
                    tone="star"
                  />
                </View>
                {selected.firstFoundAt ? (
                  <AppText variant="body" center>
                    {t("aster.constellations.firstFound", {
                      date: new Date(selected.firstFoundAt).toLocaleDateString(dateLoc, {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      }),
                    })}
                  </AppText>
                ) : null}
                {sign ? (
                  <ChunkyButton
                    label={t("aster.constellations.seeSign", { sign: signName(t, sign) })}
                    variant="primary"
                    onPress={() => {
                      setSelected(null);
                      router.push(`/chart?sign=${sign}` as Href);
                    }}
                  />
                ) : null}
              </>
            ) : (
              <>
                <View style={[styles.unknown, styles.bigUnknown]}>
                  <Ionicons name="help" size={72} color={colors.text.tertiary} />
                </View>
                <AppText variant="body" center>
                  {t("aster.constellations.unknownHint")}
                </AppText>
              </>
            )}
          </View>
        ) : null}
      </SpringBottomSheet>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 80,
    gap: spacing.xl,
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },
  head: { gap: spacing.sm },
  progressRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.sm },
  flex: { flex: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  tile: { alignItems: "center", paddingTop: spacing.md, paddingBottom: spacing.sm, paddingHorizontal: spacing.sm },
  tileName: { alignSelf: "stretch" },
  unknown: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radii.pill,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: colors.border.hairlineStrong,
    backgroundColor: surface.card,
  },
  bigUnknown: { width: 180, height: 180, alignSelf: "center" },
  detail: { gap: spacing.md, paddingBottom: spacing.lg },
  bigFigure: { alignItems: "center" },
  tags: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.sm },
});
