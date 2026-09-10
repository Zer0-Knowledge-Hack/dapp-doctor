import { parseAbi, encodeFunctionData, decodeFunctionResult, type Abi } from 'viem';
import { rpcCall } from '../rpc';
import { actionForFailure } from './helpers';
import type { CheckResult, DiagnoseTarget } from '../types';

const TITLE = 'Critical read';

/** Accepts "getMessage() returns (string)" or the signature prefixed with "function". */
function normalizeSignature(signature: string): string {
  const trimmed = signature.trim();
  return trimmed.startsWith('function ') ? trimmed : `function ${trimmed}`;
}

/** BigInt is not JSON-serializable; the report still needs to show it. */
function toDisplayable(value: unknown): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (Array.isArray(value)) return value.map(toDisplayable);
  return value;
}

/**
 * Check 5 — critical read.
 * The only check that exercises the full path the application takes: encode
 * the call, run it against the real contract, decode the answer. The four
 * previous checks can all pass and this one still fail, because the deployed
 * contract may not be the one the app believes it is.
 *
 * Read-only: uses eth_call, never signs or sends transactions.
 */
export async function checkCriticalRead(target: DiagnoseTarget): Promise<CheckResult> {
  const address = target.contractAddress as string;
  const rawSignature = target.criticalRead!.signature;
  const signature = normalizeSignature(rawSignature);

  let abi: Abi;
  let functionName: string;
  let data: `0x${string}`;

  try {
    abi = parseAbi([signature]) as Abi;
    functionName = signature.match(/function\s+([A-Za-z_$][\w$]*)/)?.[1] ?? '';
    if (!functionName) throw new Error('could not extract the function name');
    data = encodeFunctionData({ abi, functionName });
  } catch (error) {
    return {
      id: 'critical-read',
      title: TITLE,
      outcome: 'FAIL',
      summary: `The signature "${rawSignature}" is not valid: ${
        error instanceof Error ? error.message : 'unknown error'
      }`,
      action: 'Fix the signature. Expected format: functionName() returns (type).',
      observed: { signature: rawSignature },
      durationMs: 0,
      critical: true,
    };
  }

  const outcome = await rpcCall(target.rpcUrl, 'eth_call', [{ to: address, data }, 'latest']);

  if (!outcome.ok) {
    // A JSON-RPC error here is usually a revert, not an infrastructure problem.
    const isRevert = outcome.kind === 'rpc';
    return {
      id: 'critical-read',
      title: TITLE,
      outcome: 'FAIL',
      summary: isRevert
        ? `The call to ${functionName}() was rejected by the contract: ${outcome.message}`
        : `Could not execute ${functionName}(): ${outcome.message}`,
      action: isRevert
        ? 'The contract exists but rejected the read. Check the function exists with that exact signature.'
        : actionForFailure(outcome),
      observed: { address, signature, failureKind: outcome.kind, rpcCode: outcome.rpcCode },
      durationMs: outcome.durationMs,
      critical: true,
    };
  }

  const returnData = typeof outcome.result === 'string' ? outcome.result : '0x';

  if (returnData === '0x') {
    return {
      id: 'critical-read',
      title: TITLE,
      outcome: 'FAIL',
      summary: `${functionName}() returned empty. The function does not exist on the deployed contract.`,
      action:
        'There is code at the address, but it does not expose this function. The address ' +
        'most likely belongs to a different contract or a different ABI version.',
      observed: { address, signature, returnData },
      durationMs: outcome.durationMs,
      critical: true,
    };
  }

  try {
    const decoded = decodeFunctionResult({
      abi,
      functionName,
      data: returnData as `0x${string}`,
    });
    return {
      id: 'critical-read',
      title: TITLE,
      outcome: 'PASS',
      summary: `${functionName}() answered correctly.`,
      observed: { address, signature, value: toDisplayable(decoded) },
      durationMs: outcome.durationMs,
      critical: true,
    };
  } catch (error) {
    return {
      id: 'critical-read',
      title: TITLE,
      outcome: 'FAIL',
      summary: `${functionName}() returned data that does not match the declared signature.`,
      action:
        'The ABI the application uses does not match the deployed contract. Regenerate ' +
        'the ABI from the contract that is actually on this network.',
      observed: {
        address,
        signature,
        returnData,
        decodeError: error instanceof Error ? error.message : 'unknown error',
      },
      durationMs: outcome.durationMs,
      critical: true,
    };
  }
}
