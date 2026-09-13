'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AccountNotice } from '@/components/account/AccountNotice';
import { AppShell } from '@/components/app/AppShell';
import { Field } from '@/components/app/Field';
import { LaunchReport } from '@/components/app/LaunchReport';
import { DiagnosisLoadingState } from '@/components/brand/DiagnosisStates';
import { Notice } from '@/components/app/Notice';
import { revealResult } from '@/components/app/revealResult';
import { useEngineText, useLang } from '@/components/i18n/LanguageProvider';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Sheet } from '@/components/ui/Sheet';
import { getOrCreateUserId, getProStatus, isBillingEnabled } from '@/lib/billing/client';
import { USER_ID_HEADER } from '@/lib/billing/constants';
import { hasFieldErrors, validateTargetFields } from '@/lib/forms/targetFields';
import type { Lang } from '@/lib/i18n/lang';
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

const COPY = {
  en: {
    title: 'Launch Check',
    intro: 'Before real users reach your dApp on mainnet. The six checks at launch strictness, plus the rules a production configuration has to meet. Part of DApp Doctor Pro. Still read-only.',
    free: ['Launch Check is part of Pro.', 'See Pro plans', '. Diagnosis stays free.'],
    disabled: 'Launch Check is not enabled on this deployment yet. Diagnosis and comparison stay free and work as usual.',
    tryIt: 'Try it on',
    presets: {
      freeReady: { label: 'Ready in the free diagnosis', hint: 'The configuration /diagnose calls READY. A launch holds it to a stricter bar.' },
      testnet: { label: 'Still on testnet', hint: 'Base Sepolia with no fallback: fine while testing, not for a launch.' },
    },
    fields: { rpcUrl: 'Primary RPC', fallbackRpcUrl: 'Fallback RPC', expectedChainId: 'Chain ID you launch on', contractAddress: 'Contract address', criticalReadSignature: 'Critical read' },
    run: 'Run Launch Check',
    running: 'Running launch checks…',
    failed: 'The Launch Check failed.',
    unreachable: 'Could not reach the diagnostic engine. Check the connection and retry.',
    learnMore: 'Learn more',
    validation: {
      rpcUrl: 'Enter a valid RPC URL.',
      chainId: 'Chain ID must be a positive integer.',
      contract: 'Enter a valid EVM contract address.',
      fallback: 'Fallback RPC must be a valid http(s) URL.',
      signature: 'Use a zero-argument read, e.g. symbol() returns (string).',
    },
    expiredHeading: 'Your Pro access has expired.',
    lockedHeading: 'Launch Check is part of Pro.',
    lockedBody: 'Pro runs the six checks at launch strictness and adds the rules a production configuration has to meet. It also keeps every diagnosis you run. Diagnosis and comparison stay free.',
    renew: 'Renew Pro',
    seePlans: 'See Pro plans',
  },
  es: {
    title: 'Launch Check',
    intro: 'Antes de que usuarios reales lleguen a tu dApp en mainnet. Los seis chequeos con la exigencia de un lanzamiento, más las reglas que tiene que cumplir una configuración de producción. Parte de DApp Doctor Pro. Sigue siendo de solo lectura.',
    free: ['Launch Check es parte de Pro.', 'Ver los planes Pro', '. El diagnóstico sigue siendo gratis.'],
    disabled: 'Launch Check todavía no está habilitado en este despliegue. El diagnóstico y la comparación siguen gratis y funcionan como siempre.',
    tryIt: 'Pruébalo con',
    presets: {
      freeReady: { label: 'Listo en el diagnóstico gratis', hint: 'La configuración que /diagnose da como LISTO. Un lanzamiento le exige más.' },
      testnet: { label: 'Todavía en testnet', hint: 'Base Sepolia sin respaldo: sirve para probar, no para lanzar.' },
    },
    fields: { rpcUrl: 'RPC principal', fallbackRpcUrl: 'RPC de respaldo', expectedChainId: 'Chain ID donde lanzas', contractAddress: 'Dirección del contrato', criticalReadSignature: 'Lectura crítica' },
    run: 'Correr Launch Check',
    running: 'Corriendo los chequeos de lanzamiento…',
    failed: 'Launch Check falló.',
    unreachable: 'No se pudo llegar al motor de diagnóstico. Revisá la conexión y reintentá.',
    learnMore: 'Saber más',
    validation: {
      rpcUrl: 'Ingresá una URL de RPC válida.',
      chainId: 'El chain ID tiene que ser un entero positivo.',
      contract: 'Ingresá una dirección EVM válida.',
      fallback: 'El RPC de respaldo tiene que ser una URL http(s) válida.',
      signature: 'Usá una lectura de cero argumentos, p. ej. symbol() returns (string).',
    },
    expiredHeading: 'Tu acceso Pro venció.',
    lockedHeading: 'Launch Check es parte de Pro.',
    lockedBody: 'Pro corre los seis chequeos con la exigencia de un lanzamiento y agrega las reglas que tiene que cumplir una configuración de producción. También guarda cada diagnóstico que corres. El diagnóstico y la comparación siguen gratis.',
    renew: 'Renovar Pro',
    seePlans: 'Ver los planes Pro',
  },
} satisfies Record<Lang, unknown>;

