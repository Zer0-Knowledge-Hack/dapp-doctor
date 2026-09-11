import { redactRpcUrl } from '../diagnostics/rpc';
import type { Comparison } from '../diagnostics/compare';
import type { DiagnosisReport } from '../diagnostics/types';
import type { Extraction } from '../intake/extract';

/**
 * Plain-text renderings for agents.
 *
 * An agent relays these to a developer, so they lead with the verdict and the
 * root cause, keep one line per check, and put the fix directly under the
 * failure it fixes. The web app link lets the developer see the same result.
 *
 * RPC URLs are redacted, like everywhere else in the product: agents paste
 * results into issues, pull requests and chats, and providers put API keys
 * in the URL.
 */

const APP_URL = 'https://dapp-doctor.vercel.app';

/**
 * A source line is quoted from the user's config, and one line can carry an
 * RPC URL next to the value it is cited for ("RPC=… CHAIN_ID=84532"). Redact
 * every URL in it so a key never rides along with an unrelated finding.
 */
function redactUrlsIn(text: string): string {
  return text.replace(/https?:\/\/[^\s'"`<>)\],]+/g, (url) => redactRpcUrl(url));
}

export function formatReport(report: DiagnosisReport): string {
  const lines = [
    `DApp Doctor verdict: ${report.status}`,
    report.headline,
    '',
    `Target: ${redactRpcUrl(report.target.rpcUrl)} (expects chain ${report.target.expectedChainId})`,
    '',
    'Checks, in the order they ran:',
  ];

  report.checks.forEach((check, index) => {
    lines.push(`${index + 1}. ${check.title}: ${check.outcome.replace('_', ' ')}. ${check.summary}`);
    if (check.action) lines.push(`   What to do: ${check.action}`);
  });

  lines.push(
    '',
    'NOT TESTED never counts as passing. Every check is read-only: no keys, no transactions.',
    `Same diagnosis in the browser: ${APP_URL}`,
  );
  return lines.join('\n');
}

/** Tells the developer what was read from their config, and where from. */
export function formatExtraction(extraction: Extraction): string {
  const lines = ['Read from your configuration:'];

  if (extraction.rpcUrls[0]) {
    lines.push(`- RPC URL: ${redactRpcUrl(extraction.rpcUrls[0].value)}`);
  }
  if (extraction.rpcUrls[1]) {
    lines.push(`- Fallback RPC URL: ${redactRpcUrl(extraction.rpcUrls[1].value)}`);
  }
  if (extraction.chainId) {
    const how = extraction.chainId.confidence === 'inferred' ? 'guessed' : 'declared';
    lines.push(`- Expected chain: ${extraction.chainId.value}, ${how} (${redactUrlsIn(extraction.chainId.source)})`);
  }
  if (extraction.contracts[0]) {
    lines.push(`- Contract: ${extraction.contracts[0].value} (from: ${redactUrlsIn(extraction.contracts[0].source)})`);
  }
  for (const note of extraction.notes) lines.push(`Note: ${note}`);

  return lines.join('\n');
}

export function formatComparison(comparison: Comparison): string {
  const lines = [
    `DApp Doctor comparison: ${comparison.statusBefore} before, ${comparison.statusAfter} after`,
    comparison.verdict,
    '',
    'Per check (before -> after):',
  ];

  for (const delta of comparison.deltas) {
    const change = delta.change === 'UNCHANGED' ? 'unchanged' : delta.change;
    lines.push(`- ${delta.title}: ${delta.before} -> ${delta.after} (${change}). ${delta.afterSummary}`);
  }

  lines.push('', `Compare in the browser: ${APP_URL}/compare`);
  return lines.join('\n');
}
