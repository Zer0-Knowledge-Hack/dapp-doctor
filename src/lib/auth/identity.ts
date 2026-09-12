import { createHash } from 'node:crypto';
import { isValidAppUserId } from '../billing/entitlement';

/**
 * Who a request belongs to, for RevenueCat and the diagnosis history.
 *
 * Two kinds of user id exist:
 * - Anonymous: a random UUID the browser keeps. It works with no account,
 *   but it lives in that browser only.
 * - Account: derived from a Google sign-in, so the same person gets the same
 *   id on every device. It starts with "g_" and is a hash, so it reveals
 *   nothing about the account it comes from.
 */

const ACCOUNT_PREFIX = 'g_';

/** The stable user id for a Google account, from its subject id. Same account, same id, anywhere. */
export function accountUserId(googleSubject: string): string {
  const digest = createHash('sha256').update(`google:${googleSubject}`).digest('hex');
  return `${ACCOUNT_PREFIX}${digest.slice(0, 40)}`;
}

export function isAccountUserId(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith(ACCOUNT_PREFIX);
}

/**
 * The user id a request may act as.
 *
 * A signed-in session always wins. Without one, the id the browser sends is
 * accepted only if it is an anonymous one: an account id is honoured only
 * with that account's session, so knowing someone's account id is not enough
 * to read their history.
 */
export function chooseUserId(input: { sessionUserId: string | null | undefined; claimedUserId: unknown }): string | null {
  if (isValidAppUserId(input.sessionUserId)) return input.sessionUserId;
  if (isValidAppUserId(input.claimedUserId) && !isAccountUserId(input.claimedUserId)) return input.claimedUserId;
  return null;
}
