import { checkAccess } from './checks/access';
import { checkNetworkIdentity } from './checks/network';
import { checkNodeFreshness } from './checks/freshness';
import { checkContractBytecode } from './checks/bytecode';
import { checkCriticalRead } from './checks/criticalRead';
import { checkFallback } from './checks/fallback';
import { notTested } from './checks/helpers';
import type { CheckResult, DiagnoseTarget, DiagnosisReport, OverallStatus } from './types';

/**
 * Runs the full diagnosis.
 *
 * Two rules govern the order:
 *
 * 1. If the RPC does not answer, the checks that depend on it are marked
 *    NOT_TESTED. We never infer a result we could not observe.
 * 2. A wrong network identity does NOT stop the following checks. Running
 *    them anyway is what produces the evidence of the failure: the contract
 *    is missing because it is being looked for on the wrong network.
 */
export async function runDiagnosis(target: DiagnoseTarget): Promise<DiagnosisReport> {
  const startedAt = new Date();
  const started = Date.now();
  const checks: CheckResult[] = [];

  const access = await checkAccess(target);
  checks.push(access);

  const rpcIsReachable = access.outcome === 'PASS';
  const noReach = 'Did not run: the primary RPC does not answer.';

  if (!rpcIsReachable) {
    checks.push(notTested('network-identity', 'Network identity', noReach, true));
    checks.push(notTested('node-freshness', 'Node freshness', noReach, false));
    checks.push(notTested('contract-bytecode', 'Contract bytecode', noReach, true));
    checks.push(notTested('critical-read', 'Critical read', noReach, true));
  } else {
    const network = await checkNetworkIdentity(target);
    checks.push(network);
    checks.push(await checkNodeFreshness(target));
    // Observed, not assumed: the chain the RPC reported, when it reported one.
    const answeredChainId =
      typeof network.observed?.actualChainId === 'number' ? network.observed.actualChainId : undefined;

    if (!target.contractAddress) {
      const reason = 'Did not run: no contract address was provided.';
      checks.push(notTested('contract-bytecode', 'Contract bytecode', reason, true));
      checks.push(notTested('critical-read', 'Critical read', reason, true));
    } else {
      const bytecode = await checkContractBytecode(target, answeredChainId);
      checks.push(bytecode);

      if (!target.criticalRead) {
        checks.push(
          notTested('critical-read', 'Critical read', 'Did not run: no critical read was provided.', true),
        );
      } else if (bytecode.outcome !== 'PASS') {
        checks.push(
          notTested('critical-read', 'Critical read', 'Did not run: there is no contract at that address.', true),
        );
      } else {
        checks.push(await checkCriticalRead(target));
      }
    }
  }

  // The fallback uses a different URL, so it is tested even when the primary
  // is down: that is precisely when knowing whether the backup works matters.
  if (target.fallbackRpcUrl) {
    checks.push(await checkFallback(target));
  } else {
    checks.push(
      notTested('fallback', 'Fallback RPC', 'Did not run: no fallback RPC was configured.', false),
    );
  }

  const status = aggregateStatus(checks);

  return {
    status,
    headline: buildHeadline(status, checks),
    target,
    checks,
    startedAt: startedAt.toISOString(),
    durationMs: Date.now() - started,
  };
}

/**
 * Aggregated status.
 *
 * NOT_TESTED counts as risk, never as passing: not having tested something
 * is never evidence that it works.
 */
export function aggregateStatus(checks: ReadonlyArray<Pick<CheckResult, 'outcome' | 'critical'>>): OverallStatus {
  if (checks.every((check) => check.outcome === 'NOT_TESTED')) return 'NOT_TESTED';
  if (checks.some((check) => check.critical && check.outcome === 'FAIL')) return 'BLOCKED';
  if (checks.some((check) => check.outcome !== 'PASS')) return 'AT_RISK';
  return 'READY';
}

/** Report headline: names the root cause, not the list of symptoms. */
function buildHeadline(status: OverallStatus, checks: CheckResult[]): string {
  switch (status) {
    case 'READY':
      return 'All six checks passed. The configuration points at the right network and the contract answers.';
    case 'BLOCKED': {
      const rootCause = checks.find((check) => check.critical && check.outcome === 'FAIL');
      return rootCause ? rootCause.summary : 'A critical check is failing.';
    }
    case 'AT_RISK': {
      const first = checks.find((check) => check.outcome === 'WARN' || check.outcome === 'FAIL');
      if (first) return first.summary;
      const untested = checks.filter((check) => check.outcome === 'NOT_TESTED').length;
      return `The critical path answers, but ${untested} check(s) could not be executed.`;
    }
    case 'NOT_TESTED':
      return 'No check was executed.';
  }
}
