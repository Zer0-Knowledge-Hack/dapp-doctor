import { compareReports } from '../src/lib/diagnostics/compare';
import { runDiagnosis } from '../src/lib/diagnostics/engine';
import { parseTarget } from '../src/lib/diagnostics/parseTarget';
import type { CheckId, CheckOutcome, CheckResult, DiagnoseTarget, DiagnosisReport } from '../src/lib/diagnostics/types';
import { hasSpanish, toSpanish } from '../src/lib/i18n/engineText';
import { evaluateLaunch } from '../src/lib/launch/rules';
import { landingFor } from '../src/components/landing/content';

/**
 * The Spanish page shows the engine's English sentences in Spanish. What is
 * proven here: every sentence the engine writes has a Spanish rendering, the
 * rendering keeps the variable parts (addresses, URLs, numbers) intact, and
 * no English is left behind. Offline: the SSRF guard refuses internal
 * addresses before any socket opens, which yields real engine output with no
 * network at all.
 */

let failures = 0;

function check(name: string, ok: boolean, detail = '') {
  if (!ok) failures++;
  console.log(`${ok ? 'OK  ' : 'BAD '} ${name}${ok || !detail ? '' : `\n     ${detail}`}`);
}

/** Common English words that must not survive in a Spanish sentence. */
const ENGLISH = /\b(the|is|was|could|did|not|and|with|which|but|answers?|expects?|check\(s\)|found|failed|returned)\b/i;

function spanishOk(english: string): { ok: boolean; detail: string } {
  if (!hasSpanish(english)) return { ok: false, detail: `no Spanish for: ${english}` };
  const spanish = toSpanish(english);
  // Carried-over parts may be English on purpose (a chain name, a provider's own error); strip them before looking.
  const words = spanish.replace(/https?:\/\/\S+|0x[0-9a-fA-F]+|"[^"]*"|\S+\(\)|Base (Mainnet|Sepolia)|Ethereum (Mainnet|Sepolia)/g, '');
  const leftover = words.match(ENGLISH);
  return leftover ? { ok: false, detail: `"${leftover[0]}" left in: ${spanish}` } : { ok: true, detail: '' };
}

const seen = new Set<string>();
function allSpanish(label: string, sentences: string[]) {
  const bad: string[] = [];
  for (const sentence of sentences) {
    if (seen.has(sentence)) continue;
    seen.add(sentence);
    const { ok, detail } = spanishOk(sentence);
    if (!ok) bad.push(detail);
  }
  check(label, bad.length === 0, bad.join('\n     '));
}

function sentencesOf(checks: Array<Pick<CheckResult, 'title' | 'summary' | 'action'>>): string[] {
  return checks.flatMap((c) => [c.title, c.summary, ...(c.action ? [c.action] : [])]);
}

