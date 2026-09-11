import { aggregateStatus } from '../diagnostics/engine';
import { describeChain, KNOWN_NETWORKS } from '../diagnostics/networks';
import type { CheckOutcome, CheckResult, DiagnoseTarget, DiagnosisReport, OverallStatus } from '../diagnostics/types';
import { hostOf, providerDomain, sharedEndpoint } from './endpoints';

/**
 * Launch Check: the stricter bar a configuration has to clear before real
 * users reach it on mainnet.
 *
 * It does not replace the six checks, it runs them (at launch strictness) and
 * adds rules about the configuration itself. The same invariants hold:
 *
 * - The verdict comes from a fixed rule table. Nothing here is guessed.
 * - A rule that cannot be evaluated is NOT_TESTED, and NOT_TESTED is risk.
 * - A rule is decided either by what was declared (the URLs, the chain ID) or
 *   by a live check that actually ran. Never by assuming one from the other.
 */

export type LaunchRuleId =
  | 'https'
  | 'mainnet'
  | 'fallback-ready'
  | 'fallback-independent'
  | 'dedicated-primary'
  | 'critical-path';

export interface LaunchRule {
  id: LaunchRuleId;
  title: string;
  outcome: CheckOutcome;
  /** What was found. Hostnames at most: never a path or query, where API keys live. */
  summary: string;
  /** What to do about it. Empty when the outcome is PASS. */
  action?: string;
  /** A critical rule in FAIL blocks the launch; any other finding puts it at risk. */
  critical: boolean;
}

export interface LaunchVerdict {
  status: OverallStatus;
  headline: string;
  rules: LaunchRule[];
}

/**
 * Block age tolerated at launch, in seconds. Tighter than the free
 * diagnosis's 60 s, but scaled to each chain's block time so a healthy node is
 * never flagged: about seven Base blocks (~2 s each), or three Ethereum slots
 * (12 s each). A chain we do not know keeps the free diagnosis's 60 s, since
 * we cannot justify anything stricter for it.
 */
const STRICT_MAX_BLOCK_AGE_SECONDS: Record<number, number> = {
  8453: 15,
  84532: 15,
  1: 36,
  11155111: 36,
};
const UNKNOWN_CHAIN_MAX_BLOCK_AGE_SECONDS = 60;

export function launchMaxBlockAge(target: DiagnoseTarget): number {
  const strict = STRICT_MAX_BLOCK_AGE_SECONDS[target.expectedChainId] ?? UNKNOWN_CHAIN_MAX_BLOCK_AGE_SECONDS;
  // A caller asking for an even tighter bound gets it; a looser one does not.
  return target.maxBlockAgeSeconds ? Math.min(target.maxBlockAgeSeconds, strict) : strict;
}

