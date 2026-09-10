import { rpcCall, redactRpcUrl, isHexQuantity } from '../rpc';
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

  // eth_blockNumber returns a hex quantity. Anything else is not a node
  // answering, and must not be echoed into the report verbatim: the host is
  // untrusted, and the report is public.
  if (!isHexQuantity(outcome.result)) {
    return {
      id: 'access',
      title: TITLE,
      outcome: 'FAIL',
      summary: `The RPC ${safeUrl} answered, but not with a block number.`,
      action: 'The URL responds to JSON-RPC but does not behave like an EVM node. Check it is the right endpoint.',
      observed: { url: safeUrl, resultType: typeof outcome.result },
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
