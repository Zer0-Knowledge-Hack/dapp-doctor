import { NextResponse } from 'next/server';
import { runDiagnosis } from '@/lib/diagnostics/engine';
import { compareReports } from '@/lib/diagnostics/compare';
import { parseTarget } from '@/lib/diagnostics/parseTarget';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Runs two diagnoses and returns the difference.
 *
 * Both run in parallel on purpose: if network state changes between one run
 * and the other, the comparison mixes two moments and "before/after" stops
 * meaning what it says.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'The request body must be valid JSON.' }, { status: 400 });
  }

  const input = body as { before?: unknown; after?: unknown };

  const parsedBefore = parseTarget(input.before, 'before');
  if (!parsedBefore.ok) {
    return NextResponse.json({ error: parsedBefore.error }, { status: 400 });
  }

  const parsedAfter = parseTarget(input.after, 'after');
  if (!parsedAfter.ok) {
    return NextResponse.json({ error: parsedAfter.error }, { status: 400 });
  }

  try {
    const [before, after] = await Promise.all([
      runDiagnosis(parsedBefore.target),
      runDiagnosis(parsedAfter.target),
    ]);
    return NextResponse.json(compareReports(before, after), {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected engine failure.' },
      { status: 500 },
    );
  }
}
