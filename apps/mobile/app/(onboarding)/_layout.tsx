import { Stack } from "expo-router";
import { colors, surface } from "../../src/lib/design-system";

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
        contentStyle: { backgroundColor: surface.base },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="consent" options={{ animation: "slide_from_right" }} />
      <Stack.Screen name="birth-date" />
      <Stack.Screen name="birth-time" />
      <Stack.Screen name="birth-place" />
      <Stack.Screen name="reveal" options={{ gestureEnabled: false }} />
      <Stack.Screen name="tour" options={{ gestureEnabled: false, animation: "slide_from_right" }} />
    </Stack>
  );
}
