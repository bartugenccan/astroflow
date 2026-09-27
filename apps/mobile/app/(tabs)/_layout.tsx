import { Tabs } from "expo-router";
import { CelestialTabBar } from "../../src/components/CelestialTabBar";

/**
 * Four destinations, each answering a question a newcomer already has:
 * what about today, what about me, what's coming, and my settings.
 * Chart+Reading became "You"; Transits+Forecast+Year Ahead became "Ahead".
 */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CelestialTabBar {...props} />}
      // Crossfade between tabs instead of a hard cut.
      screenOptions={{ headerShown: false, animation: "fade" }}
    >
      <Tabs.Screen name="index" options={{ title: "Today" }} />
      <Tabs.Screen name="you" options={{ title: "You" }} />
      <Tabs.Screen name="ahead" options={{ title: "Ahead" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
