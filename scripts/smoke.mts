import { runDiagnosis } from '../src/lib/diagnostics/engine';
import type { DiagnoseTarget } from '../src/lib/diagnostics/types';

const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const USDC_BASE_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

const scenarios: Array<{
  name: string;
  expect: string;
  target: DiagnoseTarget;
  /** Wording a check's summary must carry: the report has to name what it observed. */
  says?: { check: string; text: string };
}> = [
  {
    name: 'A. Correct network, no contract declared',
    expect: 'AT_RISK',
    target: { rpcUrl: 'https://sepolia.base.org', expectedChainId: 84532 },
  },
  {
    name: 'B. DEMO BUG: app on Base Mainnet, expecting Base Sepolia',
    expect: 'BLOCKED',
    target: {
      rpcUrl: 'https://mainnet.base.org',
      expectedChainId: 84532,
      contractAddress: USDC_BASE,
      criticalRead: { signature: 'symbol() returns (string)' },
    },
  },
  {
    name: 'C. Everything correct against a real contract (USDC on Base)',
    expect: 'READY',
    target: {
      rpcUrl: 'https://mainnet.base.org',
      fallbackRpcUrl: 'https://base-rpc.publicnode.com',
      expectedChainId: 8453,
      contractAddress: USDC_BASE,
      criticalRead: { signature: 'symbol() returns (string)' },
    },
  },
  {
    name: 'D. RPC that does not exist',
    expect: 'BLOCKED',
    target: { rpcUrl: 'https://this-rpc-does-not-exist.invalid', expectedChainId: 84532 },
  },
  {
    name: 'E. Address with no contract on that network',
    expect: 'BLOCKED',
    target: {
      rpcUrl: 'https://sepolia.base.org',
      expectedChainId: 84532,
      contractAddress: USDC_BASE,
      criticalRead: { signature: 'symbol() returns (string)' },
    },
  },
  {
    name: 'F. A Sepolia contract looked up through a Mainnet RPC',
    expect: 'BLOCKED',
    target: {
      rpcUrl: 'https://mainnet.base.org',
      expectedChainId: 84532,
      contractAddress: USDC_BASE_SEPOLIA,
    },
    // The code was read on Mainnet, so that is the network the report must name.
    says: { check: 'contract-bytecode', text: 'on Base Mainnet' },
  },
];

let failures = 0;

for (const scenario of scenarios) {
  const report = await runDiagnosis(scenario.target);
  const said = scenario.says
    ? report.checks.find((check) => check.id === scenario.says?.check)?.summary.includes(scenario.says.text) ?? false
    : true;
  const ok = report.status === scenario.expect && said;
  if (!ok) failures++;
  console.log(`\n${ok ? 'OK  ' : 'BAD '} ${scenario.name}`);
  console.log(`     expected=${scenario.expect} got=${report.status} (${report.durationMs} ms)`);
  if (!said) console.log(`     the ${scenario.says?.check} summary should say "${scenario.says?.text}"`);
  console.log(`     > ${report.headline}`);
  for (const check of report.checks) {
    console.log(`       [${check.outcome.padEnd(10)}] ${check.title}: ${check.summary}`);
  }
}

console.log(`\n=== ${scenarios.length - failures}/${scenarios.length} scenarios as expected ===`);
process.exit(failures > 0 ? 1 : 0);
