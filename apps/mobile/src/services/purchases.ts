import { Linking, Platform } from "react-native";
import { create } from "zustand";
import Purchases, {
  INTRO_ELIGIBILITY_STATUS,
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesPackage,
} from "react-native-purchases";
import { PREMIUM_BETA, USE_HTTP } from "./config";
import { useAppStore } from "../store/useAppStore";
import { getSubject, onIdentityChange } from "./deviceAuth";
import { astrologyApi } from "./astrologyApi";
import { track } from "./analytics";

/**
 * In-app subscriptions through RevenueCat. Off unless the platform's public
 * SDK key is set (EXPO_PUBLIC_REVENUECAT_IOS_KEY / _ANDROID_KEY).
 *
 * Identity: the RevenueCat app user id is our subject id (the device token's
 * `sub`: the install, or the account it signed in to) — the same User ID we
 * declare in App Privacy, so Purchase History is "linked". When the subject
 * changes (sign-in, sign-out, data wipe) we `logIn` to the new id and
 * `syncPurchases`, which moves this Apple ID's receipt over (RevenueCat's
 * "transfer to new App User ID"), then ask our server to re-read it.
 *
 * Premium = PREMIUM_BETA, or RevenueCat's "premium" entitlement, or the
 * server's copy of it (POST /billing/sync, fed by RevenueCat's webhook).
 */
const KEY = (
  (Platform.OS === "ios"
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY) ?? ""
).trim();

export const PREMIUM_ENTITLEMENT = "premium";
export const PURCHASES_ENABLED = KEY.length > 0;
/** Where a subscriber manages or cancels (App Store / Play). */
export const MANAGE_SUBSCRIPTIONS_URL =
  Platform.OS === "ios"
    ? "https://apps.apple.com/account/subscriptions"
    : "https://play.google.com/store/account/subscriptions";

interface BillingInfo {
  /** RevenueCat says the entitlement is active on this phone. */
  storeActive: boolean;
  /** Our server says so (covers a fresh install before RevenueCat answers). */
  serverActive: boolean;
  expiresAt: string | null;
  willRenew: boolean;
  productId: string | null;
  managementURL: string | null;
}

/** Subscription details for Profile; not persisted (RevenueCat caches its own). */
export const useBillingStore = create<BillingInfo>(() => ({
  storeActive: false,
  serverActive: false,
  expiresAt: null,
  willRenew: false,
  productId: null,
  managementURL: null,
}));

let configured = false;
let currentSubject: string | null = null;

function publish(): void {
  const { storeActive, serverActive } = useBillingStore.getState();
  useAppStore.getState().setPremium(PREMIUM_BETA || storeActive || serverActive);
}

function applyCustomerInfo(info: CustomerInfo): boolean {
  const ent = info.entitlements.active[PREMIUM_ENTITLEMENT];
  useBillingStore.setState({
    storeActive: !!ent,
    ...(ent
      ? { expiresAt: ent.expirationDate, willRenew: ent.willRenew, productId: ent.productIdentifier }
      : {}),
    managementURL: info.managementURL,
  });
  publish();
  return !!ent;
}

/** Ask our server to re-read RevenueCat for this subject. Best effort. */
export async function syncServerBilling(): Promise<void> {
  if (!USE_HTTP) return;
  try {
    const s = await astrologyApi.syncBilling();
    useBillingStore.setState((cur) => ({
      serverActive: s.source === "subscription",
      expiresAt: cur.storeActive ? cur.expiresAt : s.expiresAt,
      willRenew: cur.storeActive ? cur.willRenew : s.willRenew,
      productId: cur.storeActive ? cur.productId : s.productId,
    }));
    publish();
  } catch {
    // Offline or not signed up yet: keep what we have.
  }
}

async function switchSubject(subject: string | null): Promise<void> {
  if (!configured || !subject || subject === currentSubject) return;
  currentSubject = subject;
  try {
    applyCustomerInfo((await Purchases.logIn(subject)).customerInfo);
    // Move this Apple ID's receipt to the new subject (silent; no password prompt).
    await Purchases.syncPurchases().catch(() => undefined);
    applyCustomerInfo(await Purchases.getCustomerInfo());
  } catch {
    // RevenueCat unreachable: the next launch tries again.
  }
  await syncServerBilling();
}

/** Call once at startup (root layout). Safe to call when disabled. */
export function initPurchases(): void {
  const settle = () => {
    void start();
  };
  if (useAppStore.persist.hasHydrated()) settle();
  else useAppStore.persist.onFinishHydration(settle);
}

