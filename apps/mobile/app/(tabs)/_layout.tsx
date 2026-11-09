import { StyleSheet, View } from "react-native";
import { Tabs } from "expo-router";
import { CelestialTabBar } from "../../src/components/CelestialTabBar";
import { CelestialBackground } from "../../src/components/CelestialBackground";
import { BackgroundProvided } from "../../src/components/ScreenWrapper";
import { colors, surface } from "../../src/lib/design-system";

/**
 * Five destinations: Today (Aster, the day's quests, guidance and sky),
 * Manifest (intentions, affirmations, rituals — everything that grows Aster),
 * Tarot (a three-card spread), Sky (chart, future, compatibility, ask) and
 * Profile.
 *
 * One star field sits behind all five tabs and the scenes are transparent, so
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
          <Tabs.Screen name="manifest" options={{ title: "Manifest" }} />
          <Tabs.Screen name="tarot" options={{ title: "Tarot" }} />
          <Tabs.Screen name="sky" options={{ title: "Sky" }} />
          <Tabs.Screen name="profile" options={{ title: "Profile" }} />
        </Tabs>
      </BackgroundProvided.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: surface.base },
  scene: { backgroundColor: "transparent" },
});
