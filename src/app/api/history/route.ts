import { NextResponse } from 'next/server';
import { checkEntitlement, isBillingConfigured, isValidAppUserId } from '@/lib/billing/entitlement';
import { isHistoryConfigured, listReports } from '@/lib/history/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** What the user reads when access is refused. Says what happened and what to do. */
const REFUSAL: Record<string, string> = {
  'never-purchased': 'Diagnosis history is part of DApp Doctor Pro. Upgrade to keep your past runs.',
  expired: 'Your Pro access has expired. Renew it to see your diagnosis history again.',
  unavailable: 'Could not confirm your Pro access right now. Your history is safe; try again shortly.',
};

/**
 * Returns the diagnosis history of an entitled user.
 *
 * 402 Payment Required is the answer for "no active entitlement", distinct
 * from 400 (bad request) and 503 (feature not set up), so the client can show
 * the paywall for exactly the cases where paying would change the answer.
 */
export async function GET(request: Request) {
  const userId = new URL(request.url).searchParams.get('userId');

  if (!isValidAppUserId(userId)) {
    return NextResponse.json({ error: 'userId is missing or malformed.' }, { status: 400 });
  }

  if (!isBillingConfigured()) {
    return NextResponse.json({ error: 'Diagnosis history is not enabled on this deployment.' }, { status: 503 });
  }

  const entitlement = await checkEntitlement(userId);

  if (!entitlement.active) {
    return NextResponse.json(
      {
        error: REFUSAL[entitlement.reason] ?? 'Pro access is required for diagnosis history.',
        reason: entitlement.reason,
        ...(entitlement.expiresAt ? { expiredAt: entitlement.expiresAt } : {}),
      },
      { status: entitlement.reason === 'unavailable' ? 503 : 402 },
    );
  }

  // Access and storage are separate concerns. A paying user is told they are
  // Pro even while storage is not set up, rather than being shown a paywall
  // they have already paid through.
  if (!isHistoryConfigured()) {
    return NextResponse.json(
      { reports: [], storage: false, access: { expiresAt: entitlement.expiresAt } },
      { headers: { 'cache-control': 'no-store' } },
    );
  }

  try {
    const reports = await listReports(userId);
    return NextResponse.json(
      { reports, storage: true, access: { expiresAt: entitlement.expiresAt } },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ error: 'Could not read the diagnosis history.' }, { status: 503 });
  }
}
