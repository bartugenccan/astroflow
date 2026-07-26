import { useLocalSearchParams } from "expo-router";
import { CompanionScreen } from "../src/features/companion/CompanionScreen";

export default function CompanionRoute() {
  const { seed } = useLocalSearchParams<{ seed?: string }>();
  return <CompanionScreen seed={typeof seed === "string" ? seed : undefined} />;
}
