import { rpcCall } from '../rpc';
import { actionForFailure } from './helpers';
import { describeChain } from '../networks';
import type { CheckResult, DiagnoseTarget } from '../types';

const TITLE = 'Network identity';

/**
 * Check 2 — network identity.
 * Compares the chain ID the node reports against the one the application
 * expects. This is the heart of the most common and most silent failure:
 * the app works, the node answers, and everything points at the wrong network.
 */
export async function checkNetworkIdentity(target: DiagnoseTarget): Promise<CheckResult> {
  const outcome = await rpcCall(target.rpcUrl, 'eth_chainId');

  if (!outcome.ok) {
    return {
      id: 'network-identity',
      title: TITLE,
      outcome: 'FAIL',
      summary: `Could not read the node chain ID: ${outcome.message}`,
      action: actionForFailure(outcome),
      observed: { failureKind: outcome.kind },
      durationMs: outcome.durationMs,
      critical: true,
    };
  }

  const actualChainId = Number(outcome.result);

  if (!Number.isInteger(actualChainId) || actualChainId <= 0) {
    return {
      id: 'network-identity',
      title: TITLE,
      outcome: 'FAIL',
      summary: `The node returned an unreadable chain ID: ${String(outcome.result)}`,
      action: 'Check that the URL points at an EVM node and not at another service.',
      observed: { raw: outcome.result },
      durationMs: outcome.durationMs,
      critical: true,
    };
  }

  if (actualChainId !== target.expectedChainId) {
    return {
      id: 'network-identity',
      title: TITLE,
      outcome: 'FAIL',
      summary:
        `The application expects ${describeChain(target.expectedChainId)} ` +
        `but the RPC answers ${describeChain(actualChainId)}.`,
      action:
        `Point the RPC at ${describeChain(target.expectedChainId)} ` +
        `(chain ID ${target.expectedChainId}), or fix the expected chain ID in the configuration.`,
      observed: { expectedChainId: target.expectedChainId, actualChainId },
      durationMs: outcome.durationMs,
      critical: true,
    };
  }

  return {
    id: 'network-identity',
    title: TITLE,
    outcome: 'PASS',
    summary: `The RPC answers ${describeChain(actualChainId)}, which is the expected network.`,
    observed: { expectedChainId: target.expectedChainId, actualChainId },
    durationMs: outcome.durationMs,
    critical: true,
  };
}
