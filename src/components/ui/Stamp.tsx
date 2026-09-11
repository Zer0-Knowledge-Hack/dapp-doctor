import type { OverallStatus } from '@/lib/diagnostics/types';
import { statusLabels } from '@/components/landing/content';

const colors: Record<OverallStatus, string> = {
  READY: 'text-triage-green',
  AT_RISK: 'text-triage-amber',
  BLOCKED: 'text-triage-red',
  NOT_TESTED: 'text-muted',
};

export function Stamp({ status, size = 'md' }: {
  status: OverallStatus;
  size?: 'md' | 'lg';
}): React.ReactElement {
  return (
    <span
      className={`stamp inline-block shrink-0 whitespace-nowrap border-4 border-current px-[0.4em] py-[0.12em] font-stamp leading-none font-black ${colors[status]} ${size === 'lg' ? 'text-[clamp(2.5rem,5vw,4rem)]' : 'text-[1.75rem] sm:text-[2.25rem]'}`}
      style={{ animationTimeline: 'view()', animationRange: 'entry 0% entry 80%' }}
    >
      {/* Black lettering keeps every verdict legible on paper, including amber. */}
      <span className="text-ink">{statusLabels[status]}</span>
    </span>
  );
}
