/**
 * Reads a pasted configuration and finds what a diagnosis needs: the RPC
 * URLs, the chain the app expects, and the contracts it reads.
 *
 * One reader serves every way in — the paste box, the GitHub reader and the
 * MCP server — so the three can never disagree about what a config says.
 *
 * It is pure and dependency-free so it runs in the browser: whatever a user
 * pastes, API keys included, never has to leave their machine to be read.
 *
 * Non-invention applies here too. Every finding carries the line it came
 * from, and anything guessed rather than written down is marked `inferred`.
 * When the expected chain cannot be established, it is left empty and the
 * user is asked, rather than filled with a plausible default.
 */

export type Confidence = 'declared' | 'inferred';

export interface Finding<T> {
  value: T;
  /** Where it came from: the source line, or why it was inferred. */
  source: string;
  confidence: Confidence;
}

export interface Extraction {
  rpcUrls: Finding<string>[];
  chainId: Finding<number> | null;
  contracts: Finding<string>[];
  /** Things the user should know before trusting the result. */
  notes: string[];
}

/**
 * Chain names as they appear in viem/wagmi imports, hardhat network keys and
 * env vars. Base-prefixed names are listed first: "baseSepolia" must never be
 * read as plain "sepolia".
 */
const CHAIN_NAMES: Array<{ pattern: RegExp; chainId: number }> = [
  { pattern: /\bbase[\s_-]?sepolia\b/i, chainId: 84532 },
  { pattern: /\bbase[\s_-]?mainnet\b/i, chainId: 8453 },
  { pattern: /\bsepolia\b/i, chainId: 11155111 },
  { pattern: /\bbase\b/i, chainId: 8453 },
  { pattern: /\b(?:mainnet|homestead)\b/i, chainId: 1 },
];

/** Hostname shapes of well-known RPC providers, and the chain each serves. */
const RPC_HOST_CHAINS: Array<{ pattern: RegExp; chainId: number }> = [
  { pattern: /(?:^|\.)sepolia\.base\.org$/i, chainId: 84532 },
  { pattern: /(?:^|\.)mainnet\.base\.org$/i, chainId: 8453 },
  { pattern: /base[-_]sepolia/i, chainId: 84532 },
  { pattern: /base[-_]?(?:mainnet|rpc)|^base\./i, chainId: 8453 },
  { pattern: /eth(?:ereum)?[-_]sepolia|(?:^|\.)sepolia\./i, chainId: 11155111 },
  { pattern: /eth[-_]mainnet|(?:^|\.)mainnet\.infura\.io$/i, chainId: 1 },
];

/** URLs that are clearly not RPC endpoints: explorers, docs, code hosts. */
const NOT_RPC_HOST =
  /(?:etherscan|basescan|blockscout|github|githubusercontent|npmjs|docs\.|vercel\.app|twitter|x\.com|discord)/i;

/** Hosts that strongly suggest a JSON-RPC endpoint. */
const RPC_HOST_HINT =
  /(?:rpc|alchemy|infura|quiknode|quicknode|ankr|drpc|publicnode|llamarpc|chainstack|blastapi|base\.org|node)/i;

/** Keys that say "this is an RPC URL". */
const RPC_KEY_HINT = /(?:rpc|provider|node|endpoint|http_url|jsonrpc)/i;

/** Keys that say "this is a contract address" rather than a wallet. */
const CONTRACT_KEY_HINT = /(?:contract|address|token|addr|pool|router|vault)/i;

const URL_PATTERN = /https?:\/\/[^\s'"`<>)\],]+/g;
const ADDRESS_PATTERN = /\b0x[0-9a-fA-F]{40}\b/g;
const ZERO_ADDRESS = /^0x0{40}$/i;

/** Explicit numeric declarations: `chainId: 84532`, `CHAIN_ID=8453`, `chain_id = 1`. */
const CHAIN_ID_DECLARATION = /chain[\s_-]?id["'`]?\s*[:=]\s*["'`]?(\d{1,10})\b/i;

function trimSource(line: string): string {
  const compact = line.trim().replace(/\s+/g, ' ');
  return compact.length > 120 ? `${compact.slice(0, 117)}…` : compact;
}

export function chainForRpcHost(url: string): number | null {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return null;
  }
  for (const { pattern, chainId } of RPC_HOST_CHAINS) {
    if (pattern.test(host)) return chainId;
  }
  return null;
}

/** Scores a URL by how RPC-like it is, given the line it sits on. Negative means skip. */
function scoreRpcCandidate(url: string, line: string): number {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return -1;
  }
  if (NOT_RPC_HOST.test(host)) return -1;
  let score = 0;
  if (RPC_HOST_HINT.test(host) || RPC_HOST_HINT.test(url)) score += 2;
  if (RPC_KEY_HINT.test(line)) score += 2;
  return score;
}

