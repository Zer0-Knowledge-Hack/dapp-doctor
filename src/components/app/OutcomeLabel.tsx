import type { CheckOutcome, OverallStatus } from '@/lib/diagnostics/types';

/**
 * A check outcome or verdict as the landing's comparison table shows it: black
 * text with a triage-coloured bar, so it stays legible and never depends on
 * colour alone.
 */
const BAR: Record<CheckOutcome | OverallStatus, string> = {
  PASS: 'border-triage-green',
  READY: 'border-triage-green',
  WARN: 'border-triage-amber',
  AT_RISK: 'border-triage-amber',
  FAIL: 'border-triage-red',
  BLOCKED: 'border-triage-red',
  NOT_TESTED: 'border-muted',
};

export function OutcomeLabel({ outcome }: { outcome: CheckOutcome | OverallStatus }): React.ReactElement {
  return (
    <span className={`inline-block shrink-0 border-l-[3px] pl-1.5 text-sm font-semibold whitespace-nowrap ${BAR[outcome]}`}>
      {outcome.replace('_', ' ')}
    </span>
  );
}
