import { FocusFade } from "../../src/components/FocusFade";
import { ManifestScreen } from "../../src/features/manifest/ManifestScreen";

export default function ManifestScreenRoute() {
  return (
    <FocusFade>
      <ManifestScreen />
    </FocusFade>
  );
}
