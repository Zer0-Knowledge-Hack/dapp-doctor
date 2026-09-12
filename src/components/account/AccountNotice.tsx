'use client';

import { signIn, useSession } from 'next-auth/react';
import { Notice } from '@/components/app/Notice';
import { useLang } from '@/components/i18n/LanguageProvider';
import type { Lang } from '@/lib/i18n/lang';
import { useAccountsEnabled } from './AccountProvider';

const COPY: Record<Lang, { signedOut: string; action: string; signedIn: (name: string) => string }> = {
  en: {
    signedOut: 'Sign in before you buy, and Pro and your diagnosis history follow you to any device. Without an account they stay in this browser.',
    action: 'Sign in with Google',
    signedIn: (name) => `Signed in as ${name}. Your purchases and diagnosis history are kept with your account, on any device.`,
  },
  es: {
    signedOut: 'Inicia sesión antes de comprar y Pro y tu historial te siguen a cualquier dispositivo. Sin cuenta, quedan en este navegador.',
    action: 'Iniciar sesión con Google',
    signedIn: (name) => `Sesión iniciada como ${name}. Tus compras y tu historial quedan guardados con tu cuenta, en cualquier dispositivo.`,
  },
};

/** Where a purchase will be kept, said before someone buys. Shown only when sign-in is set up. */
export function AccountNotice(): React.ReactElement | null {
  const enabled = useAccountsEnabled();
  const { data: session, status } = useSession();
  const copy = COPY[useLang()];
  if (!enabled || status === 'loading') return null;

  if (session) {
    return <Notice tone="success">{copy.signedIn(session.user?.email ?? session.user?.name ?? '')}</Notice>;
  }
  return (
    <div className="flex max-w-[70ch] flex-col gap-3 border-l-4 border-pen bg-sheet px-4 py-3 text-sm leading-relaxed sm:flex-row sm:items-center sm:justify-between">
      <p>{copy.signedOut}</p>
      <button type="button" onClick={() => signIn('google')} className="btn-pen min-h-11 shrink-0 px-4 text-sm">
        {copy.action}
      </button>
    </div>
  );
}
