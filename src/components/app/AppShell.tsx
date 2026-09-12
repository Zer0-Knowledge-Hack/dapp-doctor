import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';

/**
 * The frame every tool page shares with the landing: same header, footer,
 * content width and body type, so moving from the landing into the tool never
 * feels like changing sites.
 */
export function AppShell({ title, intro, children, compact = false }: {
  title: string;
  intro: React.ReactNode;
  children: React.ReactNode;
  /** Tool pages with long titles (dashboard, help) keep the same voice at a smaller size. */
  compact?: boolean;
}): React.ReactElement {
  return (
    <>
      <SiteHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full min-w-0 max-w-[1160px] overflow-x-hidden px-5 pb-14 text-[0.975rem] leading-[1.55] outline-none sm:px-8 sm:pb-20"
      >
        <h1
          className={`font-display font-black text-balance ${
            compact
              ? 'max-w-[32ch] text-[clamp(1.35rem,3vw,1.7rem)] leading-[1.15]'
              : 'max-w-[26ch] text-[clamp(1.5rem,3.4vw,1.9rem)] leading-[1.12]'
          }`}
        >
          {title}
        </h1>
        <div className="mt-2 max-w-[65ch] text-sm leading-relaxed text-muted sm:mt-3">
          {intro}
        </div>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
