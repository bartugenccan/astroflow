import React from "react";
import { StyleSheet, View } from "react-native";
import { Tabs, useIsFocused } from "expo-router";
import { CelestialTabBar } from "../../src/components/CelestialTabBar";
import { CelestialBackground } from "../../src/components/CelestialBackground";
import { BackgroundProvided } from "../../src/components/ScreenWrapper";
import { surface } from "../../src/lib/design-system";
import { useMascotStore } from "../../src/store/useMascotStore";

/** Cold start and bare `/(tabs)` links land on Sky. */
export const unstable_settings = { initialRouteName: "sky" };

type TabBarRenderer = NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>;

/** Stable across renders, so the navigator never re-creates the bar's element. */
const renderTabBar: TabBarRenderer = (props) => <CelestialTabBar {...props} />;

const SCREEN_OPTIONS = {
  headerShown: false,
  animation: "none",
  sceneStyle: { backgroundColor: "transparent" },
} as const;

/**
 * Five destinations: Today (Aster, the day's quests), Manifest (practice and
 * manifest stars), Sky in the centre (today's sky, the Harita Yolu chart path,
 * what's ahead, compatibility), Tarot and Profile. Sky is the initial route:
 * reading the chart is the heart of the app, so a cold start lands there.
 *
 * One star field sits behind all five tabs and the scenes are transparent, so
 * a tab switch never re-mounts a full-screen Skia canvas. Inactive tabs are
 * detached natively (the default): their views stay alive off-window instead
 * of being hidden with `display: none`, which on Fabric tears the whole native
 * view tree down and rebuilds it on every switch. The navigator's fade is off —
 * each tab eases in with `FocusFade`.
 */
export default function TabsLayout() {
  return (
    <View style={styles.root}>
      <TabsSky />
      <BackgroundProvided.Provider value={true}>
        <Tabs tabBar={renderTabBar} screenOptions={SCREEN_OPTIONS}>
          <Tabs.Screen name="index" options={{ title: "Today" }} />
          <Tabs.Screen name="manifest" options={{ title: "Manifest" }} />
          <Tabs.Screen name="sky" options={{ title: "Sky" }} />
          <Tabs.Screen name="tarot" options={{ title: "Tarot" }} />
          <Tabs.Screen name="profile" options={{ title: "Profile" }} />
        </Tabs>
      </BackgroundProvided.Provider>
    </View>
  );
}

/**
 * The shared sky. While a stack screen covers the tabs (it paints its own star
 * field) this one stops twinkling, so two skies never animate at once. Kept in
 * its own component so a push or pop re-renders only the sky, not the tabs.
 */
function TabsSky() {
  const focused = useIsFocused();
  const nova = useMascotStore((s) => !!s.state?.novaLook);
  // Tabs hold still: content leads, the sky never loops behind it.
  return <CelestialBackground variant="still" paused={!focused} nova={nova} />;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: surface.base },
});
