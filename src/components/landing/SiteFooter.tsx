'use client';

import Link from 'next/link';
import { BrandMark } from '@/components/brand/BrandLogo';
import { isLive } from './content';
import { useLanding } from './useLanding';

export function SiteFooter() {
  const landing = useLanding();
  const content = landing.footer;
  return (
    <footer className="mx-auto flex w-full max-w-[1160px] flex-col justify-between gap-5 px-5 pt-8 pb-10 text-sm sm:flex-row sm:items-start sm:px-8">
      <p className="flex max-w-[52ch] items-start gap-3 text-muted">
        <BrandMark size={20} className="mt-0.5" />
        <span>{content.body}</span>
      </p>
      {/* Five links do not fit one phone-width row: they wrap whole, never mid-label. */}
      <nav aria-label={content.navigationLabel} className="flex shrink-0 flex-wrap gap-x-6">
        {content.links.filter(isLive).map((link) => (
          <Link key={link.href} href={link.href} prefetch={false} className="flex min-h-11 items-center font-semibold whitespace-nowrap underline underline-offset-4">{link.label}</Link>
        ))}
      </nav>
    </footer>
  );
}
