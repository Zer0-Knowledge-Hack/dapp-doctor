import { aggregateEvents, inPeriod, performanceOf, RPC_DOWN_WINDOW_MS } from '../src/lib/dashboard/aggregate';
import { hasFieldErrors, validateTargetFields } from '../src/lib/forms/targetFields';
import { eventFromReport } from '../src/lib/dashboard/event';
import type { DashboardCheck, DashboardEvent } from '../src/lib/dashboard/types';
import type { CheckId, CheckOutcome, CheckResult, DiagnoseTarget, DiagnosisReport, OverallStatus } from '../src/lib/diagnostics/types';

/**
 * The dashboard must never invent a diagnosis. These fixtures are labelled
 * as such: they exercise the aggregator, not a live chain.
 */

let failures = 0;

function check(name: string, ok: boolean, detail = '') {
  if (!ok) failures++;
  console.log(`${ok ? 'OK  ' : 'BAD '} ${name}${ok || !detail ? '' : `\n     ${detail}`}`);
}

const CHECK_IDS: CheckId[] = [
  'access',
  'network-identity',
  'node-freshness',
  'contract-bytecode',
  'critical-read',
  'fallback',
];

function checks(overrides: Partial<Record<CheckId, CheckOutcome>> = {}): DashboardCheck[] {
  return CHECK_IDS.map((id) => ({
    id,
    title: id,
    outcome: overrides[id] ?? 'PASS',
    summary: `${id} ${overrides[id] ?? 'PASS'}`,
    durationMs: 10,
    critical: id !== 'node-freshness' && id !== 'fallback',
  }));
}

function event(partial: Partial<DashboardEvent> & Pick<DashboardEvent, 'id' | 'recordedAt' | 'status'>): DashboardEvent {
  return {
    source: 'diagnose',
    headline: 'fixture',
    durationMs: 100,
    startedAt: partial.recordedAt,
    expectedChainId: 8453,
    rpcUrl: 'https://mainnet.base.org/',
    checks: checks(),
    ...partial,
  };
}

const now = Date.parse('2026-09-12T12:00:00.000Z');
const HOUR = 60 * 60 * 1000;

console.log('--- empty input is empty, not a made-up total ---');
{
  const snap = aggregateEvents([], '7d', now);
  check('total is 0', snap.total === 0);
  check('READY is 0', snap.counts.READY === 0);
  check('no series buckets', snap.series.length === 0);
  check('no issues', snap.issues.length === 0);
  check('no alerts', snap.alerts.length === 0);
  check('average is null', snap.averageMs === null);
  check('recent is empty', snap.recent.length === 0);
}

console.log('\n--- period filter uses recordedAt, not a guessed day ---');
{
  const inside = event({ id: 'in', recordedAt: '2026-09-12T10:00:00.000Z', status: 'READY' });
  const outside = event({ id: 'out', recordedAt: '2026-08-01T10:00:00.000Z', status: 'BLOCKED' });
  check('event from 2 hours ago is in 24h', inPeriod(inside, '24h', now));
  check('August event is outside 24h', !inPeriod(outside, '24h', now));
  const snap = aggregateEvents([inside, outside], '24h', now);
  check('24h total is 1', snap.total === 1);
  check('the August BLOCKED is not counted', snap.counts.BLOCKED === 0 && snap.counts.READY === 1);
}

console.log('\n--- status counts come from the events ---');
{
  const events = [
    event({ id: 'a', recordedAt: '2026-09-12T11:00:00.000Z', status: 'READY' }),
    event({ id: 'b', recordedAt: '2026-09-12T11:10:00.000Z', status: 'AT_RISK' }),
    event({ id: 'c', recordedAt: '2026-09-12T11:20:00.000Z', status: 'BLOCKED' }),
    event({ id: 'd', recordedAt: '2026-09-12T11:30:00.000Z', status: 'BLOCKED' }),
  ];
  const snap = aggregateEvents(events, 'all', now);
  check('total 4', snap.total === 4);
  check('READY 1', snap.counts.READY === 1);
  check('AT_RISK 1', snap.counts.AT_RISK === 1);
  check('BLOCKED 2', snap.counts.BLOCKED === 2);
}

