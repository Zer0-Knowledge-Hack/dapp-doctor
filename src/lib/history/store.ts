import { Redis } from '@upstash/redis';
import { redactRpcUrl } from '../diagnostics/redact';
import type { DiagnosisReport } from '../diagnostics/types';

/**
 * Diagnosis history — the paid feature.
 *
 * Only reports the server generated itself are stored. Clients never upload a
 * report, so a paying user cannot use this store to park arbitrary data, and
 * what the history shows is exactly what the engine measured.
 *
 * The user id is a random UUID the browser keeps. It works as a bearer
 * credential for reading the history: unguessable, but anyone holding it can
 * read. That is why ids are validated as random tokens upstream, and why RPC
 * URLs are redacted before a report is stored: the check summaries already
 * redact them, but `report.target` holds the URL exactly as the user typed it,
 * and providers put API keys in the path or query. We never keep those keys.
 */

/** A copy of the report with every user-supplied URL stripped of credentials. */
function redactForStorage(report: DiagnosisReport): DiagnosisReport {
  return {
    ...report,
    target: {
      ...report.target,
      rpcUrl: redactRpcUrl(report.target.rpcUrl),
      ...(report.target.fallbackRpcUrl
        ? { fallbackRpcUrl: redactRpcUrl(report.target.fallbackRpcUrl) }
        : {}),
    },
  };
}

/** Keep the most recent runs. History is for comparing, not archiving. */
const MAX_REPORTS = 50;

export interface StoredReport {
  id: string;
  savedAt: string;
  report: DiagnosisReport;
}

/**
 * The Vercel marketplace integration injects KV_REST_API_* names, while the
 * Upstash SDK's own fromEnv() looks for UPSTASH_REDIS_REST_*. Reading both
 * explicitly means neither naming leaves the feature silently off.
 */
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

export function isHistoryConfigured(): boolean {
  return readConfig() !== null;
}

const keyFor = (userId: string) => `history:${userId}`;

export async function saveReport(userId: string, report: DiagnosisReport): Promise<StoredReport | null> {
  const db = redis();
  if (!db) return null;

  const entry: StoredReport = {
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    report: redactForStorage(report),
  };

  // LPUSH + LTRIM in one pipeline, so the list never grows past the cap even
  // if two saves race.
  await db.pipeline().lpush(keyFor(userId), JSON.stringify(entry)).ltrim(keyFor(userId), 0, MAX_REPORTS - 1).exec();

  return entry;
}

export async function listReports(userId: string, limit = MAX_REPORTS): Promise<StoredReport[]> {
  const db = redis();
  if (!db) return [];

  const raw = await db.lrange<string | StoredReport>(keyFor(userId), 0, Math.min(limit, MAX_REPORTS) - 1);

  // The SDK auto-parses JSON values it recognises, so an entry may come back
  // already as an object. Accept both, and drop anything malformed rather than
  // failing the whole list over one bad row.
  return raw.flatMap((item) => {
    try {
      const entry = typeof item === 'string' ? (JSON.parse(item) as StoredReport) : item;
      return entry && typeof entry.id === 'string' && entry.report ? [entry] : [];
    } catch {
      return [];
    }
  });
}
