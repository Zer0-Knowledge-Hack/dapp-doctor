'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { Offering, Package } from '@revenuecat/purchases-js';
import { AppShell } from '@/components/app/AppShell';
import { Notice } from '@/components/app/Notice';
import { OutcomeLabel } from '@/components/app/OutcomeLabel';
import { useEngineText, useLang } from '@/components/i18n/LanguageProvider';
import type { StoredReport } from '@/lib/history/store';
import {
  getCurrentOffering,
  getOrCreateUserId,
  getProStatus,
  isBillingEnabled,
  presentPaywall,
  purchasePackage,
  type PaywallOutcome,
  type ProStatus,
} from '@/lib/billing/client';
import { USER_ID_HEADER } from '@/lib/billing/constants';
import { DeviceHistoryList } from '@/components/app/DeviceHistoryList';
import { describeChain } from '@/lib/diagnostics/networks';
import { readLocalHistory } from '@/lib/history/local';
import type { DashboardEvent } from '@/lib/dashboard/types';
import { LOCALE, type Lang } from '@/lib/i18n/lang';

type AccessState =
  | { kind: 'loading' }
  | { kind: 'disabled' }
  | { kind: 'error'; message: string }
  | { kind: 'locked'; reason: string; message: string; expiredAt?: string }
  | { kind: 'unlocked'; reports: StoredReport[]; expiresAt: string | null; storage: boolean };

type Message = { tone: 'info' | 'success' | 'failure'; text: string } | null;

const COPY = {
  en: {
    title: 'Diagnosis history',
    intro: 'Pro keeps every diagnosis you run, so you can see when a configuration broke and prove when it was fixed.',
    checking: 'Checking your access…',
    disabled: 'Diagnosis history is not enabled on this deployment yet. Diagnosis and comparison stay free and work as usual.',
    expiredHeading: 'Your Pro access has expired.',
    offerHeading: 'Keep every diagnosis with Pro.',
    expiredBody: (date?: string) => `Access ended${date ? ` on ${date}` : ''}. Your history is kept; renew to see it again.`,
    offerBody: 'Every diagnosis you run is saved automatically, and Launch Check holds your configuration to a stricter bar before you go to mainnet. Diagnosis and before/after comparison stay free.',
    buy: (plan: string) => `Buy ${plan}`,
    paywall: 'Compare plans in the paywall',
    noPlans: 'No plans are on sale right now.',
    testStore: 'Purchases on this deployment go through RevenueCat Test Store. They are test transactions: no card is charged.',
    active: 'Pro is active',
    lifetime: 'Lifetime access',
    renews: (date: string) => `Renews on ${date}`,
    ends: (date: string) => `Ends on ${date}`,
    testPurchase: 'Test Store purchase',
    runLaunch: 'Run Launch Check',
    manage: 'Manage subscription',
    yours: 'Your diagnoses',
    noStorage: 'Your Pro access is confirmed. History storage is not set up on this deployment yet, so new diagnoses are not being saved.',
    empty: ['No diagnoses saved yet.', 'Run one', 'and it will appear here.'],
    deviceTitle: 'On this device',
    open: 'Open',
    expects: 'expects',
    period: { none: 'one-time', P1M: 'per month', P1Y: 'per year', P1W: 'per week', every: 'every' },
    plans: {} as Record<string, string>,
  },
  es: {
    title: 'Historial de diagnósticos',
    intro: 'Pro guarda cada diagnóstico que corres, para ver cuándo se rompió una configuración y probar cuándo se arregló.',
    checking: 'Revisando tu acceso…',
    disabled: 'El historial todavía no está habilitado en este despliegue. El diagnóstico y la comparación siguen gratis y funcionan como siempre.',
    expiredHeading: 'Tu acceso Pro venció.',
    offerHeading: 'Guarda cada diagnóstico con Pro.',
    expiredBody: (date?: string) => `El acceso terminó${date ? ` el ${date}` : ''}. Tu historial se conserva; renueva para volver a verlo.`,
    offerBody: 'Cada diagnóstico que corres se guarda solo, y Launch Check le exige más a tu configuración antes de ir a mainnet. El diagnóstico y la comparación antes/después siguen gratis.',
    buy: (plan: string) => `Comprar ${plan}`,
    paywall: 'Comparar planes en el paywall',
    noPlans: 'No hay planes a la venta ahora.',
    testStore: 'Las compras en este despliegue pasan por RevenueCat Test Store. Son transacciones de prueba: no se cobra ninguna tarjeta.',
    active: 'Pro está activo',
    lifetime: 'Acceso de por vida',
    renews: (date: string) => `Se renueva el ${date}`,
    ends: (date: string) => `Termina el ${date}`,
    testPurchase: 'Compra de Test Store',
    runLaunch: 'Correr Launch Check',
    manage: 'Administrar la suscripción',
    yours: 'Tus diagnósticos',
    noStorage: 'Tu acceso Pro está confirmado. El guardado del historial todavía no está configurado en este despliegue, así que los diagnósticos nuevos no se guardan.',
    empty: ['Todavía no hay diagnósticos guardados.', 'Corre uno', 'y aparecerá aquí.'],
    deviceTitle: 'En este dispositivo',
    open: 'Abrir',
    expects: 'espera',
    period: { none: 'pago único', P1M: 'por mes', P1Y: 'por año', P1W: 'por semana', every: 'cada' },
    // Package names come from RevenueCat in English; these are the ones this offering sells.
    plans: { $rc_monthly: 'Mensual', $rc_annual: 'Anual', $rc_lifetime: 'De por vida' } as Record<string, string>,
  },
} satisfies Record<Lang, unknown>;

