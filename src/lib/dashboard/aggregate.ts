import type { CheckId, CheckOutcome, OverallStatus } from '../diagnostics/types';
import type {
  CheckStats,
  DashboardAlert,
  DashboardEvent,
  DashboardSnapshot,
  IssueRow,
  NetworkRow,
  PerformanceStats,
  PeriodId,
  PeriodTrend,
  RpcHealth,
  RpcRow,
  StatusCounts,
  TimeBucket,
} from './types';

const CHECK_ORDER: CheckId[] = [
  'access',
  'network-identity',
  'node-freshness',
  'contract-bytecode',
  'critical-read',
  'fallback',
];

const CHECK_TITLE: Record<CheckId, string> = {
  access: 'RPC access',
  'network-identity': 'Network identity',
  'node-freshness': 'Node freshness',
  'contract-bytecode': 'Contract bytecode',
  'critical-read': 'Critical read',
  fallback: 'Fallback RPC',
};

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
/** How recent an access FAIL must be to call an RPC Down, not merely degraded. */
export const RPC_DOWN_WINDOW_MS = 6 * HOUR_MS;
const ALERT_MIN = 2;
const RECENT_LIMIT = 50;
const P95_MIN_SAMPLES = 5;
const MEDIAN_MIN_SAMPLES = 2;

export function periodStartMs(period: PeriodId, nowMs: number): number | null {
  switch (period) {
    case '24h':
      return nowMs - DAY_MS;
    case '7d':
      return nowMs - 7 * DAY_MS;
    case '30d':
      return nowMs - 30 * DAY_MS;
    case 'all':
      return null;
  }
}

export function inPeriod(event: DashboardEvent, period: PeriodId, nowMs: number): boolean {
  const start = periodStartMs(period, nowMs);
  if (start === null) return true;
  const at = Date.parse(event.recordedAt);
  return Number.isFinite(at) && at >= start && at <= nowMs;
}

function emptyCounts(): StatusCounts {
  return { READY: 0, AT_RISK: 0, BLOCKED: 0, NOT_TESTED: 0 };
}

function accessOf(event: DashboardEvent): CheckOutcome | undefined {
  return event.checks.find((check) => check.id === 'access')?.outcome;
}

function quantile(sorted: number[], q: number): number | null {
  if (sorted.length === 0) return null;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[index];
}

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export function performanceOf(durations: number[]): PerformanceStats {
  const samples = durations.length;
  if (samples === 0) {
    return { averageMs: null, medianMs: null, p95Ms: null, fastestMs: null, slowestMs: null, samples: 0 };
  }
  const sorted = [...durations].sort((a, b) => a - b);
  const sum = sorted.reduce((total, value) => total + value, 0);
  return {
    averageMs: Math.round(sum / samples),
    medianMs: samples >= MEDIAN_MIN_SAMPLES ? median(sorted) : null,
    p95Ms: samples >= P95_MIN_SAMPLES ? quantile(sorted, 0.95) : null,
    fastestMs: sorted[0],
    slowestMs: sorted[sorted.length - 1],
    samples,
  };
}

