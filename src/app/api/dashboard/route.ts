import { NextResponse } from 'next/server';
import { aggregateEvents } from '@/lib/dashboard/aggregate';
import { isDashboardConfigured, listDiagnosisEvents } from '@/lib/dashboard/store';
import { isPeriodId, type PeriodId } from '@/lib/dashboard/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Aggregated health of real diagnoses already stored.
 * Does not run the engine. Period filters the stored events; it does not invent any.
 */
export async function GET(request: Request) {
  const periodParam = new URL(request.url).searchParams.get('period') ?? '7d';
  if (!isPeriodId(periodParam)) {
    return NextResponse.json(
      { error: 'period must be one of 24h, 7d, 30d, all.' },
      { status: 400 },
    );
  }
  const period: PeriodId = periodParam;

  if (!isDashboardConfigured()) {
    return NextResponse.json(
      { configured: false, period, generatedAt: new Date().toISOString(), snapshot: null },
      { headers: { 'cache-control': 'no-store' } },
    );
  }

  try {
    const events = await listDiagnosisEvents();
    return NextResponse.json(
      {
        configured: true,
        period,
        generatedAt: new Date().toISOString(),
        snapshot: aggregateEvents(events, period),
      },
      { headers: { 'cache-control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ error: 'Could not read dashboard data.' }, { status: 503 });
  }
}
