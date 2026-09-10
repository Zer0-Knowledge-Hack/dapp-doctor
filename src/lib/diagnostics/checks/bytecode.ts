import { rpcCall } from '../rpc';
import { actionForFailure } from './helpers';
import { describeChain } from '../networks';
import type { CheckResult, DiagnoseTarget } from '../types';

const TITLE = 'Contract bytecode';

/**
 * Check 4 — contract bytecode.
 * An address with no code on this network is indistinguishable from any
 * other address: reads return empty instead of failing, and the app shows
 * zeros as if they were real data.
 */
export async function checkContractBytecode(target: DiagnoseTarget): Promise<CheckResult> {
  const address = target.contractAddress as string;
  const outcome = await rpcCall(target.rpcUrl, 'eth_getCode', [address, 'latest']);

  if (!outcome.ok) {
    return {
      id: 'contract-bytecode',
      title: TITLE,
      outcome: 'FAIL',
      summary: `Could not read the code at ${address}: ${outcome.message}`,
      action: actionForFailure(outcome),
      observed: { address, failureKind: outcome.kind },
      durationMs: outcome.durationMs,
      critical: true,
    };
  }

  const code = typeof outcome.result === 'string' ? outcome.result : '';
  const hasCode = code.length > 2 && code !== '0x' && code !== '0x0';

  if (!hasCode) {
    return {
      id: 'contract-bytecode',
      title: TITLE,
      outcome: 'FAIL',
      summary: `No contract deployed at ${address} on ${describeChain(target.expectedChainId)}.`,
      action:
        'The address has no code on this network. Verify the contract is deployed here ' +
        'and that the address does not come from a different network.',
      observed: { address, bytecodeSize: 0 },
      durationMs: outcome.durationMs,
      critical: true,
    };
  }

  return {
    id: 'contract-bytecode',
    title: TITLE,
    outcome: 'PASS',
    summary: `A contract is deployed at ${address} (${(code.length - 2) / 2} bytes of code).`,
    observed: { address, bytecodeSize: (code.length - 2) / 2 },
    durationMs: outcome.durationMs,
    critical: true,
  };
}
