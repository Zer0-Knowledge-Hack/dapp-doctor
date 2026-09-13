'use client';

import { Fragment } from 'react';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { useLanding } from './useLanding';

export function Trust() {
  const landing = useLanding();
  const content = landing.trust;
  return (
    <section aria-labelledby="trust-heading" className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
      <h2 id="trust-heading" className="max-w-[18ch] font-display text-[clamp(1.3rem,2.8vw,1.7rem)] leading-[1.12] font-black">{content.headline}</h2>
      <div className="max-w-[65ch]">
        <p className="text-sm leading-relaxed">
          {content.introduction}{' '}
          {content.methods.map((method, index) => (
            <Fragment key={method}>
              {index > 0 && (index === content.methods.length - 1 ? ` ${content.conjunction} ` : ', ')}
              <code className="font-mono text-[0.86em] [overflow-wrap:anywhere]">{method}</code>
            </Fragment>
          ))}.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-muted">{content.security}</p>
        <p className="mt-4 text-sm leading-relaxed">{content.source}</p>
        <div className="mt-7"><ButtonLink href={content.primary.href} variant="plain">{content.primary.label}</ButtonLink></div>
      </div>
    </section>
  );
}
