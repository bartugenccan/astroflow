import { Stack } from "expo-router";
import { colors } from "../../src/lib/design-system";

export default function ElectionLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: colors.ink[950] },
      }}
    />
  );
}
