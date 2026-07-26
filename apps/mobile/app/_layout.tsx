import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Stack, SplashScreen } from "expo-router";
import { useFonts } from "expo-font";
import {
  CormorantGaramond_500Medium,
  CormorantGaramond_600SemiBold,
  CormorantGaramond_500Medium_Italic,
} from "@expo-google-fonts/cormorant-garamond";
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from "@expo-google-fonts/manrope";
import { useAppStore } from "../src/store/useAppStore";
import { colors } from "../src/lib/design-system";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    CormorantGaramond_500Medium,
    CormorantGaramond_600SemiBold,
    CormorantGaramond_500Medium_Italic,
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
  });

  const hasHydrated = useAppStore((s) => s._hasHydrated);
  const hasOnboarded = useAppStore((s) => s.hasOnboarded);

  const ready = (fontsLoaded || fontError) && hasHydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: styles.content }}>
          <Stack.Protected guard={!hasOnboarded}>
            <Stack.Screen name="(onboarding)" />
          </Stack.Protected>
          <Stack.Protected guard={hasOnboarded}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="compatibility" />
            <Stack.Screen name="companion" />
            <Stack.Screen name="intentions" />
          </Stack.Protected>
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink[950] },
  content: { backgroundColor: colors.ink[950] },
});
