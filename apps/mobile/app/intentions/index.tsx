import { Redirect, type Href } from "expo-router";

/** `/intentions` — wishes live in the Manifest tab's sky now; old links land there. */
export default function IntentionsIndex() {
  return <Redirect href={"/(tabs)/manifest" as Href} />;
}
