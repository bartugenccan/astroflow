import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { Segmented } from "../../components/ui/Segmented";
import { SectionPager } from "../../components/ui/SectionPager";
import { ChartScreen } from "../chart/ChartScreen";
import { ReadingScreen } from "../reading/ReadingScreen";
import { useTranslation } from "../../i18n";
import { spacing } from "../../lib/design-system";

const SECTIONS = ["story", "picture"] as const;
type Section = (typeof SECTIONS)[number];

/**
 * "You" — everything the birth chart says about the person, in one tab.
 *
 * Was two separate tabs (Chart and Reading) that answered the same question in
 * two registers: the wheel and the words. They are one destination now, split
 * by a segmented control. Both sections stay mounted once opened, so flipping
 * between them keeps scroll position and never reloads the wheel.
 */
export function YouScreen() {
  const { t } = useTranslation();
  const [section, setSection] = useState<Section>("story");

  return (
    <ScreenWrapper>
      <View style={styles.switcher}>
        <Segmented
          value={section}
          onChange={setSection}
          options={[
            { key: "story", label: t("you.story") },
            { key: "picture", label: t("you.picture") },
          ]}
        />
      </View>
      <SectionPager
        order={SECTIONS}
        active={section}
        render={(key) => (key === "story" ? <ReadingScreen /> : <ChartScreen />)}
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
