import { FocusFade } from "../../src/components/FocusFade";
import { ProfileScreen } from "../../src/features/profile/ProfileScreen";

export default function ProfileScreenRoute() {
  return (
    <FocusFade>
      <ProfileScreen />
    </FocusFade>
  );
}
