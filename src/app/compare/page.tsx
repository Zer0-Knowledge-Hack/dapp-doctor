'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/app/AppShell';
import { revealResult } from '@/components/app/revealResult';
import { Field } from '@/components/app/Field';
import { Notice } from '@/components/app/Notice';
import { OutcomeLabel } from '@/components/app/OutcomeLabel';
import { Mascot } from '@/components/brand/Mascot';
import { DiagnosisLoadingState } from '@/components/brand/DiagnosisStates';
import { Ecg } from '@/components/ecg/Ecg';
import { useEngineText, useLang } from '@/components/i18n/LanguageProvider';
import { useLanding } from '@/components/landing/useLanding';
import { Sheet } from '@/components/ui/Sheet';
import { Stamp } from '@/components/ui/Stamp';
import type { ChangeKind, Comparison } from '@/lib/diagnostics/compare';
import type { Lang } from '@/lib/i18n/lang';

const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

interface FormState {
  rpcUrl: string;
  fallbackRpcUrl: string;
  expectedChainId: string;
  contractAddress: string;
  criticalReadSignature: string;
}

/** "Before" is the broken configuration: the app looks for Sepolia against a Mainnet node. */
const BEFORE: FormState = {
  rpcUrl: 'https://mainnet.base.org',
  fallbackRpcUrl: '',
  expectedChainId: '84532',
  contractAddress: USDC_BASE,
  criticalReadSignature: 'symbol() returns (string)',
};

/** "After" is the same app with the network fixed and a fallback declared. */
const AFTER: FormState = {
  rpcUrl: 'https://mainnet.base.org',
  fallbackRpcUrl: 'https://base-rpc.publicnode.com',
  expectedChainId: '8453',
  contractAddress: USDC_BASE,
  criticalReadSignature: 'symbol() returns (string)',
};

const COPY = {
  en: {
    title: 'Compare two setups',
    intro: 'Runs the same diagnosis on the broken configuration and the fixed one, at the same moment. A single report proves nothing; the difference between the two is what proves the fix.',
    before: 'Before',
    after: 'After',
    beforeSubtitle: 'The configuration with the failure',
    afterSubtitle: 'The fixed configuration',
    fields: { rpcUrl: 'Primary RPC', fallbackRpcUrl: 'Fallback RPC', expectedChainId: 'Expected chain ID', contractAddress: 'Contract address', criticalReadSignature: 'Critical read' },
    run: 'Compare',
    running: 'Comparing…',
    failed: 'The comparison failed.',
    unreachable: 'Could not reach the diagnostic engine.',
    tally: (fixed: number, regressed: number) => `${fixed} fixed, ${regressed} broke.`,
    columns: { check: 'Check', change: 'Change' },
    // Words, not colour, say what changed; a regression is the one to read first.
    change: { FIXED: 'fixed', REGRESSED: 'broke', CHANGED: 'changed', UNCHANGED: 'unchanged' } as Record<ChangeKind, string>,
  },
  es: {
    title: 'Comparar dos configuraciones',
    intro: 'Corre el mismo diagnóstico sobre la configuración rota y la arreglada, en el mismo momento. Un reporte solo no prueba nada; lo que prueba el arreglo es la diferencia entre los dos.',
    before: 'Antes',
    after: 'Después',
    beforeSubtitle: 'La configuración con la falla',
    afterSubtitle: 'La configuración arreglada',
    fields: { rpcUrl: 'RPC principal', fallbackRpcUrl: 'RPC de respaldo', expectedChainId: 'Chain ID esperado', contractAddress: 'Dirección del contrato', criticalReadSignature: 'Lectura crítica' },
    run: 'Comparar',
    running: 'Comparando…',
    failed: 'La comparación falló.',
    unreachable: 'No se pudo llegar al motor de diagnóstico.',
    tally: (fixed: number, regressed: number) => `${fixed} arreglado(s), ${regressed} roto(s).`,
    columns: { check: 'Chequeo', change: 'Cambio' },
    change: { FIXED: 'arreglado', REGRESSED: 'se rompió', CHANGED: 'cambió', UNCHANGED: 'sin cambios' } as Record<ChangeKind, string>,
  },
} satisfies Record<Lang, unknown>;

type Copy = (typeof COPY)[Lang];

export default function ComparePage() {
  const copy = COPY[useLang()];
  const text = useEngineText();
  const [before, setBefore] = useState<FormState>(BEFORE);
  const [after, setAfter] = useState<FormState>(AFTER);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  // The result arrives below both panels: bring it into view.
  useEffect(() => {
    if (comparison) revealResult('comparison-result');
  }, [comparison]);

  async function compare() {
    setRunning(true);
    setError(null);
    try {
      const response = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ before, after }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ? text(payload.error) : copy.failed);
        setComparison(null);
      } else {
        setComparison(payload as Comparison);
      }
    } catch {
      setError(copy.unreachable);
      setComparison(null);
    } finally {
      setRunning(false);
    }
  }

  return (
    <AppShell
      title={copy.title}
      intro={<p>{copy.intro}</p>}
    >
      <div className="mt-10 grid gap-8 md:grid-cols-2">
        <Panel copy={copy} title={copy.before} subtitle={copy.beforeSubtitle} values={before} onChange={setBefore} />
        <Panel copy={copy} title={copy.after} subtitle={copy.afterSubtitle} values={after} onChange={setAfter} />
      </div>

      <div className="mt-8">
        <button type="button" onClick={compare} disabled={running} className="btn-pen min-h-12 px-6 disabled:opacity-60">
          {running ? copy.running : copy.run}
        </button>
      </div>

      {error && (
        <div className="mt-8">
          <Notice tone="failure">{error}</Notice>
        </div>
      )}

      {running ? <DiagnosisLoadingState /> : comparison && <Result comparison={comparison} copy={copy} />}
    </AppShell>
  );
}

