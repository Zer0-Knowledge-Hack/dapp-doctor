import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';

/**
 * The frame every tool page shares with the landing: same header, footer,
 * content width and body type, so moving from the landing into the tool never
 * feels like changing sites.
 */
export function AppShell({ title, intro, children }: {
  title: string;
  intro: React.ReactNode;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <>
      <SiteHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-[1160px] px-5 pb-16 text-[1.0625rem] leading-[1.6] outline-none sm:px-8 sm:pb-24"
      >
        <h1 className="max-w-[22ch] font-display text-[clamp(2.5rem,6vw,4.5rem)] leading-[0.92] font-black text-balance">
          {title}
        </h1>
        <div className="mt-5 max-w-[65ch]">{intro}</div>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
