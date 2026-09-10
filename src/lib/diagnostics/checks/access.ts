import { rpcCall, redactRpcUrl } from '../rpc';
import { actionForFailure } from './helpers';
import type { CheckResult, DiagnoseTarget } from '../types';

const TITLE = 'RPC access';

/**
 * Check 1 — URL / access.
 * Proves the configured URL answers as a JSON-RPC node.
 * If this fails, no other check against the primary RPC is meaningful:
 * the engine marks them NOT_TESTED rather than reporting them falsely.
 */
export async function checkAccess(target: DiagnoseTarget): Promise<CheckResult> {
  const outcome = await rpcCall(target.rpcUrl, 'eth_blockNumber');
  const safeUrl = redactRpcUrl(target.rpcUrl);

  if (!outcome.ok) {
    return {
      id: 'access',
      title: TITLE,
      outcome: 'FAIL',
      summary: `The RPC ${safeUrl} did not answer: ${outcome.message}`,
      action: actionForFailure(outcome),
      observed: {
        url: safeUrl,
        failureKind: outcome.kind,
        httpStatus: outcome.httpStatus,
        rpcCode: outcome.rpcCode,
      },
      durationMs: outcome.durationMs,
      critical: true,
    };
  }

  return {
    id: 'access',
    title: TITLE,
    outcome: 'PASS',
    summary: `The RPC ${safeUrl} answers correctly.`,
    observed: { url: safeUrl, blockNumberHex: outcome.result, latencyMs: outcome.durationMs },
    durationMs: outcome.durationMs,
    critical: true,
  };
}
