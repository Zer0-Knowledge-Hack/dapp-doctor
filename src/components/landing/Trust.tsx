'use client';

import { Fragment } from 'react';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { useLanding } from './useLanding';

export function Trust() {
  const landing = useLanding();
  const content = landing.trust;
  return (
    <section aria-labelledby="trust-heading" className="grid gap-7 border-t-2 border-ink pt-9 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
      <h2 id="trust-heading" className="max-w-[14ch] font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[0.95] font-black">{content.headline}</h2>
      <div className="max-w-[65ch]">
        <p>
          {content.introduction}{' '}
          {content.methods.map((method, index) => (
            <Fragment key={method}>
              {index > 0 && (index === content.methods.length - 1 ? ` ${content.conjunction} ` : ', ')}
              <code className="font-mono text-[0.86em] [overflow-wrap:anywhere]">{method}</code>
            </Fragment>
          ))}.
        </p>
        <p className="mt-5 text-muted">{content.security}</p>
        <p className="mt-5">{content.source}</p>
        <div className="mt-7"><ButtonLink href={content.primary.href} variant="plain">{content.primary.label}</ButtonLink></div>
      </div>
    </section>
  );
}
