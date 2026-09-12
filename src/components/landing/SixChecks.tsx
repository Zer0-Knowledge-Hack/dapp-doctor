'use client';

import { isLive } from './content';
import { useLanding } from './useLanding';

export function SixChecks() {
  const landing = useLanding();
  const content = landing.sixChecks;
  return (
    <section aria-labelledby="checks-heading">
      <h2 id="checks-heading" className="mb-5 font-display text-[clamp(1.3rem,2.8vw,1.7rem)] leading-[1.12] font-black">{content.headline}</h2>
      <ol className="space-y-3">
        {content.items.filter(isLive).map((item, index) => (
          <li key={item.title} className="grid grid-cols-[2rem_1fr] gap-x-3 py-1 sm:grid-cols-[2.5rem_10rem_1fr] sm:gap-x-5 lg:grid-cols-[3rem_12rem_1fr]">
            <span aria-hidden="true" className="row-span-2 font-display text-xl leading-none font-bold sm:row-span-1">{String(index + 1).padStart(2, '0')}</span>
            <h3 className="text-base leading-snug font-bold">{item.title}</h3>
            <p className="col-start-2 mt-1.5 max-w-[65ch] text-sm leading-relaxed text-muted sm:col-start-auto sm:mt-0">{item.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
