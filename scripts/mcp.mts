import { redactRpcUrl } from '../src/lib/diagnostics/redact';
import { findSecrets } from '../src/lib/mcp/secrets';
import { compareConfigs, diagnoseConfig, diagnoseRpc } from '../src/lib/mcp/tools';

/**
 * The MCP server is where developers' own files meet our servers, so the
 * first thing proven here is that secrets never leak: refused before being
 * read, and never repeated back — not even in the refusal.
 */

let failures = 0;

function check(name: string, ok: boolean, detail = '') {
  if (!ok) failures++;
  console.log(`${ok ? 'OK  ' : 'BAD '} ${name}${ok || !detail ? '' : `\n     ${detail}`}`);
}

// Built at runtime, so no key-shaped literal ever sits in this public repo:
// secret scanners would flag it, and a repo should not look like it leaks.
// Only the shape matters to the detector, not the value.
const HEX_64 = 'a1b2c3d4'.repeat(8);
const TEST_PRIVATE_KEY = `0x${HEX_64}`;
const TEST_MNEMONIC = [...Array(11).fill('test'), 'junk'].join(' ');
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

console.log('--- secret detection ---');
check('a raw private key is caught', findSecrets(`KEY=${TEST_PRIVATE_KEY}`).length === 1);
check('a variable named PRIVATE_KEY is caught', findSecrets('PRIVATE_KEY=anything').length === 1);
check('an assigned seed phrase is caught', findSecrets(`MNEMONIC_WORDS="${TEST_MNEMONIC}"`).length === 1);
check('a commented-out private key is still caught', findSecrets(`# DEPLOYER=${TEST_PRIVATE_KEY}`).length === 1);
check(
  'a plain English comment is NOT a seed phrase',
  findSecrets('# the rpc url that we use for the app in staging and also prod envs').length === 0,
);
check(
  'an Ankr URL with a 64-hex API key is NOT a private key',
  findSecrets(`RPC_URL=https://rpc.ankr.com/eth/${HEX_64}`).length === 0,
);
check('a contract address is NOT a private key', findSecrets(`CONTRACT=${USDC_BASE}`).length === 0);

console.log('\n--- refusals never echo the secret ---');
{
  const result = await diagnoseConfig({
    config: `RPC_URL=https://sepolia.base.org\nDEPLOYER_KEY=${TEST_PRIVATE_KEY}`,
  });
  check('config with a private key is refused', result.isError);
  check('the refusal does not contain the key', !result.text.includes(TEST_PRIVATE_KEY.slice(2)), result.text);
  check('the refusal names the line', /line 2/.test(result.text), result.text);
  check('nothing was diagnosed', !/verdict/i.test(result.text), result.text);
}
{
  const result = await diagnoseConfig({ config: `SEED="${TEST_MNEMONIC}"\nRPC_URL=https://sepolia.base.org` });
  check('config with a seed phrase is refused', result.isError);
  check('the refusal does not contain the phrase', !result.text.includes('test junk'), result.text);
}
{
  const result = await diagnoseRpc({
    rpcUrl: 'https://sepolia.base.org',
    expectedChainId: 84532,
    criticalReadSignature: TEST_PRIVATE_KEY,
  });
  check('a key smuggled into the signature field is refused', result.isError);
  check('and is not echoed back', !result.text.includes(TEST_PRIVATE_KEY.slice(2)), result.text);
}

console.log('\n--- output redacts API keys in RPC URLs ---');
{
  const apiKey = 'sk3cr3tAPIk3yABCDEFGHIJ1234567890';
  const result = await diagnoseRpc({ rpcUrl: `https://base-sepolia.example-rpc.com/v2/${apiKey}`, expectedChainId: 84532 });
  check('the API key never appears in the output', !result.text.includes(apiKey), result.text);
}

{
  // One line holding both the URL and the chain: the chain's source line is
  // quoted back, and must not carry the key with it.
  const apiKey = 'lineK3yABCDEFGHIJKLMNOP1234567890';
  const result = await diagnoseConfig({
    config: `RPC_URL=https://base-sepolia.example-rpc.com/v2/${apiKey} CHAIN_ID=84532`,
  });
  check('a key on the same line as the chain id is not quoted back', !result.text.includes(apiKey), result.text);
}

{
  // Every provider shape, not only a key at the end of the path. The public
  // dashboard stores these URLs, so a key that slips through here is published.
  const key = 'a1b2c3d4'.repeat(4);
  const shapes = [
    `https://base-mainnet.g.alchemy.com/v2/${key}`,
    `https://example.base-mainnet.quiknode.pro/${key}/`,
    `https://go.getblock.io/${key}/`,
    `https://node.example.com/${key}/rpc`,
    `https://rpc.example.com/base?apikey=${key}`,
    `https://user:${key}@rpc.example.com/`,
  ];
  const leaked = shapes.filter((url) => redactRpcUrl(url).includes(key));
  check('a key anywhere in the URL is redacted (end, before a trailing slash, mid-path, query, userinfo)', leaked.length === 0, leaked.join(' | '));
  check('short path parts that are not keys stay readable', redactRpcUrl('https://rpc.example.com/v2/base/mainnet') === 'https://rpc.example.com/v2/base/mainnet');
}

console.log('\n--- agents are held to the SSRF guard ---');
{
  const result = await diagnoseRpc({ rpcUrl: 'http://169.254.169.254/latest/meta-data/', expectedChainId: 1 });
  check('cloud metadata is refused through the MCP too', /refused to contact 169\.254\.169\.254/i.test(result.text), result.text);
}

console.log('\n--- the tools work end to end (live Base) ---');
{
  const result = await diagnoseConfig({
    config: `NEXT_PUBLIC_RPC_URL=https://mainnet.base.org\nNEXT_PUBLIC_CHAIN_ID=84532\nNEXT_PUBLIC_CONTRACT=${USDC_BASE}`,
  });
  check('the demo bug read from a .env is BLOCKED', /verdict: BLOCKED/.test(result.text), result.text);
  check(
    'and names the network mismatch',
    /expects Base Sepolia but the RPC answers Base Mainnet/.test(result.text),
    result.text,
  );
}
{
  // The critical read must be included: without it that check is NOT_TESTED,
  // and NOT_TESTED correctly keeps the verdict at AT_RISK instead of READY.
  const target = {
    rpcUrl: 'https://mainnet.base.org',
    contractAddress: USDC_BASE,
    criticalReadSignature: 'symbol() returns (string)',
  };
  const result = await compareConfigs({
    before: { ...target, expectedChainId: 84532 },
    after: { ...target, expectedChainId: 8453, fallbackRpcUrl: 'https://base-rpc.publicnode.com' },
  });
  check('compare proves the fix: BLOCKED before, READY after', /BLOCKED before, READY after/.test(result.text), result.text);
}
{
  const result = await diagnoseConfig({ config: 'RPC_URL=https://my-private-node.example.com' });
  check('unknown network is not guessed: the agent is asked for it', result.isError && /expectedChainId/.test(result.text), result.text);
}

console.log(`\n=== ${failures === 0 ? 'all MCP checks passed' : `${failures} MCP check(s) FAILED`} ===`);
process.exit(failures > 0 ? 1 : 0);
