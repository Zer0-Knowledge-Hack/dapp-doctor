'use client';

import { LANGS, type Lang } from '@/lib/i18n/lang';
import { useLang, useSetLang } from './LanguageProvider';

const NAMES: Record<Lang, string> = { en: 'English', es: 'Español' };

/**
 * Two buttons, each named in its own language, so a reader finds theirs
 * without first understanding the other one. The pressed one is the current.
 */
export function LanguageToggle(): React.ReactElement {
  const lang = useLang();
  const setLang = useSetLang();
  return (
    <div role="group" aria-label="Language / Idioma" className="flex shrink-0 border-2 border-ink bg-sheet">
      {LANGS.map((option) => (
        <button
          key={option}
          type="button"
          lang={option}
          aria-pressed={lang === option}
          onClick={() => setLang(option)}
          className="min-h-9 px-2 text-xs font-semibold sm:min-h-10 sm:px-2.5 [&+&]:border-l-2 [&+&]:border-ink aria-pressed:bg-ink aria-pressed:text-paper"
        >
          {NAMES[option]}
        </button>
      ))}
    </div>
  );
}
