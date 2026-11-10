import { StyleSheet, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { ScreenWrapper } from "../src/components/ScreenWrapper";
import { BackButton } from "../src/components/ui/BackButton";
import { ChartScreen, type ChartFocus } from "../src/features/chart/ChartScreen";
import { spacing } from "../src/lib/design-system";

type Param = string | string[] | undefined;
const first = (v: Param) => (Array.isArray(v) ? v[0] : v);

/**
 * `/chart` — the natal wheel on its own screen, opened from Sky → Your chart.
 * Deep links: `?planet=<NatalPlanet>&transit=<TransitPlanet>` opens that
 * placement with a "today's transit" note; `?sign=<Sign>` highlights the
 * placements in that sign. Missing or unknown values are ignored.
 */
export default function ChartRoute() {
  const params = useLocalSearchParams<{ planet?: Param; transit?: Param; sign?: Param }>();
  const focus: ChartFocus = {
    planet: first(params.planet),
    transit: first(params.transit),
    sign: first(params.sign),
  };
  return (
    <ScreenWrapper>
      <View style={styles.topBar}>
        <BackButton />
      </View>
      <ChartScreen focus={focus} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
});