type Copy = (typeof COPY)[Lang];

/** "P1M" → "per month". A null period is a one-time (lifetime) purchase. */
function describePeriod(period: string | null, copy: Copy): string {
  if (!period) return copy.period.none;
  if (period === 'P1M' || period === 'P1Y' || period === 'P1W') return copy.period[period];
  return `${copy.period.every} ${period.replace(/^P/, '').toLowerCase()}`;
}

/** In the page's language, whatever the browser's locale. */
function formatDate(value: string | Date, lang: Lang): string {
  return new Date(value).toLocaleDateString(LOCALE[lang], { year: 'numeric', month: 'short', day: 'numeric' });
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function HistoryPage() {
  const lang = useLang();
  const copy = COPY[lang];
  const text = useEngineText();
  const [access, setAccess] = useState<AccessState>({ kind: 'loading' });
  const [offering, setOffering] = useState<Offering | null>(null);
  const [status, setStatus] = useState<ProStatus | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState(false);
  const [localLog, setLocalLog] = useState<DashboardEvent[]>([]);

  /**
   * The server is the source of truth for access. The browser SDK can say a
   * purchase went through; only the server's own RevenueCat check unlocks
   * the history.
   */
  const loadHistory = useCallback(async (): Promise<AccessState> => {
    if (!isBillingEnabled()) return { kind: 'disabled' };
    try {
      // In a header, not the URL: the id reads this history, and URLs are logged.
      const response = await fetch('/api/history', {
        cache: 'no-store',
        headers: { [USER_ID_HEADER]: getOrCreateUserId() },
      });
      const payload = await response.json();
      if (response.ok) {
        return {
          kind: 'unlocked',
          reports: payload.reports,
          expiresAt: payload.access?.expiresAt ?? null,
          storage: payload.storage !== false,
        };
      }
      if (response.status === 402) {
        return { kind: 'locked', reason: payload.reason, message: payload.error, expiredAt: payload.expiredAt };
      }
      if (response.status === 503 && /not enabled/i.test(payload.error ?? '')) return { kind: 'disabled' };
      return { kind: 'error', message: payload.error ?? 'Could not load your history.' };
    } catch {
      return { kind: 'error', message: 'Could not reach DApp Doctor. Check your connection and reload.' };
    }
  }, []);

  useEffect(() => {
    setLocalLog(readLocalHistory());
  }, [access]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = await loadHistory();
      if (cancelled) return;
      setAccess(next);
      if (next.kind === 'disabled') return;
      // Offer and client-side status are for display only.
      const [currentOffering, proStatus] = await Promise.all([
        getCurrentOffering().catch(() => null),
        getProStatus().catch(() => null),
      ]);
      if (cancelled) return;
      setOffering(currentOffering);
      setStatus(proStatus);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadHistory]);

  /**
   * After a purchase, RevenueCat can take a moment to reflect it on the
   * server side. Re-ask the server a few times instead of trusting the
   * browser's word that access was granted.
   */
  async function confirmAccessAfterPurchase(purchased: ProStatus) {
    setStatus(purchased);
    for (let attempt = 0; attempt < 4; attempt++) {
      const next = await loadHistory();
      if (next.kind === 'unlocked') {
        setAccess(next);
        return true;
      }
      await wait(1500);
    }
    setAccess(await loadHistory());
    return false;
  }

  async function handleOutcome(outcome: PaywallOutcome) {
    if (outcome.kind === 'purchased') {
      const confirmed = await confirmAccessAfterPurchase(outcome.status);
      const testNote = outcome.status.store === 'test_store' ? ' This was a Test Store transaction: no card was charged.' : '';
      setMessage(
        confirmed
          ? { tone: 'success', text: `Pro unlocked.${testNote}` }
          : {
              tone: 'info',
              text: `The purchase went through, but the server has not confirmed access yet. Reload in a moment.${testNote}`,
            },
      );
    } else if (outcome.kind === 'cancelled') {
      setMessage({ tone: 'info', text: 'Purchase cancelled. Nothing was charged and your access is unchanged.' });
    } else if (outcome.kind === 'failed') {
      setMessage({ tone: 'failure', text: outcome.simulated ? outcome.message : `The purchase failed: ${outcome.message}` });
    } else {
      setMessage({
        tone: 'info',
        text: 'The designed paywall is not available right now. Choose a plan from the list below instead.',
      });
    }
  }

  async function openPaywall() {
    if (!offering) return;
    setBusy(true);
    setMessage(null);
    try {
      await handleOutcome(await presentPaywall(offering));
    } finally {
      setBusy(false);
    }
  }

  async function buy(rcPackage: Package) {
    setBusy(true);
    setMessage(null);
    try {
      await handleOutcome(await purchasePackage(rcPackage));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      title={copy.title}
      intro={<p>{copy.intro}</p>}
    >
      {message && (
        <div className="mt-8">
          <Notice tone={message.tone}>{text(message.text)}</Notice>
        </div>
      )}

      {access.kind === 'loading' && <p className="mt-10 text-muted">{copy.checking}</p>}

      {access.kind === 'disabled' && (
        <div className="mt-10">
          <Notice>{copy.disabled}</Notice>
        </div>
      )}

      {access.kind === 'error' && (
        <div className="mt-10">
          <Notice tone="failure">{text(access.message)}</Notice>
        </div>
      )}

      {access.kind === 'locked' && (
        <section aria-labelledby="offer-heading" className="mt-12">
          <h2 id="offer-heading" className="font-display text-[clamp(1.35rem,3vw,1.75rem)] leading-[1.1] font-black">
            {access.reason === 'expired' ? copy.expiredHeading : copy.offerHeading}
          </h2>
          <p className="mt-5 max-w-[65ch]">
            {access.reason === 'expired'
              ? copy.expiredBody(access.expiredAt ? formatDate(access.expiredAt, lang) : undefined)
              : copy.offerBody}
          </p>

          {offering ? (
            <>
              <dl className="mt-9 grid border-y-2 border-ink md:grid-cols-3">
                {offering.availablePackages.map((rcPackage) => {
                  const product = rcPackage.webBillingProduct;
                  const planName = copy.plans[rcPackage.identifier] ?? product.title;
                  const price = (product.currentPrice.amountMicros / 1_000_000).toFixed(2);
                  return (
                    <div
                      key={rcPackage.identifier}
                      className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-4 border-b border-ink py-6 last:border-b-0 md:block md:border-r md:border-b-0 md:px-7 md:py-8 md:first:pl-0 md:last:border-r-0"
                    >
                      <dt className="text-lg font-semibold">{planName}</dt>
                      <dd className="md:mt-4">
                        <div className="flex items-baseline justify-end gap-2 md:justify-start">
                          <span className="text-sm text-muted">{product.currentPrice.currency}</span>
                          <span className="font-display text-[clamp(1.5rem,3vw,2rem)] leading-none font-bold">{price}</span>
                        </div>
                        <span className="mt-2 block text-right text-sm text-muted md:text-left">
                          {describePeriod(product.normalPeriodDuration, copy)}
                        </span>
                      </dd>
                      <dd className="col-span-2 md:mt-6">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => buy(rcPackage)}
                          className="btn-pen min-h-12 w-full px-5 disabled:opacity-60 md:w-auto"
                        >
                          {copy.buy(planName)}
                        </button>
                      </dd>
                    </div>
                  );
                })}
              </dl>
              <button
                type="button"
                disabled={busy}
                onClick={openPaywall}
                className="mt-6 min-h-11 text-sm font-semibold underline underline-offset-4 disabled:opacity-60"
              >
                {copy.paywall}
              </button>
            </>
          ) : (
            <p className="mt-8 text-muted">{copy.noPlans}</p>
          )}

          <p className="mt-6 max-w-[65ch] border-l-4 border-ink pl-4 text-sm leading-relaxed">
            {copy.testStore}
          </p>
        </section>
      )}

      {access.kind === 'unlocked' && (
        <section aria-labelledby="history-heading" className="mt-12">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-l-4 border-triage-green bg-sheet px-4 py-3 text-sm">
            <span className="font-semibold">{copy.active}</span>
            <span className="text-muted">
              {access.expiresAt === null
                ? copy.lifetime
                : (status?.willRenew ? copy.renews : copy.ends)(formatDate(access.expiresAt, lang))}
            </span>
            {status?.store === 'test_store' && <span className="text-muted">{copy.testPurchase}</span>}
            <Link href="/launch" prefetch={false} className="font-semibold text-pen underline underline-offset-4">
              {copy.runLaunch}
            </Link>
            {status?.managementURL && (
              <a
                href={status.managementURL}
                target="_blank"
                rel="noreferrer"
                className="ml-auto font-semibold underline underline-offset-4"
              >
                {copy.manage}
              </a>
            )}
          </div>

          <h2 id="history-heading" className="mt-8 mb-4 font-display text-[clamp(1.35rem,3vw,1.75rem)] leading-[1.1] font-black">
            {copy.yours}
          </h2>

          {!access.storage ? (
            <Notice>{copy.noStorage}</Notice>
          ) : access.reports.length === 0 ? (
            <Notice tone="action">
              {copy.empty[0]}{' '}
              <Link href="/diagnose" prefetch={false} className="font-semibold text-pen underline underline-offset-4">
                {copy.empty[1]}
              </Link>{' '}
              {copy.empty[2]}
            </Notice>
          ) : (
            <ol className="border-t-2 border-ink">
              {access.reports.map((entry) => (
                <li key={entry.id} className="border-b border-ink py-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <OutcomeLabel outcome={entry.report.status} />
                    <span className="text-sm text-muted">{new Date(entry.savedAt).toLocaleString(LOCALE[lang], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                  <p className="mt-2 max-w-[70ch] font-semibold">{text(entry.report.headline)}</p>
                  <p className="mt-1 text-sm text-muted">
                    <span className="font-mono break-all">{entry.report.target.rpcUrl}</span>, {copy.expects}{' '}
                    {describeChain(entry.report.target.expectedChainId)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}

      <DeviceHistoryList events={localLog} title={copy.deviceTitle} openLabel={copy.open} lang={lang} />
    </AppShell>
  );
}
