/**
 * Server-side entitlement verification against RevenueCat.
 *
 * The paywall is decided here, never in the browser. A check that only runs
 * client-side is one devtools edit away from being skipped, so every paid
 * endpoint asks RevenueCat directly with a key that never leaves the server.
 *
 * Failure policy: fail closed. If RevenueCat cannot be reached, the answer is
 * "not entitled", with the reason, rather than guessing in the user's favour.
 */

const REVENUECAT_API = 'https://api.revenuecat.com/v1';
const DEFAULT_ENTITLEMENT_ID = 'pro';
const TIMEOUT_MS = 5_000;

/**
 * App user ids travel into the RevenueCat URL path, so they are validated
 * before use: no slashes, dots or percent signs means no path traversal
 * (`../`) and no encoded tricks (`%2F`). The client generates a random UUID,
 * which matches; anything else is refused outright.
 */
const APP_USER_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;

export function isValidAppUserId(value: unknown): value is string {
  return typeof value === 'string' && APP_USER_ID_PATTERN.test(value);
}

/** One entitlement as RevenueCat returns it under `subscriber.entitlements`. */
export interface RevenueCatEntitlement {
  expires_date: string | null;
  grace_period_expires_date?: string | null;
  product_identifier?: string;
  purchase_date?: string;
}

/**
 * RevenueCat returns expired entitlements too, so presence is not access.
 * Active means: no expiry at all (a lifetime purchase), an expiry still in the
 * future, or a billing grace period still running.
 */
export function isEntitlementActive(entitlement: RevenueCatEntitlement, now: Date = new Date()): boolean {
  if (entitlement.expires_date === null) return true;

  const expires = Date.parse(entitlement.expires_date);
  if (Number.isFinite(expires) && expires > now.getTime()) return true;

  const grace = entitlement.grace_period_expires_date
    ? Date.parse(entitlement.grace_period_expires_date)
    : NaN;
  return Number.isFinite(grace) && grace > now.getTime();
}

export type EntitlementCheck =
  | { active: true; expiresAt: string | null; productId?: string }
  | { active: false; reason: 'not-configured' | 'invalid-user' | 'unavailable' | 'never-purchased' | 'expired'; expiresAt?: string | null };

export function isBillingConfigured(): boolean {
  return Boolean(process.env.REVENUECAT_SECRET_API_KEY);
}

export async function checkEntitlement(appUserId: string): Promise<EntitlementCheck> {
  if (!isValidAppUserId(appUserId)) return { active: false, reason: 'invalid-user' };

  const apiKey = process.env.REVENUECAT_SECRET_API_KEY;
  if (!apiKey) return { active: false, reason: 'not-configured' };

  const entitlementId = process.env.REVENUECAT_ENTITLEMENT_ID || DEFAULT_ENTITLEMENT_ID;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${REVENUECAT_API}/subscribers/${encodeURIComponent(appUserId)}`, {
      headers: { authorization: `Bearer ${apiKey}`, accept: 'application/json' },
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) return { active: false, reason: 'unavailable' };

    const body = (await response.json()) as {
      subscriber?: { entitlements?: Record<string, RevenueCatEntitlement> };
    };

    const entitlement = body.subscriber?.entitlements?.[entitlementId];
    if (!entitlement) return { active: false, reason: 'never-purchased' };

    return isEntitlementActive(entitlement)
      ? { active: true, expiresAt: entitlement.expires_date, productId: entitlement.product_identifier }
      : { active: false, reason: 'expired', expiresAt: entitlement.expires_date };
  } catch {
    return { active: false, reason: 'unavailable' };
  } finally {
    clearTimeout(timer);
  }
}
