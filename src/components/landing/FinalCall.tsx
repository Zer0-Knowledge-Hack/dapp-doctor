import { ButtonLink } from '@/components/ui/ButtonLink';
import { landing } from './content';

export function FinalCall() {
  const content = landing.finalCall;
  return (
    <section aria-labelledby="final-heading" className="border-y-[3px] border-ink py-12 sm:py-16">
      <h2 id="final-heading" className="max-w-[22ch] font-display text-[clamp(2.75rem,6vw,4.75rem)] leading-[0.95] font-black text-balance">{content.headline}</h2>
      <div className="mt-8"><ButtonLink href={content.primary.href} variant="pen">{content.primary.label}</ButtonLink></div>
    </section>
  );
}
