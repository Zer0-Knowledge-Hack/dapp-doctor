import { isLive, landing } from './content';

export function SixChecks() {
  const content = landing.sixChecks;
  return (
    <section aria-labelledby="checks-heading">
      <h2 id="checks-heading" className="mb-9 font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[0.95] font-black">{content.headline}</h2>
      <ol className="border-t-2 border-ink">
        {content.items.filter(isLive).map((item, index) => (
          <li key={item.title} className="grid grid-cols-[2.5rem_1fr] gap-x-3 border-b border-ink py-6 sm:grid-cols-[3rem_12rem_1fr] sm:gap-x-6 lg:grid-cols-[4rem_15rem_1fr]">
            <span aria-hidden="true" className="row-span-2 font-display text-3xl leading-none font-bold sm:row-span-1">{String(index + 1).padStart(2, '0')}</span>
            <h3 className="text-lg leading-snug font-bold">{item.title}</h3>
            <p className="col-start-2 mt-2 max-w-[65ch] text-muted sm:col-start-auto sm:mt-0">{item.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
