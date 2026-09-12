import type { CheckId, CheckOutcome, OverallStatus } from '../diagnostics/types';

/**
 * A stored diagnosis, slim enough for aggregation and stripped of anything
 * that must not sit in Redis: no private keys, no seed phrases, no raw
 * provider bodies, no API keys in URLs.
 *
 * Built only from a DiagnosisReport the engine already produced. The
 * dashboard never invents a check outcome.
 */
export type DashboardSource = 'diagnose' | 'compare';

export interface DashboardCheck {
  id: CheckId;
  title: string;
  outcome: CheckOutcome;
  summary: string;
  action?: string;
  durationMs: number;
  critical: boolean;
}

export interface DashboardEvent {
  id: string;
  recordedAt: string;
  source: DashboardSource;
  status: OverallStatus;
  headline: string;
  durationMs: number;
  startedAt: string;
  expectedChainId: number;
  /** Already redacted. Providers put keys in the path or query. */
  rpcUrl: string;
  fallbackRpcUrl?: string;
  contractAddress?: string;
  checks: DashboardCheck[];
}

export type PeriodId = '24h' | '7d' | '30d' | 'all';

export const PERIOD_IDS: readonly PeriodId[] = ['24h', '7d', '30d', 'all'];

export function isPeriodId(value: unknown): value is PeriodId {
  return typeof value === 'string' && (PERIOD_IDS as readonly string[]).includes(value);
}

export interface StatusCounts {
  READY: number;
  AT_RISK: number;
  BLOCKED: number;
  NOT_TESTED: number;
}

export interface TimeBucket {
  /** Inclusive start of the bucket, ISO. */
  start: string;
  label: string;
  counts: StatusCounts;
}

export interface IssueRow {
  id: CheckId;
  title: string;
  problems: number;
  fail: number;
  warn: number;
  /** problems / diagnoses in the period, 0–1. */
  share: number;
}

export interface NetworkRow {
  expectedChainId: number;
  diagnostics: number;
  ready: number;
  atRisk: number;
  blocked: number;
  notTested: number;
  /** READY / diagnostics, 0–1. */
  health: number;
}

export type RpcHealth = 'healthy' | 'degraded' | 'down';

export interface RpcRow {
  rpcUrl: string;
  diagnostics: number;
  successes: number;
  failures: number;
  successRate: number;
  averageMs: number;
  lastAt: string;
  lastStatus: OverallStatus;
  health: RpcHealth;
}

export interface CheckStats {
  id: CheckId;
  title: string;
  total: number;
  pass: number;
  warn: number;
  fail: number;
  notTested: number;
  /** PASS / (total − NOT_TESTED). Null when nothing actually ran. */
  successRate: number | null;
}

export type AlertKind = 'rpc-degraded' | 'network-identity' | 'critical-read' | 'fallback';
export type AlertSeverity = 'critical' | 'warning';

export interface DashboardAlert {
  kind: AlertKind;
  severity: AlertSeverity;
  resource: string;
  at: string;
  count: number;
}

export interface PerformanceStats {
  averageMs: number | null;
  medianMs: number | null;
  p95Ms: number | null;
  fastestMs: number | null;
  slowestMs: number | null;
  samples: number;
}

/** Present only when the previous equal window also has events. */
export interface PeriodTrend {
  previousTotal: number;
  totalDelta: number;
  readyShareDelta: number | null;
}

export interface DashboardSnapshot {
  period: PeriodId;
  generatedAt: string;
  total: number;
  counts: StatusCounts;
  trend: PeriodTrend | null;
  averageMs: number | null;
  p95Ms: number | null;
  series: TimeBucket[];
  issues: IssueRow[];
  networks: NetworkRow[];
  rpcs: RpcRow[];
  checks: CheckStats[];
  alerts: DashboardAlert[];
  performance: PerformanceStats;
  recent: DashboardEvent[];
}
