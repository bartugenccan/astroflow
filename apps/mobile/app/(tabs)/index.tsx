import { FocusFade } from "../../src/components/FocusFade";
import { TodayScreen } from "../../src/features/today/TodayScreen";

export default function TodayScreenRoute() {
  return (
    <FocusFade>
      <TodayScreen />
    </FocusFade>
  );
}
