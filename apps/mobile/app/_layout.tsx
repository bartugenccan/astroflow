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
import { TermSheet } from "../src/features/glossary/TermSheet";

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
        {/* One transition language app-wide: pushed screens slide in from the
            right (with the native swipe-back), conversational/utility screens
            rise from the bottom, and the onboarding ↔ app swap crossfades. */}
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: styles.content,
            animation: "slide_from_right",
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
          }}
        >
          <Stack.Protected guard={!hasOnboarded}>
            <Stack.Screen name="(onboarding)" options={{ animation: "fade" }} />
          </Stack.Protected>
          <Stack.Protected guard={hasOnboarded}>
            <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
            <Stack.Screen name="year-ahead" />
            <Stack.Screen name="chart" />
            <Stack.Screen name="compatibility" />
            <Stack.Screen name="intentions" />
            <Stack.Screen name="glossary" />
            <Stack.Screen
              name="companion"
              options={{ animation: "slide_from_bottom", fullScreenGestureEnabled: false }}
            />
          </Stack.Protected>
        </Stack>
        {/* App-wide glossary sheet, opened from any ⓘ. */}
        {hasOnboarded ? <TermSheet /> : null}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink[950] },
  content: { backgroundColor: colors.ink[950] },
});
