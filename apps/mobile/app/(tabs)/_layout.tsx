import { StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import { CelestialTabBar } from "../../src/components/CelestialTabBar";
import { CelestialBackground } from "../../src/components/CelestialBackground";
import { BackgroundProvided } from "../../src/components/ScreenWrapper";
import { colors } from "../../src/lib/design-system";

/**
 * Four destinations: Today (what the sky is doing now + the day's guidance),
 * For You (your chart, questions, affirmations, compatibility), Future
 * (Solar Return + forecasts) and Profile.
 *
 * One star field sits behind all four tabs and the scenes are transparent, so
 * switching tabs never re-mounts a Skia canvas (a re-mounted canvas stayed
 * black until it redrew). Tabs stay attached, the navigator's fade is off —
 * each tab eases in with `FocusFade` instead, which never starts invisible.
 */
export default function TabsLayout() {
  return (
    <View style={styles.root}>
      <CelestialBackground />
      <BackgroundProvided.Provider value={true}>
        <Tabs
          tabBar={(props) => <CelestialTabBar {...props} />}
          detachInactiveScreens={false}
          screenOptions={{
            headerShown: false,
            animation: "none",
            sceneStyle: styles.scene,
          }}
        >
          <Tabs.Screen name="index" options={{ title: "Today" }} />
          <Tabs.Screen name="you" options={{ title: "For You" }} />
          <Tabs.Screen name="ahead" options={{ title: "Future" }} />
          <Tabs.Screen name="profile" options={{ title: "Profile" }} />
        </Tabs>
      </BackgroundProvided.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink[950] },
  scene: { backgroundColor: "transparent" },
});
