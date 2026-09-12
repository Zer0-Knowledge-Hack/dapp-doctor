'use client';

import Link from 'next/link';
import { isLive } from './content';
import { useLanding } from './useLanding';

export function SiteFooter() {
  const landing = useLanding();
  const content = landing.footer;
  return (
    <footer className="mx-auto flex w-full max-w-[1160px] flex-col justify-between gap-5 px-5 pt-8 pb-10 text-sm sm:flex-row sm:items-start sm:px-8">
      <p className="max-w-[52ch] text-muted">{content.body}</p>
      <nav aria-label={content.navigationLabel} className="flex shrink-0 gap-6">
        {content.links.filter(isLive).map((link) => (
          <Link key={link.href} href={link.href} prefetch={false} className="flex min-h-11 items-center font-semibold underline underline-offset-4">{link.label}</Link>
        ))}
      </nav>
    </footer>
  );
}