console.log('--- real engine output, offline ---');
{
  const refused = await runDiagnosis({ rpcUrl: 'http://127.0.0.1:1', fallbackRpcUrl: 'http://10.0.0.1', expectedChainId: 8453 });
  allSpanish('a refused primary and fallback: every sentence', [refused.headline, ...sentencesOf(refused.checks)]);
  const metadata = await runDiagnosis({ rpcUrl: 'http://169.254.169.254', expectedChainId: 84532, contractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' });
  allSpanish('cloud metadata as the primary: every sentence', [metadata.headline, ...sentencesOf(metadata.checks)]);
  const comparison = compareReports(refused, metadata);
  allSpanish('the comparison verdict and its rows', [comparison.verdict, ...comparison.deltas.flatMap((d) => [d.title, d.afterSummary, d.beforeSummary])]);
}

console.log('\n--- every Launch Check rule ---');
{
  const ids: CheckId[] = ['access', 'network-identity', 'node-freshness', 'contract-bytecode', 'critical-read', 'fallback'];
  const diagnosis = (target: DiagnoseTarget, overrides: Partial<Record<CheckId, CheckOutcome>> = {}): DiagnosisReport => ({
    status: 'READY', headline: '', target, startedAt: '', durationMs: 1,
    checks: ids.map((id) => ({ id, title: 'x', summary: 'x', durationMs: 1, critical: true, outcome: overrides[id] ?? (id === 'fallback' && !target.fallbackRpcUrl ? 'NOT_TESTED' : 'PASS') })),
  });
  const base: DiagnoseTarget = {
    rpcUrl: 'https://base-mainnet.g.alchemy.com/v2/abc', fallbackRpcUrl: 'https://base-rpc.publicnode.com',
    expectedChainId: 8453, contractAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', criticalRead: { signature: 'symbol() returns (string)' },
  };
  const cases: Array<[DiagnoseTarget, Partial<Record<CheckId, CheckOutcome>>?]> = [
    [base],
    [{ ...base, expectedChainId: 84532 }],
    [{ ...base, expectedChainId: 424242 }],
    [{ ...base, rpcUrl: 'http://rpc.example.com' }],
    [{ ...base, fallbackRpcUrl: 'http://rpc.example.com' }],
    [{ ...base, rpcUrl: 'http://rpc.example.com', fallbackRpcUrl: 'http://rpc2.example.com' }],
    [{ ...base, fallbackRpcUrl: undefined }],
    [base, { fallback: 'FAIL' }],
    [base, { fallback: 'WARN' }],
    [base, { fallback: 'NOT_TESTED' }],
    [{ ...base, fallbackRpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/x' }],
    [{ ...base, rpcUrl: 'https://mainnet.base.org' }],
    [{ ...base, rpcUrl: 'https://base-rpc.publicnode.com' }],
    [{ ...base, rpcUrl: 'https://rpc.ankr.com/base' }],
    [{ ...base, contractAddress: undefined }],
    [{ ...base, criticalRead: undefined }],
    [{ ...base, contractAddress: undefined, criticalRead: undefined }],
    [base, { 'node-freshness': 'NOT_TESTED' }],
  ];
  const sentences = cases.flatMap(([target, overrides]) => {
    const verdict = evaluateLaunch(diagnosis(target, overrides));
    return [verdict.headline, ...sentencesOf(verdict.rules)].filter((s) => s !== 'x');
  });
  allSpanish(`${cases.length} launch configurations: every rule, summary, action and headline`, sentences);
}

console.log('\n--- every sentence the checks can write ---');
allSpanish('check sentences not reachable offline', [
  'The RPC https://mainnet.base.org/ answers correctly.',
  'The RPC https://mainnet.base.org/ answered, but not with a block number.',
  'The RPC https://x.example/ did not answer: No response within 8000 ms',
  'The URL responds to JSON-RPC but does not behave like an EVM node. Check it is the right endpoint.',
  'Could not read the node chain ID: The provider answered HTTP 429 Too Many Requests',
  'The node returned an unreadable chain ID: nope',
  'Check that the URL points at an EVM node and not at another service.',
  'The application expects Base Sepolia but the RPC answers Base Mainnet.',
  'Point the RPC at Base Sepolia (chain ID 84532), or fix the expected chain ID in the configuration.',
  'The RPC answers Base Mainnet, which is the expected network.',
  'Could not read the latest block: The JSON-RPC response is not an object',
  'The node did not return a readable block for "latest".',
  'Check that the endpoint is fully synced.',
  'The latest block is dated 12 s in the future.',
  'There is clock skew between this environment and the node. Verify the system time.',
  'The latest block is 75 s old (limit: 60 s).',
  'The node is lagging and may serve stale state. Use a secondary RPC, or wait for the provider to catch up before trusting these reads.',
  'The latest block is 1 s old. The node is up to date.',
  'Could not read the code at 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913: The provider answered 2xx but the body is not JSON',
  'No contract deployed at 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 on Base Mainnet.',
  'No contract deployed at 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 on the network this RPC answers.',
  'This was checked on Base Mainnet, the network the RPC answers, not on Base Sepolia. Fix the network identity first, then run the diagnosis again.',
  'The address has no code on this network. Verify the contract is deployed here and that the address does not come from a different network.',
  'A contract is deployed at 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 (1852 bytes of code).',
  'The signature "symbol(" is not valid: Unknown signature.',
  'Fix the signature. Expected format: functionName() returns (type).',
  'The call to symbol() was rejected by the contract: execution reverted',
  'Could not execute symbol(): The JSON-RPC response carries neither result nor error',
  'The contract exists but rejected the read. Check the function exists with that exact signature.',
  'symbol() returned empty. The function does not exist on the deployed contract.',
  'There is code at the address, but it does not expose this function. The address most likely belongs to a different contract or a different ABI version.',
  'symbol() answered correctly.',
  'symbol() returned data that does not match the declared signature.',
  'The ABI the application uses does not match the deployed contract. Regenerate the ABI from the contract that is actually on this network.',
  'The fallback RPC https://x.example/ did not answer: The response was too large to be a JSON-RPC envelope',
  'Without a working backup there is no network if the primary goes down. The provider did not answer in time. Try a secondary RPC and check the provider status page.',
  'The fallback answers Base Mainnet, but the application expects Base Sepolia.',
  'Fix the fallback URL. As it stands, if the primary goes down the application will read from the wrong network without raising any error.',
  'The fallback https://base-rpc.publicnode.com/ answers and is on Base Mainnet.',
  'Did not run: no contract address was provided.',
  'Did not run: no critical read was provided.',
  'Did not run: there is no contract at that address.',
  'All six checks passed. The configuration points at the right network and the contract answers.',
  'The critical path answers, but 3 check(s) could not be executed.',
  'No check was executed.',
  'Check that the RPC URL is correct and that the host resolves from this environment.',
  'The API key is missing, expired, or not allowed to call this method. Review the provider credentials.',
  'You exceeded the provider rate limit. Lower the call frequency or upgrade the plan.',
  'The endpoint path does not exist. Check that the URL includes the provider full path.',
  'Review the endpoint configuration in the provider dashboard.',
  'The provider does not support this method on your plan. Use a provider that exposes it.',
  'The node rejected the call. Review the parameters being sent.',
  'The response is not valid JSON-RPC. The URL most likely points at something that is not a node.',
  'The scheme ftp: is not allowed. Use http or https.',
  'rpc.example.invalid: the hostname does not resolve',
  'rpc.example.invalid: the hostname did not resolve within 3000 ms',
  'The URL is not valid.',
  'Unknown network failure',
]);

console.log('\n--- comparison verdicts ---');
allSpanish('every verdict shape', [
  'The fix resolved 2 check(s) but broke 1 that used to pass.',
  'Nothing changed between the two runs.',
  'The status went from AT_RISK to BLOCKED without any individual check being resolved.',
  'The fix resolved 2 check(s). The target is now READY.',
  'The fix resolved 1 check(s), but the target is still AT_RISK.',
  'Did not run in the previous pass.',
]);

console.log('\n--- messages a page can show ---');
{
  const invalid = [parseTarget(null), parseTarget({}), parseTarget({ rpcUrl: 'https://x.org' }), parseTarget({ rpcUrl: 'https://x.org', expectedChainId: 1, contractAddress: '0x1' }),
    parseTarget({ rpcUrl: 'https://x.org', expectedChainId: 1, fallbackRpcUrl: 'nope' }), parseTarget({}, 'before'), parseTarget({ rpcUrl: 'x' }, 'after')];
  allSpanish('every input validation error, with and without the comparison prefix', invalid.flatMap((r) => (r.ok ? [] : [r.error])));
  allSpanish('purchase outcomes and access messages', [
    'Pro unlocked.', 'Pro unlocked. This was a Test Store transaction: no card was charged.',
    'Purchase cancelled. Nothing was charged and your access is unchanged.',
    'Test Store simulated a failed purchase. No charge was made and your access is unchanged.',
    'The purchase failed: You already own this plan.', 'Could not load your history.',
    'Your Pro access has expired. Renew it to run Launch Check again.', 'userId is missing or malformed.',
  ]);
  allSpanish('heartbeat messages', [
    'The RPC answered HTTP 503.', 'No answer within 4 seconds.', 'The RPC answered with an error.',
    'No answer: the address is unreachable, or it refuses requests from a browser.', 'The RPC answered, but not with a block.',
  ]);
}

console.log('\n--- what the translation must never do ---');
check('variable parts survive untouched',
  toSpanish('No contract deployed at 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 on Base Mainnet.').includes('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913 en Base Mainnet'));
check('an unknown sentence is left as it is, never guessed', toSpanish('Something new the engine says.') === 'Something new the engine says.');
check('translating Spanish again changes nothing', toSpanish('Identidad de red') === 'Identidad de red');

console.log('\n--- the landing copy ---');
{
  const en = JSON.stringify(landingFor('en'));
  const es = landingFor('es');
  const flags = (value: unknown): string[] => JSON.stringify(value).match(/"availability":"\w+"/g) ?? [];
  check('Spanish keeps every availability flag where English has it', flags(es).join() === flags(landingFor('en')).join());
  check('Spanish keeps every link target', JSON.stringify(es).match(/"href":"[^"]+"/g)?.join() === en.match(/"href":"[^"]+"/g)?.join());
  check('the Spanish headline is Spanish', es.hero.headline !== landingFor('en').hero.headline);
}

console.log(`\n=== ${failures === 0 ? 'all i18n checks passed' : `${failures} i18n check(s) FAILED`} ===`);
process.exit(failures > 0 ? 1 : 0);
