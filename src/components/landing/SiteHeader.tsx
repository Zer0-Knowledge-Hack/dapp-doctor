'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { isLive } from './content';
import { AccountButton } from '@/components/account/AccountButton';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { LanguageToggle } from '@/components/i18n/LanguageToggle';
import { useLanding } from './useLanding';

export function SiteHeader() {
  const landing = useLanding();
  const content = landing.header;
  const pathname = usePathname();
  return (
    <header className="mx-auto flex w-full max-w-[1160px] flex-wrap items-center justify-between gap-x-8 gap-y-3 px-5 pt-7 pb-8 sm:px-8 sm:pt-9 sm:pb-10">
      <a href="#main-content" className="sr-only z-50 bg-sheet px-4 py-3 text-pen focus:not-sr-only focus:fixed focus:top-4 focus:left-4">
        {content.skip}
      </a>
      {/* The name is the way home from every page, as people expect from a site's logo. */}
      <Link href="/" prefetch={false} aria-label={content.homeLabel} className="flex min-h-11 items-center">
        <BrandLogo name={content.name} />
      </Link>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 sm:gap-x-8">
        <nav aria-label={content.navigationLabel} className="flex flex-wrap gap-x-5 sm:gap-x-7">
          {content.links.filter(isLive).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={false}
              // The page you are on is marked, and loses its underline: it is not somewhere to go.
              aria-current={pathname === link.href ? 'page' : undefined}
              className="flex min-h-11 items-center text-sm font-semibold underline decoration-1 underline-offset-4 aria-[current=page]:no-underline aria-[current=page]:border-b-[3px] aria-[current=page]:border-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <LanguageToggle />
        <AccountButton />
      </div>
    </header>
  );
}
