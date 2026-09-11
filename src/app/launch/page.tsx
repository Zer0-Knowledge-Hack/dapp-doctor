'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AppShell } from '@/components/app/AppShell';
import { Field } from '@/components/app/Field';
import { LaunchReport } from '@/components/app/LaunchReport';
import { Notice } from '@/components/app/Notice';
import { revealResult } from '@/components/app/revealResult';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Sheet } from '@/components/ui/Sheet';
import { getOrCreateUserId, getProStatus, isBillingEnabled } from '@/lib/billing/client';
import { USER_ID_HEADER } from '@/lib/billing/constants';
import type { LaunchReport as LaunchReportData } from '@/lib/launch/run';

const USDC_BASE = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const USDC_BASE_SEPOLIA = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

interface FormState {
  rpcUrl: string;
  fallbackRpcUrl: string;
  expectedChainId: string;
  contractAddress: string;
  criticalReadSignature: string;
}

const PRESETS: Record<string, { label: string; hint: string; values: FormState }> = {
  freeReady: {
    label: 'Ready in the free diagnosis',
    hint: 'The configuration /diagnose calls READY. A launch holds it to a stricter bar.',
    values: {
      rpcUrl: 'https://mainnet.base.org',
      fallbackRpcUrl: 'https://base-rpc.publicnode.com',
      expectedChainId: '8453',
      contractAddress: USDC_BASE,
      criticalReadSignature: 'symbol() returns (string)',
    },
  },
  testnet: {
    label: 'Still on testnet',
    hint: 'Base Sepolia with no fallback: fine while testing, not for a launch.',
    values: {
      rpcUrl: 'https://sepolia.base.org',
      fallbackRpcUrl: '',
      expectedChainId: '84532',
      contractAddress: USDC_BASE_SEPOLIA,
      criticalReadSignature: 'symbol() returns (string)',
    },
  },
};

/** Who may run this. The server decides; the browser only shapes what is shown first. */
type Access =
  | { kind: 'checking' }
  | { kind: 'disabled' }
  | { kind: 'pro' }
  | { kind: 'free' }
  | { kind: 'locked'; reason: string; message: string };

export default function LaunchPage() {
  const [form, setForm] = useState<FormState>(PRESETS.freeReady.values);
  const [activePreset, setActivePreset] = useState<string | null>('freeReady');
  const [access, setAccess] = useState<Access>({ kind: 'checking' });
  const [report, setReport] = useState<LaunchReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  // Display only: the browser's word on Pro decides what is shown first, and
  // the server's own check decides what is served.
  useEffect(() => {
    if (!isBillingEnabled()) {
      setAccess({ kind: 'disabled' });
      return;
    }
    let cancelled = false;
    getProStatus()
      .then((status) => !cancelled && setAccess({ kind: status.active ? 'pro' : 'free' }))
      .catch(() => !cancelled && setAccess({ kind: 'free' }));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (report) revealResult('result-heading');
  }, [report]);

  // A refusal lands below the form too, and must not look like nothing happened.
  useEffect(() => {
    if (access.kind === 'locked') revealResult('locked-heading');
  }, [access.kind]);

  function update(field: keyof FormState, value: string) {
    setActivePreset(null);
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  /** Takes the values explicitly so a preset can run the moment it is chosen. */
  async function runCheck(values: FormState = form) {
    setRunning(true);
    setError(null);
    try {
      const response = await fetch('/api/launch-check', {
        method: 'POST',
        // In a header, not the body or URL: the id is what the server checks access against.
        headers: { 'content-type': 'application/json', [USER_ID_HEADER]: getOrCreateUserId() },
        body: JSON.stringify(values),
      });
      const payload = await response.json();
      if (response.ok) {
        setReport(payload as LaunchReportData);
        setAccess({ kind: 'pro' });
      } else if (response.status === 402) {
        setReport(null);
        setAccess({ kind: 'locked', reason: payload.reason, message: payload.error });
      } else if (response.status === 503 && /not enabled/i.test(payload.error ?? '')) {
        setReport(null);
        setAccess({ kind: 'disabled' });
      } else {
        setError(payload.error ?? 'The Launch Check failed.');
        setReport(null);
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
    void runCheck(preset.values);
  }

  const disabled = access.kind === 'disabled';

  return (
    <AppShell
      title="Launch Check"
      intro={
        <p>
          Before real users reach your dApp on mainnet. The six checks at launch strictness, plus the rules a
          production configuration has to meet. Part of DApp Doctor Pro. Still read-only.
        </p>
      }
    >
      {access.kind === 'free' && (
        <div className="mt-8">
          <Notice tone="action">
            Launch Check is part of Pro.{' '}
            <Link href="/history" prefetch={false} className="font-semibold text-pen underline underline-offset-4">
              See Pro plans
            </Link>
            . Diagnosis stays free.
          </Notice>
        </div>
      )}

      {disabled && (
        <div className="mt-8">
          <Notice>
            Launch Check is not enabled on this deployment yet. Diagnosis and comparison stay free and work as usual.
          </Notice>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">Try it on</span>
        {Object.entries(PRESETS).map(([key, preset]) => (
          <button
            key={key}
            type="button"
            onClick={() => runPreset(key)}
            disabled={running || disabled}
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
            void runCheck();
          }}
        >
          <Field label="Primary RPC" value={form.rpcUrl} onChange={(v) => update('rpcUrl', v)} />
          <Field label="Fallback RPC" value={form.fallbackRpcUrl} onChange={(v) => update('fallbackRpcUrl', v)} />
          <Field label="Chain ID you launch on" value={form.expectedChainId} onChange={(v) => update('expectedChainId', v)} />
          <Field label="Contract address" value={form.contractAddress} onChange={(v) => update('contractAddress', v)} />
          <div className="sm:col-span-2">
            <Field
              label="Critical read"
              value={form.criticalReadSignature}
              onChange={(v) => update('criticalReadSignature', v)}
            />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={running || disabled} className="btn-pen min-h-12 px-6 disabled:opacity-60">
              {running ? 'Checking…' : 'Run Launch Check'}
            </button>
          </div>
        </form>
      </Sheet>

      {error && (
        <div className="mt-8">
          <Notice tone="failure">{error}</Notice>
        </div>
      )}

      {access.kind === 'locked' && (
        <section aria-labelledby="locked-heading" className="mt-12">
          <h2 id="locked-heading" className="font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[0.95] font-black">
            {access.reason === 'expired' ? 'Your Pro access has expired.' : 'Launch Check is part of Pro.'}
          </h2>
          <p className="mt-5 max-w-[65ch]">
            {access.reason === 'expired'
              ? access.message
              : 'Pro runs the six checks at launch strictness and adds the rules a production configuration has to meet. It also keeps every diagnosis you run. Diagnosis and comparison stay free.'}
          </p>
          <div className="mt-7">
            <ButtonLink href="/history" variant="pen">
              {access.reason === 'expired' ? 'Renew Pro' : 'See Pro plans'}
            </ButtonLink>
          </div>
        </section>
      )}

      {report && <LaunchReport report={report} />}
    </AppShell>
  );
}
