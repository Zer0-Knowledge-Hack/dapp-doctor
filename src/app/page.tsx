import { BeforeAfter } from '@/components/landing/BeforeAfter';
import { FinalCall } from '@/components/landing/FinalCall';
import { Hero } from '@/components/landing/Hero';
import { Pro } from '@/components/landing/Pro';
import { SiteFooter } from '@/components/landing/SiteFooter';
import { SiteHeader } from '@/components/landing/SiteHeader';
import { SixChecks } from '@/components/landing/SixChecks';
import { Symptoms } from '@/components/landing/Symptoms';
import { Trust } from '@/components/landing/Trust';
import { Verdicts } from '@/components/landing/Verdicts';
import { WaysIn } from '@/components/landing/WaysIn';
import { isLive, landing } from '@/components/landing/content';

const sections = [
  { content: landing.hero, Component: Hero },
  { content: landing.symptoms, Component: Symptoms },
  { content: landing.sixChecks, Component: SixChecks },
  { content: landing.verdicts, Component: Verdicts },
  { content: landing.beforeAfter, Component: BeforeAfter },
  { content: landing.waysIn, Component: WaysIn },
  { content: landing.pro, Component: Pro },
  { content: landing.trust, Component: Trust },
  { content: landing.finalCall, Component: FinalCall },
];

export default function LandingPage() {
  return (
    <>
      {isLive(landing.header) && <SiteHeader />}
      <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-[1160px] space-y-7 px-5 text-[0.9375rem] leading-[1.55] outline-none sm:space-y-8 sm:px-8">
        {sections.filter(({ content }) => isLive(content)).map(({ content, Component }) => (
          <Component key={content.headline} />
        ))}
      </main>
      {isLive(landing.footer) && <SiteFooter />}
    </>
  );
}
