import type { CheckId, CheckOutcome, DiagnosisReport, OverallStatus } from './types';

/**
 * Before/after comparison.
 *
 * The product value is not detecting the failure: it is proving the fix
 * resolved it. A single report proves nothing; two reports of the same
 * target, before and after the change, do.
 */

export type ChangeKind =
  /** Was failing and now passes. */
  | 'FIXED'
  /** Was passing and now is not. The most important thing to surface. */
  | 'REGRESSED'
  /** Changed outcome without reaching PASS or coming from PASS. */
  | 'CHANGED'
  /** Same outcome in both runs. */
  | 'UNCHANGED';

export interface CheckDelta {
  id: CheckId;
  title: string;
  before: CheckOutcome;
  after: CheckOutcome;
  change: ChangeKind;
  /** What is observed now. This is the text that matters when something changed. */
  afterSummary: string;
  beforeSummary: string;
}

export interface Comparison {
  before: DiagnosisReport;
  after: DiagnosisReport;
  statusBefore: OverallStatus;
  statusAfter: OverallStatus;
  deltas: CheckDelta[];
  fixed: number;
  regressed: number;
  /** One line summarising whether the fix worked. */
  verdict: string;
}

function classify(before: CheckOutcome, after: CheckOutcome): ChangeKind {
  if (before === after) return 'UNCHANGED';
  if (after === 'PASS') return 'FIXED';
  if (before === 'PASS') return 'REGRESSED';
  return 'CHANGED';
}

export function compareReports(before: DiagnosisReport, after: DiagnosisReport): Comparison {
  // Indexed by id and not by position: the engine always emits all six
  // checks, but relying on ordering would make the comparison brittle.
  const beforeById = new Map(before.checks.map((check) => [check.id, check]));

  const deltas: CheckDelta[] = after.checks.map((afterCheck) => {
    const beforeCheck = beforeById.get(afterCheck.id);
    const beforeOutcome: CheckOutcome = beforeCheck?.outcome ?? 'NOT_TESTED';
    return {
      id: afterCheck.id,
      title: afterCheck.title,
      before: beforeOutcome,
      after: afterCheck.outcome,
      change: classify(beforeOutcome, afterCheck.outcome),
      beforeSummary: beforeCheck?.summary ?? 'Did not run in the previous pass.',
      afterSummary: afterCheck.summary,
    };
  });

  const fixed = deltas.filter((delta) => delta.change === 'FIXED').length;
  const regressed = deltas.filter((delta) => delta.change === 'REGRESSED').length;

  return {
    before,
    after,
    statusBefore: before.status,
    statusAfter: after.status,
    deltas,
    fixed,
    regressed,
    verdict: buildVerdict(before.status, after.status, fixed, regressed),
  };
}

/**
 * The verdict names the regression first when there is one: having fixed
 * four things does not make up for breaking one that used to work.
 */
function buildVerdict(
  statusBefore: OverallStatus,
  statusAfter: OverallStatus,
  fixed: number,
  regressed: number,
): string {
  if (regressed > 0) {
    return `The fix resolved ${fixed} check(s) but broke ${regressed} that used to pass.`;
  }
  if (fixed === 0) {
    return statusBefore === statusAfter
      ? 'Nothing changed between the two runs.'
      : `The status went from ${statusBefore} to ${statusAfter} without any individual check being resolved.`;
  }
  if (statusAfter === 'READY') {
    return `The fix resolved ${fixed} check(s). The target is now READY.`;
  }
  return `The fix resolved ${fixed} check(s), but the target is still ${statusAfter}.`;
}
