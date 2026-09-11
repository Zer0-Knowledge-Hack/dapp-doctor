import type { CheckId, CheckOutcome, CheckResult, DiagnoseTarget, DiagnosisReport } from '../src/lib/diagnostics/types';
import { providerDomain, sharedEndpoint } from '../src/lib/launch/endpoints';
import { evaluateLaunch, launchMaxBlockAge, type LaunchRuleId } from '../src/lib/launch/rules';
import { runLaunchCheck } from '../src/lib/launch/run';

/**
 * Launch Check is the paid verdict, so its rule table is proven here offline:
 * fixed diagnoses in, a fixed verdict out, no network. The live checks it
 * builds on are covered by the smoke test. The last block proves the guard
 * holds on this entry point too; it refuses before any socket opens, so it
 * needs no network either.
 */

let failures = 0;

function check(name: string, ok: boolean, detail = '') {
  if (!ok) failures++;
  console.log(`${ok ? 'OK  ' : 'BAD '} ${name}${ok || !detail ? '' : `\n     ${detail}`}`);
}

// Built at runtime, so no key-shaped literal sits in this public repo.
const PATH_KEY = 'a1b2c3d4'.repeat(4);
const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const CHECK_IDS: CheckId[] = ['access', 'network-identity', 'node-freshness', 'contract-bytecode', 'critical-read', 'fallback'];
const CRITICAL: Record<CheckId, boolean> = {
  access: true,
  'network-identity': true,
  'node-freshness': false,
  'contract-bytecode': true,
  'critical-read': true,
  fallback: false,
};

/** A production-shaped target: dedicated primary, public fallback, Base Mainnet, a critical read. */
const GOOD: DiagnoseTarget = {
  rpcUrl: `https://base-mainnet.g.alchemy.com/v2/${PATH_KEY}`,
  fallbackRpcUrl: 'https://base-rpc.publicnode.com',
  expectedChainId: 8453,
  contractAddress: USDC_BASE,
  criticalRead: { signature: 'symbol() returns (string)' },
};

/** A diagnosis where every check has the given outcome unless overridden. */
function diagnosis(target: DiagnoseTarget, overrides: Partial<Record<CheckId, CheckOutcome>> = {}): DiagnosisReport {
  const checks: CheckResult[] = CHECK_IDS.map((id) => ({
    id,
    title: id,
    outcome: overrides[id] ?? (id === 'fallback' && !target.fallbackRpcUrl ? 'NOT_TESTED' : 'PASS'),
    summary: `${id} summary`,
    durationMs: 1,
    critical: CRITICAL[id],
  }));
  return { status: 'READY', headline: '', target, checks, startedAt: new Date(0).toISOString(), durationMs: 1 };
}

function ruleOf(target: DiagnoseTarget, id: LaunchRuleId, overrides: Partial<Record<CheckId, CheckOutcome>> = {}) {
  const rule = evaluateLaunch(diagnosis(target, overrides)).rules.find((candidate) => candidate.id === id);
  if (!rule) throw new Error(`rule ${id} missing`);
  return rule;
}

console.log('--- the verdict ---');
{
  const verdict = evaluateLaunch(diagnosis(GOOD));
  check('a production-shaped config with every check passing is READY', verdict.status === 'READY', verdict.headline);
}
{
  const verdict = evaluateLaunch(diagnosis({ ...GOOD, rpcUrl: 'https://mainnet.base.org' }));
  check('the free diagnosis preset (public Base primary) is AT_RISK, not READY', verdict.status === 'AT_RISK');
}
{
  const verdict = evaluateLaunch(diagnosis(GOOD, { 'node-freshness': 'NOT_TESTED' }));
  check('a live check that did not run never yields READY', verdict.status === 'AT_RISK');
}
{
  const verdict = evaluateLaunch(diagnosis(GOOD, { 'network-identity': 'FAIL' }));
  check('a critical live check failing blocks the launch', verdict.status === 'BLOCKED');
  check('the headline names the observed breakage first', verdict.headline === 'network-identity summary', verdict.headline);
}
{
  const verdict = evaluateLaunch(diagnosis(GOOD, { 'node-freshness': 'WARN' }));
  check('a node over the strict age puts the launch at risk', verdict.status === 'AT_RISK');
}