console.log('\n--- issues count FAIL and WARN only ---');
{
  const events = [
    event({
      id: 'e1',
      recordedAt: '2026-09-12T11:00:00.000Z',
      status: 'BLOCKED',
      checks: checks({ 'network-identity': 'FAIL', fallback: 'WARN' }),
    }),
    event({
      id: 'e2',
      recordedAt: '2026-09-12T11:05:00.000Z',
      status: 'BLOCKED',
      checks: checks({ 'network-identity': 'FAIL' }),
    }),
  ];
  const snap = aggregateEvents(events, 'all', now);
  const identity = snap.issues.find((row) => row.id === 'network-identity');
  const fallback = snap.issues.find((row) => row.id === 'fallback');
  const access = snap.issues.find((row) => row.id === 'access');
  check('network-identity has 2 problems', identity?.problems === 2 && identity.fail === 2);
  check('fallback has 1 WARN', fallback?.problems === 1 && fallback.warn === 1);
  check('a passing check is omitted', access === undefined);
  check('issues are sorted by frequency', snap.issues[0]?.id === 'network-identity');
}

console.log('\n--- series omits empty buckets ---');
{
  const events = [
    event({ id: 's1', recordedAt: '2026-09-11T10:00:00.000Z', status: 'READY' }),
    event({ id: 's2', recordedAt: '2026-09-12T10:00:00.000Z', status: 'BLOCKED' }),
  ];
  const snap = aggregateEvents(events, '7d', now);
  check('two days with data, not seven empty days', snap.series.length === 2);
  check('first bucket is the 11th', snap.series[0]?.label === '2026-09-11');
}

console.log('\n--- RPC Down is only for a recent access FAIL ---');
{
  const oldFail = event({
    id: 'old',
    recordedAt: new Date(now - RPC_DOWN_WINDOW_MS - HOUR).toISOString(),
    status: 'BLOCKED',
    rpcUrl: 'https://stale.example/',
    checks: checks({ access: 'FAIL' }),
  });
  const recentFail = event({
    id: 'new',
    recordedAt: new Date(now - 10 * 60 * 1000).toISOString(),
    status: 'BLOCKED',
    rpcUrl: 'https://down.example/',
    checks: checks({ access: 'FAIL' }),
  });
  const snap = aggregateEvents([oldFail, recentFail], '30d', now);
  const stale = snap.rpcs.find((row) => row.rpcUrl === 'https://stale.example/');
  const down = snap.rpcs.find((row) => row.rpcUrl === 'https://down.example/');
  check('an old access FAIL is degraded, not down', stale?.health === 'degraded');
  check('a FAIL inside 6 hours is down', down?.health === 'down');
}

console.log('\n--- alerts need two real occurrences ---');
{
  const once = [
    event({
      id: 'once',
      recordedAt: '2026-09-12T11:00:00.000Z',
      status: 'BLOCKED',
      checks: checks({ 'network-identity': 'FAIL' }),
    }),
  ];
  check('one identity FAIL does not alert', aggregateEvents(once, 'all', now).alerts.length === 0);
  const twice = [
    ...once,
    event({
      id: 'twice',
      recordedAt: '2026-09-12T11:30:00.000Z',
      status: 'BLOCKED',
      checks: checks({ 'network-identity': 'FAIL' }),
    }),
  ];
  const alerts = aggregateEvents(twice, 'all', now).alerts;
  check('two identity FAILs raise an alert', alerts.some((alert) => alert.kind === 'network-identity' && alert.count === 2));
}

