import { NextResponse } from 'next/server';
import { runDiagnosis } from '@/lib/diagnostics/engine';
import { parseTarget } from '@/lib/diagnostics/parseTarget';
import { checkEntitlement, isValidAppUserId } from '@/lib/billing/entitlement';
import { recordDiagnosisEvent } from '@/lib/dashboard/store';
import { saveReport } from '@/lib/history/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// six checks against a live network can outlast a serverless default of 10s when a
// provider is slow. Without this the function is killed and the caller gets
// nothing, which is worse than a slow but honest report.
export const maxDuration = 30;

type HistoryOutcome = { saved: true; id: string } | { saved: false; reason: string };

export async function POST(request: Request) {
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

  const userId = (body as { userId?: unknown }).userId;
  const wantsHistory = isValidAppUserId(userId);

  try {
    // The entitlement lookup runs alongside the diagnosis rather than after
    // it, so a paying user does not wait for RevenueCat on top of six checks.
    const [report, entitlement] = await Promise.all([
      runDiagnosis(parsed.target),
      wantsHistory ? checkEntitlement(userId) : Promise.resolve(null),
    ]);

    // Dashboard log is independent of Pro history: every finished diagnosis
    // is a real event. Best effort — a Redis outage must not hide the report.
    try {
      await recordDiagnosisEvent(report, 'diagnose');
    } catch {
      /* the diagnosis is the product */
    }

    let history: HistoryOutcome | undefined;
    if (entitlement) {
      if (!entitlement.active) {
        history = { saved: false, reason: entitlement.reason };
      } else {
        // Saving is best effort: the diagnosis is the product, the history is
        // an extra. A storage outage must never cost the user their report.
        try {
          const stored = await saveReport(userId as string, report);
          history = stored ? { saved: true, id: stored.id } : { saved: false, reason: 'not-configured' };
        } catch {
          history = { saved: false, reason: 'unavailable' };
        }
      }
    }

    return NextResponse.json(
      history ? { ...report, history } : report,
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected engine failure.' },
      { status: 500 },
    );
  }
}
