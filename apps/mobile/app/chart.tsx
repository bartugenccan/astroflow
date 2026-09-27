import { StyleSheet, View } from "react-native";
import { ScreenWrapper } from "../src/components/ScreenWrapper";
import { BackButton } from "../src/components/ui/BackButton";
import { ChartScreen } from "../src/features/chart/ChartScreen";
import { spacing } from "../src/lib/design-system";

/** `/chart` — the natal wheel on its own screen, opened from For You → Your chart. */
export default function ChartRoute() {
  return (
    <ScreenWrapper>
      <View style={styles.topBar}>
        <BackButton />
      </View>
      <ChartScreen />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
});
