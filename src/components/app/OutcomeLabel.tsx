'use client';

import { useLang } from '@/components/i18n/LanguageProvider';
import type { CheckOutcome, OverallStatus } from '@/lib/diagnostics/types';
import { OUTCOME_LABELS, STATUS_LABELS } from '@/lib/i18n/engineText';

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
  const lang = useLang();
  const label = outcome in OUTCOME_LABELS[lang] ? OUTCOME_LABELS[lang][outcome as CheckOutcome] : STATUS_LABELS[lang][outcome as OverallStatus];
  return (
    <span className={`inline-block shrink-0 border-l-[3px] pl-1.5 text-sm font-semibold whitespace-nowrap ${BAR[outcome]}`}>
      {label}
    </span>
  );
}
