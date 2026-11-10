import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { Stack, SplashScreen, useNavigationContainerRef } from "expo-router";
import { useFonts } from "expo-font";
import {
  Nunito_700Bold,
  Nunito_700Bold_Italic,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from "@expo-google-fonts/nunito";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { Caveat_500Medium, Caveat_700Bold } from "@expo-google-fonts/caveat";
import { AI_CONSENT_VERSION, useAppStore } from "../src/store/useAppStore";
import { colors, surface } from "../src/lib/design-system";
import { TermSheet } from "../src/features/glossary/TermSheet";
import { ConfigErrorScreen } from "../src/components/ConfigErrorScreen";
import { API_CONFIG_ERROR } from "../src/services/config";
import { initSentry, navigationIntegration, Sentry } from "../src/services/sentry";
import { AppErrorBoundary } from "../src/components/AppErrorBoundary";
import { ReminderBridge } from "../src/features/reminders/ReminderBridge";
import { VaultBridge } from "../src/features/account/VaultBridge";
import { AiConsentScreen } from "../src/features/consent/AiConsentScreen";
import { CelebrationHost } from "../src/features/aster/CelebrationHost";

initSentry();
SplashScreen.preventAutoHideAsync();

/** Any render error below the root lands here (and in Sentry) instead of a white screen. */
export { AppErrorBoundary as ErrorBoundary };

function RootLayout() {
  const navigationRef = useNavigationContainerRef();
  useEffect(() => {
    if (navigationRef) navigationIntegration.registerNavigationContainer(navigationRef);
  }, [navigationRef]);

  const [fontsLoaded, fontError] = useFonts({
    Nunito_700Bold,
    Nunito_700Bold_Italic,
    Nunito_800ExtraBold,
    Nunito_900Black,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    Caveat_500Medium,
    Caveat_700Bold,
  });

  const hasHydrated = useAppStore((s) => s._hasHydrated);
  const hasOnboarded = useAppStore((s) => s.hasOnboarded);
  const aiConsentCurrent = useAppStore((s) => !!s.aiConsentAt && s.aiConsentVersion >= AI_CONSENT_VERSION);
  const acceptAiConsent = useAppStore((s) => s.acceptAiConsent);

  const ready = (fontsLoaded || fontError) && hasHydrated;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;
  if (API_CONFIG_ERROR) return <ConfigErrorScreen />;
  // Onboarded without the current AI notice (signed in on a new phone, a build
  // from before it existed, or the notice grew since): show it once first.
  if (hasOnboarded && !aiConsentCurrent) {
    return (
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <AiConsentScreen onAccept={acceptAiConsent} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

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
            <Stack.Screen name="aster" />
            <Stack.Screen name="election" />
            <Stack.Screen name="glossary" />
            <Stack.Screen name="reports" />
            <Stack.Screen name="plan" />
            <Stack.Screen name="sky-today" />
            <Stack.Screen name="learn" />
            <Stack.Screen name="ritual" />
            {/* Lessons and the paywall rise like a lesson and close with their X. */}
            <Stack.Screen
              name="lesson/[key]"
              options={{ animation: "slide_from_bottom", fullScreenGestureEnabled: false }}
            />
            <Stack.Screen
              name="premium"
              options={{ animation: "slide_from_bottom", fullScreenGestureEnabled: false }}
            />
            {/* A guided manifest practice rises like a lesson and closes with its X. */}
            <Stack.Screen
              name="practice"
              options={{ animation: "slide_from_bottom", fullScreenGestureEnabled: false }}
            />
            <Stack.Screen
              name="companion"
              options={{ animation: "slide_from_bottom", fullScreenGestureEnabled: false }}
            />
          </Stack.Protected>
        </Stack>
        {/* App-wide glossary sheet, opened from any ⓘ. */}
        {hasOnboarded ? <TermSheet /> : null}
        {/* Local reminders: schedule from settings, route taps. */}
        {hasOnboarded ? <ReminderBridge /> : null}
        {hasOnboarded ? <VaultBridge /> : null}
        {/* Aster's celebrations (hatching, growing, rewards) over everything. */}
        {hasOnboarded ? <CelebrationHost /> : null}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: surface.base },
  content: { backgroundColor: surface.base },
});