async function start(): Promise<void> {
  publish();
  if (!PURCHASES_ENABLED) {
    await syncServerBilling();
    return;
  }
  if (configured) return;
  onIdentityChange((subject) => {
    void switchSubject(subject);
  });
  try {
    if (__DEV__) void Purchases.setLogLevel(LOG_LEVEL.WARN);
    const subject = await getSubject();
    // Without a subject yet (offline first launch) RevenueCat starts anonymous;
    // the identity listener logs in once the device token arrives.
    Purchases.configure({ apiKey: KEY, ...(subject ? { appUserID: subject } : {}) });
    configured = true;
    currentSubject = subject;
    Purchases.addCustomerInfoUpdateListener(applyCustomerInfo);
    applyCustomerInfo(await Purchases.getCustomerInfo());
  } catch {
    // Keep the app usable; Premium falls back to the server's answer.
  }
  await syncServerBilling();
}

/**
 * "Manage subscription": on iOS, Apple's in-app sheet (StoreKit, through
 * RevenueCat), which also lists TestFlight/sandbox subscriptions and keeps
 * the person in the app. When the sheet closes the entitlement is re-read, so
 * a cancellation or plan change shows at once. Elsewhere, or if the sheet
 * can't open, the store's web page.
 */
export async function openManageSubscriptions(): Promise<void> {
  const openWeb = () =>
    Linking.openURL(useBillingStore.getState().managementURL ?? MANAGE_SUBSCRIPTIONS_URL).catch(() => undefined);
  if (Platform.OS !== "ios" || !configured) {
    await openWeb();
    return;
  }
  try {
    await Purchases.showManageSubscriptions();
  } catch {
    await openWeb();
    return;
  }
  try {
    applyCustomerInfo(await Purchases.getCustomerInfo());
  } catch {
    // Offline: the listener catches up later.
  }
  void syncServerBilling();
}

export interface PremiumPlan {
  id: string;
  /** "annual" | "monthly" | … — RevenueCat's package type, lower-case. */
  period: string;
  /** Localised billed price from the store, e.g. "₺999,99". */
  price: string;
  priceValue: number;
  /** "₺83,33" for a yearly plan; null when the store doesn't say. */
  pricePerMonth: string | null;
  /** Free-trial length in days when this user is eligible; null otherwise. */
  trialDays: number | null;
  pkg: PurchasesPackage;
}

function trialDaysOf(pkg: PurchasesPackage): number | null {
  const intro = pkg.product.introPrice;
  if (!intro || intro.price !== 0) return null;
  const unit = String(intro.periodUnit).toUpperCase();
  const n = intro.periodNumberOfUnits * (intro.cycles || 1);
  if (unit === "DAY") return n;
  if (unit === "WEEK") return n * 7;
  if (unit === "MONTH") return n * 30;
  return null;
}

/** The current offering's packages, annual first. Empty when disabled or offline. */
export async function loadPlans(): Promise<PremiumPlan[]> {
  if (!configured) return [];
  try {
    const offerings = await Purchases.getOfferings();
    const pkgs = offerings.current?.availablePackages ?? [];
    const order = ["ANNUAL", "SIX_MONTH", "THREE_MONTH", "MONTHLY", "WEEKLY", "LIFETIME"];
    const sorted = [...pkgs].sort((a, b) => order.indexOf(a.packageType) - order.indexOf(b.packageType));
    let eligibility: Record<string, { status: INTRO_ELIGIBILITY_STATUS }> = {};
    try {
      eligibility = await Purchases.checkTrialOrIntroductoryPriceEligibility(
        sorted.map((p) => p.product.identifier),
      );
    } catch {
      // Unknown eligibility: show no trial rather than promise one.
    }
    return sorted.map((pkg) => {
      const eligible =
        eligibility[pkg.product.identifier]?.status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE;
      return {
        id: pkg.identifier,
        period: String(pkg.packageType).toLowerCase(),
        price: pkg.product.priceString,
        priceValue: pkg.product.price,
        pricePerMonth: pkg.packageType === "ANNUAL" ? pkg.product.pricePerMonthString : null,
        trialDays: eligible ? trialDaysOf(pkg) : null,
        pkg,
      };
    });
  } catch {
    return [];
  }
}

/** Whole-percent saving of a yearly plan over twelve monthly payments, or null. */
export function annualSaving(plans: PremiumPlan[]): number | null {
  const annual = plans.find((p) => p.period === "annual");
  const monthly = plans.find((p) => p.period === "monthly");
  if (!annual || !monthly || monthly.priceValue <= 0) return null;
  const pct = Math.round((1 - annual.priceValue / (monthly.priceValue * 12)) * 100);
  return pct >= 5 ? pct : null;
}

export type PurchaseOutcome = "purchased" | "cancelled" | "failed";

export async function buyPlan(plan: PremiumPlan): Promise<PurchaseOutcome> {
  if (!configured) return "failed";
  track("purchase_started", { product: plan.id });
  try {
    const { customerInfo } = await Purchases.purchasePackage(plan.pkg);
    const active = applyCustomerInfo(customerInfo);
    void syncServerBilling();
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
    const active = applyCustomerInfo(await Purchases.restorePurchases());
    await syncServerBilling();
    track("purchases_restored", { active });
    return active ? "restored" : "none";
  } catch {
    return "failed";
  }
}
