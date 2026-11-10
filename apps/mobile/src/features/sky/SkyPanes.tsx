import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import { EnterView } from "../../lib/motion";
import { CompatibilityList } from "../compatibility/CompatibilityListScreen";
import { SkyPath } from "../skypath/SkyPath";
import { useMascotStore } from "../../store/useMascotStore";
import { layout, spacing } from "../../lib/design-system";
import { TodaySkyStrip } from "./TodaySkyStrip";

/**
 * "My chart": today's sky in one line on top, then Harita Yolu — the chart
 * read chapter by chapter. Coming back from a lesson re-reads Aster's state
 * so the path shows the new tick at once.
 */
export function ChartPane() {
  const refreshIfStale = useMascotStore((s) => s.refreshIfStale);
  const refresh = useMascotStore((s) => s.refresh);
  const first = React.useRef(true);
  useFocusEffect(
    React.useCallback(() => {
      if (first.current) {
        first.current = false;
        void refreshIfStale();
        return;
      }
      void refresh();
    }, [refresh, refreshIfStale]),
  );

  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <EnterView index={0}>
        <TodaySkyStrip />
      </EnterView>
      <EnterView index={1}>
        <SkyPath />
      </EnterView>
    </ScrollView>
  );
}

/** "Match": compatibility — saved people and "Add a person". */
export function MatchPane() {
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <CompatibilityList />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: layout.gutter,
    paddingTop: spacing.lg,
    paddingBottom: 140,
    gap: spacing.xl,
  },
});