function utcDay(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function utcHour(ms: number): string {
  return new Date(ms).toISOString().slice(0, 13);
}

function utcMonth(ms: number): string {
  return new Date(ms).toISOString().slice(0, 7);
}

/**
 * Buckets that actually contain events. Empty hours or days are omitted:
 * a zero bar would look like a measurement.
 */
export function seriesOf(events: DashboardEvent[], period: PeriodId, nowMs: number): TimeBucket[] {
  if (events.length === 0) return [];

  const times = events.map((event) => Date.parse(event.recordedAt)).filter(Number.isFinite);
  if (times.length === 0) return [];
  const oldest = Math.min(...times);
  const span = nowMs - oldest;

  let keyOf: (ms: number) => string;
  let labelOf: (key: string) => string;

  if (period === '24h') {
    keyOf = utcHour;
    labelOf = (key) => `${key.slice(11, 13)}:00`;
  } else if (period === 'all' && span > 60 * DAY_MS) {
    keyOf = utcMonth;
    labelOf = (key) => key;
  } else {
    keyOf = utcDay;
    labelOf = (key) => key;
  }

  const buckets = new Map<string, StatusCounts>();
  const starts = new Map<string, number>();

  for (const event of events) {
    const at = Date.parse(event.recordedAt);
    if (!Number.isFinite(at)) continue;
    const key = keyOf(at);
    const counts = buckets.get(key) ?? emptyCounts();
    counts[event.status] += 1;
    buckets.set(key, counts);
    if (!starts.has(key)) starts.set(key, at);
  }

  return [...buckets.entries()]
    .sort((a, b) => (starts.get(a[0]) ?? 0) - (starts.get(b[0]) ?? 0))
    .map(([key, counts]) => ({
      start: new Date(starts.get(key) ?? 0).toISOString(),
      label: labelOf(key),
      counts,
    }));
}

export function issuesOf(events: DashboardEvent[]): IssueRow[] {
  const total = events.length;
  return CHECK_ORDER.map((id) => {
    let fail = 0;
    let warn = 0;
    for (const event of events) {
      const check = event.checks.find((item) => item.id === id);
      if (check?.outcome === 'FAIL') fail += 1;
      if (check?.outcome === 'WARN') warn += 1;
    }
    const problems = fail + warn;
    return {
      id,
      title: CHECK_TITLE[id],
      problems,
      fail,
      warn,
      share: total === 0 ? 0 : problems / total,
    };
  })
    .filter((row) => row.problems > 0)
    .sort((a, b) => b.problems - a.problems);
}

export function networksOf(events: DashboardEvent[]): NetworkRow[] {
  const byChain = new Map<number, NetworkRow>();
  for (const event of events) {
    const row = byChain.get(event.expectedChainId) ?? {
      expectedChainId: event.expectedChainId,
      diagnostics: 0,
      ready: 0,
      atRisk: 0,
      blocked: 0,
      notTested: 0,
      health: 0,
    };
    row.diagnostics += 1;
    if (event.status === 'READY') row.ready += 1;
    else if (event.status === 'AT_RISK') row.atRisk += 1;
    else if (event.status === 'BLOCKED') row.blocked += 1;
    else row.notTested += 1;
    byChain.set(event.expectedChainId, row);
  }

  return [...byChain.values()]
    .map((row) => ({ ...row, health: row.diagnostics === 0 ? 0 : row.ready / row.diagnostics }))
    .sort((a, b) => b.diagnostics - a.diagnostics);
}

function rpcHealth(eventsNewestFirst: DashboardEvent[], nowMs: number): RpcHealth {
  const latest = eventsNewestFirst[0];
  const latestAccess = latest ? accessOf(latest) : undefined;
  const recent = eventsNewestFirst.filter((event) => nowMs - Date.parse(event.recordedAt) <= RPC_DOWN_WINDOW_MS);
  const recentLatestAccess = recent[0] ? accessOf(recent[0]) : undefined;

  if (recent.length > 0 && recentLatestAccess === 'FAIL') return 'down';
  if (latestAccess === 'FAIL') return 'degraded';
  if (eventsNewestFirst.some((event) => accessOf(event) === 'FAIL')) return 'degraded';
  return 'healthy';
}

export function rpcsOf(events: DashboardEvent[], nowMs: number): RpcRow[] {
  const groups = new Map<string, DashboardEvent[]>();
  for (const event of events) {
    const list = groups.get(event.rpcUrl) ?? [];
    list.push(event);
    groups.set(event.rpcUrl, list);
  }

  return [...groups.entries()]
    .map(([rpcUrl, group]) => {
      const newestFirst = [...group].sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt));
      let successes = 0;
      let failures = 0;
      let durationSum = 0;
      for (const event of group) {
        durationSum += event.durationMs;
        const access = accessOf(event);
        if (access === 'FAIL') failures += 1;
        else if (access === 'PASS') successes += 1;
      }
      const decided = successes + failures;
      return {
        rpcUrl,
        diagnostics: group.length,
        successes,
        failures,
        successRate: decided === 0 ? 0 : successes / decided,
        averageMs: Math.round(durationSum / group.length),
        lastAt: newestFirst[0].recordedAt,
        lastStatus: newestFirst[0].status,
        health: rpcHealth(newestFirst, nowMs),
      };
    })
    .sort((a, b) => b.diagnostics - a.diagnostics);
}

export function checksOf(events: DashboardEvent[]): CheckStats[] {
  return CHECK_ORDER.map((id) => {
    let pass = 0;
    let warn = 0;
    let fail = 0;
    let notTested = 0;
    for (const event of events) {
      const check = event.checks.find((item) => item.id === id);
      if (!check) {
        notTested += 1;
        continue;
      }
      if (check.outcome === 'PASS') pass += 1;
      else if (check.outcome === 'WARN') warn += 1;
      else if (check.outcome === 'FAIL') fail += 1;
      else notTested += 1;
    }
    const ran = pass + warn + fail;
    return {
      id,
      title: CHECK_TITLE[id],
      total: events.length,
      pass,
      warn,
      fail,
      notTested,
      successRate: ran === 0 ? null : pass / ran,
    };
  });
}

