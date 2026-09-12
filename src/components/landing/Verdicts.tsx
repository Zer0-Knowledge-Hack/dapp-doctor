'use client';

import { Stamp } from '@/components/ui/Stamp';
import { isLive } from './content';
import { useLanding } from './useLanding';

export function Verdicts() {
  const landing = useLanding();
  const content = landing.verdicts;
  return (
    <section aria-labelledby="verdicts-heading">
      <h2 id="verdicts-heading" className="mb-5 font-display text-[clamp(1.3rem,2.8vw,1.7rem)] leading-[1.12] font-black">{content.headline}</h2>
      <ul className="grid border-t-2 border-ink md:grid-cols-3">
        {content.items.filter(isLive).map((item) => (
          <li key={item.status} className="border-b border-ink px-3 pt-6 pb-5 md:border-b-0 md:border-r md:px-6 md:last:border-r-0">
            <Stamp status={item.status} />
            <p className="mt-5 max-w-[40ch] text-sm leading-relaxed text-muted">{item.body}</p>
          </li>
        ))}
      </ul>
      <div className="mt-6 border-l-4 border-pen pl-4 text-sm font-semibold">
        {content.principles.filter(isLive).map((item) => <p key={item.text}>{item.text}</p>)}
      </div>
    </section>
  );
}
