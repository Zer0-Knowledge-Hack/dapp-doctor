'use client';

import Link from 'next/link';
import { OutcomeLabel } from '@/components/app/OutcomeLabel';
import { Sheet } from '@/components/ui/Sheet';
import type { DashboardEvent } from '@/lib/dashboard/types';
import { describeChain } from '@/lib/diagnostics/networks';
import type { Lang } from '@/lib/i18n/lang';
import { formatRelative } from '@/lib/time/relative';

/** Diagnoses kept in this browser. Not Pro history, not invented figures. */
export function DeviceHistoryList({
  events,
  title,
  openLabel,
  lang,
}: {
  events: DashboardEvent[];
  title: string;
  openLabel: string;
  lang: Lang;
}): React.ReactElement | null {
  if (events.length === 0) return null;
  return (
    <Sheet className="mt-5 px-4 py-4 sm:px-6">
      <h2 className="font-display text-[clamp(1.05rem,2vw,1.3rem)] font-black">{title}</h2>
      <ul className="mt-3">
        {events.slice(0, 8).map((event) => (
          <li key={event.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-ink/15 py-2.5 text-sm last:border-b-0">
            <span className="text-muted" title={event.recordedAt}>{formatRelative(event.recordedAt, lang)}</span>
            <span>{describeChain(event.expectedChainId)}</span>
            <OutcomeLabel outcome={event.status} />
            <Link
              href={`/dashboard?id=${encodeURIComponent(event.id)}`}
              prefetch={false}
              className="ml-auto font-semibold text-pen underline underline-offset-4"
            >
              {openLabel}
            </Link>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
