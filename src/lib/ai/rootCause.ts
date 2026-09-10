import { chatCompletion, isConfigured, configuredModel } from './tokenFactory';
import type { CheckId, DiagnosisReport } from '../diagnostics/types';

/**
 * Root-cause analysis — the task Token Factory owns.
 *
 * The deterministic engine decides *whether* each check passed; a model must
 * never touch a verdict. What the engine cannot do is explain *why* several
 * checks failed together, or read a provider error string it has no table
 * entry for. That is this module's job, and it runs in the main flow.
 *
 * Non-invention is enforced in code, not requested politely: the model must
 * cite the check ids its conclusion rests on, and any id that is not in the
 * report — or that it describes with the wrong outcome — is reported as an
 * invention rather than shown to the user as fact.
 */

export interface RootCauseAnalysis {
  available: boolean;
  /** One paragraph naming the underlying cause. Absent when unavailable. */
  rootCause?: string;
  /** Checks the conclusion rests on. Every id is verified against the report. */
  citedChecks?: CheckId[];
  confidence?: 'high' | 'medium' | 'low';
  /** Cited ids that do not exist in the report. Non-empty means it invented. */
  invented?: string[];
  /** Why the analysis is missing, shown to the user instead of silence. */
  unavailableReason?: string;
  model?: string;
  latencyMs?: number;
  usage?: { promptTokens: number; completionTokens: number };
}

const SYSTEM_PROMPT = `You are a diagnostic assistant for blockchain RPC configuration.

You will receive the results of six deterministic checks that have ALREADY been
run. Your job is to explain the single underlying root cause behind them.

Absolute rules:
- Never contradict a check outcome. The outcomes are measured facts.
- Never assert anything the evidence does not show. If the evidence is thin,
  say so and lower your confidence rather than guessing.
- Several failures usually share one upstream cause. Name that cause, not the
  list of symptoms.
- A NOT_TESTED check is not a passing check. It means nothing was observed.
- Be concrete and brief: at most four sentences, plain English, no bullet
  points, no markdown.

Answer with a single JSON object and nothing else:
{"rootCause": string, "citedChecks": string[], "confidence": "high"|"medium"|"low"}

citedChecks must contain only ids that appear in the evidence you were given.`;

/** Compact, factual rendering of the report. No interpretation, only observations. */
function buildEvidence(report: DiagnosisReport): string {
  const lines = report.checks.map((check) => {
    const parts = [`- id: ${check.id}`, `outcome: ${check.outcome}`, `observed: ${check.summary}`];
    if (check.observed) parts.push(`data: ${JSON.stringify(check.observed)}`);
    return parts.join(' | ');
  });

  return [
    `Aggregated status: ${report.status}`,
    `Expected chain id: ${report.target.expectedChainId}`,
    '',
    'Check results:',
    ...lines,
  ].join('\n');
}

/** Models sometimes wrap JSON in prose or a code fence. Pull out the object. */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function analyzeRootCause(report: DiagnosisReport): Promise<RootCauseAnalysis> {
  if (!isConfigured()) {
    return {
      available: false,
      unavailableReason: 'AI analysis is not configured on this deployment.',
    };
  }

  const outcome = await chatCompletion([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: buildEvidence(report) },
  ]);

  if (!outcome.ok) {
    return {
      available: false,
      unavailableReason: `AI analysis unavailable: ${outcome.reason}. The deterministic report below is unaffected.`,
      model: configuredModel(),
      latencyMs: outcome.latencyMs,
    };
  }

  const parsed = extractJson(outcome.text) as {
    rootCause?: unknown;
    citedChecks?: unknown;
    confidence?: unknown;
  } | null;

  if (!parsed || typeof parsed.rootCause !== 'string' || parsed.rootCause.trim() === '') {
    return {
      available: false,
      unavailableReason: 'AI analysis unavailable: the model did not return a usable answer.',
      model: outcome.model,
      latencyMs: outcome.latencyMs,
      usage: outcome.usage,
    };
  }

  // Non-invention, enforced: every cited id has to exist in the report.
  const realIds = new Set<string>(report.checks.map((check) => check.id));
  const cited = Array.isArray(parsed.citedChecks)
    ? parsed.citedChecks.filter((id): id is string => typeof id === 'string')
    : [];
  const invented = cited.filter((id) => !realIds.has(id));

  const confidence =
    parsed.confidence === 'high' || parsed.confidence === 'medium' || parsed.confidence === 'low'
      ? parsed.confidence
      : 'medium';

  return {
    available: true,
    rootCause: parsed.rootCause.trim(),
    citedChecks: cited.filter((id): id is CheckId => realIds.has(id)),
    confidence,
    ...(invented.length > 0 ? { invented } : {}),
    model: outcome.model,
    latencyMs: outcome.latencyMs,
    usage: outcome.usage,
  };
}
