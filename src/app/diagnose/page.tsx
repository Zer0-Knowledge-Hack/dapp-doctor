'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AppShell } from '@/components/app/AppShell';
import { Field } from '@/components/app/Field';
import { Notice } from '@/components/app/Notice';
import { Report } from '@/components/app/Report';
import { revealResult } from '@/components/app/revealResult';
import { useEngineText, useLang } from '@/components/i18n/LanguageProvider';
import { Sheet } from '@/components/ui/Sheet';
import { getOrCreateUserId, isBillingEnabled } from '@/lib/billing/client';
import type { Lang } from '@/lib/i18n/lang';
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

const COPY = {
  en: {
    title: 'Diagnose a dApp',
    intro: 'Six read-only checks on the RPC configuration your app runs on. No private keys, no seed phrases, no transactions.',
    tryIt: 'Try it on',
    presets: {
      broken: { label: 'Broken demo', hint: 'The app points at Base Mainnet while expecting Base Sepolia. The typical silent failure.' },
      healthy: { label: 'Correct configuration', hint: 'Same app, network and fallback configured properly. Useful to compare before and after.' },
    },
    fields: {
      rpcUrl: 'Primary RPC',
      fallbackRpcUrl: 'Fallback RPC (optional)',
      expectedChainId: 'Expected chain ID',
      contractAddress: 'Contract address (optional)',
      criticalReadSignature: 'Critical read (optional)',
    },
    run: 'Diagnose',
    running: 'Diagnosing…',
    failed: 'The diagnosis failed.',
    unreachable: 'Could not reach the diagnostic engine.',
    saved: ['Saved to your', 'diagnosis history', '. Launching on mainnet?', 'Run Launch Check', '.'],
    upsell: ['Keep every diagnosis and check your launch with Pro', '. Diagnosis stays free.'],
  },
  es: {
    title: 'Diagnosticar una dApp',
    intro: 'Seis chequeos de solo lectura sobre la configuración RPC de tu app. Sin claves privadas, sin frases semilla, sin transacciones.',
    tryIt: 'Pruébalo con',
    presets: {
      broken: { label: 'Demo rota', hint: 'La app apunta a Base Mainnet pero espera Base Sepolia. La falla silenciosa típica.' },
      healthy: { label: 'Configuración correcta', hint: 'La misma app, con la red y el respaldo bien configurados. Sirve para comparar antes y después.' },
    },
    fields: {
      rpcUrl: 'RPC principal',
      fallbackRpcUrl: 'RPC de respaldo (opcional)',
      expectedChainId: 'Chain ID esperado',
      contractAddress: 'Dirección del contrato (opcional)',
      criticalReadSignature: 'Lectura crítica (opcional)',
    },
    run: 'Diagnosticar',
    running: 'Diagnosticando…',
    failed: 'El diagnóstico falló.',
    unreachable: 'No se pudo llegar al motor de diagnóstico.',
    saved: ['Guardado en tu', 'historial de diagnósticos', '. ¿Vas a lanzar en mainnet?', 'Corre Launch Check', '.'],
    upsell: ['Guarda cada diagnóstico y revisa tu lanzamiento con Pro', '. El diagnóstico sigue siendo gratis.'],
  },
} satisfies Record<Lang, unknown>;

const PRESETS: Record<string, { values: FormState }> = {
  broken: {
    values: {
      rpcUrl: 'https://mainnet.base.org',
      fallbackRpcUrl: '',
      expectedChainId: '84532',
      contractAddress: USDC_BASE,
      criticalReadSignature: 'symbol() returns (string)',
    },
  },
  healthy: {
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
  const copy = COPY[useLang()];
  const text = useEngineText();
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
        setError(payload.error ? text(payload.error) : copy.failed);
        setReport(null);
      } else {
        setReport(payload as DiagnosisReport);
        setHistory((payload as { history?: HistoryOutcome }).history ?? null);
      }
    } catch {
      setError(copy.unreachable);
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
      title={copy.title}
      intro={<p>{copy.intro}</p>}
    >
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">{copy.tryIt}</span>
        {Object.keys(PRESETS).map((key) => (
          // A preset's words live in the copy; its values are the same in every language.
          <button
            key={key}
            type="button"
            // A preset is a demo: one click fills the form and shows the result.
            onClick={() => runPreset(key)}
            disabled={running}
            aria-pressed={activePreset === key}
            title={copy.presets[key as keyof typeof copy.presets].hint}
            className="btn-plain min-h-11 px-4 text-sm disabled:opacity-60"
          >
            {copy.presets[key as keyof typeof copy.presets].label}
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
          <Field label={copy.fields.rpcUrl} value={form.rpcUrl} onChange={(v) => update('rpcUrl', v)} />
          <Field
            label={copy.fields.fallbackRpcUrl}
            value={form.fallbackRpcUrl}
            onChange={(v) => update('fallbackRpcUrl', v)}
          />
          <Field
            label={copy.fields.expectedChainId}
            value={form.expectedChainId}
            onChange={(v) => update('expectedChainId', v)}
          />
          <Field
            label={copy.fields.contractAddress}
            value={form.contractAddress}
            onChange={(v) => update('contractAddress', v)}
          />
          <div className="sm:col-span-2">
            <Field
              label={copy.fields.criticalReadSignature}
              value={form.criticalReadSignature}
              onChange={(v) => update('criticalReadSignature', v)}
            />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={running} className="btn-pen min-h-12 px-6 disabled:opacity-60">
              {running ? copy.running : copy.run}
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
            {copy.saved[0]}{' '}
            <Link href="/history" prefetch={false} className="font-semibold underline underline-offset-4">
              {copy.saved[1]}
            </Link>
            {copy.saved[2]}{' '}
            <Link href="/launch" prefetch={false} className="font-semibold underline underline-offset-4">
              {copy.saved[3]}
            </Link>
            {copy.saved[4]}
          </Notice>
        </div>
      )}
      {report && history && !history.saved && history.reason === 'never-purchased' && (
        <div className="mt-6">
          <Notice tone="action">
            <Link href="/history" prefetch={false} className="font-semibold text-pen underline underline-offset-4">
              {copy.upsell[0]}
            </Link>
            {copy.upsell[1]}
          </Notice>
        </div>
      )}
    </AppShell>
  );
}
