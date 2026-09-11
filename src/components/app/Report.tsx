import { Ecg } from '@/components/ecg/Ecg';
import { landing } from '@/components/landing/content';
import { Sheet } from '@/components/ui/Sheet';
import { Stamp } from '@/components/ui/Stamp';
import { describeChain } from '@/lib/diagnostics/networks';
import type { CheckOutcome, DiagnosisReport, OverallStatus } from '@/lib/diagnostics/types';
import { OutcomeLabel } from './OutcomeLabel';

/**
 * A diagnosis as a clinical chart: the verdict stamped on a sheet with the
 * heartbeat of the result, then one ruled row per check in the order they ran.
 * The stamp and the strip carry the bold moment; the rows stay quiet.
 */
export function Report({ report }: { report: DiagnosisReport }): React.ReactElement {
  return (
    <section aria-labelledby="result-heading" className="mt-12 sm:mt-16">
      <VerdictSheet
        status={report.status}
        headline={report.headline}
        details={`${formatWhen(report.startedAt)}. Expects ${describeChain(report.target.expectedChainId)}. ${report.checks.length} checks in ${report.durationMs} ms.`}
      />
      <CheckRows items={report.checks} />
    </section>
  );
}

/** English, like the rest of the interface: the browser's own locale would mix another language's date format in. */
export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' });
}

/** The verdict: headline, stamp and heartbeat. Its heading is where a new result scrolls to. */
export function VerdictSheet({ status, headline, details }: {
  status: OverallStatus;
  headline: string;
  details: string;
}): React.ReactElement {
  return (
    <Sheet className="px-5 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-5">
        <div className="min-w-0 max-w-[40ch]">
          <h2
            id="result-heading"
            tabIndex={-1}
            className="font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.02] font-black text-balance outline-none"
          >
            {headline}
          </h2>
          <p className="mt-3 text-sm text-muted">{details}</p>
        </div>
        <Stamp status={status} size="lg" />
      </div>
      <Ecg
        rhythm={status}
        motion={status === 'READY' ? landing.motion : undefined}
        className="mt-6 h-20 w-full text-ink sm:h-24"
      />
    </Sheet>
  );
}

export interface CheckRow {
  id: string;
  title: string;
  outcome: CheckOutcome;
  summary: string;
  action?: string;
  observed?: Record<string, unknown>;
}

/** One ruled, numbered row per finding, with what to do and the raw observation. */
export function CheckRows({ items }: { items: CheckRow[] }): React.ReactElement {
  return (
    <ol className="mt-10 border-t-2 border-ink">
      {items.map((check, index) => (
        <li key={check.id} className="grid grid-cols-[2.5rem_1fr] gap-x-3 border-b border-ink py-6 sm:grid-cols-[3rem_1fr] sm:gap-x-6">
          <span aria-hidden="true" className="font-display text-3xl leading-none font-bold">
            {String(index + 1).padStart(2, '0')}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="text-lg leading-snug font-bold">{check.title}</h3>
              <OutcomeLabel outcome={check.outcome} />
            </div>
            <p className="mt-2 max-w-[70ch] break-words">{check.summary}</p>
            {check.action && (
              <p className="mt-3 max-w-[70ch] border-l-[3px] border-pen pl-3 text-pen">
                <span className="font-semibold">What to do: </span>
                {check.action}
              </p>
            )}
            {check.observed && (
              <details className="mt-3 text-sm">
                <summary className="w-fit cursor-pointer text-muted underline underline-offset-4">Observed data</summary>
                <pre className="mt-2 overflow-x-auto border border-ink bg-sheet p-3 font-mono text-xs leading-relaxed">
                  {JSON.stringify(check.observed, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
