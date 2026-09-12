import { eventFromReport } from '../dashboard/event';
import type { DashboardEvent, DashboardSource } from '../dashboard/types';
import type { DiagnosisReport } from '../diagnostics/types';

const KEY = 'dapp-doctor:local-history';
const MAX = 30;

function canUse(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readLocalHistory(): DashboardEvent[] {
  if (!canUse()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEvent);
  } catch {
    return [];
  }
}

export function saveLocalDiagnosis(report: DiagnosisReport, source: DashboardSource = 'diagnose'): DashboardEvent {
  const event = eventFromReport(report, source);
  if (!canUse()) return event;
  const next = [event, ...readLocalHistory().filter((item) => item.id !== event.id)].slice(0, MAX);
  window.localStorage.setItem(KEY, JSON.stringify(next));
  return event;
}

function isEvent(value: unknown): value is DashboardEvent {
  if (!value || typeof value !== 'object') return false;
  const item = value as DashboardEvent;
  return (
    typeof item.id === 'string'
    && typeof item.recordedAt === 'string'
    && typeof item.status === 'string'
    && typeof item.rpcUrl === 'string'
    && Array.isArray(item.checks)
  );
}
