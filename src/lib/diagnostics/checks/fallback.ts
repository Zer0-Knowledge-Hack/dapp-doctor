import { rpcCall, redactRpcUrl } from '../rpc';
import { actionForFailure } from './helpers';
import { describeChain } from '../networks';
import type { CheckResult, DiagnoseTarget } from '../types';

const TITLE = 'Fallback RPC';

/**
 * Check 6 — fallback.
 * A misconfigured backup is worse than no backup: if it points at another
 * network, the day the primary goes down the application does not fail, it
 * silently starts reading from the wrong chain. That is why the backup is
 * validated against the same expected chain ID, not just for availability.
 *
 * Not critical: its absence degrades to AT_RISK, it does not block.
 */
export async function checkFallback(target: DiagnoseTarget): Promise<CheckResult> {
  const url = target.fallbackRpcUrl as string;
  const safeUrl = redactRpcUrl(url);
  const outcome = await rpcCall(url, 'eth_chainId');

  if (!outcome.ok) {
    return {
      id: 'fallback',
      title: TITLE,
      outcome: 'WARN',
      summary: `The fallback RPC ${safeUrl} did not answer: ${outcome.message}`,
      action: `Without a working backup there is no network if the primary goes down. ${actionForFailure(outcome)}`,
      observed: { url: safeUrl, failureKind: outcome.kind, httpStatus: outcome.httpStatus },
      durationMs: outcome.durationMs,
      critical: false,
    };
  }

  const fallbackChainId = Number(outcome.result);

  if (fallbackChainId !== target.expectedChainId) {
    return {
      id: 'fallback',
      title: TITLE,
      outcome: 'FAIL',
      summary:
        `The fallback answers ${describeChain(fallbackChainId)}, ` +
        `but the application expects ${describeChain(target.expectedChainId)}.`,
      action:
        'Fix the fallback URL. As it stands, if the primary goes down the application ' +
        'will read from the wrong network without raising any error.',
      observed: { url: safeUrl, expectedChainId: target.expectedChainId, fallbackChainId },
      durationMs: outcome.durationMs,
      critical: false,
    };
  }

  return {
    id: 'fallback',
    title: TITLE,
    outcome: 'PASS',
    summary: `The fallback ${safeUrl} answers and is on ${describeChain(fallbackChainId)}.`,
    observed: { url: safeUrl, fallbackChainId, latencyMs: outcome.durationMs },
    durationMs: outcome.durationMs,
    critical: false,
  };
}
