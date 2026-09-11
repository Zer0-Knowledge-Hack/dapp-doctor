import { describeChain } from '@/lib/diagnostics/networks';
import type { LaunchReport as LaunchReportData } from '@/lib/launch/run';
import { CheckRows, formatWhen, VerdictSheet } from './Report';

/**
 * A Launch Check as a chart: one verdict for the launch, then the launch
 * rules, then the six checks that fed it. The same sheet and rows as a
 * diagnosis, so the two reports read as one family.
 */
export function LaunchReport({ report }: { report: LaunchReportData }): React.ReactElement {
  const { diagnosis } = report;
  const maxAge = diagnosis.target.maxBlockAgeSeconds;

  return (
    <section aria-labelledby="result-heading" className="mt-12 sm:mt-16">
      <VerdictSheet
        status={report.status}
        headline={report.headline}
        details={`${formatWhen(report.startedAt)}. Launching on ${describeChain(diagnosis.target.expectedChainId)}. ${report.rules.length} launch rules and ${diagnosis.checks.length} checks in ${report.durationMs} ms.`}
      />

      <h2 className="mt-14 font-display text-3xl leading-none font-black sm:text-4xl">Launch rules</h2>
      <p className="mt-3 max-w-[65ch] text-sm text-muted">What a configuration needs before real users reach it.</p>
      <CheckRows items={report.rules} />

      <h2 className="mt-14 font-display text-3xl leading-none font-black sm:text-4xl">The six checks, at launch strictness</h2>
      <p className="mt-3 max-w-[65ch] text-sm text-muted">
        The free diagnosis, run live against your RPCs{maxAge ? `, with blocks no older than ${maxAge} s` : ''}.
      </p>
      <CheckRows items={diagnosis.checks} />
    </section>
  );
}
