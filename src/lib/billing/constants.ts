/**
 * The entitlement that unlocks DApp Doctor Pro.
 *
 * Shared by the browser and the server so the two can never disagree on which
 * entitlement means "paid". It is not a secret, which is why it may carry the
 * NEXT_PUBLIC_ prefix. It must match the identifier in the RevenueCat
 * dashboard exactly — including its spelling.
 */
export const PRO_ENTITLEMENT_ID =
  process.env.NEXT_PUBLIC_REVENUECAT_ENTITLEMENT_ID || 'daap_doctor_pro';

/**
 * Header that carries the app user id to paid endpoints. The id works as a
 * credential for a user's history, so it must never travel in a URL.
 */
export const USER_ID_HEADER = 'x-dapp-doctor-user';
