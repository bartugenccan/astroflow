import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { Segmented } from "../../components/ui/Segmented";
import { SectionPager } from "../../components/ui/SectionPager";
import { ChartPane, AskPane, MatchPane } from "../you/YouPanes";
import { ForecastScreen } from "../forecast/ForecastScreen";
import { SolarReturnCard } from "../ahead/SolarReturnCard";
import { EnterView } from "../../lib/motion";
import { useTranslation } from "../../i18n";
import { spacing } from "../../lib/design-system";

const SECTIONS = ["chart", "future", "match", "ask"] as const;
type Section = (typeof SECTIONS)[number];

/**
 * Sky — the astrology reference tab: your natal chart, what's ahead (Solar
 * Return pinned on top, then weekly/monthly forecasts and best days), how you
 * match with others, and a place to ask. Manifesting lives in its own tab.
 *
 * Sections stay mounted once opened, so switching keeps scroll position.
 */
export function SkyScreen() {
  const { t } = useTranslation();
  const [section, setSection] = useState<Section>("chart");

  return (
    <ScreenWrapper>
      <View style={styles.switcher}>
        <Segmented
          value={section}
          onChange={setSection}
          options={[
            { key: "chart", label: t("you.chart") },
            { key: "future", label: t("tabs.ahead") },
            { key: "match", label: t("you.compat") },
            { key: "ask", label: t("you.ask") },
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
                <EnterView scale>
                  <SolarReturnCard />
                </EnterView>
              }
            />
          ) : key === "match" ? (
            <MatchPane />
          ) : (
            <AskPane />
          )
        }
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  switcher: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
});
