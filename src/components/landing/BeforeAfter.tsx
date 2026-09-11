import { Ecg } from '@/components/ecg/Ecg';
import { ButtonLink } from '@/components/ui/ButtonLink';
import { Sheet } from '@/components/ui/Sheet';
import { Stamp } from '@/components/ui/Stamp';
import { isLive, landing } from './content';

export function BeforeAfter() {
  const content = landing.beforeAfter;
  return (
    <section aria-labelledby="comparison-heading">
      <h2 id="comparison-heading" className="max-w-[22ch] font-display text-[clamp(2rem,4.5vw,3.25rem)] leading-[0.95] font-black text-balance">{content.headline}</h2>
      <p className="mt-5 max-w-[65ch]">{content.body}</p>
      <Sheet className="mt-9 px-3 py-6 sm:px-8 sm:py-8 lg:px-10">
        <figure>
          <figcaption className="mb-7 text-sm text-muted">{content.caption}</figcaption>
          <div className="grid grid-cols-2 divide-x divide-ink">
            <div className="min-w-0 pr-3 sm:pr-7">
              <p className="mb-5 text-sm font-semibold">{content.columns.before}</p>
              <Stamp status="BLOCKED" />
              <Ecg rhythm="BLOCKED" className="mt-5 h-20 w-full text-ink sm:h-24" />
            </div>
            <div className="min-w-0 pl-4 sm:pl-8">
              <p className="mb-5 text-sm font-semibold">{content.columns.after}</p>
              <Stamp status="READY" />
              <Ecg rhythm="READY" className="mt-5 h-20 w-full text-ink sm:h-24" />
            </div>
          </div>
          <table className="mt-5 w-full table-fixed border-collapse text-left text-xs leading-snug sm:text-base">
            <thead className="border-y-2 border-ink">
              <tr>
                <th scope="col" className="w-[32%] py-3 pr-2 font-semibold">{content.columns.check}</th>
                <th scope="col" className="w-[28%] py-3 pr-1 font-semibold">{content.columns.before}</th>
                <th scope="col" className="w-[22%] py-3 pr-1 font-semibold">{content.columns.after}</th>
                <th scope="col" className="w-[18%] py-3 text-right"><span className="sr-only">{content.columns.change}</span></th>
              </tr>
            </thead>
            <tbody>
              {content.rows.filter(isLive).map((row) => (
                <tr key={row.check} className="border-b border-ink">
                  <th scope="row" className="py-4 pr-2 font-medium">{row.check}</th>
                  <td className="py-4 pr-1"><span className={`inline-block border-l-[3px] pl-1.5 font-semibold ${row.before === 'FAIL' ? 'border-triage-red' : 'border-muted'}`}>{row.before}</span></td>
                  <td className="py-4 pr-1"><span className="inline-block border-l-[3px] border-triage-green pl-1.5 font-semibold">{row.after}</span></td>
                  <td className="py-4 text-right">{row.change}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      </Sheet>
      <div className="mt-8"><ButtonLink href={content.primary.href} variant="pen">{content.primary.label}</ButtonLink></div>
    </section>
  );
}
