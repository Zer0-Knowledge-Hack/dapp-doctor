'use client';

import type { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import { createContext, useContext, useEffect, useState } from 'react';
import { setBillingAccount } from '@/lib/billing/client';

const AccountsEnabled = createContext(false);

/**
 * The signed-in account, if any, for every page. The server reads the session
 * and hands it over, so the page knows who is signed in on its first paint and
 * never fetches it again.
 */
export function AccountProvider({ enabled, session, children }: {
  enabled: boolean;
  session: Session | null;
  children: React.ReactNode;
}) {
  const appUserId = session?.appUserId ?? null;

  // Before any page asks RevenueCat anything, point it at the right user: this
  // runs during the first render, ahead of the pages' own effects.
  useState(() => {
    void setBillingAccount(appUserId);
    return null;
  });
  useEffect(() => {
    void setBillingAccount(appUserId);
  }, [appUserId]);

  return (
    <AccountsEnabled.Provider value={enabled}>
      <SessionProvider session={session} refetchOnWindowFocus={false}>
        {children}
      </SessionProvider>
    </AccountsEnabled.Provider>
  );
}

/** Whether Google sign-in is set up on this deployment. Without it, nothing about accounts is shown. */
export function useAccountsEnabled(): boolean {
  return useContext(AccountsEnabled);
}