export function alertsOf(events: DashboardEvent[]): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];

  const byRpc = new Map<string, DashboardEvent[]>();
  for (const event of events) {
    const list = byRpc.get(event.rpcUrl) ?? [];
    list.push(event);
    byRpc.set(event.rpcUrl, list);
  }

  for (const [rpcUrl, group] of byRpc) {
    const failed = group.filter((event) => accessOf(event) === 'FAIL');
    if (failed.length >= ALERT_MIN) {
      const latest = [...failed].sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt))[0];
      alerts.push({
        kind: 'rpc-degraded',
        severity: 'critical',
        resource: rpcUrl,
        at: latest.recordedAt,
        count: failed.length,
      });
    }
  }

  const failing = (id: CheckId) =>
    events.filter((event) => event.checks.some((check) => check.id === id && (check.outcome === 'FAIL' || check.outcome === 'WARN')));

  const identity = failing('network-identity').filter((event) =>
    event.checks.some((check) => check.id === 'network-identity' && check.outcome === 'FAIL'),
  );
  if (identity.length >= ALERT_MIN) {
    const latest = [...identity].sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt))[0];
    alerts.push({
      kind: 'network-identity',
      severity: 'critical',
      resource: `chain ${latest.expectedChainId}`,
      at: latest.recordedAt,
      count: identity.length,
    });
  }

  const reads = failing('critical-read').filter((event) =>
    event.checks.some((check) => check.id === 'critical-read' && check.outcome === 'FAIL'),
  );
  if (reads.length >= ALERT_MIN) {
    const latest = [...reads].sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt))[0];
    alerts.push({
      kind: 'critical-read',
      severity: 'critical',
      resource: latest.contractAddress ?? 'undeclared contract',
      at: latest.recordedAt,
      count: reads.length,
    });
  }

  const fallbacks = failing('fallback');
  if (fallbacks.length >= ALERT_MIN) {
    const latest = [...fallbacks].sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt))[0];
    alerts.push({
      kind: 'fallback',
      severity: 'warning',
      resource: latest.fallbackRpcUrl ?? 'undeclared fallback',
      at: latest.recordedAt,
      count: fallbacks.length,
    });
  }

  return alerts.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

function previousWindow(events: DashboardEvent[], period: PeriodId, nowMs: number): DashboardEvent[] {
  const start = periodStartMs(period, nowMs);
  if (start === null) return [];
  const length = nowMs - start;
  const previousStart = start - length;
  return events.filter((event) => {
    const at = Date.parse(event.recordedAt);
    return Number.isFinite(at) && at >= previousStart && at < start;
  });
}

function trendOf(current: DashboardEvent[], previous: DashboardEvent[]): PeriodTrend | null {
  if (current.length === 0 || previous.length === 0) return null;
  const readyNow = current.filter((event) => event.status === 'READY').length / current.length;
  const readyThen = previous.filter((event) => event.status === 'READY').length / previous.length;
  return {
    previousTotal: previous.length,
    totalDelta: current.length - previous.length,
    readyShareDelta: readyNow - readyThen,
  };
}

export function aggregateEvents(
  events: DashboardEvent[],
  period: PeriodId,
  nowMs: number = Date.now(),
): DashboardSnapshot {
  const scoped = events.filter((event) => inPeriod(event, period, nowMs));
  const counts = emptyCounts();
  const durations: number[] = [];

  for (const event of scoped) {
    counts[event.status] += 1;
    durations.push(event.durationMs);
  }

  const performance = performanceOf(durations);
  const recent = [...scoped].sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt)).slice(0, RECENT_LIMIT);

  return {
    period,
    generatedAt: new Date(nowMs).toISOString(),
    total: scoped.length,
    counts,
    trend: trendOf(scoped, previousWindow(events, period, nowMs)),
    averageMs: performance.averageMs,
    p95Ms: performance.p95Ms,
    series: seriesOf(scoped, period, nowMs),
    issues: issuesOf(scoped),
    networks: networksOf(scoped),
    rpcs: rpcsOf(scoped, nowMs),
    checks: checksOf(scoped),
    alerts: alertsOf(scoped),
    performance,
    recent,
  };
}
