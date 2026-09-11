import { isLive, landing } from './content';

export function Symptoms() {
  const content = landing.symptoms;
  return (
    <section aria-labelledby="symptoms-heading" className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
      <h2 id="symptoms-heading" className="max-w-[18ch] font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[0.95] font-black text-balance">{content.headline}</h2>
      <ul className="border-t-2 border-ink">
        {content.items.filter(isLive).map((item) => (
          <li key={item.title} className="border-b border-ink py-6 first:pt-5">
            <h3 className="mb-2 text-lg font-bold">{item.title}</h3>
            <p className="max-w-[65ch] text-muted">{item.body}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
