'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { Offering, Package } from '@revenuecat/purchases-js';
import type { OverallStatus } from '@/lib/diagnostics/types';
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

type AccessState =
  | { kind: 'loading' }
  | { kind: 'disabled' }
  | { kind: 'error'; message: string }
  | { kind: 'locked'; reason: string; message: string; expiredAt?: string }
  | { kind: 'unlocked'; reports: StoredReport[]; expiresAt: string | null };

type Notice = { tone: 'neutral' | 'success' | 'failure'; text: string } | null;

const STATUS_STYLE: Record<OverallStatus, string> = {
  READY: 'text-emerald-300 border-emerald-500/40 bg-emerald-500/10',
  AT_RISK: 'text-amber-300 border-amber-500/40 bg-amber-500/10',
  BLOCKED: 'text-rose-300 border-rose-500/40 bg-rose-500/10',
  NOT_TESTED: 'text-zinc-400 border-zinc-600/40 bg-zinc-500/10',
};

const NOTICE_STYLE = {
  neutral: 'border-zinc-700 bg-zinc-900 text-zinc-300',
  success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  failure: 'border-rose-500/40 bg-rose-500/10 text-rose-200',
};

/** "P1M" → "per month". A null period is a one-time (lifetime) purchase. */
function describePeriod(period: string | null): string {
  if (!period) return 'one-time payment';
  if (period === 'P1M') return 'per month';
  if (period === 'P1Y') return 'per year';
  if (period === 'P1W') return 'per week';
  return `every ${period.replace(/^P/, '').toLowerCase()}`;
}