function Panel({ copy, title, subtitle, values, onChange }: {
  copy: Copy;
  title: string;
  subtitle: string;
  values: FormState;
  onChange: (values: FormState) => void;
}) {
  function update(field: keyof FormState, value: string) {
    onChange({ ...values, [field]: value });
  }

  return (
    <Sheet className="px-5 py-6 sm:px-7 sm:py-7">
      <h2 className="font-display text-3xl leading-none font-black">{title}</h2>
      <p className="mt-2 mb-6 text-sm text-muted">{subtitle}</p>
      <div className="space-y-4">
        <Field label={copy.fields.rpcUrl} value={values.rpcUrl} onChange={(v) => update('rpcUrl', v)} />
        <Field label={copy.fields.fallbackRpcUrl} value={values.fallbackRpcUrl} onChange={(v) => update('fallbackRpcUrl', v)} />
        <Field label={copy.fields.expectedChainId} value={values.expectedChainId} onChange={(v) => update('expectedChainId', v)} />
        <Field label={copy.fields.contractAddress} value={values.contractAddress} onChange={(v) => update('contractAddress', v)} />
        <Field
          label={copy.fields.criticalReadSignature}
          value={values.criticalReadSignature}
          onChange={(v) => update('criticalReadSignature', v)}
        />
      </div>
    </Sheet>
  );
}

function Result({ comparison, copy }: { comparison: Comparison; copy: Copy }) {
  const text = useEngineText();
  const landing = useLanding();
  return (
    <section aria-labelledby="comparison-result" className="mt-12 sm:mt-16">
      <Sheet className="px-3 py-6 sm:px-8 sm:py-8 lg:px-10">
        {/* The doctor sits beside the verdict only: the two forms above stay plain. */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2
              id="comparison-result"
              tabIndex={-1}
              className="max-w-[40ch] font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.02] font-black text-balance outline-none"
            >
              {text(comparison.verdict)}
            </h2>
            <p className="mt-3 text-sm text-muted">
              {copy.tally(comparison.fixed, comparison.regressed)}
            </p>
          </div>
          <Mascot size={110} sizes="(min-width: 640px) 110px, 72px" className="w-[72px]! shrink-0 sm:w-[110px]!" />
        </div>

        <div className="mt-7 grid grid-cols-2 divide-x divide-ink">
          <div className="min-w-0 pr-3 sm:pr-7">
            <p className="mb-5 text-sm font-semibold">{copy.before}</p>
            <Stamp status={comparison.statusBefore} />
            <Ecg rhythm={comparison.statusBefore} className="mt-5 h-20 w-full text-ink sm:h-24" />
          </div>
          <div className="min-w-0 pl-4 sm:pl-8">
            <p className="mb-5 text-sm font-semibold">{copy.after}</p>
            <Stamp status={comparison.statusAfter} />
            <Ecg
              rhythm={comparison.statusAfter}
              motion={comparison.statusAfter === 'READY' ? landing.motion : undefined}
              className="mt-5 h-20 w-full text-ink sm:h-24"
            />
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-left text-sm leading-snug sm:text-base">
            <thead className="border-y-2 border-ink">
              <tr>
                <th scope="col" className="py-3 pr-3 font-semibold">{copy.columns.check}</th>
                <th scope="col" className="py-3 pr-3 font-semibold">{copy.before}</th>
                <th scope="col" className="py-3 pr-3 font-semibold">{copy.after}</th>
                <th scope="col" className="py-3 text-right font-semibold">{copy.columns.change}</th>
              </tr>
            </thead>
            <tbody>
              {comparison.deltas.map((delta) => (
                <tr key={delta.id} className="border-b border-ink align-top">
                  <th scope="row" className="py-4 pr-3 font-medium">
                    {text(delta.title)}
                    <span className="mt-1 block max-w-[48ch] text-sm font-normal text-muted">{text(delta.afterSummary)}</span>
                  </th>
                  <td className="py-4 pr-3"><OutcomeLabel outcome={delta.before} /></td>
                  <td className="py-4 pr-3"><OutcomeLabel outcome={delta.after} /></td>
                  <td className="py-4 text-right">
                    {/* Black text with a red bar, like every status here: red text on white is too faint. */}
                    <span className={delta.change === 'REGRESSED' ? 'border-l-[3px] border-triage-red pl-1.5 font-bold' : ''}>
                      {copy.change[delta.change]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Sheet>
    </section>
  );
}
