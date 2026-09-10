import { NextResponse } from 'next/server';
import { runDiagnosis } from '@/lib/diagnostics/engine';
import { parseTarget } from '@/lib/diagnostics/parseTarget';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

  try {
    const report = await runDiagnosis(parsed.target);
    return NextResponse.json(report, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected engine failure.' },
      { status: 500 },
    );
  }
}
