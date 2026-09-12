'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { LANG_COOKIE, type Lang } from '@/lib/i18n/lang';
import { toSpanish } from '@/lib/i18n/engineText';

interface LanguageState {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const LanguageContext = createContext<LanguageState>({ lang: 'en', setLang: () => {} });

/**
 * Holds the interface language. The first value comes from the cookie the
 * server read, so the page is painted in the right language from the start.
 */
export function LanguageProvider({ initial, children }: { initial: Lang; children: React.ReactNode }) {
  const [lang, setState] = useState<Lang>(initial);

  const setLang = useCallback((next: Lang) => {
    // A year, the whole site, and never sent to other sites.
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = next;
    setState(next);
  }, []);

  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LanguageContext).lang;
}

export function useSetLang(): (lang: Lang) => void {
  return useContext(LanguageContext).setLang;
}

/** Text written by the engine, in the reader's language. English passes through untouched. */
export function useEngineText(): (text: string) => string {
  const lang = useLang();
  return lang === 'es' ? toSpanish : identity;
}

function identity(text: string): string {
  return text;
}
