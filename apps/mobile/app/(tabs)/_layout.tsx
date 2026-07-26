import { Tabs } from "expo-router";
import { CelestialTabBar } from "../../src/components/CelestialTabBar";

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CelestialTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: "Today" }} />
      <Tabs.Screen name="chart" options={{ title: "Chart" }} />
      <Tabs.Screen name="transits" options={{ title: "Transits" }} />
      <Tabs.Screen name="reading" options={{ title: "Reading" }} />
      <Tabs.Screen name="forecast" options={{ title: "Forecast" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