export function extractFromText(text: string): Extraction {
  const lines = text.split(/\r?\n/);
  const notes: string[] = [];

  // A bare URL with nothing around it is the simplest paste of all.
  const trimmed = text.trim();
  const isBareUrl = /^https?:\/\/\S+$/.test(trimmed);

  const rpcCandidates: Array<Finding<string> & { score: number; order: number }> = [];
  const contracts: Finding<string>[] = [];
  let declaredChain: Finding<number> | null = null;
  let namedChain: Finding<number> | null = null;

  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    // Comments document configs; they do not configure them.
    if (!line || /^(?:#|\/\/)/.test(line)) return;

    for (const url of line.match(URL_PATTERN) ?? []) {
      const score = isBareUrl ? 3 : scoreRpcCandidate(url, line);
      if (score > 0 && !rpcCandidates.some((candidate) => candidate.value === url)) {
        rpcCandidates.push({ value: url, source: trimSource(line), confidence: 'declared', score, order: index });
      }
    }

    for (const address of line.match(ADDRESS_PATTERN) ?? []) {
      if (ZERO_ADDRESS.test(address)) continue;
      if (contracts.some((found) => found.value.toLowerCase() === address.toLowerCase())) continue;
      contracts.push({
        value: address,
        source: trimSource(line),
        // An address under a contract-ish key is declared; a stray one is a guess.
        confidence: CONTRACT_KEY_HINT.test(line.split(address)[0]) ? 'declared' : 'inferred',
      });
    }

    if (!declaredChain) {
      const match = line.match(CHAIN_ID_DECLARATION);
      if (match) {
        declaredChain = { value: Number(match[1]), source: trimSource(line), confidence: 'declared' };
      }
    }

    if (!namedChain) {
      // Strip URLs first, so "mainnet.base.org" in a URL is not read as a chain name.
      const withoutUrls = line.replace(URL_PATTERN, ' ');
      for (const { pattern, chainId } of CHAIN_NAMES) {
        if (pattern.test(withoutUrls)) {
          namedChain = { value: chainId, source: trimSource(line), confidence: 'declared' };
          break;
        }
      }
    }
  });

  const rpcUrls = rpcCandidates
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .map(({ value, source, confidence }) => ({ value, source, confidence }));

  // Declared contracts first; within each group, keep file order.
  contracts.sort((a, b) => (a.confidence === b.confidence ? 0 : a.confidence === 'declared' ? -1 : 1));

  // Expected chain, strongest evidence first: an explicit number, then a chain
  // name in code, and only then a guess from the RPC hostname.
  let chainId: Finding<number> | null = declaredChain ?? namedChain;
  if (!chainId && rpcUrls[0]) {
    const fromHost = chainForRpcHost(rpcUrls[0].value);
    if (fromHost !== null) {
      chainId = {
        value: fromHost,
        source: `inferred from the RPC hostname ${new URL(rpcUrls[0].value).hostname}`,
        confidence: 'inferred',
      };
      notes.push(
        'The expected chain was inferred from the RPC hostname. If your app expects a different network, change it: that mismatch is exactly what the diagnosis looks for.',
      );
    }
  }

  if (rpcUrls.length === 0) notes.push('No RPC URL found. Paste the URL your app connects to.');
  if (!chainId) notes.push('Could not tell which network your app expects. Pick it before running the diagnosis.');
  if (rpcUrls.some((found) => /localhost|127\.0\.0\.1/.test(found.value))) {
    notes.push('A localhost RPC cannot be reached from DApp Doctor. Use the public URL of your node or provider.');
  }

  return { rpcUrls, chainId, contracts, notes };
}
