import { Redis } from '@upstash/redis';
import type { DashboardEvent, DashboardSource } from './types';
import { eventFromReport } from './event';
import type { DiagnosisReport } from '../diagnostics/types';

/**
 * Global diagnosis log for the health dashboard.
 *
 * Separate from Pro history (`history:<userId>`): that list is a paying
 * user's own runs, capped at 50. This list is every diagnosis the HTTP
 * APIs produce, redacted, so the dashboard can answer "how many today"
 * without inventing a number.
 */

const KEY = 'dashboard:events';
/** Rolling window. Older events drop; the dashboard never pads the gap. */
const MAX_EVENTS = 1_000;

function readConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

let client: Redis | null = null;

function redis(): Redis | null {
  if (client) return client;
  const config = readConfig();
  if (!config) return null;
  client = new Redis(config);
  return client;
}

export function isDashboardConfigured(): boolean {
  return readConfig() !== null;
}

export async function recordDiagnosisEvent(
  report: DiagnosisReport,
  source: DashboardSource,
): Promise<DashboardEvent | null> {
  const db = redis();
  if (!db) return null;

  const event = eventFromReport(report, source);
  await db.pipeline().lpush(KEY, JSON.stringify(event)).ltrim(KEY, 0, MAX_EVENTS - 1).exec();
  return event;
}

export async function listDiagnosisEvents(limit = MAX_EVENTS): Promise<DashboardEvent[]> {
  const db = redis();
  if (!db) return [];

  const raw = await db.lrange<string | DashboardEvent>(KEY, 0, Math.min(limit, MAX_EVENTS) - 1);

  return raw.flatMap((item) => {
    try {
      const event = typeof item === 'string' ? (JSON.parse(item) as DashboardEvent) : item;
      return event && typeof event.id === 'string' && event.status && Array.isArray(event.checks)
        ? [event]
        : [];
    } catch {
      return [];
    }
  });
}
