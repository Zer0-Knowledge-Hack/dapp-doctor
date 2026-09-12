'use client';

import { useLang } from '@/components/i18n/LanguageProvider';
import type { OverallStatus } from '@/lib/diagnostics/types';
import { STATUS_LABELS } from '@/lib/i18n/engineText';

const colors: Record<OverallStatus, string> = {
  READY: 'text-triage-green',
  AT_RISK: 'text-triage-amber',
  BLOCKED: 'text-triage-red',
  NOT_TESTED: 'text-muted',
};

export function Stamp({ status, size = 'md', label }: {
  status: OverallStatus;
  size?: 'md' | 'lg';
  /** Different wording for the same triage colour, e.g. the heartbeat monitor's FLATLINE. */
  label?: string;
}): React.ReactElement {
  const lang = useLang();
  const text = label ?? STATUS_LABELS[lang][status];
  // A stamp never wraps, so a long word (the Spanish BLOQUEADO, EN RIESGO)
  // takes a slightly smaller size to stay inside its column. Short words keep
  // the original sizes.
  const long = text.length > 8;
  const sizes =
    size === 'lg'
      ? long ? 'text-[clamp(2rem,3.8vw,3.25rem)]' : 'text-[clamp(2.5rem,5vw,4rem)]'
      : long ? 'text-[1.5rem] sm:text-[1.85rem]' : 'text-[1.75rem] sm:text-[2.25rem]';
  return (
    <span
      className={`stamp inline-block shrink-0 whitespace-nowrap border-4 border-current px-[0.4em] py-[0.12em] font-stamp leading-none font-black ${colors[status]} ${sizes}`}
      style={{ animationTimeline: 'view()', animationRange: 'entry 0% entry 80%' }}
    >
      {/* Black lettering keeps every verdict legible on paper, including amber. */}
      <span className="text-ink">{text}</span>
    </span>
  );
}
