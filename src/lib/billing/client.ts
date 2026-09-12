import type { CustomerInfo, Offering, Package, Purchases } from '@revenuecat/purchases-js';
import { PRO_ENTITLEMENT_ID } from './constants';

/**
 * Browser side of billing. Import only from client components.
 *
 * What this module decides is presentation, never access. The server checks
 * the entitlement against RevenueCat itself before serving anything paid, so
 * a tampered browser can only lie to itself.
 */

const USER_ID_STORAGE_KEY = 'dapp-doctor:user-id';

/** Public by design: RevenueCat public keys are meant to ship to browsers. */
const PUBLIC_API_KEY = process.env.NEXT_PUBLIC_REVENUECAT_API_KEY;

export function isBillingEnabled(): boolean {
  return Boolean(PUBLIC_API_KEY);
}

let memoryUserId: string | null = null;

/** Set when someone is signed in: their account's id, the same on every device. */
let accountUserId: string | null = null;

/**
 * Signs RevenueCat in as the account, or back out to this browser's anonymous
 * id. Purchases made while signed in belong to the account, so they follow
 * the person to any device. Called by the session provider on every page load.
 */
export async function setBillingAccount(appUserId: string | null): Promise<void> {
  accountUserId = appUserId;
  if (!sdkPromise) return;
  const { purchases } = await sdkPromise;
  const target = getOrCreateUserId();
  if (purchases.getAppUserId() !== target) await purchases.changeUser(target);
}

/**
 * The RevenueCat app user id: the signed-in account's, or else this browser's.
 *
 * We generate a UUID rather than calling the SDK's
 * generateRevenueCatAnonymousAppUserId(): that id looks like
 * "$RCAnonymousID:…", and the server refuses `$` and `:` in ids because they
 * travel into a URL path. A UUID is equally anonymous and passes the check.
 *
 * Without signing in, the id lives in this browser only: another device, or
 * clearing site data, loses access to a purchase made with it.
 */
export function getOrCreateUserId(): string {
  if (accountUserId) return accountUserId;
  try {
    const existing = window.localStorage.getItem(USER_ID_STORAGE_KEY);
    if (existing) return existing;
    const created = crypto.randomUUID();
    window.localStorage.setItem(USER_ID_STORAGE_KEY, created);
    return created;
  } catch {
    // Storage can be blocked (private mode, strict settings). Keep the id for
    // this page view so the flow still works; it just will not persist.
    memoryUserId ??= crypto.randomUUID();
    return memoryUserId;
  }
}

type Sdk = typeof import('@revenuecat/purchases-js');

let sdkPromise: Promise<{ sdk: Sdk; purchases: Purchases }> | null = null;

/**
 * Loads and configures the SDK exactly once. The import is dynamic because
 * the SDK is browser-only and client components still render on the server.
 */
function getSdk(): Promise<{ sdk: Sdk; purchases: Purchases }> {
  if (!PUBLIC_API_KEY) {
    return Promise.reject(new Error('Billing is not enabled on this deployment.'));
  }
  sdkPromise ??= import('@revenuecat/purchases-js').then((sdk) => {
    const purchases = sdk.Purchases.isConfigured()
      ? sdk.Purchases.getSharedInstance()
      : sdk.Purchases.configure({ apiKey: PUBLIC_API_KEY, appUserId: getOrCreateUserId() });
    return { sdk, purchases };
  });
  return sdkPromise;
}

export interface ProStatus {
  active: boolean;
  /** null for a lifetime purchase. */
  expiresAt: Date | null;
  willRenew: boolean;
  /** "test_store" marks a test transaction; the demo has to say so. */
  store: string | null;
  productId: string | null;
  /** Web equivalent of Customer Center: where the user manages the subscription. */
  managementURL: string | null;
}

function statusFrom(info: CustomerInfo): ProStatus {
  const entitlement = info.entitlements.active[PRO_ENTITLEMENT_ID];
  return {
    active: Boolean(entitlement?.isActive),
    expiresAt: entitlement?.expirationDate ?? null,
    willRenew: Boolean(entitlement?.willRenew),
    store: entitlement?.store ?? null,
    productId: entitlement?.productIdentifier ?? null,
    managementURL: info.managementURL,
  };
}

