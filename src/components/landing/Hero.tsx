'use client';

import { Mascot } from '@/components/brand/Mascot';
import { Ecg } from '@/components/ecg/Ecg';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Sheet } from '@/components/ui/Sheet';
import { useLanding } from './useLanding';

export function Hero() {
  const landing = useLanding();
  const content = landing.hero;
  return (
    <section aria-labelledby="hero-heading">
      <Sheet className="px-5 pt-8 pb-8 sm:px-10 sm:pt-12 sm:pb-10 lg:px-14 lg:pt-14 lg:pb-12">
        {/* Text on the left, the doctor on the right; on a phone the doctor follows the text. */}
        <div className="grid items-end gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <h1 id="hero-heading" className="max-w-[850px] font-display text-[clamp(3rem,8vw,6.5rem)] leading-[0.9] font-black tracking-[-0.025em] text-balance">
              {content.headline}
            </h1>
            <Ecg rhythm="READY" motion={landing.motion} className="mt-7 h-24 w-full text-ink sm:mt-8 sm:h-32" />
            <div className="mt-5 border-t-2 border-ink pt-6 sm:mt-7 sm:pt-8">
              <p className="max-w-[64ch]">{content.body}</p>
              <div className="mt-7 flex flex-wrap items-center gap-4 sm:gap-5">
                <ButtonLink href={content.primary.href} variant="pen">{content.primary.label}</ButtonLink>
                <ButtonLink href={content.secondary.href} variant="plain">{content.secondary.label}</ButtonLink>
              </div>
            </div>
          </div>
          <Mascot
            size={300}
            priority
            alt={content.mascotAlt}
            sizes="(min-width: 1024px) 300px, 200px"
            className="mx-auto w-[200px]! lg:w-[300px]!"
          />
        </div>
      </Sheet>
    </section>
  );
}
