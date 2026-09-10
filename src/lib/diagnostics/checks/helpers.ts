import type { CheckId, CheckResult } from '../types';
import type { RpcOutcome } from '../rpc';

/** Builds a NOT_TESTED result, carrying the reason it did not run. */
export function notTested(
  id: CheckId,
  title: string,
  reason: string,
  critical: boolean,
): CheckResult {
  return { id, title, outcome: 'NOT_TESTED', summary: reason, durationMs: 0, critical };
}

/**
 * Translates a transport failure into a concrete action.
 * This is deliberately a table and not a model call: these causes are
 * deterministic and must not depend on AI availability.
 */
export function actionForFailure(failure: Extract<RpcOutcome, { ok: false }>): string {
  switch (failure.kind) {
    case 'blocked':
      return 'This service only contacts publicly routable hosts. Private, loopback and link-local addresses are refused, so point it at the RPC endpoint as it is reachable from the internet.';
    case 'network':
      return 'Check that the RPC URL is correct and that the host resolves from this environment.';
    case 'timeout':
      return 'The provider did not answer in time. Try a secondary RPC and check the provider status page.';
    case 'http':
      if (failure.httpStatus === 401 || failure.httpStatus === 403) {
        return 'The API key is missing, expired, or not allowed to call this method. Review the provider credentials.';
      }
      if (failure.httpStatus === 429) {
        return 'You exceeded the provider rate limit. Lower the call frequency or upgrade the plan.';
      }
      if (failure.httpStatus === 404) {
        return 'The endpoint path does not exist. Check that the URL includes the provider full path.';
      }
      return 'Review the endpoint configuration in the provider dashboard.';
    case 'rpc':
      if (failure.rpcCode === -32601) {
        return 'The provider does not support this method on your plan. Use a provider that exposes it.';
      }
      return 'The node rejected the call. Review the parameters being sent.';
    case 'malformed':
      return 'The response is not valid JSON-RPC. The URL most likely points at something that is not a node.';
  }
}
