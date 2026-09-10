'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { ChangeKind, Comparison } from '@/lib/diagnostics/compare';
import type { CheckOutcome, OverallStatus } from '@/lib/diagnostics/types';

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

const STATUS_STYLE: Record<OverallStatus, string> = {
  READY: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  AT_RISK: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
  BLOCKED: 'text-rose-300 border-rose-500/40 bg-rose-500/10',
  NOT_TESTED: 'text-zinc-400 border-zinc-600/40 bg-zinc-500/10',
};

const OUTCOME_STYLE: Record<CheckOutcome, string> = {
  PASS: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  WARN: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  FAIL: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  NOT_TESTED: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
};

const CHANGE_STYLE: Record<ChangeKind, { label: string; className: string }> = {
  FIXED: { label: 'FIXED', className: 'text-emerald-300' },
  REGRESSED: { label: 'REGRESSED', className: 'text-rose-300' },
  CHANGED: { label: 'CHANGED', className: 'text-amber-300' },
  UNCHANGED: { label: 'unchanged', className: 'text-zinc-600' },
};

export default function Compare() {
  const [before, setBefore] = useState<FormState>(BEFORE);
  const [after, setAfter] = useState<FormState>(AFTER);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

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
    <main className="mx-auto max-w-5xl px-6 py-12">
      <header className="mb-10">
        <Link href="/" className="text-xs text-zinc-500 transition hover:text-zinc-300">
          ← Single diagnosis
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Before and after</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Runs the same diagnosis against two configurations and shows what changed. Detecting the
          failure proves nothing on its own: what proves the fix is the difference between the two
          runs.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Panel title="Before" subtitle="Configuration with the failure" values={before} onChange={setBefore} />
        <Panel title="After" subtitle="Fixed configuration" values={after} onChange={setAfter} />
      </div>

      <button
        type="button"
        onClick={compare}
        disabled={running}
        className="mt-6 rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:opacity-50"
      >
        {running ? 'Comparing...' : 'Compare'}
      </button>

      {error && (
        <p className="mt-6 rounded-md border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      {comparison && <Result comparison={comparison} />}
    </main>
  );
}

function Panel({
  title,
  subtitle,
  values,
  onChange,
}: {
  title: string;
  subtitle: string;
  values: FormState;
  onChange: (values: FormState) => void;
}) {
  function update(field: keyof FormState, value: string) {
    onChange({ ...values, [field]: value });
  }

  return (
    <section className="rounded-lg border border-zinc-800 p-5">
      <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
      <p className="mb-4 text-xs text-zinc-500">{subtitle}</p>
      <div className="space-y-3">
        <Field label="Primary RPC" value={values.rpcUrl} onChange={(v) => update('rpcUrl', v)} />
        <Field
          label="Fallback RPC"
          value={values.fallbackRpcUrl}
          onChange={(v) => update('fallbackRpcUrl', v)}
        />
        <Field
          label="Expected chain ID"
          value={values.expectedChainId}
          onChange={(v) => update('expectedChainId', v)}
        />
        <Field
          label="Contract address"
          value={values.contractAddress}
          onChange={(v) => update('contractAddress', v)}
        />
        <Field
          label="Critical read"
          value={values.criticalReadSignature}
          onChange={(v) => update('criticalReadSignature', v)}
        />
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs text-zinc-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-100 outline-none transition focus:border-zinc-500"
      />
    </label>
  );
}

function Result({ comparison }: { comparison: Comparison }) {
  return (
    <section className="mt-8">
      <div className="rounded-lg border border-zinc-800 px-5 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className={`rounded border px-2 py-1 text-xs font-semibold ${STATUS_STYLE[comparison.statusBefore]}`}>
            {comparison.statusBefore.replace('_', ' ')}
          </span>
          <span className="text-zinc-600">→</span>
          <span className={`rounded border px-2 py-1 text-xs font-semibold ${STATUS_STYLE[comparison.statusAfter]}`}>
            {comparison.statusAfter.replace('_', ' ')}
          </span>
          <span className="ml-auto text-xs text-zinc-500">
            {comparison.fixed} fixed · {comparison.regressed} regressed
          </span>
        </div>
        <p className="mt-3 text-sm text-zinc-200">{comparison.verdict}</p>
      </div>

      <table className="mt-4 w-full border-separate border-spacing-y-2 text-left text-sm">
        <thead>
          <tr className="text-xs text-zinc-500">
            <th className="px-3 font-normal">Check</th>
            <th className="px-3 font-normal">Before</th>
            <th className="px-3 font-normal">After</th>
            <th className="px-3 font-normal">Change</th>
          </tr>
        </thead>
        <tbody>
          {comparison.deltas.map((delta) => (
            <tr key={delta.id} className="align-top">
              <td className="rounded-l-lg border-y border-l border-zinc-800 px-3 py-3">
                <div className="font-medium text-zinc-200">{delta.title}</div>
                <div className="mt-1 text-xs text-zinc-500">{delta.afterSummary}</div>
              </td>
              <td className="border-y border-zinc-800 px-3 py-3">
                <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${OUTCOME_STYLE[delta.before]}`}>
                  {delta.before.replace('_', ' ')}
                </span>
              </td>
              <td className="border-y border-zinc-800 px-3 py-3">
                <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${OUTCOME_STYLE[delta.after]}`}>
                  {delta.after.replace('_', ' ')}
                </span>
              </td>
              <td className={`rounded-r-lg border-y border-r border-zinc-800 px-3 py-3 text-xs font-semibold ${CHANGE_STYLE[delta.change].className}`}>
                {CHANGE_STYLE[delta.change].label}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
