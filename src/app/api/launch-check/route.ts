import { NextResponse } from 'next/server';
import { USER_ID_HEADER } from '@/lib/billing/constants';
import { checkEntitlement, isBillingConfigured, isValidAppUserId } from '@/lib/billing/entitlement';
import { parseTarget } from '@/lib/diagnostics/parseTarget';
import { runLaunchCheck } from '@/lib/launch/run';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// The six checks against a live network, like /api/diagnose.
export const maxDuration = 30;

/** What the user reads when access is refused. Says what happened and what to do. */
const REFUSAL: Record<string, string> = {
  'never-purchased': 'Launch Check is part of DApp Doctor Pro. Diagnosis stays free.',
  expired: 'Your Pro access has expired. Renew it to run Launch Check again.',
  unavailable: 'Could not confirm your Pro access right now. Try again shortly.',
};

/**
 * Runs a Launch Check for an entitled user.
 *
 * Access is decided here, against RevenueCat, before a single request leaves
 * for the network: a browser that claims to be Pro gets nothing it has not
 * paid for, and an unpaid call costs us no outbound traffic.
 */
export async function POST(request: Request) {
  // The user id works as a credential here, so it travels in a header, never the URL.
  const userId = request.headers.get(USER_ID_HEADER);
  if (!isValidAppUserId(userId)) {
    return NextResponse.json({ error: 'userId is missing or malformed.' }, { status: 400 });
  }

  if (!isBillingConfigured()) {
    return NextResponse.json({ error: 'Launch Check is not enabled on this deployment.' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'The request body must be valid JSON.' }, { status: 400 });
  }

  const parsed = parseTarget(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const entitlement = await checkEntitlement(userId);
  if (!entitlement.active) {
    return NextResponse.json(
      {
        error: REFUSAL[entitlement.reason] ?? 'Pro access is required for Launch Check.',
        reason: entitlement.reason,
        ...(entitlement.expiresAt ? { expiredAt: entitlement.expiresAt } : {}),
      },
      { status: entitlement.reason === 'unavailable' ? 503 : 402 },
    );
  }

  try {
    const report = await runLaunchCheck(parsed.target);
    return NextResponse.json(report, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected engine failure.' },
      { status: 500 },
    );
  }
}