console.log('\n--- mainnet ---');
check('a known mainnet passes', ruleOf(GOOD, 'mainnet').outcome === 'PASS');
check('Base Sepolia fails', ruleOf({ ...GOOD, expectedChainId: 84532 }, 'mainnet').outcome === 'FAIL');
check('Ethereum Sepolia fails', ruleOf({ ...GOOD, expectedChainId: 11155111 }, 'mainnet').outcome === 'FAIL');
check('a testnet blocks the launch', evaluateLaunch(diagnosis({ ...GOOD, expectedChainId: 84532 })).status === 'BLOCKED');
check('an unknown chain warns instead of guessing', ruleOf({ ...GOOD, expectedChainId: 424242 }, 'mainnet').outcome === 'WARN');

console.log('\n--- https ---');
check('https on both passes', ruleOf(GOOD, 'https').outcome === 'PASS');
check('a plain-http primary fails', ruleOf({ ...GOOD, rpcUrl: 'http://rpc.example.com' }, 'https').outcome === 'FAIL');
{
  const rule = ruleOf({ ...GOOD, fallbackRpcUrl: 'http://rpc.example.com' }, 'https');
  check('a plain-http fallback fails', rule.outcome === 'FAIL' && rule.summary.includes('fallback'), rule.summary);
}

console.log('\n--- fallback ---');
{
  const noFallback = { ...GOOD, fallbackRpcUrl: undefined };
  check('no fallback fails', ruleOf(noFallback, 'fallback-ready').outcome === 'FAIL');
  check('no fallback blocks the launch', evaluateLaunch(diagnosis(noFallback)).status === 'BLOCKED');
  check('provider independence is NOT_TESTED without a fallback', ruleOf(noFallback, 'fallback-independent').outcome === 'NOT_TESTED');
}
check('a fallback on the wrong chain fails', ruleOf(GOOD, 'fallback-ready', { fallback: 'FAIL' }).outcome === 'FAIL');
check('a fallback that does not answer fails', ruleOf(GOOD, 'fallback-ready', { fallback: 'WARN' }).outcome === 'FAIL');
check('a working fallback passes', ruleOf(GOOD, 'fallback-ready').outcome === 'PASS');
check('a fallback from another provider passes', ruleOf(GOOD, 'fallback-independent').outcome === 'PASS');
{
  const sameProvider = { ...GOOD, fallbackRpcUrl: `https://base-mainnet.g.alchemy.com/v2/${PATH_KEY}x` };
  check('a fallback from the same provider warns', ruleOf(sameProvider, 'fallback-independent').outcome === 'WARN');
}

console.log('\n--- dedicated primary ---');
{
  const rule = ruleOf({ ...GOOD, rpcUrl: 'https://mainnet.base.org' }, 'dedicated-primary');
  check('the public Base endpoint warns, never fails', rule.outcome === 'WARN');
  check('the Base note cites WebSockets', /WebSocket/.test(rule.action ?? ''));
  check('no rate limit is attributed to Base', !/rate.?limit/i.test(`${rule.summary} ${rule.action}`));
}
{
  const rule = ruleOf({ ...GOOD, rpcUrl: 'https://base-rpc.publicnode.com' }, 'dedicated-primary');
  check('PublicNode warns', rule.outcome === 'WARN');
  check('nothing about Base is claimed for another operator', !/Base/.test(rule.action ?? ''), rule.action);
}
check('a keyed provider passes', ruleOf(GOOD, 'dedicated-primary').outcome === 'PASS');
check('Ankr without a key is shared', sharedEndpoint('https://rpc.ankr.com/base') !== null);
check('Ankr with a key is dedicated', sharedEndpoint(`https://rpc.ankr.com/base/${PATH_KEY}`) === null);
check('dRPC without a key is shared', sharedEndpoint('https://base.drpc.org') !== null);
check('dRPC with a key is dedicated', sharedEndpoint(`https://lb.drpc.org/ogrpc?network=base&dkey=${PATH_KEY}`) === null);
check('an unknown host is never accused of being public', sharedEndpoint('https://rpc.example.com') === null);
check('a lookalike host is not matched', sharedEndpoint('https://mainnet.base.org.evil.example') === null);

