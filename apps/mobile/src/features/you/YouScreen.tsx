import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { Segmented } from "../../components/ui/Segmented";
import { SectionPager } from "../../components/ui/SectionPager";
import { IntentionsPane } from "../affirmations/IntentionsPane";
import { ChartPane, AskPane, MatchPane } from "./YouPanes";
import { useTranslation } from "../../i18n";
import { spacing } from "../../lib/design-system";

const SECTIONS = ["chart", "ask", "intentions", "match"] as const;
type Section = (typeof SECTIONS)[number];

/**
 * "For You" — everything about the person in one tab: their chart, a place to
 * ask about what's on their mind, their affirmations and goals, and how they
 * match with others. Nothing here depends on the day (that's Today) or on
 * timing (that's Future).
 *
 * Sections stay mounted once opened, so switching keeps scroll position and
 * never reloads.
 */
export function YouScreen() {
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
            { key: "ask", label: t("you.ask") },
            { key: "intentions", label: t("you.intentions") },
            { key: "match", label: t("you.compat") },
          ]}
        />
      </View>
      <SectionPager
        order={SECTIONS}
        active={section}
        render={(key) =>
          key === "chart" ? (
            <ChartPane />
          ) : key === "ask" ? (
            <AskPane />
          ) : key === "intentions" ? (
            <IntentionsPane />
          ) : (
            <MatchPane />
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
