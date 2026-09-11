'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/app/AppShell';
import { revealResult } from '@/components/app/revealResult';
import { Field } from '@/components/app/Field';
import { Notice } from '@/components/app/Notice';
import { OutcomeLabel } from '@/components/app/OutcomeLabel';
import { Ecg } from '@/components/ecg/Ecg';
import { landing } from '@/components/landing/content';
import { Sheet } from '@/components/ui/Sheet';
import { Stamp } from '@/components/ui/Stamp';
import type { ChangeKind, Comparison } from '@/lib/diagnostics/compare';

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

/** Words, not colour, say what changed; a regression is the one to read first. */
const CHANGE_TEXT: Record<ChangeKind, string> = {
  FIXED: 'fixed',
  REGRESSED: 'broke',
  CHANGED: 'changed',
  UNCHANGED: 'unchanged',
};

export default function ComparePage() {
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
        setError(payload.error ?? 'The comparison failed.');
        setComparison(null);
      } else {
        setComparison(payload as Comparison);
      }
    } catch {
      setError('Could not reach the diagnostic engine.');
      setComparison(null);
    } finally {
      setRunning(false);
    }
  }

  return (
    <AppShell
      title="Compare two setups"
      intro={
        <p>
          Runs the same diagnosis on the broken configuration and the fixed one, at the same moment. A single
          report proves nothing; the difference between the two is what proves the fix.
        </p>
      }
    >
      <div className="mt-10 grid gap-8 md:grid-cols-2">
        <Panel title="Before" subtitle="The configuration with the failure" values={before} onChange={setBefore} />
        <Panel title="After" subtitle="The fixed configuration" values={after} onChange={setAfter} />
      </div>

      <div className="mt-8">
        <button type="button" onClick={compare} disabled={running} className="btn-pen min-h-12 px-6 disabled:opacity-60">
          {running ? 'Comparing…' : 'Compare'}
        </button>
      </div>

      {error && (
        <div className="mt-8">
          <Notice tone="failure">{error}</Notice>
        </div>
      )}

      {comparison && <Result comparison={comparison} />}
    </AppShell>
  );
}

function Panel({ title, subtitle, values, onChange }: {
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
        <Field label="Primary RPC" value={values.rpcUrl} onChange={(v) => update('rpcUrl', v)} />
        <Field label="Fallback RPC" value={values.fallbackRpcUrl} onChange={(v) => update('fallbackRpcUrl', v)} />
        <Field label="Expected chain ID" value={values.expectedChainId} onChange={(v) => update('expectedChainId', v)} />
        <Field label="Contract address" value={values.contractAddress} onChange={(v) => update('contractAddress', v)} />
        <Field
          label="Critical read"
          value={values.criticalReadSignature}
          onChange={(v) => update('criticalReadSignature', v)}
        />
      </div>
    </Sheet>
  );
}

function Result({ comparison }: { comparison: Comparison }) {
  return (
    <section aria-labelledby="comparison-result" className="mt-12 sm:mt-16">
      <Sheet className="px-3 py-6 sm:px-8 sm:py-8 lg:px-10">
        <h2
          id="comparison-result"
          tabIndex={-1}
          className="max-w-[40ch] font-display text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.02] font-black text-balance outline-none"
        >
          {comparison.verdict}
        </h2>
        <p className="mt-3 text-sm text-muted">
          {comparison.fixed} fixed, {comparison.regressed} broke.
        </p>

        <div className="mt-7 grid grid-cols-2 divide-x divide-ink">
          <div className="min-w-0 pr-3 sm:pr-7">
            <p className="mb-5 text-sm font-semibold">Before</p>
            <Stamp status={comparison.statusBefore} />
            <Ecg rhythm={comparison.statusBefore} className="mt-5 h-20 w-full text-ink sm:h-24" />
          </div>
          <div className="min-w-0 pl-4 sm:pl-8">
            <p className="mb-5 text-sm font-semibold">After</p>
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
                <th scope="col" className="py-3 pr-3 font-semibold">Check</th>
                <th scope="col" className="py-3 pr-3 font-semibold">Before</th>
                <th scope="col" className="py-3 pr-3 font-semibold">After</th>
                <th scope="col" className="py-3 text-right font-semibold">Change</th>
              </tr>
            </thead>
            <tbody>
              {comparison.deltas.map((delta) => (
                <tr key={delta.id} className="border-b border-ink align-top">
                  <th scope="row" className="py-4 pr-3 font-medium">
                    {delta.title}
                    <span className="mt-1 block max-w-[48ch] text-sm font-normal text-muted">{delta.afterSummary}</span>
                  </th>
                  <td className="py-4 pr-3"><OutcomeLabel outcome={delta.before} /></td>
                  <td className="py-4 pr-3"><OutcomeLabel outcome={delta.after} /></td>
                  <td className="py-4 text-right">
                    {/* Black text with a red bar, like every status here: red text on white is too faint. */}
                    <span className={delta.change === 'REGRESSED' ? 'border-l-[3px] border-triage-red pl-1.5 font-bold' : ''}>
                      {CHANGE_TEXT[delta.change]}
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
