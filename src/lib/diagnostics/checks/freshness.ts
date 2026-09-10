import { rpcCall } from '../rpc';
import { actionForFailure } from './helpers';
import type { CheckResult, DiagnoseTarget } from '../types';

const TITLE = 'Node freshness';
const DEFAULT_MAX_AGE_SECONDS = 60;

/**
 * Check 3 — node freshness.
 * A lagging node answers everything correctly but serves stale state, so the
 * app "works" while showing data that is no longer true.
 * Not critical: it degrades to AT_RISK, it does not block.
 */
export async function checkNodeFreshness(target: DiagnoseTarget): Promise<CheckResult> {
  const maxAge = target.maxBlockAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS;
  const outcome = await rpcCall(target.rpcUrl, 'eth_getBlockByNumber', ['latest', false]);

  if (!outcome.ok) {
    return {
      id: 'node-freshness',
      title: TITLE,
      outcome: 'FAIL',
      summary: `Could not read the latest block: ${outcome.message}`,
      action: actionForFailure(outcome),
      observed: { failureKind: outcome.kind },
      durationMs: outcome.durationMs,
      critical: false,
    };
  }

  const block = outcome.result as { number?: string; timestamp?: string } | null;

  if (!block || typeof block.timestamp !== 'string') {
    return {
      id: 'node-freshness',
      title: TITLE,
      outcome: 'FAIL',
      summary: 'The node did not return a readable block for "latest".',
      action: 'Check that the endpoint is fully synced.',
      observed: { raw: outcome.result },
      durationMs: outcome.durationMs,
      critical: false,
    };
  }

  const blockNumber = block.number ? Number(BigInt(block.number)) : null;
  const blockTimestamp = Number(BigInt(block.timestamp));
  const ageSeconds = Math.round(Date.now() / 1000 - blockTimestamp);
  const observed = { blockNumber, blockTimestamp, ageSeconds, maxAgeSeconds: maxAge };

  // A block in the future is not freshness: it is clock skew somewhere.
  if (ageSeconds < -maxAge) {
    return {
      id: 'node-freshness',
      title: TITLE,
      outcome: 'WARN',
      summary: `The latest block is dated ${Math.abs(ageSeconds)} s in the future.`,
      action: 'There is clock skew between this environment and the node. Verify the system time.',
      observed,
      durationMs: outcome.durationMs,
      critical: false,
    };
  }

  if (ageSeconds > maxAge) {
    return {
      id: 'node-freshness',
      title: TITLE,
      outcome: 'WARN',
      summary: `The latest block is ${ageSeconds} s old (limit: ${maxAge} s).`,
      action:
        'The node is lagging and may serve stale state. Use a secondary RPC, or wait ' +
        'for the provider to catch up before trusting these reads.',
      observed,
      durationMs: outcome.durationMs,
      critical: false,
    };
  }

  return {
    id: 'node-freshness',
    title: TITLE,
    outcome: 'PASS',
    summary: `The latest block is ${Math.max(ageSeconds, 0)} s old. The node is up to date.`,
    observed,
    durationMs: outcome.durationMs,
    critical: false,
  };
}
