import React from "react";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { ReadingPage } from "../src/components/ReadingPage";
import { PaywallContent, type PaywallVariant } from "../src/components/PaywallSheet";

const VARIANTS: PaywallVariant[] = ["compat", "forecast", "premium"];

/** `/premium?variant=` — what Premium opens, as a page (Profile → Premium). */
export default function PremiumRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ variant?: string }>();
  const variant = VARIANTS.find((v) => v === params.variant) ?? "premium";
  const leave = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)" as Href));
  return (
    <ReadingPage backIcon="close">
      <PaywallContent variant={variant} onClose={leave} />
    </ReadingPage>
  );
}