console.log('\n--- performance stays null until there are enough samples ---');
{
  check('no durations → all null', performanceOf([]).averageMs === null && performanceOf([]).p95Ms === null);
  check('one sample has average, not median or p95', performanceOf([40]).medianMs === null && performanceOf([40]).p95Ms === null && performanceOf([40]).averageMs === 40);
  check('two samples unlock median', performanceOf([10, 30]).medianMs === 20);
  const p95 = performanceOf([10, 20, 30, 40, 100]);
  check('five samples unlock p95', p95.p95Ms === 100 && p95.fastestMs === 10 && p95.slowestMs === 100);
}

console.log('\n--- trend only when the previous window has events ---');
{
  const current = event({ id: 'now', recordedAt: '2026-09-12T11:00:00.000Z', status: 'READY' });
  const previous = event({ id: 'then', recordedAt: '2026-09-11T11:00:00.000Z', status: 'BLOCKED' });
  const withPrev = aggregateEvents([current, previous], '24h', now);
  check('24h trend exists when yesterday also has a run', withPrev.trend !== null && withPrev.trend.previousTotal === 1);
  const onlyNow = aggregateEvents([current], '24h', now);
  check('no trend when the previous window is empty', onlyNow.trend === null);
}

console.log('\n--- stored events redact API keys ---');
{
  const report = diagnosis({
    rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/superSecretKeyValue99',
    expectedChainId: 8453,
  });
  const stored = eventFromReport(report, 'diagnose');
  check('the path key is not kept', !stored.rpcUrl.includes('superSecretKeyValue99'));
  check('the host remains', stored.rpcUrl.includes('alchemy.com'));
}

console.log('\n--- unknown chains keep their number ---');
{
  const snap = aggregateEvents(
    [event({ id: 'u', recordedAt: '2026-09-12T11:00:00.000Z', status: 'READY', expectedChainId: 999 })],
    'all',
    now,
  );
  check('chain 999 is listed as itself', snap.networks[0]?.expectedChainId === 999);
}

console.log('\n--- client field validation matches the API rules ---');
{
  const messages = {
    rpcUrl: 'rpc',
    chainId: 'chain',
    contract: 'contract',
    fallback: 'fallback',
    signature: 'sig',
  };
  const empty = validateTargetFields(
    { rpcUrl: '', fallbackRpcUrl: '', expectedChainId: '', contractAddress: '', criticalReadSignature: '' },
    messages,
  );
  check('empty required fields fail', Boolean(empty.rpcUrl && empty.expectedChainId));
  const file = validateTargetFields(
    { rpcUrl: 'file:///etc/passwd', fallbackRpcUrl: '', expectedChainId: '8453', contractAddress: '', criticalReadSignature: '' },
    messages,
  );
  check('file:// is refused', file.rpcUrl === 'rpc');
  const badAddr = validateTargetFields(
    { rpcUrl: 'https://mainnet.base.org', fallbackRpcUrl: '', expectedChainId: '8453', contractAddress: '0x123', criticalReadSignature: '' },
    messages,
  );
  check('short address fails', badAddr.contractAddress === 'contract');
  const ok = validateTargetFields(
    {
      rpcUrl: 'https://mainnet.base.org',
      fallbackRpcUrl: '',
      expectedChainId: '8453',
      contractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      criticalReadSignature: 'symbol() returns (string)',
    },
    messages,
  );
  check('a valid form has no field errors', !hasFieldErrors(ok));
}

console.log(`\n=== ${failures === 0 ? 'all dashboard checks passed' : `${failures} dashboard check(s) FAILED`} ===`);
process.exit(failures > 0 ? 1 : 0);

function diagnosis(target: DiagnoseTarget): DiagnosisReport {
  const results: CheckResult[] = CHECK_IDS.map((id) => ({
    id,
    title: id,
    outcome: 'PASS' as CheckOutcome,
    summary: 'ok',
    durationMs: 1,
    critical: true,
  }));
  return {
    status: 'READY' as OverallStatus,
    headline: 'ok',
    target,
    checks: results,
    startedAt: new Date(0).toISOString(),
    durationMs: 1,
  };
}
