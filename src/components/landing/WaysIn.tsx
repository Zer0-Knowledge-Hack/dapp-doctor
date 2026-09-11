import { isLive, landing } from './content';

export function WaysIn() {
  const content = landing.waysIn;
  return (
    <section aria-labelledby="ways-heading" className="grid gap-7 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
      <h2 id="ways-heading" className="max-w-[19ch] font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[0.95] font-black text-balance">{content.headline}</h2>
      <ul className="border-t-2 border-ink">
        {content.items.filter(isLive).map((item) => (
          <li key={item.title} className="border-b border-ink py-6">
            <h3 className="mb-2 text-lg font-bold">{item.title}</h3>
            <p className="max-w-[65ch] text-muted">{item.body}</p>
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
