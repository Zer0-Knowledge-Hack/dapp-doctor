import { accountUserId, chooseUserId, isAccountUserId } from '../src/lib/auth/identity';
import { isEntitlementActive, isValidAppUserId } from '../src/lib/billing/entitlement';

/**
 * The RevenueCat brief judges whether a failed purchase or an expired
 * entitlement correctly removes access. This asserts the rule that decides it,
 * offline, against fixed clocks — no RevenueCat account needed.
 */

let failures = 0;

function check(name: string, actual: boolean, expected: boolean) {
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`${ok ? 'OK  ' : 'BAD '} ${name}${ok ? '' : `  — expected ${expected}, got ${actual}`}`);
}

const now = new Date('2026-09-12T12:00:00Z');

console.log('--- entitlement activity ---');
check('lifetime purchase (expires_date null) is active',
  isEntitlementActive({ expires_date: null }, now), true);
check('expiry in the future is active',
  isEntitlementActive({ expires_date: '2026-10-12T12:00:00Z' }, now), true);
check('expiry in the past is NOT active',
  isEntitlementActive({ expires_date: '2026-09-01T12:00:00Z' }, now), false);
check('expired one second ago is NOT active',
  isEntitlementActive({ expires_date: '2026-09-12T11:59:59Z' }, now), false);
check('expired but inside a grace period is active',
  isEntitlementActive({ expires_date: '2026-09-10T12:00:00Z', grace_period_expires_date: '2026-09-15T12:00:00Z' }, now), true);
check('expired and grace period also over is NOT active',
  isEntitlementActive({ expires_date: '2026-09-01T12:00:00Z', grace_period_expires_date: '2026-09-05T12:00:00Z' }, now), false);
check('unparseable expiry fails closed',
  isEntitlementActive({ expires_date: 'not-a-date' }, now), false);

console.log('\n--- app user id validation (it travels into a URL path) ---');
check('random UUID accepted', isValidAppUserId('3f1c9a2e-7b4d-4e8a-9c21-5d6f0a1b2c3d'), true);
check('path traversal refused', isValidAppUserId('../../v1/subscribers/admin'), false);
check('encoded slash refused', isValidAppUserId('abcdefgh%2F..%2Fadmin'), false);
check('query injection refused', isValidAppUserId('abcdefghijklmnop?x=1'), false);
check('too short refused', isValidAppUserId('abc'), false);
check('non-string refused', isValidAppUserId(12345), false);
check('empty refused', isValidAppUserId(''), false);

console.log('\n--- accounts: whose purchase and history a request may reach ---');
const account = accountUserId('109876543210987654321');
const anonymous = '3f1c9a2e-7b4d-4e8a-9c21-5d6f0a1b2c3d';
check('an account id is a valid RevenueCat user id', isValidAppUserId(account), true);
check('the same Google account always gets the same id', accountUserId('109876543210987654321') === account, true);
check('another Google account gets another id', accountUserId('109876543210987654322') === account, false);
check('the id does not contain the Google subject', account.includes('109876543210987654321'), false);
check('account ids are recognisable', isAccountUserId(account) && !isAccountUserId(anonymous), true);
check('a signed-in session wins over what the browser sends',
  chooseUserId({ sessionUserId: account, claimedUserId: anonymous }) === account, true);
check('without a session, an anonymous id is accepted',
  chooseUserId({ sessionUserId: null, claimedUserId: anonymous }) === anonymous, true);
check('without a session, an account id is refused: knowing it is not enough',
  chooseUserId({ sessionUserId: null, claimedUserId: account }) === null, true);
check('a malformed id is refused', chooseUserId({ sessionUserId: undefined, claimedUserId: '../admin' }) === null, true);

console.log(`\n=== ${failures === 0 ? 'all billing checks passed' : `${failures} billing check(s) FAILED`} ===`);
process.exit(failures > 0 ? 1 : 0);