function isHttps(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

function httpsRule(target: DiagnoseTarget): LaunchRule {
  const plain = [
    ...(isHttps(target.rpcUrl) ? [] : ['primary']),
    ...(target.fallbackRpcUrl && !isHttps(target.fallbackRpcUrl) ? ['fallback'] : []),
  ];
  if (plain.length > 0) {
    return {
      id: 'https',
      title: 'HTTPS on every RPC',
      outcome: 'FAIL',
      summary: `The ${plain.join(' and ')} RPC ${plain.length > 1 ? 'use' : 'uses'} plain HTTP.`,
      action:
        'Serve every RPC over HTTPS. Over plain HTTP, anyone on the network path can read or alter the ' +
        'responses your app trusts.',
      critical: true,
    };
  }
  return {
    id: 'https',
    title: 'HTTPS on every RPC',
    outcome: 'PASS',
    summary: target.fallbackRpcUrl ? 'Both RPCs use HTTPS.' : 'The primary RPC uses HTTPS.',
    critical: true,
  };
}

function mainnetRule(target: DiagnoseTarget): LaunchRule {
  const known = KNOWN_NETWORKS[target.expectedChainId];
  if (!known) {
    return {
      id: 'mainnet',
      title: 'Launching on a mainnet',
      outcome: 'WARN',
      summary: `DApp Doctor does not know chain ID ${target.expectedChainId}, so it cannot confirm it is a mainnet.`,
      action: `Confirm in the chain's own documentation that ${target.expectedChainId} is its production network.`,
      critical: true,
    };
  }
  if (known.testnet) {
    return {
      id: 'mainnet',
      title: 'Launching on a mainnet',
      outcome: 'FAIL',
      summary: `The app expects ${known.name}, which is a testnet.`,
      action: 'Set the expected chain ID to the mainnet you are launching on, and point both RPCs at it.',
      critical: true,
    };
  }
  return {
    id: 'mainnet',
    title: 'Launching on a mainnet',
    outcome: 'PASS',
    summary: `The app expects ${known.name}.`,
    critical: true,
  };
}

/**
 * The free diagnosis treats a missing or broken fallback as a risk. At launch
 * it blocks: one provider outage would otherwise be a full outage, and a
 * fallback on the wrong chain turns that outage into silently wrong data.
 * The verdict on a declared fallback comes from the live fallback check.
 */
function fallbackReadyRule(target: DiagnoseTarget, checks: CheckResult[]): LaunchRule {
  const base = { id: 'fallback-ready' as const, title: 'Working fallback RPC', critical: true };

  if (!target.fallbackRpcUrl) {
    return {
      ...base,
      outcome: 'FAIL',
      summary: 'No fallback RPC is configured.',
      action:
        'Add a second RPC your app switches to when the primary fails. At launch, one provider outage is ' +
        'otherwise a full outage.',
    };
  }

  const live = checks.find((check) => check.id === 'fallback');
  switch (live?.outcome) {
    case 'PASS':
      return { ...base, outcome: 'PASS', summary: `The fallback (${hostOf(target.fallbackRpcUrl)}) answers on the expected network.` };
    case 'FAIL':
      return {
        ...base,
        outcome: 'FAIL',
        summary: 'The fallback answers a different network than the app expects.',
        action: 'Point the fallback at the same network as the primary. See the Fallback RPC check below.',
      };
    case 'WARN':
      return {
        ...base,
        outcome: 'FAIL',
        summary: 'The fallback RPC did not answer, so it would not take over if the primary failed.',
        action: 'Fix or replace the fallback. See the Fallback RPC check below for what it returned.',
      };
    default:
      return { ...base, outcome: 'NOT_TESTED', summary: 'Did not run: the fallback check did not execute.' };
  }
}

function fallbackIndependentRule(target: DiagnoseTarget): LaunchRule {
  const base = { id: 'fallback-independent' as const, title: 'Fallback from another provider', critical: false };

  if (!target.fallbackRpcUrl) {
    return { ...base, outcome: 'NOT_TESTED', summary: 'Did not run: no fallback RPC is configured.' };
  }

  const primary = providerDomain(target.rpcUrl);
  const fallback = providerDomain(target.fallbackRpcUrl);

  if (primary && primary === fallback) {
    return {
      ...base,
      outcome: 'WARN',
      summary: `Both RPCs are served by ${primary}. An outage at that provider takes down both.`,
      action: 'Use a fallback from a different provider than the primary.',
    };
  }
  return { ...base, outcome: 'PASS', summary: `The primary and the fallback come from different providers (${primary}, ${fallback}).` };
}

/**
 * A known shared endpoint as the primary is a warning, not a block: nothing
 * says it cannot serve production. The Base-specific note is what Base's
 * documentation states about its public endpoints, and nothing more: it does
 * not claim a rate limit, so neither do we. Source, checked 11 September 2026:
 * https://docs.base.org/base-chain/api-reference/ethereum-json-rpc-api/eth_subscribe
 */
function dedicatedPrimaryRule(target: DiagnoseTarget): LaunchRule {
  const base = { id: 'dedicated-primary' as const, title: 'Dedicated primary RPC', critical: false };
  const shared = sharedEndpoint(target.rpcUrl);

  if (!shared) {
    return { ...base, outcome: 'PASS', summary: 'The primary RPC is not one of the shared public endpoints DApp Doctor knows.' };
  }

  const why = shared.isBasePublic
    ? "Base's documentation states that its public endpoints are HTTP only, with no WebSocket connections " +
      '(so no eth_subscribe), and points to the Base Services Hub for a WebSocket-capable provider.'
    : 'You have no account with its operator, so its capacity and availability are outside your control.';

  return {
    ...base,
    outcome: 'WARN',
    summary: `The primary RPC is ${shared.label} (${hostOf(target.rpcUrl)}), a free endpoint shared by everyone who uses it.`,
    action: `${why} Move the primary to a provider account you control; a public endpoint can still serve as the fallback.`,
  };
}

function criticalPathRule(target: DiagnoseTarget): LaunchRule {
  const base = { id: 'critical-path' as const, title: 'Critical path declared', critical: true };
  const missing = [
    ...(target.contractAddress ? [] : ['contract address']),
    ...(target.criticalRead ? [] : ['critical read']),
  ];

  if (missing.length > 0) {
    return {
      ...base,
      outcome: 'FAIL',
      summary: `No ${missing.join(' or ')} was declared, so nothing proves your app can read what it needs.`,
      action:
        'Declare the contract your app depends on and the zero-argument read it cannot work without, ' +
        'for example: symbol() returns (string).',
    };
  }
  return {
    ...base,
    outcome: 'PASS',
    summary: 'A contract and the read your app depends on are declared, so the live checks exercise them.',
  };
}

/** The rules, in reading order. Pure: the live checks have already run. */
export function evaluateLaunch(diagnosis: DiagnosisReport): LaunchVerdict {
  const { target, checks } = diagnosis;
  const rules = [
    mainnetRule(target),
    httpsRule(target),
    fallbackReadyRule(target, checks),
    fallbackIndependentRule(target),
    dedicatedPrimaryRule(target),
    criticalPathRule(target),
  ];

  const status = aggregateStatus([...rules, ...checks]);
  return { status, headline: headlineFor(status, rules, checks, target), rules };
}

/**
 * Names one cause. Breakage the live checks observed comes first: a node on
 * the wrong chain matters more than how the configuration is written.
 */
function headlineFor(status: OverallStatus, rules: LaunchRule[], checks: CheckResult[], target: DiagnoseTarget): string {
  const findings = [...checks, ...rules];
  switch (status) {
    case 'READY':
      return `Ready to launch on ${describeChain(target.expectedChainId)}: every launch rule and all six checks passed.`;
    case 'BLOCKED':
      return findings.find((item) => item.critical && item.outcome === 'FAIL')?.summary ?? 'A launch rule is failing.';
    case 'AT_RISK': {
      const first = findings.find((item) => item.outcome === 'WARN' || item.outcome === 'FAIL');
      if (first) return first.summary;
      const untested = findings.filter((item) => item.outcome === 'NOT_TESTED').length;
      return `Nothing failed, but ${untested} check(s) could not be executed.`;
    }
    case 'NOT_TESTED':
      return 'No launch rule could be evaluated.';
  }
}
