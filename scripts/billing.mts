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

console.log(`\n=== ${failures === 0 ? 'all billing checks passed' : `${failures} billing check(s) FAILED`} ===`);
process.exit(failures > 0 ? 1 : 0);
