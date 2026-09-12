'use client';

import { signIn, signOut, useSession } from 'next-auth/react';
import { useLang } from '@/components/i18n/LanguageProvider';
import type { Lang } from '@/lib/i18n/lang';
import { useAccountsEnabled } from './AccountProvider';

const COPY: Record<Lang, { signIn: string; signOut: string; signedInAs: (name: string) => string }> = {
  en: { signIn: 'Sign in', signOut: 'Sign out', signedInAs: (name) => `Signed in as ${name}` },
  es: { signIn: 'Iniciar sesión', signOut: 'Cerrar sesión', signedInAs: (name) => `Sesión iniciada como ${name}` },
};

/** Sign in or out, in the header. Signing in is optional: everything free works without it. */
export function AccountButton(): React.ReactElement | null {
  const enabled = useAccountsEnabled();
  const { data: session, status } = useSession();
  const copy = COPY[useLang()];
  if (!enabled || status === 'loading') return null;

  if (!session) {
    return (
      <button type="button" onClick={() => signIn('google')} className="btn-plain min-h-11 px-3 text-sm">
        {copy.signIn}
      </button>
    );
  }

  const name = session.user?.name?.split(' ')[0] || session.user?.email || '';
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="max-w-[12rem] truncate font-semibold" title={copy.signedInAs(session.user?.email ?? name)}>
        {name}
      </span>
      <button type="button" onClick={() => signOut()} className="min-h-11 font-semibold underline underline-offset-4">
        {copy.signOut}
      </button>
    </div>
  );
}
