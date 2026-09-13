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
      <Sheet className="px-5 pt-6 pb-6 sm:px-8 sm:pt-8 sm:pb-8 lg:px-10 lg:pt-9 lg:pb-9">
        {/* Text on the left, the doctor on the right; on a phone the doctor follows the text. */}
        <div className="grid items-end gap-x-8 gap-y-6 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="min-w-0">
            <h1 id="hero-heading" className="max-w-[28ch] font-display text-[clamp(1.6rem,4vw,2.35rem)] leading-[1.08] font-black tracking-[-0.02em] text-balance">
              {content.headline}
            </h1>
            <Ecg rhythm="READY" motion={landing.motion} className="mt-5 h-20 w-full text-ink sm:mt-6 sm:h-24" />
            <div className="mt-4 border-t-2 border-ink pt-5 sm:mt-5 sm:pt-6">
              <p className="max-w-[64ch] text-sm leading-relaxed text-muted sm:text-[0.9375rem]">{content.body}</p>
              <div className="mt-5 flex flex-wrap items-center gap-3 sm:gap-4">
                <ButtonLink href={content.primary.href} variant="pen">{content.primary.label}</ButtonLink>
                <ButtonLink href={content.secondary.href} variant="plain">{content.secondary.label}</ButtonLink>
              </div>
            </div>
          </div>
          <Mascot
            size={220}
            priority
            alt={content.mascotAlt}
            sizes="(min-width: 1024px) 220px, 160px"
            className="mx-auto w-[160px]! lg:w-[220px]!"
          />
        </div>
      </Sheet>
    </section>
  );
}
