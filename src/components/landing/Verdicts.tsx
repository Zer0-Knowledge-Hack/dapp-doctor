import { Stamp } from '@/components/ui/Stamp';
import { isLive, landing } from './content';

export function Verdicts() {
  const content = landing.verdicts;
  return (
    <section aria-labelledby="verdicts-heading">
      <h2 id="verdicts-heading" className="mb-9 font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[0.95] font-black">{content.headline}</h2>
      <ul className="grid border-t-2 border-ink md:grid-cols-3">
        {content.items.filter(isLive).map((item) => (
          <li key={item.status} className="border-b border-ink px-3 pt-9 pb-7 md:border-b-0 md:border-r md:px-7 md:last:border-r-0">
            <Stamp status={item.status} size="lg" />
            <p className="mt-8 max-w-[40ch] text-muted">{item.body}</p>
          </li>
        ))}
      </ul>
      <div className="mt-8 border-l-4 border-pen pl-5 font-semibold">
        {content.principles.filter(isLive).map((item) => <p key={item.text}>{item.text}</p>)}
      </div>
    </section>
  );
}
