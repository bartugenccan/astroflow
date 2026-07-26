import { Stack } from "expo-router";
import { colors } from "../../src/lib/design-system";

export default function CompatibilityLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.ink[950] },
      }}
    />
  );
}