function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function History() {
  const [access, setAccess] = useState<AccessState>({ kind: 'loading' });
  const [offering, setOffering] = useState<Offering | null>(null);
  const [status, setStatus] = useState<ProStatus | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState(false);

  /**
   * The server is the source of truth for access. The browser SDK can say a
   * purchase went through; only the server's own RevenueCat check unlocks
   * the history.
   */
  const loadHistory = useCallback(async (): Promise<AccessState> => {
    if (!isBillingEnabled()) return { kind: 'disabled' };
    try {
      const response = await fetch(`/api/history?userId=${encodeURIComponent(getOrCreateUserId())}`, {
        cache: 'no-store',
      });
      const payload = await response.json();
      if (response.ok) return { kind: 'unlocked', reports: payload.reports, expiresAt: payload.access?.expiresAt ?? null };
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
      setNotice(
        confirmed
          ? { tone: 'success', text: `Pro unlocked.${testNote}` }
          : {
              tone: 'neutral',
              text: `The purchase went through, but the server has not confirmed access yet. Reload in a moment.${testNote}`,
            },
      );
    } else if (outcome.kind === 'cancelled') {
      setNotice({ tone: 'neutral', text: 'Purchase cancelled. Nothing was charged and your access is unchanged.' });
    } else if (outcome.kind === 'failed') {
      setNotice({ tone: 'failure', text: outcome.simulated ? outcome.message : `The purchase failed: ${outcome.message}` });
    } else {
      setNotice({
        tone: 'neutral',
        text: 'The designed paywall is not available right now. Choose a plan from the list below instead.',
      });
    }
  }

  async function openPaywall() {
    if (!offering) return;
    setBusy(true);
    setNotice(null);
    try {
      await handleOutcome(await presentPaywall(offering));
    } finally {
      setBusy(false);
    }
  }

  async function buy(rcPackage: Package) {
    setBusy(true);
    setNotice(null);
    try {
      await handleOutcome(await purchasePackage(rcPackage));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-10">
        <Link href="/" className="text-xs text-zinc-500 transition hover:text-zinc-300">
          Back to diagnosis
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Diagnosis history</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Pro keeps every diagnosis you run, so you can see when a configuration broke and prove when it was
          fixed.
        </p>
      </header>

      {notice && (
        <p className={`mb-6 rounded-md border px-4 py-3 text-sm ${NOTICE_STYLE[notice.tone]}`}>{notice.text}</p>
      )}

      {access.kind === 'loading' && <p className="text-sm text-zinc-500">Checking your access…</p>}

      {access.kind === 'disabled' && (
        <p className="rounded-md border border-zinc-800 px-4 py-3 text-sm text-zinc-400">
          Diagnosis history is not enabled on this deployment yet. Diagnosis and comparison stay free and work
          as usual.
        </p>
      )}

      {access.kind === 'error' && (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {access.message}
        </p>
      )}

      {access.kind === 'locked' && (
        <section className="rounded-lg border border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-zinc-100">
            {access.reason === 'expired' ? 'Your Pro access has expired' : 'Keep every diagnosis with Pro'}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            {access.reason === 'expired'
              ? `Access ended${access.expiredAt ? ` on ${formatDate(access.expiredAt)}` : ''}. Your history is kept; renew to see it again.`
              : 'Every diagnosis you run is saved automatically. Diagnosis and before/after comparison stay free.'}
          </p>

          {offering ? (
            <>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {offering.availablePackages.map((rcPackage) => {
                  const product = rcPackage.webBillingProduct;
                  return (
                    <div key={rcPackage.identifier} className="flex flex-col rounded-lg border border-zinc-800 p-4">
                      <span className="text-sm font-medium text-zinc-200">{product.title}</span>
                      <span className="mt-2 text-2xl font-semibold text-zinc-50">
                        {product.currentPrice.formattedPrice}
                      </span>
                      <span className="text-xs text-zinc-500">{describePeriod(product.normalPeriodDuration)}</span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => buy(rcPackage)}
                        className="mt-4 rounded-md bg-white px-3 py-2 text-sm font-medium text-black transition hover:bg-zinc-200 disabled:opacity-50"
                      >
                        Buy {product.title}
                      </button>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={openPaywall}
                className="mt-4 text-sm text-zinc-400 underline-offset-4 transition hover:text-zinc-200 hover:underline disabled:opacity-50"
              >
                Compare plans in the paywall
              </button>
            </>
          ) : (
            <p className="mt-6 text-sm text-zinc-500">No plans are on sale right now.</p>
          )}

          <p className="mt-6 border-t border-zinc-800 pt-4 text-xs text-zinc-500">
            Purchases on this deployment go through RevenueCat Test Store. They are test transactions: no card is
            charged.
          </p>
        </section>
      )}

      {access.kind === 'unlocked' && (
        <section>
          <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm">
            <span className="font-medium text-emerald-200">Pro is active</span>
            <span className="text-zinc-400">
              {access.expiresAt === null
                ? 'Lifetime access'
                : `${status?.willRenew ? 'Renews' : 'Ends'} on ${formatDate(access.expiresAt)}`}
            </span>
            {status?.store === 'test_store' && <span className="text-zinc-500">Test Store purchase</span>}
            {status?.managementURL && (
              <a
                href={status.managementURL}
                target="_blank"
                rel="noreferrer"
                className="ml-auto text-zinc-300 underline-offset-4 hover:underline"
              >
                Manage subscription
              </a>
            )}
          </div>

          {access.reports.length === 0 ? (
            <p className="rounded-md border border-zinc-800 px-4 py-6 text-sm text-zinc-400">
              No diagnoses saved yet. <Link href="/" className="text-zinc-200 underline-offset-4 hover:underline">Run one</Link>{' '}
              and it will appear here.
            </p>
          ) : (
            <ol className="space-y-3">
              {access.reports.map((entry) => (
                <li key={entry.id} className="rounded-lg border border-zinc-800 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[entry.report.status]}`}
                    >
                      {entry.report.status.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-zinc-500">{new Date(entry.savedAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-2 text-sm text-zinc-200">{entry.report.headline}</p>
                  <p className="mt-1 break-all font-mono text-xs text-zinc-500">
                    {entry.report.target.rpcUrl} · expects chain {entry.report.target.expectedChainId}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </main>
  );
}
