'use client';

import Link from 'next/link';
import { isLive } from './content';
import { LanguageToggle } from '@/components/i18n/LanguageToggle';
import { useLanding } from './useLanding';

export function SiteHeader() {
  const landing = useLanding();
  const content = landing.header;
  return (
    <header className="mx-auto flex w-full max-w-[1160px] flex-wrap items-center justify-between gap-x-8 gap-y-3 px-5 pt-7 pb-8 sm:px-8 sm:pt-9 sm:pb-10">
      <a href="#main-content" className="sr-only z-50 bg-sheet px-4 py-3 text-pen focus:not-sr-only focus:fixed focus:top-4 focus:left-4">
        {content.skip}
      </a>
      <span className="flex items-center gap-3 font-display text-[2rem] leading-none font-black">
        <svg width="29" height="29" viewBox="0 0 29 29" fill="none" aria-hidden="true">
          <path d="M10 0h9v10h10v9H19v10h-9V19H0v-9h10Z" fill="currentColor" />
        </svg>
        {content.name}
      </span>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 sm:gap-x-8">
        <nav aria-label={content.navigationLabel} className="flex flex-wrap gap-x-5 sm:gap-x-7">
          {content.links.filter(isLive).map((link) => (
            <Link key={link.href} href={link.href} prefetch={false} className="flex min-h-11 items-center text-sm font-semibold underline decoration-1 underline-offset-4">
              {link.label}
            </Link>
          ))}
        </nav>
        <LanguageToggle />
      </div>
    </header>
  );
}
