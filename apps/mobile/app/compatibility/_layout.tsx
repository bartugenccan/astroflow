import { Stack } from "expo-router";
import { colors, surface } from "../../src/lib/design-system";

export default function CompatibilityLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: surface.base },
      }}
    />
  );
}
