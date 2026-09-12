import { extractFromText } from '../intake/extract';
import type { TargetFields } from './targetFields';

const KEY_TO_FIELD: Array<[RegExp, keyof TargetFields]> = [
  [/^(NEXT_PUBLIC_|VITE_|PUBLIC_)?(RPC_URL|RPC)$/i, 'rpcUrl'],
  [/^(NEXT_PUBLIC_|VITE_|PUBLIC_)?(FALLBACK_RPC(_URL)?|RPC_FALLBACK|FALLBACK_URL)$/i, 'fallbackRpcUrl'],
  [/^(NEXT_PUBLIC_|VITE_|PUBLIC_)?(CHAIN_ID|EXPECTED_CHAIN(_ID)?)$/i, 'expectedChainId'],
  [/^(NEXT_PUBLIC_|VITE_|PUBLIC_)?(CONTRACT(_ADDRESS)?|TOKEN_ADDRESS)$/i, 'contractAddress'],
  [/^(NEXT_PUBLIC_|VITE_|PUBLIC_)?(CRITICAL_READ|READ_SIGNATURE)$/i, 'criticalReadSignature'],
];

const JSON_ALIASES: Record<string, keyof TargetFields> = {
  rpcUrl: 'rpcUrl',
  rpc_url: 'rpcUrl',
  url: 'rpcUrl',
  fallbackRpcUrl: 'fallbackRpcUrl',
  fallback_rpc_url: 'fallbackRpcUrl',
  expectedChainId: 'expectedChainId',
  chainId: 'expectedChainId',
  chain_id: 'expectedChainId',
  contractAddress: 'contractAddress',
  contract_address: 'contractAddress',
  criticalReadSignature: 'criticalReadSignature',
  critical_read: 'criticalReadSignature',
};

/** Pulls form fields from a pasted .env or JSON config. Unknown keys are ignored. */
export function parseConfigFile(text: string): Partial<TargetFields> {
  const out: Partial<TargetFields> = {};
  const trimmed = text.trim();
  if (!trimmed) return out;

  const extracted = extractFromText(trimmed);
  if (extracted.rpcUrls[0]) out.rpcUrl = extracted.rpcUrls[0].value;
  if (extracted.rpcUrls[1]) out.fallbackRpcUrl = extracted.rpcUrls[1].value;
  if (extracted.chainId) out.expectedChainId = String(extracted.chainId.value);
  if (extracted.contracts[0]) out.contractAddress = extracted.contracts[0].value;

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      applyUnknown(JSON.parse(trimmed), out);
      return out;
    } catch {
      // Fall through to line parsing; a broken JSON file may still hold KEY=value lines.
    }
  }

  for (const line of trimmed.split(/\r?\n/)) {
    const row = line.trim();
    if (!row || row.startsWith('#') || row.startsWith('//')) continue;
    const match = row.match(/^export\s+([A-Za-z0-9_.]+)\s*=\s*(.*)$/) ?? row.match(/^([A-Za-z0-9_.]+)\s*=\s*(.*)$/);
    if (!match) continue;
    applyKey(match[1], stripQuotes(match[2]), out);
  }

  return out;
}

export function hasParsedFields(fields: Partial<TargetFields>): boolean {
  return Object.values(fields).some((value) => Boolean(value && value.trim()));
}

function applyUnknown(value: unknown, out: Partial<TargetFields>): void {
  if (Array.isArray(value)) {
    value.forEach((item) => applyUnknown(item, out));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (nested && typeof nested === 'object') applyUnknown(nested, out);
    else if (typeof nested === 'string' || typeof nested === 'number') applyKey(key, String(nested), out);
  }
}

function applyKey(key: string, value: string, out: Partial<TargetFields>): void {
  const cleaned = value.trim();
  if (!cleaned) return;
  const alias = JSON_ALIASES[key];
  if (alias && !out[alias]) out[alias] = cleaned;
  for (const [pattern, field] of KEY_TO_FIELD) {
    if (pattern.test(key) && !out[field]) {
      out[field] = cleaned;
      return;
    }
  }
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}
