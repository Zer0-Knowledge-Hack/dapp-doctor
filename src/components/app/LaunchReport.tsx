'use client';

import { useLang } from '@/components/i18n/LanguageProvider';
import { describeChain } from '@/lib/diagnostics/networks';
import type { Lang } from '@/lib/i18n/lang';
import type { LaunchReport as LaunchReportData } from '@/lib/launch/run';
import { CheckRows, formatWhen, VerdictSheet } from './Report';

/**
 * A Launch Check as a chart: one verdict for the launch, then the launch
 * rules, then the six checks that fed it. The same sheet and rows as a
 * diagnosis, so the two reports read as one family.
 */
const COPY: Record<Lang, {
  details: (when: string, chain: string, rules: number, checks: number, ms: number) => string;
  rules: string;
  rulesIntro: string;
  checks: string;
  checksIntro: (maxAge?: number) => string;
}> = {
  en: {
    details: (when, chain, rules, checks, ms) => `${when}. Launching on ${chain}. ${rules} launch rules and ${checks} checks in ${ms} ms.`,
    rules: 'Launch rules',
    rulesIntro: 'What a configuration needs before real users reach it.',
    checks: 'The six checks, at launch strictness',
    checksIntro: (maxAge) => `The free diagnosis, run live against your RPCs${maxAge ? `, with blocks no older than ${maxAge} s` : ''}.`,
  },
  es: {
    details: (when, chain, rules, checks, ms) => `${when}. Lanzamiento en ${chain}. ${rules} reglas de lanzamiento y ${checks} chequeos en ${ms} ms.`,
    rules: 'Reglas de lanzamiento',
    rulesIntro: 'Lo que una configuración necesita antes de que lleguen usuarios reales.',
    checks: 'Los seis chequeos, con la exigencia de un lanzamiento',
    checksIntro: (maxAge) => `El diagnóstico gratis, corrido en vivo contra tus RPC${maxAge ? `, con bloques de no más de ${maxAge} s` : ''}.`,
  },
};

export function LaunchReport({ report }: { report: LaunchReportData }): React.ReactElement {
  const { diagnosis } = report;
  const maxAge = diagnosis.target.maxBlockAgeSeconds;
  const lang = useLang();
  const copy = COPY[lang];

  return (
    <section aria-labelledby="result-heading" className="mt-12 sm:mt-16">
      <VerdictSheet
        status={report.status}
        headline={report.headline}
        details={copy.details(formatWhen(report.startedAt, lang), describeChain(diagnosis.target.expectedChainId), report.rules.length, diagnosis.checks.length, report.durationMs)}
      />

      <h2 className="mt-10 font-display text-[clamp(1.25rem,2.8vw,1.6rem)] leading-[1.1] font-black">{copy.rules}</h2>
      <p className="mt-3 max-w-[65ch] text-sm text-muted">{copy.rulesIntro}</p>
      <CheckRows items={report.rules} />

      <h2 className="mt-10 font-display text-[clamp(1.25rem,2.8vw,1.6rem)] leading-[1.1] font-black">{copy.checks}</h2>
      <p className="mt-3 max-w-[65ch] text-sm text-muted">
        {copy.checksIntro(maxAge)}
      </p>
      <CheckRows items={diagnosis.checks} />
    </section>
  );
}
