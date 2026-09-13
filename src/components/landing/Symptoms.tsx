'use client';

import { isLive } from './content';
import { useLanding } from './useLanding';

export function Symptoms() {
  const landing = useLanding();
  const content = landing.symptoms;
  return (
    <section aria-labelledby="symptoms-heading" className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
      <h2 id="symptoms-heading" className="max-w-[22ch] font-display text-[clamp(1.3rem,2.8vw,1.7rem)] leading-[1.12] font-black text-balance">{content.headline}</h2>
      <ul className="space-y-1">
        {content.items.filter(isLive).map((item) => (
          <li key={item.title} className="py-3 first:pt-0">
            <h3 className="mb-1.5 text-base font-bold">{item.title}</h3>
            <p className="max-w-[65ch] text-sm leading-relaxed text-muted">{item.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
