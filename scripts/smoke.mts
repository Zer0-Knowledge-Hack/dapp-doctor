import { runDiagnosis } from '../src/lib/diagnostics/engine';
import type { DiagnoseTarget } from '../src/lib/diagnostics/types';

const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

const scenarios: Array<{ name: string; expect: string; target: DiagnoseTarget }> = [
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
];

let failures = 0;

for (const scenario of scenarios) {
  const report = await runDiagnosis(scenario.target);
  const ok = report.status === scenario.expect;
  if (!ok) failures++;
  console.log(`\n${ok ? 'OK  ' : 'BAD '} ${scenario.name}`);
  console.log(`     expected=${scenario.expect} got=${report.status} (${report.durationMs} ms)`);
  console.log(`     > ${report.headline}`);
  for (const check of report.checks) {
    console.log(`       [${check.outcome.padEnd(10)}] ${check.title}: ${check.summary}`);
  }
}

console.log(`\n=== ${scenarios.length - failures}/${scenarios.length} scenarios as expected ===`);
process.exit(failures > 0 ? 1 : 0);
