import { parseConfigFile } from '../src/lib/forms/parseConfigFile';
import { extractFromText } from '../src/lib/intake/extract';

/**
 * The config reader feeds every way into DApp Doctor, so a wrong read here is
 * a wrong diagnosis everywhere. These are real config shapes, plus the traps
 * that a naive reader falls into.
 */

let failures = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(`${ok ? 'OK  ' : 'BAD '} ${name}${ok ? '' : `\n     expected ${JSON.stringify(expected)}\n     got      ${JSON.stringify(actual)}`}`);
}

console.log('--- a bare URL ---');
{
  const r = extractFromText('https://sepolia.base.org');
  check('finds the URL', r.rpcUrls.map((f) => f.value), ['https://sepolia.base.org']);
  check('infers Base Sepolia from the host', r.chainId?.value, 84532);
  check('marks the chain as inferred, not declared', r.chainId?.confidence, 'inferred');
}

console.log('\n--- the demo bug, as a .env ---');
{
  const r = extractFromText(`
NEXT_PUBLIC_RPC_URL=https://base-mainnet.g.alchemy.com/v2/abc123def456ghi789
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_CONTRACT_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
`);
  check('RPC points at Base Mainnet', r.rpcUrls[0]?.value, 'https://base-mainnet.g.alchemy.com/v2/abc123def456ghi789');
  check('declared chain wins over the RPC host (84532, not 8453)', r.chainId?.value, 84532);
  check('declared chain is marked declared', r.chainId?.confidence, 'declared');
  check('contract found and declared', [r.contracts[0]?.value, r.contracts[0]?.confidence], ['0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 'declared']);
}

console.log('\n--- a wagmi config ---');
{
  const r = extractFromText(`
import { baseSepolia } from 'wagmi/chains'
export const config = createConfig({
  chains: [baseSepolia],
  transports: { [baseSepolia.id]: http('https://sepolia.base.org') },
})`);
  check('reads the chain from the import name', r.chainId?.value, 84532);
  check('finds the transport URL', r.rpcUrls[0]?.value, 'https://sepolia.base.org');
}

console.log('\n--- a hardhat config with an explorer URL nearby ---');
{
  const r = extractFromText(`
networks: {
  baseSepolia: {
    url: "https://base-sepolia.g.alchemy.com/v2/KEY",
    chainId: 84532,
  },
},
etherscan: { customChains: [{ network: "base", urls: { browserURL: "https://basescan.org" } }] }
`);
  check('keeps the RPC and drops the explorer', r.rpcUrls.map((f) => f.value), ['https://base-sepolia.g.alchemy.com/v2/KEY']);
  check('chain 84532', r.chainId?.value, 84532);
}

console.log('\n--- traps ---');
{
  const r = extractFromText('RPC_URL=https://mainnet.base.org');
  check('"mainnet" inside a URL is not read as Ethereum Mainnet', r.chainId?.value, 8453);
}
{
  const r = extractFromText('const chain = baseSepolia');
  check('"baseSepolia" is Base Sepolia, never Ethereum Sepolia', r.chainId?.value, 84532);
}
{
  const r = extractFromText('# RPC_URL=https://old-node.example-rpc.com\nRPC_URL=https://sepolia.base.org');
  check('commented-out lines are ignored', r.rpcUrls.map((f) => f.value), ['https://sepolia.base.org']);
}
{
  const r = extractFromText('TOKEN_ADDRESS=0x0000000000000000000000000000000000000000');
  check('the zero address is not a contract', r.contracts.length, 0);
}
{
  const r = extractFromText('RPC_URL=https://sepolia.base.org\nFALLBACK_RPC_URL=https://base-sepolia-rpc.publicnode.com');
  check('primary and fallback keep file order', r.rpcUrls.map((f) => f.value), ['https://sepolia.base.org', 'https://base-sepolia-rpc.publicnode.com']);
}
{
  const r = extractFromText('hello, nothing useful here');
  check('no RPC → no invented URL', r.rpcUrls.length, 0);
  check('no RPC → no invented chain', r.chainId, null);
  check('and the user is told what is missing', r.notes.length > 0, true);
}
{
  const r = extractFromText('RPC_URL=https://my-private-node.example.com');
  check('unknown host → chain left empty, not guessed', r.chainId, null);
}

console.log('\n--- upload button reads the same .env ---');
{
  const fields = parseConfigFile(`
NEXT_PUBLIC_RPC_URL=https://mainnet.base.org
NEXT_PUBLIC_CHAIN_ID=8453
NEXT_PUBLIC_CONTRACT_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
CRITICAL_READ=symbol() returns (string)
`);
  check('upload fills the RPC', fields.rpcUrl, 'https://mainnet.base.org');
  check('upload fills the chain', fields.expectedChainId, '8453');
  check('upload fills the contract', fields.contractAddress, '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913');
  check('upload fills the critical read', fields.criticalReadSignature, 'symbol() returns (string)');
}

console.log(`\n=== ${failures === 0 ? 'all intake checks passed' : `${failures} intake check(s) FAILED`} ===`);
process.exit(failures > 0 ? 1 : 0);
