import { redactRpcUrl } from '../diagnostics/redact';
import type { DiagnosisReport } from '../diagnostics/types';
import type { DashboardEvent, DashboardSource } from './types';

/**
 * Turns a finished report into a dashboard event. URLs are redacted here,
 * not later: Redis must never see a provider key.
 */
export function eventFromReport(report: DiagnosisReport, source: DashboardSource): DashboardEvent {
  return {
    id: crypto.randomUUID(),
    recordedAt: new Date().toISOString(),
    source,
    status: report.status,
    headline: report.headline,
    durationMs: report.durationMs,
    startedAt: report.startedAt,
    expectedChainId: report.target.expectedChainId,
    rpcUrl: redactRpcUrl(report.target.rpcUrl),
    ...(report.target.fallbackRpcUrl
      ? { fallbackRpcUrl: redactRpcUrl(report.target.fallbackRpcUrl) }
      : {}),
    ...(report.target.contractAddress ? { contractAddress: report.target.contractAddress } : {}),
    checks: report.checks.map((check) => ({
      id: check.id,
      title: check.title,
      outcome: check.outcome,
      summary: check.summary,
      ...(check.action ? { action: check.action } : {}),
      durationMs: check.durationMs,
      critical: check.critical,
    })),
  };
}
