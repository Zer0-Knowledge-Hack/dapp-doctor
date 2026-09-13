'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { isLive } from './content';
import { AccountButton } from '@/components/account/AccountButton';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { LanguageToggle } from '@/components/i18n/LanguageToggle';
import { useLanding } from './useLanding';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useLang } from '@/components/i18n/LanguageProvider';
import type { Lang } from '@/lib/i18n/lang';

type NavGroup = 'work' | 'monitor' | 'account';

const ICONS: Record<string, IconName> = {
  '/dashboard': 'dashboard',
  '/diagnose': 'diagnose',
  '/compare': 'compare',
  '/heartbeat': 'heartbeat',
  '/launch': 'launch',
  '/history': 'history',
  '/help': 'help',
};

const PRIMARY = ['/diagnose', '/dashboard', '/history', '/compare'];

const GROUPS: Record<Lang, Record<NavGroup, string>> = {
  en: { work: 'Diagnose', monitor: 'Monitoring', account: 'Account' },
  es: { work: 'Diagnóstico', monitor: 'Monitoreo', account: 'Cuenta' },
};

const MENU: Record<Lang, { open: string; close: string; more: string }> = {
  en: { open: 'Open menu', close: 'Close menu', more: 'More' },
  es: { open: 'Abrir menú', close: 'Cerrar menú', more: 'Más' },
};

function groupOf(href: string): NavGroup {
  if (href === '/heartbeat') return 'monitor';
  if (href === '/history' || href === '/launch' || href === '/help') return 'account';
  return 'work';
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteHeader() {
  const landing = useLanding();
  const lang = useLang();
  const content = landing.header;
  const pathname = usePathname() ?? '/';
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const links = content.links.filter((link) => isLive(link) && !link.href.startsWith('http'));
  const primary = PRIMARY.map((href) => links.find((link) => link.href === href)).filter(
    (link): link is (typeof links)[number] => Boolean(link),
  );
  const extra = links.filter((link) => !PRIMARY.includes(link.href));
  const moreActive = extra.some((link) => isActive(pathname, link.href));
  const menu = MENU[lang];

  useEffect(() => {
    setOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!moreOpen) return;
    const onDoc = (event: MouseEvent) => {
      if (!moreRef.current?.contains(event.target as Node)) setMoreOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

  return (
    <header className="mx-auto flex w-full max-w-[1160px] items-center justify-between gap-x-3 px-5 pt-4 pb-4 sm:px-8 sm:pt-5 sm:pb-5">
      <a href="#main-content" className="sr-only z-50 bg-sheet px-4 py-3 text-pen focus:not-sr-only focus:fixed focus:top-4 focus:left-4">
        {content.skip}
      </a>

      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          className="btn-plain inline-flex min-h-9 min-w-9 items-center justify-center lg:hidden"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(true)}
        >
          <Icon name="menu" size={18} />
          <span className="sr-only">{menu.open}</span>
        </button>
        {/* The logo is the way home from every page, as people expect from a site's logo. */}
        <Link
          href="/"
          prefetch={false}
          aria-label={content.homeLabel}
          className="flex min-h-11 min-w-0 items-center"
        >
          <BrandLogo name={content.name} />
        </Link>
      </div>

      <nav aria-label={content.navigationLabel} className="hidden min-w-0 items-center lg:flex">
        {primary.map((link) => (
          <NavLink key={link.href} href={link.href} label={link.label} active={isActive(pathname, link.href)} />
        ))}
        {extra.length > 0 && (
          <div ref={moreRef} className="relative">
            <button
              type="button"
              aria-expanded={moreOpen}
              aria-haspopup="true"
              onClick={() => setMoreOpen((value) => !value)}
              className={`flex min-h-9 items-center gap-1 px-2.5 text-xs font-semibold ${
                moreActive || moreOpen ? 'bg-ink text-paper' : 'hover:bg-paper'
              }`}
            >
              {menu.more}
              <Icon name="more" size={14} />
            </button>
            {moreOpen && (
              <ul className="absolute top-full right-0 z-30 mt-1 min-w-44 border-[3px] border-ink bg-sheet py-1 shadow-[4px_4px_0_var(--ink)]">
                {extra.map((link) => {
                  const active = isActive(pathname, link.href);
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        prefetch={false}
                        aria-current={active ? 'page' : undefined}
                        className={`flex min-h-10 items-center gap-2 px-3 text-sm font-semibold ${
                          active ? 'bg-paper' : 'hover:bg-paper'
                        }`}
                      >
                        {ICONS[link.href] && <Icon name={ICONS[link.href]} size={16} />}
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </nav>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <LanguageToggle />
        <AccountButton />
      </div>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label={menu.close}
            className="absolute inset-0 bg-ink/40"
            onClick={() => setOpen(false)}
          />
          <nav
            id={panelId}
            aria-label={content.navigationLabel}
            className="relative flex h-full w-[min(18.5rem,100%)] flex-col border-r-[3px] border-ink bg-sheet px-4 py-4"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="font-display text-lg font-black">{content.name}</p>
              <button
                type="button"
                className="btn-plain inline-flex min-h-9 min-w-9 items-center justify-center"
                onClick={() => setOpen(false)}
              >
                <Icon name="close" size={18} />
                <span className="sr-only">{menu.close}</span>
              </button>
            </div>
            <MobileGroups links={links} pathname={pathname} groupLabels={GROUPS[lang]} />
            <div className="mt-auto space-y-3 border-t-2 border-ink pt-4">
              <AccountButton />
              <LanguageToggle />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      prefetch={false}
      aria-current={active ? 'page' : undefined}
      className={`flex min-h-9 items-center px-2.5 text-xs font-semibold ${
        active ? 'bg-ink text-paper' : 'hover:bg-paper'
      }`}
    >
      {label}
    </Link>
  );
}

function MobileGroups({
  links,
  pathname,
  groupLabels,
}: {
  links: Array<{ href: string; label: string }>;
  pathname: string;
  groupLabels: Record<NavGroup, string>;
}) {
  const order: NavGroup[] = ['work', 'monitor', 'account'];
  return (
    <div className="space-y-5 overflow-y-auto">
      {order.map((group) => {
        const items = links.filter((link) => groupOf(link.href) === group);
        if (items.length === 0) return null;
        return (
          <div key={group}>
            <p className="mb-1.5 text-[0.7rem] font-semibold tracking-wide text-muted uppercase">{groupLabels[group]}</p>
            <ul>
              {items.map((link) => {
                const active = isActive(pathname, link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      prefetch={false}
                      aria-current={active ? 'page' : undefined}
                      className={`flex min-h-11 items-center gap-2.5 border-l-[3px] px-2.5 text-sm font-semibold ${
                        active ? 'border-pen bg-paper' : 'border-transparent'
                      }`}
                    >
                      {ICONS[link.href] && <Icon name={ICONS[link.href]} size={16} />}
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
