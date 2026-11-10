import { useRouter } from "expo-router";
import { AiConsentScreen } from "../../src/features/consent/AiConsentScreen";
import { useAppStore } from "../../src/store/useAppStore";

export default function ConsentRoute() {
  const router = useRouter();
  const acceptAiConsent = useAppStore((s) => s.acceptAiConsent);
  return (
    <AiConsentScreen
      // Still an egg: onboarding hasn't finished, so there's no Aster state yet.
      asterStage={0}
      onBack={router.canGoBack() ? () => router.back() : undefined}
      onAccept={() => {
        acceptAiConsent();
        router.replace("/birth-date");
      }}
    />
  );
}