console.log('\n--- critical path ---');
check('contract and read declared passes', ruleOf(GOOD, 'critical-path').outcome === 'PASS');
check('no contract fails', ruleOf({ ...GOOD, contractAddress: undefined }, 'critical-path').outcome === 'FAIL');
check('no critical read fails', ruleOf({ ...GOOD, criticalRead: undefined }, 'critical-path').outcome === 'FAIL');

console.log('\n--- strict freshness ---');
check('Base is held to 15 s', launchMaxBlockAge(GOOD) === 15);
check('Ethereum is held to three slots', launchMaxBlockAge({ ...GOOD, expectedChainId: 1 }) === 36);
check('an unknown chain keeps the free 60 s', launchMaxBlockAge({ ...GOOD, expectedChainId: 424242 }) === 60);
check('a tighter bound from the caller is kept', launchMaxBlockAge({ ...GOOD, maxBlockAgeSeconds: 5 }) === 5);
check('a looser bound from the caller is ignored', launchMaxBlockAge({ ...GOOD, maxBlockAgeSeconds: 600 }) === 15);

console.log('\n--- provider domains ---');
check('Alchemy subdomains are one provider',
  providerDomain('https://base-mainnet.g.alchemy.com/v2/x') === providerDomain('https://eth-mainnet.g.alchemy.com/v2/y'));
check('different providers differ', providerDomain('https://mainnet.base.org') !== providerDomain('https://base-rpc.publicnode.com'));

console.log('\n--- no leaks ---');
{
  const keyedFallback = `https://base-mainnet.infura.io/v3/${PATH_KEY}`;
  const cases = [
    evaluateLaunch(diagnosis(GOOD)),
    evaluateLaunch(diagnosis({ ...GOOD, fallbackRpcUrl: keyedFallback }, { fallback: 'WARN' })),
    evaluateLaunch(diagnosis({ ...GOOD, fallbackRpcUrl: keyedFallback, rpcUrl: `https://base-mainnet.infura.io/v3/${PATH_KEY}0` })),
    evaluateLaunch(diagnosis({ ...GOOD, rpcUrl: `http://rpc.ankr.com/base/${PATH_KEY}` })),
  ];
  const leaked = cases.some((verdict) => JSON.stringify(verdict.rules).includes(PATH_KEY));
  check('no rule ever repeats the path or query of an RPC URL', !leaked);
}

console.log('\n--- the SSRF guard still applies (a paying user is still an untrusted caller) ---');
{
  const report = await runLaunchCheck({
    rpcUrl: 'http://169.254.169.254/latest/meta-data',
    fallbackRpcUrl: 'http://127.0.0.1:8545',
    expectedChainId: 8453,
  });
  const kindOf = (id: CheckId) => report.diagnosis.checks.find((c) => c.id === id)?.observed?.failureKind;
  check('cloud metadata as the primary is refused before connecting', kindOf('access') === 'blocked', String(kindOf('access')));
  check('loopback as the fallback is never reported as working', ruleOutcome(report, 'fallback-ready') === 'FAIL');
  check('a refused configuration is BLOCKED', report.status === 'BLOCKED');
}

function ruleOutcome(report: { rules: { id: string; outcome: string }[] }, id: LaunchRuleId) {
  return report.rules.find((rule) => rule.id === id)?.outcome;
}

console.log(`\n=== ${failures === 0 ? 'all launch checks passed' : `${failures} launch check(s) FAILED`} ===`);
process.exit(failures > 0 ? 1 : 0);
