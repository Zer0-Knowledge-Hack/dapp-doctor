'use client';

import { ButtonLink } from '@/components/ui/ButtonLink';
import { useLanding } from './useLanding';

export function FinalCall() {
  const landing = useLanding();
  const content = landing.finalCall;
  return (
    <section aria-labelledby="final-heading" className="border-t-2 border-ink pt-7 pb-4 sm:pt-8">
      <h2 id="final-heading" className="max-w-[26ch] font-display text-[clamp(1.5rem,3.4vw,2rem)] leading-[1.1] font-black text-balance">{content.headline}</h2>
      <div className="mt-5"><ButtonLink href={content.primary.href} variant="pen">{content.primary.label}</ButtonLink></div>
    </section>
  );
}
