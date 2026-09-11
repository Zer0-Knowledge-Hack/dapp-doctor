'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AppShell } from '@/components/app/AppShell';
import { Field } from '@/components/app/Field';
import { Notice } from '@/components/app/Notice';
import { Report } from '@/components/app/Report';
import { revealResult } from '@/components/app/revealResult';
import { Sheet } from '@/components/ui/Sheet';
import { getOrCreateUserId, isBillingEnabled } from '@/lib/billing/client';
import type { DiagnosisReport } from '@/lib/diagnostics/types';

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

export default function DiagnosePage() {
  const [form, setForm] = useState<FormState>(PRESETS.broken.values);
  const [report, setReport] = useState<DiagnosisReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState<HistoryOutcome | null>(null);
  // Which preset the form currently holds. Editing any field clears it, since
  // the form no longer matches the preset.
  const [activePreset, setActivePreset] = useState<string | null>('broken');
  const demoStarted = useRef(false);

  function update(field: keyof FormState, value: string) {
    setActivePreset(null);
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  /**
   * Runs a diagnosis. Takes the values explicitly so a preset can run the
   * moment it is chosen: state set in the same click would not be readable
   * here yet.
   */
  async function diagnose(values: FormState = form) {
    setRunning(true);
    setError(null);
    setHistory(null);
    try {
      // With billing on, the run carries the user id so the server can keep it
      // in history. The server decides whether this user may have history.
      const response = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(isBillingEnabled() ? { ...values, userId: getOrCreateUserId() } : values),
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

  function runPreset(key: string) {
    const preset = PRESETS[key];
    if (!preset) return;
    setForm(preset.values);
    setActivePreset(key);
    void diagnose(preset.values);
  }

  // A new result arrives below the form: bring it into view.
  useEffect(() => {
    if (report) revealResult('result-heading');
  }, [report]);

  // The landing's "Watch it catch a broken one" opens /diagnose?demo=broken:
  // the demo runs on arrival instead of asking for another click. Guarded so
  // React's development double-render does not run it twice.
  useEffect(() => {
    if (demoStarted.current) return;
    const demo = new URLSearchParams(window.location.search).get('demo');
    if (demo && PRESETS[demo]) {
      demoStarted.current = true;
      runPreset(demo);
    }
    // Runs once on arrival; the preset values are constants.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppShell
      title="Diagnose a dApp"
      intro={
        <p>
          Six read-only checks on the RPC configuration your app runs on. No private keys, no seed phrases, no
          transactions.
        </p>
      }
    >
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">Try it on</span>
        {Object.entries(PRESETS).map(([key, preset]) => (
          <button
            key={key}
            type="button"
            // A preset is a demo: one click fills the form and shows the result.
            onClick={() => runPreset(key)}
            disabled={running}
            aria-pressed={activePreset === key}
            title={preset.hint}
            className="btn-plain min-h-11 px-4 text-sm disabled:opacity-60"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <Sheet className="mt-6 px-5 py-6 sm:px-8 sm:py-8">
        <form
          className="grid gap-5 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            void diagnose();
          }}
        >
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
            <button type="submit" disabled={running} className="btn-pen min-h-12 px-6 disabled:opacity-60">
              {running ? 'Diagnosing…' : 'Diagnose'}
            </button>
          </div>
        </form>
      </Sheet>

      {error && (
        <div className="mt-8">
          <Notice tone="failure">{error}</Notice>
        </div>
      )}

      {report && <Report report={report} />}

      {report && history?.saved && (
        <div className="mt-6">
          <Notice tone="success">
            Saved to your{' '}
            <Link href="/history" prefetch={false} className="font-semibold underline underline-offset-4">
              diagnosis history
            </Link>
            . Launching on mainnet?{' '}
            <Link href="/launch" prefetch={false} className="font-semibold underline underline-offset-4">
              Run Launch Check
            </Link>
            .
          </Notice>
        </div>
      )}
      {report && history && !history.saved && history.reason === 'never-purchased' && (
        <div className="mt-6">
          <Notice tone="action">
            <Link href="/history" prefetch={false} className="font-semibold text-pen underline underline-offset-4">
              Keep every diagnosis and check your launch with Pro
            </Link>
            . Diagnosis stays free.
          </Notice>
        </div>
      )}
    </AppShell>
  );
}
