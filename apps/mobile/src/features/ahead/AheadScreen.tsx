import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { ScreenWrapper } from "../../components/ScreenWrapper";
import { Segmented } from "../../components/ui/Segmented";
import { SectionPager } from "../../components/ui/SectionPager";
import { TransitsScreen } from "../transits/TransitsScreen";
import { ForecastScreen } from "../forecast/ForecastScreen";
import { useTranslation } from "../../i18n";
import { spacing } from "../../lib/design-system";

const HORIZONS = ["now", "season"] as const;
type Horizon = (typeof HORIZONS)[number];

function isHorizon(v: unknown): v is Horizon {
  return typeof v === "string" && (HORIZONS as readonly string[]).includes(v);
}

/**
 * "Ahead" — what's coming, at two distances: right now and the next weeks.
 *
 * Folds the old Transits and Forecast tabs together. Ordering them by time
 * horizon means the user picks a distance rather than a technique. The year
 * (Solar Return) moved out to its own screen, reached from Today's "Your year"
 * card, where it has room to explain itself.
 *
 * `?section=season` lets other screens deep-link to a horizon (Today's
 * "See your forecast" lands on the weeks view, not on "Now").
 */
export function AheadScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ section?: string }>();
  const [horizon, setHorizon] = useState<Horizon>(
    isHorizon(params.section) ? params.section : "now",
  );

  useEffect(() => {
    if (isHorizon(params.section)) setHorizon(params.section);
  }, [params.section]);

  return (
    <ScreenWrapper>
      <View style={styles.switcher}>
        <Segmented
          value={horizon}
          onChange={setHorizon}
          options={[
            { key: "now", label: t("ahead.now") },
            { key: "season", label: t("ahead.season") },
          ]}
        />
      </View>
      <SectionPager
        order={HORIZONS}
        active={horizon}
        render={(key) => (key === "now" ? <TransitsScreen /> : <ForecastScreen />)}
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
