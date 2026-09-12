'use client';

import { ButtonLink } from '@/components/ui/ButtonLink';
import { isLive } from './content';
import { useLanding } from './useLanding';

export function Pro() {
  const landing = useLanding();
  const content = landing.pro;
  return (
    <section aria-labelledby="pro-heading">
      <h2 id="pro-heading" className="font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[0.95] font-black">{content.headline}</h2>
      <p className="mt-5 max-w-[65ch]">{content.body}</p>
      <ul className="mt-4 text-muted">
        {content.features.filter(isLive).map((feature) => <li key={feature.text}>{feature.text}</li>)}
      </ul>
      <dl className="mt-9 grid border-y-2 border-ink md:grid-cols-3">
        {content.plans.filter(isLive).map((plan) => (
          <div key={plan.name} className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 border-b border-ink py-6 last:border-b-0 md:block md:border-r md:border-b-0 md:px-7 md:py-8 md:first:pl-0 md:last:border-r-0">
            <dt className="text-lg font-semibold">{plan.name}</dt>
            <dd className="md:mt-4">
              <div className="flex items-baseline justify-end gap-2 md:justify-start">
                <span className="text-sm text-muted">{plan.currency}</span>
                <span className="font-display text-5xl leading-none font-bold sm:text-6xl">{plan.price}</span>
              </div>
              <span className="mt-2 block text-right text-sm text-muted md:text-left">{plan.period}</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-6 max-w-[65ch] border-l-4 border-ink pl-4 text-sm leading-relaxed">{content.notice}</p>
      <div className="mt-7"><ButtonLink href={content.primary.href} variant="pen">{content.primary.label}</ButtonLink></div>
    </section>
  );
}
