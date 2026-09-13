'use client';

import { useLang } from '@/components/i18n/LanguageProvider';
import type { CheckOutcome, OverallStatus } from '@/lib/diagnostics/types';
import type { Lang } from '@/lib/i18n/lang';
import { Mascot } from './Mascot';

/**
 * The states around a diagnosis, told by the mascot: ready before one runs,
 * working while it runs, and a friendly empty state where nothing is saved
 * yet. The words carry the meaning; the otter is decoration beside them.
 */

const COPY: Record<Lang, { readyTitle: string; readyBody: string; working: string; workingBody: string }> = {
  en: {
    readyTitle: 'Ready to diagnose your dApp.',
    readyBody: 'Pick an example above or enter your RPC. Results appear right here.',
    working: 'Checking your configuration…',
    workingBody: 'Six read-only checks against the live network. This takes a few seconds.',
  },
  es: {
    readyTitle: 'Lista para diagnosticar tu dApp.',
    readyBody: 'Elige un ejemplo arriba o ingresa tu RPC. Los resultados aparecen aquí mismo.',
    working: 'Revisando tu configuración…',
    workingBody: 'Seis chequeos de solo lectura contra la red en vivo. Tarda unos segundos.',
  },
};

/** Where a result will appear, before there is one. Kept short so the form stays in view. */
export function DiagnosisEmptyState({ title, children, mascotSize = 88 }: {
  /** Defaults to "Ready to diagnose your dApp." */
  title?: string;
  children?: React.ReactNode;
  mascotSize?: number;
}): React.ReactElement {
  const copy = COPY[useLang()];
  return (
    <div className="flex items-center gap-5 border-2 border-dashed border-ink bg-sheet/60 px-5 py-4 sm:gap-7">
      <Mascot size={mascotSize} variant="ready" className="shrink-0" />
      <div className="min-w-0">
        <p className="font-display text-[clamp(1.35rem,3vw,1.75rem)] leading-[1.1] font-black text-balance">{title ?? copy.readyTitle}</p>
        <div className="mt-2 max-w-[60ch] text-sm leading-relaxed text-muted">{children ?? copy.readyBody}</div>
      </div>
    </div>
  );
}

/** While the checks run. The motion is gentle, and none at all for anyone who asked for less. */
export function DiagnosisLoadingState({ label, detail }: { label?: string; detail?: string }): React.ReactElement {
  const copy = COPY[useLang()];
  return (
    <div role="status" aria-live="polite" className="mt-6 flex items-center gap-5 border-2 border-ink bg-sheet px-5 py-4 sm:gap-7">
      <Mascot size={80} variant="working" className="shrink-0" />
      <div className="min-w-0">
        <p className="font-display text-[clamp(1.35rem,3vw,1.75rem)] leading-[1.1] font-black text-balance">{label ?? copy.working}</p>
        <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-muted">{detail ?? copy.workingBody}</p>
        <span aria-hidden="true" className="loading-scan mt-4 block h-[3px] w-full max-w-[18rem] bg-ink/15" />
      </div>
    </div>
  );
}

type Tone = 'healthy' | 'warning' | 'critical' | 'untested';

const TONE: Record<CheckOutcome | OverallStatus, Tone> = {
  PASS: 'healthy',
  READY: 'healthy',
  WARN: 'warning',
  AT_RISK: 'warning',
  FAIL: 'critical',
  BLOCKED: 'critical',
  NOT_TESTED: 'untested',
};

/** The trace on the mascot's tablet, one per tone: a steady beat, an uneven one, a flatline. */
const TRACE: Record<Tone, string> = {
  healthy: 'M2 9h4l1.5-5 2 9 1.5-4h2.5l1.5-5 2 9 1.5-4H22',
  warning: 'M2 9h5l1-2.5 1.8 5.5 1.2-3H15l1.2-6 1.8 8L19 9h3',
  critical: 'M2 9h4l1.5-5 2 9 1.5-4H22',
  untested: 'M2 9h20',
};

const COLOR: Record<Tone, string> = {
  healthy: 'var(--triage-green)',
  warning: 'var(--triage-amber)',
  critical: 'var(--triage-red)',
  untested: 'var(--muted)',
};

/**
 * A small status indicator drawn after the mascot's tablet: a framed screen
 * whose trace tells the state by its shape, not only its colour. Always shown
 * next to the status word, so it is decorative to a screen reader.
 */
export function DiagnosisStatus({ outcome, className = '' }: { outcome: CheckOutcome | OverallStatus; className?: string }): React.ReactElement {
  const tone = TONE[outcome];
  return (
    <svg width="24" height="18" viewBox="0 0 24 18" aria-hidden="true" focusable="false" className={`shrink-0 ${className}`}>
      <rect x="0.75" y="0.75" width="22.5" height="16.5" fill="var(--sheet)" stroke="var(--ink)" strokeWidth="1.5" />
      <path
        d={TRACE[tone]}
        fill="none"
        stroke={COLOR[tone]}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
        strokeDasharray={tone === 'untested' ? '2 2.5' : undefined}
      />
    </svg>
  );
}
