import { FocusFade } from "../../src/components/FocusFade";
import { SkyScreen } from "../../src/features/sky/SkyScreen";

export default function SkyScreenRoute() {
  return (
    <FocusFade>
      <SkyScreen />
    </FocusFade>
  );
}
