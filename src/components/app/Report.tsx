'use client';

import { Ecg } from '@/components/ecg/Ecg';
import { useEngineText, useLang } from '@/components/i18n/LanguageProvider';
import { useLanding } from '@/components/landing/useLanding';
import { LOCALE, type Lang } from '@/lib/i18n/lang';
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
  const lang = useLang();
  const when = formatWhen(report.startedAt, lang);
  const chain = describeChain(report.target.expectedChainId);
  const details =
    lang === 'es'
      ? `${when}. Espera ${chain}. ${report.checks.length} chequeos en ${report.durationMs} ms.`
      : `${when}. Expects ${chain}. ${report.checks.length} checks in ${report.durationMs} ms.`;
  return (
    <section aria-labelledby="result-heading" className="mt-6">
      <VerdictSheet status={report.status} headline={report.headline} details={details} />
      <CheckRows items={report.checks} />
    </section>
  );
}

/** In the page's language, never the browser's: that would mix another language's date format in. */
export function formatWhen(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleString(LOCALE[lang], { dateStyle: 'medium', timeStyle: 'short' });
}

/** The verdict: headline, stamp and heartbeat. Its heading is where a new result scrolls to. */
export function VerdictSheet({ status, headline, details }: {
  status: OverallStatus;
  headline: string;
  details: string;
}): React.ReactElement {
  const text = useEngineText();
  const landing = useLanding();
  return (
    <Sheet className="px-5 py-6 sm:px-8 sm:py-8">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-5">
        <div className="min-w-0 max-w-[40ch]">
          <h2
            id="result-heading"
            tabIndex={-1}
            className="font-display text-[clamp(1.35rem,3vw,1.75rem)] leading-[1.1] font-black text-balance outline-none"
          >
            {text(headline)}
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
  durationMs?: number;
}

const ROW_LABELS: Record<Lang, { action: string; observed: string; meaning: Record<CheckOutcome, string>; duration: string }> = {
  en: {
    action: 'What should I do? ',
    observed: 'Observed data',
    duration: 'Duration',
    meaning: {
      PASS: 'The check completed successfully.',
      WARN: 'The check completed, but the configuration may need attention.',
      FAIL: 'The check found a problem that should be fixed.',
      NOT_TESTED: 'This check could not run. That is not evidence that it works.',
    },
  },
  es: {
    action: '¿Qué hago? ',
    observed: 'Datos observados',
    duration: 'Duración',
    meaning: {
      PASS: 'El chequeo terminó bien.',
      WARN: 'El chequeo terminó, pero la configuración puede necesitar atención.',
      FAIL: 'El chequeo encontró un problema que hay que corregir.',
      NOT_TESTED: 'Este chequeo no pudo correr. Eso no es evidencia de que funciona.',
    },
  },
};

/** One ruled, numbered row per finding, with what to do and the raw observation. */
export function CheckRows({ items }: { items: CheckRow[] }): React.ReactElement {
  const text = useEngineText();
  const labels = ROW_LABELS[useLang()];
  return (
    <ol className="mt-10 border-t-2 border-ink">
      {items.map((check, index) => (
        <li key={check.id} className="grid grid-cols-[2.5rem_1fr] gap-x-3 border-b border-ink py-6 sm:grid-cols-[3rem_1fr] sm:gap-x-6">
          <span aria-hidden="true" className="font-display text-xl leading-none font-bold">
            {String(index + 1).padStart(2, '0')}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 className="text-lg leading-snug font-bold">{text(check.title)}</h3>
              <OutcomeLabel outcome={check.outcome} />
            </div>
            <p className="mt-1 text-sm text-muted">{labels.meaning[check.outcome]}</p>
            <p className="mt-2 max-w-[70ch] break-words">{text(check.summary)}</p>
            {typeof check.durationMs === 'number' && (
              <p className="mt-2 font-mono text-xs text-muted">
                {labels.duration}: {check.durationMs} ms
              </p>
            )}
            {check.action && (
              <p className="mt-3 max-w-[70ch] border-l-[3px] border-pen pl-3 text-pen">
                <span className="font-semibold">{labels.action}</span>
                {text(check.action)}
              </p>
            )}
            {check.observed && (
              <details className="mt-3 text-sm">
                <summary className="w-fit cursor-pointer text-muted underline underline-offset-4">{labels.observed}</summary>
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