const PRESETS: Record<'freeReady' | 'testnet', { values: FormState }> = {
  freeReady: {
    values: {
      rpcUrl: 'https://mainnet.base.org',
      fallbackRpcUrl: 'https://base-rpc.publicnode.com',
      expectedChainId: '8453',
      contractAddress: USDC_BASE,
      criticalReadSignature: 'symbol() returns (string)',
    },
  },
  testnet: {
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
  const copy = COPY[useLang()];
  const text = useEngineText();
  const [form, setForm] = useState<FormState>(PRESETS.freeReady.values);
  const [activePreset, setActivePreset] = useState<string | null>('freeReady');
  const [access, setAccess] = useState<Access>({ kind: 'checking' });
  const [report, setReport] = useState<LaunchReportData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const fieldErrors = validateTargetFields(form, copy.validation);
  const invalid = hasFieldErrors(fieldErrors);

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
    if (hasFieldErrors(validateTargetFields(values, copy.validation))) {
      setAttempted(true);
      setForm(values);
      return;
    }
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
        setError(payload.error ? text(payload.error) : copy.failed);
        setReport(null);
      }
    } catch {
      setError(copy.unreachable);
      setReport(null);
    } finally {
      setRunning(false);
    }
  }

  function runPreset(key: keyof typeof PRESETS) {
    const preset = PRESETS[key];
    if (!preset) return;
    setForm(preset.values);
    setActivePreset(key);
    void runCheck(preset.values);
  }

  const disabled = access.kind === 'disabled';

  return (
    <AppShell
      title={copy.title}
      intro={<p>{copy.intro}</p>}
    >
      {access.kind === 'free' && (
        <div className="mt-8">
          <Notice tone="action">
            {copy.free[0]}{' '}
            <Link href="/history" prefetch={false} className="font-semibold text-pen underline underline-offset-4">
              {copy.free[1]}
            </Link>
            {copy.free[2]}
          </Notice>
        </div>
      )}

      {disabled && (
        <div className="mt-8">
          <Notice>{copy.disabled}</Notice>
        </div>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">{copy.tryIt}</span>
        {(Object.keys(PRESETS) as Array<keyof typeof PRESETS>).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => runPreset(key)}
            disabled={running || disabled}
            aria-pressed={activePreset === key}
            title={copy.presets[key].hint}
            className="btn-plain min-h-11 px-4 text-sm disabled:opacity-60"
          >
            {copy.presets[key].label}
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
          <Field label={copy.fields.rpcUrl} value={form.rpcUrl} onChange={(v) => update('rpcUrl', v)} error={attempted ? fieldErrors.rpcUrl : undefined} learnMoreHref="/help#rpc-url" learnMoreLabel={copy.learnMore} />
          <Field label={copy.fields.fallbackRpcUrl} value={form.fallbackRpcUrl} onChange={(v) => update('fallbackRpcUrl', v)} error={attempted ? fieldErrors.fallbackRpcUrl : undefined} learnMoreHref="/help#fallback" learnMoreLabel={copy.learnMore} />
          <Field label={copy.fields.expectedChainId} value={form.expectedChainId} onChange={(v) => update('expectedChainId', v)} error={attempted ? fieldErrors.expectedChainId : undefined} learnMoreHref="/help#chain-id" learnMoreLabel={copy.learnMore} />
          <Field label={copy.fields.contractAddress} value={form.contractAddress} onChange={(v) => update('contractAddress', v)} error={attempted ? fieldErrors.contractAddress : undefined} learnMoreHref="/help#contract" learnMoreLabel={copy.learnMore} />
          <div className="sm:col-span-2">
            <Field
              label={copy.fields.criticalReadSignature}
              value={form.criticalReadSignature}
              onChange={(v) => update('criticalReadSignature', v)}
              error={attempted ? fieldErrors.criticalReadSignature : undefined}
              learnMoreHref="/help#critical-read"
              learnMoreLabel={copy.learnMore}
            />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={running || disabled || (attempted && invalid)} className="btn-pen min-h-12 px-6 disabled:opacity-60">
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

      {access.kind === 'locked' && (
        <section aria-labelledby="locked-heading" className="mt-12">
          <h2 id="locked-heading" className="font-display text-[clamp(1.35rem,3vw,1.75rem)] leading-[1.1] font-black">
            {access.reason === 'expired' ? copy.expiredHeading : copy.lockedHeading}
          </h2>
          <p className="mt-5 max-w-[65ch]">
            {access.reason === 'expired' ? text(access.message) : copy.lockedBody}
          </p>
          <div className="mt-6">
            <AccountNotice />
          </div>
          <div className="mt-7">
            <ButtonLink href="/history" variant="pen">
              {access.reason === 'expired' ? copy.renew : copy.seePlans}
            </ButtonLink>
          </div>
        </section>
      )}

      {running ? <DiagnosisLoadingState /> : report && <LaunchReport report={report} />}
    </AppShell>
  );
}
