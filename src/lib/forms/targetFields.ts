/**
 * Client-side field rules, aligned with parseTarget. The API remains the
 * source of truth; this only stops an obvious bad submit from leaving the page.
 */

export interface TargetFields {
  rpcUrl: string;
  fallbackRpcUrl: string;
  expectedChainId: string;
  contractAddress: string;
  criticalReadSignature: string;
}

export type FieldKey = keyof TargetFields;
export type FieldErrors = Partial<Record<FieldKey, string>>;

export interface FieldMessages {
  rpcUrl: string;
  chainId: string;
  contract: string;
  fallback: string;
  signature: string;
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

function isAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

/** Zero-argument read, with or without a leading "function" and a returns clause. */
function isReadSignature(value: string): boolean {
  const trimmed = value.trim().replace(/^function\s+/, '');
  return /^[A-Za-z_$][\w$]*\s*\(\s*\)/.test(trimmed);
}

export function validateTargetFields(fields: TargetFields, messages: FieldMessages): FieldErrors {
  const errors: FieldErrors = {};

  if (!fields.rpcUrl.trim() || !isHttpUrl(fields.rpcUrl.trim())) {
    errors.rpcUrl = messages.rpcUrl;
  }

  const chain = Number(fields.expectedChainId);
  if (!Number.isInteger(chain) || chain <= 0) {
    errors.expectedChainId = messages.chainId;
  }

  if (fields.contractAddress.trim() && !isAddress(fields.contractAddress.trim())) {
    errors.contractAddress = messages.contract;
  }

  if (fields.fallbackRpcUrl.trim() && !isHttpUrl(fields.fallbackRpcUrl.trim())) {
    errors.fallbackRpcUrl = messages.fallback;
  }

  if (fields.criticalReadSignature.trim() && !isReadSignature(fields.criticalReadSignature)) {
    errors.criticalReadSignature = messages.signature;
  }

  return errors;
}

export function hasFieldErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
