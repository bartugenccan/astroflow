import { FocusFade } from "../../src/components/FocusFade";
import { TarotScreen } from "../../src/features/tarot/TarotScreen";

export default function TarotScreenRoute() {
  return (
    <FocusFade>
      <TarotScreen />
    </FocusFade>
  );
}
