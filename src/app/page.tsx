'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { CheckOutcome, DiagnosisReport, OverallStatus } from '@/lib/diagnostics/types';
import { getOrCreateUserId, isBillingEnabled } from '@/lib/billing/client';

/** Set by the API when the request carried a user id: whether the run was kept in history. */
type HistoryOutcome = { saved: true; id: string } | { saved: false; reason: string };

const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

interface FormState {
  rpcUrl: string;
  fallbackRpcUrl: string;
  expectedChainId: string;
  contractAddress: string;
  criticalReadSignature: string;
}

const PRESETS: Record<string, { label: string; hint: string; values: FormState }> = {
  broken: {
    label: 'Broken demo',
    hint: 'The app points at Base Mainnet while expecting Base Sepolia. The typical silent failure.',
    values: {
      rpcUrl: 'https://mainnet.base.org',
      fallbackRpcUrl: '',
      expectedChainId: '84532',
      contractAddress: USDC_BASE,
      criticalReadSignature: 'symbol() returns (string)',
    },
  },
  healthy: {
    label: 'Correct configuration',
    hint: 'Same app, network and fallback configured properly. Useful to compare before and after.',
    values: {
      rpcUrl: 'https://mainnet.base.org',
      fallbackRpcUrl: 'https://base-rpc.publicnode.com',
      expectedChainId: '8453',
      contractAddress: USDC_BASE,
      criticalReadSignature: 'symbol() returns (string)',
    },
  },
};

const STATUS_STYLE: Record<OverallStatus, { text: string; box: string; label: string }> = {
  READY: { text: 'text-emerald-300', box: 'border-emerald-500/40 bg-emerald-500/10', label: 'READY' },
  AT_RISK: { text: 'text-amber-300', box: 'border-amber-500/40 bg-amber-500/10', label: 'AT RISK' },
  BLOCKED: { text: 'text-rose-300', box: 'border-rose-500/40 bg-rose-500/10', label: 'BLOCKED' },
  NOT_TESTED: { text: 'text-zinc-400', box: 'border-zinc-600/40 bg-zinc-500/10', label: 'NOT TESTED' },
};

const OUTCOME_STYLE: Record<CheckOutcome, string> = {
  PASS: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  WARN: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  FAIL: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  NOT_TESTED: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
};

export default function Home() {
  const [form, setForm] = useState<FormState>(PRESETS.broken.values);
  const [report, setReport] = useState<DiagnosisReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<HistoryOutcome | null>(null);

  function update(field: keyof FormState, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  async function diagnose() {
    setRunning(true);
    setError(null);
    setHistory(null);
    try {
      // With billing on, the run carries the user id so the server can keep it
      // in history. The server decides whether this user may have history.
      const response = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(isBillingEnabled() ? { ...form, userId: getOrCreateUserId() } : form),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? 'The diagnosis failed.');
        setReport(null);
      } else {
        setReport(payload as DiagnosisReport);
        setHistory((payload as { history?: HistoryOutcome }).history ?? null);
      }
    } catch {
      setError('Could not reach the diagnostic engine.');
      setReport(null);
    } finally {
      setRunning(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight">DApp Doctor</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Six deterministic, read-only checks on a dApp RPC configuration. No private keys, no
          seed phrases, no transactions.
        </p>
        <nav className="mt-4 flex gap-5 text-xs text-zinc-500">
          <Link href="/compare" className="transition hover:text-zinc-300">
            Compare before and after
          </Link>
          {isBillingEnabled() && (
            <Link href="/history" className="transition hover:text-zinc-300">
              Diagnosis history
            </Link>
          )}
        </nav>
      </header>

      <section className="mb-8 flex flex-wrap gap-2">
        {Object.entries(PRESETS).map(([key, preset]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setForm(preset.values);
              setReport(null);
              setError(null);
            }}
            className="rounded-md border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-zinc-500 hover:text-white"
            title={preset.hint}
          >
            {preset.label}
          </button>
        ))}
      </section>

      <section className="grid gap-4 rounded-lg border border-zinc-800 p-5 sm:grid-cols-2">
        <Field label="Primary RPC" value={form.rpcUrl} onChange={(v) => update('rpcUrl', v)} />
        <Field
          label="Fallback RPC (optional)"
          value={form.fallbackRpcUrl}
          onChange={(v) => update('fallbackRpcUrl', v)}
        />
        <Field
          label="Expected chain ID"
          value={form.expectedChainId}
          onChange={(v) => update('expectedChainId', v)}
        />
        <Field
          label="Contract address (optional)"
          value={form.contractAddress}
          onChange={(v) => update('contractAddress', v)}
        />
        <div className="sm:col-span-2">
          <Field
            label="Critical read (optional)"
            value={form.criticalReadSignature}
            onChange={(v) => update('criticalReadSignature', v)}
          />
        </div>
        <div className="sm:col-span-2">
          <button
            type="button"
            onClick={diagnose}
            disabled={running}
            className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:opacity-50"
          >
            {running ? 'Diagnosing...' : 'Diagnose'}
          </button>
        </div>
      </section>

      {error && (
        <p className="mt-6 rounded-md border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      {report && <Report report={report} />}

      {report && history?.saved && (
        <p className="mt-4 text-xs text-zinc-500">
          Saved to your{' '}
          <Link href="/history" className="text-zinc-300 underline-offset-4 hover:underline">
            diagnosis history
          </Link>
          .
        </p>
      )}
      {report && history && !history.saved && history.reason === 'never-purchased' && (
        <p className="mt-4 text-xs text-zinc-500">
          <Link href="/history" className="text-zinc-300 underline-offset-4 hover:underline">
            Keep every diagnosis with Pro
          </Link>
          . Diagnosis stays free.
        </p>
      )}
    </main>
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
      <span className="mb-1.5 block text-zinc-400">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-100 outline-none transition focus:border-zinc-500"
      />
    </label>
  );
}

function Report({ report }: { report: DiagnosisReport }) {
  const style = STATUS_STYLE[report.status];
  return (
    <section className="mt-8">
      <div className={`rounded-lg border px-5 py-4 ${style.box}`}>
        <div className={`text-xs font-semibold tracking-widest ${style.text}`}>{style.label}</div>
        <p className="mt-1.5 text-sm text-zinc-200">{report.headline}</p>
        <p className="mt-2 text-xs text-zinc-500">
          {report.checks.length} checks in {report.durationMs} ms ·{' '}
          {new Date(report.startedAt).toLocaleString()}
        </p>
      </div>

      <ol className="mt-4 space-y-3">
        {report.checks.map((check) => (
          <li key={check.id} className="rounded-lg border border-zinc-800 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wider ${OUTCOME_STYLE[check.outcome]}`}
              >
                {check.outcome.replace('_', ' ')}
              </span>
              <span className="text-sm font-medium text-zinc-200">{check.title}</span>
              <span className="ml-auto text-[11px] text-zinc-600">{check.durationMs} ms</span>
            </div>
            <p className="mt-2 text-sm text-zinc-300">{check.summary}</p>
            {check.action && (
              <p className="mt-2 border-l-2 border-zinc-700 pl-3 text-sm text-zinc-400">
                <span className="font-medium text-zinc-300">What to do: </span>
                {check.action}
              </p>
            )}
            {check.observed && (
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-400">
                  Observed data
                </summary>
                <pre className="mt-1.5 overflow-x-auto rounded bg-zinc-900/80 p-2.5 text-[11px] text-zinc-400">
                  {JSON.stringify(check.observed, null, 2)}
                </pre>
              </details>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
