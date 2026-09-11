'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import type { Offering, Package } from '@revenuecat/purchases-js';
import { AppShell } from '@/components/app/AppShell';
import { Notice } from '@/components/app/Notice';
import { OutcomeLabel } from '@/components/app/OutcomeLabel';
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
import { describeChain } from '@/lib/diagnostics/networks';

type AccessState =
  | { kind: 'loading' }
  | { kind: 'disabled' }
  | { kind: 'error'; message: string }
  | { kind: 'locked'; reason: string; message: string; expiredAt?: string }
  | { kind: 'unlocked'; reports: StoredReport[]; expiresAt: string | null; storage: boolean };

type Message = { tone: 'info' | 'success' | 'failure'; text: string } | null;

/** "P1M" → "per month". A null period is a one-time (lifetime) purchase. */
function describePeriod(period: string | null): string {
  if (!period) return 'one-time';
  if (period === 'P1M') return 'per month';
  if (period === 'P1Y') return 'per year';
  if (period === 'P1W') return 'per week';
  return `every ${period.replace(/^P/, '').toLowerCase()}`;
}

function formatDate(value: string | Date): string {
  // English, like the rest of the interface, whatever the browser's locale.
  return new Date(value).toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default function HistoryPage() {
  const [access, setAccess] = useState<AccessState>({ kind: 'loading' });
  const [offering, setOffering] = useState<Offering | null>(null);
  const [status, setStatus] = useState<ProStatus | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [busy, setBusy] = useState(false);

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
      title="Diagnosis history"
      intro={<p>Pro keeps every diagnosis you run, so you can see when a configuration broke and prove when it was fixed.</p>}
    >
      {message && (
        <div className="mt-8">
          <Notice tone={message.tone}>{message.text}</Notice>
        </div>
      )}

      {access.kind === 'loading' && <p className="mt-10 text-muted">Checking your access…</p>}

      {access.kind === 'disabled' && (
        <div className="mt-10">
          <Notice>
            Diagnosis history is not enabled on this deployment yet. Diagnosis and comparison stay free and work as
            usual.
          </Notice>
        </div>
      )}

      {access.kind === 'error' && (
        <div className="mt-10">
          <Notice tone="failure">{access.message}</Notice>
        </div>
      )}

      {access.kind === 'locked' && (
        <section aria-labelledby="offer-heading" className="mt-12">
          <h2 id="offer-heading" className="font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[0.95] font-black">
            {access.reason === 'expired' ? 'Your Pro access has expired.' : 'Keep every diagnosis with Pro.'}
          </h2>
          <p className="mt-5 max-w-[65ch]">
            {access.reason === 'expired'
              ? `Access ended${access.expiredAt ? ` on ${formatDate(access.expiredAt)}` : ''}. Your history is kept; renew to see it again.`
              : 'Every diagnosis you run is saved automatically, and Launch Check holds your configuration to a stricter bar before you go to mainnet. Diagnosis and before/after comparison stay free.'}
          </p>

          {offering ? (
            <>
              <dl className="mt-9 grid border-y-2 border-ink md:grid-cols-3">
                {offering.availablePackages.map((rcPackage) => {
                  const product = rcPackage.webBillingProduct;
                  const price = (product.currentPrice.amountMicros / 1_000_000).toFixed(2);
                  return (
                    <div
                      key={rcPackage.identifier}
                      className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-4 border-b border-ink py-6 last:border-b-0 md:block md:border-r md:border-b-0 md:px-7 md:py-8 md:first:pl-0 md:last:border-r-0"
                    >
                      <dt className="text-lg font-semibold">{product.title}</dt>
                      <dd className="md:mt-4">
                        <div className="flex items-baseline justify-end gap-2 md:justify-start">
                          <span className="text-sm text-muted">{product.currentPrice.currency}</span>
                          <span className="font-display text-5xl leading-none font-bold sm:text-6xl">{price}</span>
                        </div>
                        <span className="mt-2 block text-right text-sm text-muted md:text-left">
                          {describePeriod(product.normalPeriodDuration)}
                        </span>
                      </dd>
                      <dd className="col-span-2 md:mt-6">
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => buy(rcPackage)}
                          className="btn-pen min-h-12 w-full px-5 disabled:opacity-60 md:w-auto"
                        >
                          Buy {product.title}
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
                Compare plans in the paywall
              </button>
            </>
          ) : (
            <p className="mt-8 text-muted">No plans are on sale right now.</p>
          )}

          <p className="mt-6 max-w-[65ch] border-l-4 border-ink pl-4 text-sm leading-relaxed">
            Purchases on this deployment go through RevenueCat Test Store. They are test transactions: no card is
            charged.
          </p>
        </section>
      )}

      {access.kind === 'unlocked' && (
        <section aria-labelledby="history-heading" className="mt-12">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-l-4 border-triage-green bg-sheet px-4 py-3 text-sm">
            <span className="font-semibold">Pro is active</span>
            <span className="text-muted">
              {access.expiresAt === null
                ? 'Lifetime access'
                : `${status?.willRenew ? 'Renews' : 'Ends'} on ${formatDate(access.expiresAt)}`}
            </span>
            {status?.store === 'test_store' && <span className="text-muted">Test Store purchase</span>}
            <Link href="/launch" prefetch={false} className="font-semibold text-pen underline underline-offset-4">
              Run Launch Check
            </Link>
            {status?.managementURL && (
              <a
                href={status.managementURL}
                target="_blank"
                rel="noreferrer"
                className="ml-auto font-semibold underline underline-offset-4"
              >
                Manage subscription
              </a>
            )}
          </div>

          <h2 id="history-heading" className="mt-10 mb-6 font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[0.95] font-black">
            Your diagnoses
          </h2>

          {!access.storage ? (
            <Notice>
              Your Pro access is confirmed. History storage is not set up on this deployment yet, so new diagnoses are
              not being saved.
            </Notice>
          ) : access.reports.length === 0 ? (
            <Notice tone="action">
              No diagnoses saved yet.{' '}
              <Link href="/diagnose" prefetch={false} className="font-semibold text-pen underline underline-offset-4">
                Run one
              </Link>{' '}
              and it will appear here.
            </Notice>
          ) : (
            <ol className="border-t-2 border-ink">
              {access.reports.map((entry) => (
                <li key={entry.id} className="border-b border-ink py-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <OutcomeLabel outcome={entry.report.status} />
                    <span className="text-sm text-muted">{new Date(entry.savedAt).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                  </div>
                  <p className="mt-2 max-w-[70ch] font-semibold">{entry.report.headline}</p>
                  <p className="mt-1 text-sm text-muted">
                    <span className="font-mono break-all">{entry.report.target.rpcUrl}</span>, expects{' '}
                    {describeChain(entry.report.target.expectedChainId)}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </AppShell>
  );
}