export async function getProStatus(): Promise<ProStatus> {
  const { purchases } = await getSdk();
  return statusFrom(await purchases.getCustomerInfo());
}

export async function getCurrentOffering(): Promise<Offering | null> {
  const { purchases } = await getSdk();
  const offerings = await purchases.getOfferings();
  const current = offerings.current;
  return current && current.availablePackages.length > 0 ? current : null;
}

export type PurchaseOutcome =
  | { kind: 'purchased'; status: ProStatus }
  | { kind: 'cancelled' }
  | { kind: 'failed'; message: string; simulated: boolean };

export type PaywallOutcome = PurchaseOutcome | { kind: 'unavailable'; message: string };

/**
 * Sorts an SDK error into what the user needs to hear.
 *
 * - A cancellation is the user's choice, not an error: no red banner, and it
 *   must never read as a failed payment.
 * - Test Store can simulate a failed purchase on purpose. That is what the
 *   demo uses to show the failure path, so it is labelled as simulated.
 * - Configuration and unsupported errors mean the paywall itself could not
 *   be shown, which is the only case where falling back to our own plan list
 *   is right. Any other error happened during a real purchase attempt and is
 *   reported as a failed purchase — hiding it behind a fallback would make a
 *   failed payment look like nothing happened.
 */
function classify(sdk: Sdk, error: unknown): PaywallOutcome {
  if (!(error instanceof sdk.PurchasesError)) {
    return { kind: 'unavailable', message: error instanceof Error ? error.message : 'Unknown error.' };
  }

  switch (error.errorCode) {
    case sdk.ErrorCode.UserCancelledError:
      return { kind: 'cancelled' };
    case sdk.ErrorCode.TestStoreSimulatedPurchaseError:
      return {
        kind: 'failed',
        simulated: true,
        message: 'Test Store simulated a failed purchase. No charge was made and your access is unchanged.',
      };
    case sdk.ErrorCode.ConfigurationError:
    case sdk.ErrorCode.UnsupportedError:
      return { kind: 'unavailable', message: error.message };
    case sdk.ErrorCode.ProductAlreadyPurchasedError:
      return { kind: 'failed', simulated: false, message: 'You already own this plan.' };
    case sdk.ErrorCode.PaymentPendingError:
      return {
        kind: 'failed',
        simulated: false,
        message: 'The payment is still pending. Access unlocks as soon as it completes.',
      };
    case sdk.ErrorCode.NetworkError:
      return {
        kind: 'failed',
        simulated: false,
        message: 'Could not reach the payment service. Nothing was charged; try again.',
      };
    default:
      return { kind: 'failed', simulated: false, message: error.message || 'The purchase could not be completed.' };
  }
}

/** A plan-list purchase has no paywall to fall back from, so "unavailable" is a failure. */
function asPurchaseOutcome(outcome: PaywallOutcome): PurchaseOutcome {
  return outcome.kind === 'unavailable'
    ? { kind: 'failed', simulated: false, message: outcome.message }
    : outcome;
}

/** Buys one package from our own plan list. */
export async function purchasePackage(rcPackage: Package): Promise<PurchaseOutcome> {
  const { sdk, purchases } = await getSdk();
  try {
    const { customerInfo } = await purchases.purchase({ rcPackage });
    return { kind: 'purchased', status: statusFrom(customerInfo) };
  } catch (error) {
    return asPurchaseOutcome(classify(sdk, error));
  }
}

/**
 * Presents the paywall designed in the RevenueCat dashboard. When it cannot
 * be shown, the caller falls back to our own plan list, so the user is never
 * left without a way to buy.
 */
export async function presentPaywall(offering: Offering, htmlTarget?: HTMLElement): Promise<PaywallOutcome> {
  const { sdk, purchases } = await getSdk();
  try {
    const { customerInfo } = await purchases.presentPaywall({ offering, htmlTarget });
    return { kind: 'purchased', status: statusFrom(customerInfo) };
  } catch (error) {
    return classify(sdk, error);
  }
}
