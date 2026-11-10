import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { AppText } from "../../components/ui/AppText";
import { PressableScale } from "../../components/ui/PressableScale";
import { Segmented } from "../../components/ui/Segmented";
import { SectionPager } from "../../components/ui/SectionPager";
import { SectionLink } from "../../components/ui/SectionLink";
import { ChartPane, MatchPane } from "./SkyPanes";
import { ForecastScreen } from "../forecast/ForecastScreen";
import { SolarReturnCard } from "./SolarReturnCard";
import { EnterView } from "../../lib/motion";
import { useTranslation } from "../../i18n";
import { depth, layout, palette, radii, spacing } from "../../lib/design-system";

const SECTIONS = ["chart", "future", "match"] as const;
type Section = (typeof SECTIONS)[number];

function isSection(value: unknown): value is Section {
  return typeof value === "string" && (SECTIONS as readonly string[]).includes(value);
}

/**
 * Sky — the heart of the app and where it opens. Three panes:
 *   My chart — today's sky in a line, then Harita Yolu (the chart, chapter by chapter)
 *   Ahead    — the birthday year, best days and the forecast; pick a date
 *   Match    — compatibility with the people you save
 * "Ask Aster" sits in the header on every pane (it used to be a fourth pane).
 *
 * Panes stay mounted once opened, so switching keeps scroll position.
 * Deep link: `/(tabs)/sky?pane=future`; unknown values (the old `ask`
 * included) are ignored.
 */
export function SkyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ pane?: string | string[] }>();
  const [section, setSection] = useState<Section>("chart");

  const linkedPane = Array.isArray(params.pane) ? params.pane[0] : params.pane;
  useEffect(() => {
    if (linkedPane === undefined) return;
    if (linkedPane === "ask") router.push("/companion" as Href);
    else if (isSection(linkedPane)) setSection(linkedPane);
    // Consume the param so the same link works again after switching panes.
    router.setParams({ pane: undefined });
  }, [linkedPane, router]);

  return (
    <ScreenWrapper>
      <View style={styles.header}>
        <EnterView from="none" style={styles.titleRow}>
          <AppText variant="display" accessibilityRole="header" style={styles.flex}>
            {t("skypath.sky.title")}
          </AppText>
          <PressableScale
            onPress={() => router.push("/companion" as Href)}
            scaleTo={0.95}
            style={styles.ask}
            accessibilityRole="button"
            accessibilityLabel={t("skypath.sky.askAster")}
          >
            <Ionicons name="chatbubble-ellipses" size={18} color={palette.primary.on} />
            <AppText variant="labelLong" color={palette.primary.on}>
              {t("skypath.sky.askAster")}
            </AppText>
          </PressableScale>
        </EnterView>
        <Segmented
          value={section}
          onChange={setSection}
          options={[
            { key: "chart", label: t("skypath.sky.panes.chart") },
            { key: "future", label: t("skypath.sky.panes.future") },
            { key: "match", label: t("skypath.sky.panes.match") },
          ]}
        />
      </View>
      <SectionPager
        order={SECTIONS}
        active={section}
        render={(key) =>
          key === "chart" ? (
            <ChartPane />
          ) : key === "future" ? (
            <ForecastScreen
              headerSlot={
                <View style={styles.aheadTop}>
                  <EnterView scale>
                    <SolarReturnCard />
                  </EnterView>
                  <SectionLink
                    label={t("skypath.sky.pickDate")}
                    icon="hourglass"
                    tone="star"
                    onPress={() => router.push("/election?mode=check" as Href)}
                  />
                </View>
              }
            />
          ) : (
            <MatchPane />
          )
        }
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  flex: { flex: 1, minWidth: 0 },
  ask: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: palette.primary.face,
    borderBottomWidth: depth.sm,
    borderBottomColor: palette.primary.slab,
  },
  aheadTop: { gap: spacing.md },
});

