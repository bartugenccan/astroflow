import { Platform } from "react-native";
import Purchases, { LOG_LEVEL, type CustomerInfo, type PurchasesPackage } from "react-native-purchases";
import { PREMIUM_BETA } from "./config";
import { useAppStore } from "../store/useAppStore";
import { track } from "./analytics";

/**
 * In-app subscriptions through RevenueCat. Off unless the platform's public
 * SDK key is set (EXPO_PUBLIC_REVENUECAT_IOS_KEY / _ANDROID_KEY). While off,
 * or while PREMIUM_BETA is on, nothing here changes who is Premium.
 *
 * One entitlement, "premium", is the source of truth: whenever RevenueCat
 * reports customer info, `isPremium` becomes "beta, or that entitlement is
 * active". The RevenueCat user is anonymous (no device id, no account id).
 */
const KEY = (
  Platform.OS === "ios"
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY
) ?? "";

export const PREMIUM_ENTITLEMENT = "premium";
export const PURCHASES_ENABLED = KEY.trim().length > 0;

let configured = false;

function apply(info: CustomerInfo): boolean {
  const active = info.entitlements.active[PREMIUM_ENTITLEMENT] !== undefined;
  useAppStore.getState().setPremium(PREMIUM_BETA || active);
  return active;
}

/** Call once at startup (root layout). Safe to call when disabled. */
export function initPurchases(): void {
  if (!PURCHASES_ENABLED || configured) return;
  try {
    if (__DEV__) void Purchases.setLogLevel(LOG_LEVEL.WARN);
    Purchases.configure({ apiKey: KEY.trim() });
    configured = true;
    // Settle the persisted flag from the store's own record (works offline from its cache) —
    // after the app store has rehydrated, or the rehydrate would overwrite the answer.
    const settle = () => {
      Purchases.addCustomerInfoUpdateListener(apply);
      Purchases.getCustomerInfo().then(apply).catch(() => undefined);
    };
    if (useAppStore.persist.hasHydrated()) settle();
    else useAppStore.persist.onFinishHydration(settle);
  } catch {
    configured = false;
  }
}

export interface PremiumPlan {
  id: string;
  /** Localised price from the store, e.g. "₺149,99". */
  price: string;
  /** "monthly" | "annual" | … — RevenueCat's package type, lower-case. */
  period: string;
  pkg: PurchasesPackage;
}

/** The current offering's packages, annual first. Empty when disabled or offline. */
export async function loadPlans(): Promise<PremiumPlan[]> {
  if (!configured) return [];
  try {
    const offerings = await Purchases.getOfferings();
    const pkgs = offerings.current?.availablePackages ?? [];
    const order = ["ANNUAL", "SIX_MONTH", "THREE_MONTH", "MONTHLY", "WEEKLY", "LIFETIME"];
    return [...pkgs]
      .sort((a, b) => order.indexOf(a.packageType) - order.indexOf(b.packageType))
      .map((pkg) => ({
        id: pkg.identifier,
        price: pkg.product.priceString,
        period: String(pkg.packageType).toLowerCase(),
        pkg,
      }));
  } catch {
    return [];
  }
}

export type PurchaseOutcome = "purchased" | "cancelled" | "failed";

export async function buyPlan(plan: PremiumPlan): Promise<PurchaseOutcome> {
  if (!configured) return "failed";
  track("purchase_started", { product: plan.id });
  try {
    const { customerInfo } = await Purchases.purchasePackage(plan.pkg);
    const active = apply(customerInfo);
    if (active) track("purchase_completed", { product: plan.id });
    return active ? "purchased" : "failed";
  } catch (e) {
    const cancelled = !!(e as { userCancelled?: boolean | null }).userCancelled;
    track("purchase_failed", { reason: cancelled ? "cancelled" : "error" });
    return cancelled ? "cancelled" : "failed";
  }
}

/** "Restore purchases" (required by App Review whenever there are subscriptions). */
export async function restorePurchases(): Promise<"restored" | "none" | "failed"> {
  if (!configured) return "failed";
  try {
    const active = apply(await Purchases.restorePurchases());
    track("purchases_restored", { active });
    return active ? "restored" : "none";
  } catch {
    return "failed";
  }
}
