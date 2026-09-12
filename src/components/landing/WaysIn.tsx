'use client';

import { isLive } from './content';
import { useLanding } from './useLanding';

export function WaysIn() {
  const landing = useLanding();
  const content = landing.waysIn;
  return (
    <section aria-labelledby="ways-heading" className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr] lg:gap-12">
      <h2 id="ways-heading" className="max-w-[24ch] font-display text-[clamp(1.3rem,2.8vw,1.7rem)] leading-[1.12] font-black text-balance">{content.headline}</h2>
      {/* min-w-0: as a grid item the list would otherwise grow to the unwrapped
          command's width and push the whole page sideways on a phone. */}
      <ul className="min-w-0 space-y-4">
        {content.items.filter(isLive).map((item) => (
          <li key={item.title}>
            <h3 className="mb-1.5 text-base font-bold">{item.title}</h3>
            <p className="max-w-[65ch] text-sm leading-relaxed text-muted">{item.body}</p>
            {'command' in item && (
              // A setup command is a machine value: mono, selectable, never wrapped mid-token on wide screens.
              <code className="mt-3 block w-fit max-w-full overflow-x-auto border border-ink bg-sheet px-3 py-2 font-mono text-sm whitespace-nowrap">
                {item.command}
              </code>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
