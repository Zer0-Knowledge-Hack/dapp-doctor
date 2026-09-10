import type { DiagnoseTarget } from './types';

/**
 * Input validation shared by /api/diagnose and /api/compare.
 * It lives outside the routes so both accept exactly the same shape: if they
 * diverged, the before/after comparison would stop being comparable.
 */

export type ParseResult =
  | { ok: true; target: DiagnoseTarget }
  | { ok: false; error: string };

/** http(s) only: keeps the endpoint from being used to read file:// or internal schemes. */
function isUsableRpcUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim() === '') return false;
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

function isAddress(value: unknown): value is string {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value);
}

export function parseTarget(raw: unknown, label = ''): ParseResult {
  const prefix = label ? `${label}: ` : '';

  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: `${prefix}expected a configuration object.` };
  }

  const input = raw as Record<string, unknown>;

  if (!isUsableRpcUrl(input.rpcUrl)) {
    return { ok: false, error: `${prefix}rpcUrl is required and must be a valid http(s) URL.` };
  }

  const expectedChainId = Number(input.expectedChainId);
  if (!Number.isInteger(expectedChainId) || expectedChainId <= 0) {
    return {
      ok: false,
      error: `${prefix}expectedChainId is required and must be a positive integer.`,
    };
  }

  if (
    input.contractAddress !== undefined &&
    input.contractAddress !== '' &&
    !isAddress(input.contractAddress)
  ) {
    return {
      ok: false,
      error: `${prefix}contractAddress must be a 20-byte EVM address (0x + 40 hex).`,
    };
  }

  if (
    input.fallbackRpcUrl !== undefined &&
    input.fallbackRpcUrl !== '' &&
    !isUsableRpcUrl(input.fallbackRpcUrl)
  ) {
    return { ok: false, error: `${prefix}fallbackRpcUrl must be a valid http(s) URL.` };
  }

  const signature =
    typeof input.criticalReadSignature === 'string' && input.criticalReadSignature.trim() !== ''
      ? input.criticalReadSignature.trim()
      : undefined;

  const maxBlockAgeSeconds = Number(input.maxBlockAgeSeconds);

  return {
    ok: true,
    target: {
      rpcUrl: input.rpcUrl,
      expectedChainId,
      ...(isAddress(input.contractAddress) ? { contractAddress: input.contractAddress } : {}),
      ...(isUsableRpcUrl(input.fallbackRpcUrl) ? { fallbackRpcUrl: input.fallbackRpcUrl } : {}),
      ...(signature ? { criticalRead: { signature } } : {}),
      ...(Number.isInteger(maxBlockAgeSeconds) && maxBlockAgeSeconds > 0
        ? { maxBlockAgeSeconds }
        : {}),
    },
  };
}
