import type { StatusCounts, TimeBucket } from '@/lib/dashboard/types';

const TRIAGE: Record<keyof StatusCounts, string> = {
  READY: 'var(--triage-green)',
  AT_RISK: 'var(--triage-amber)',
  BLOCKED: 'var(--triage-red)',
  NOT_TESTED: 'var(--muted)',
};

const ORDER: (keyof StatusCounts)[] = ['READY', 'AT_RISK', 'BLOCKED', 'NOT_TESTED'];

function bucketTotal(counts: StatusCounts): number {
  return counts.READY + counts.AT_RISK + counts.BLOCKED + counts.NOT_TESTED;
}

/** Stacked bars. Only buckets that already contain real events. */
export function HealthSeriesChart({ series }: { series: TimeBucket[] }): React.ReactElement {
  const max = Math.max(...series.map((bucket) => bucketTotal(bucket.counts)), 1);
  return (
    <div className="flex min-h-32 items-end gap-1 overflow-x-auto sm:gap-2">
      {series.map((bucket) => {
        const total = bucketTotal(bucket.counts);
        return (
          <div key={bucket.start} className="flex min-w-8 flex-1 flex-col items-center gap-2">
            <div
              className="flex w-full max-w-10 flex-col-reverse border-2 border-ink"
              style={{ height: `${Math.max(8, (total / max) * 120)}px` }}
              title={`${bucket.label}: ${total}`}
            >
              {ORDER.map((status) => {
                const value = bucket.counts[status];
                if (value === 0) return null;
                return (
                  <div
                    key={status}
                    style={{ height: `${(value / total) * 100}%`, background: TRIAGE[status] }}
                  />
                );
              })}
            </div>
            <span className="font-mono text-[0.65rem] text-muted">{bucket.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Lines from real buckets. A missing bucket is a gap, not a fabricated zero. */
export function HealthLineChart({ series, labels }: {
  series: TimeBucket[];
  labels: Record<keyof StatusCounts, string>;
}): React.ReactElement {
  const width = 640;
  const height = 188;
  const pad = { top: 10, right: 10, bottom: 28, left: 34 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(
    ...series.map((bucket) => Math.max(bucket.counts.READY, bucket.counts.AT_RISK, bucket.counts.BLOCKED)),
    1,
  );
  const x = (index: number) => pad.left + (series.length === 1 ? innerW / 2 : (index / (series.length - 1)) * innerW);
  const y = (value: number) => pad.top + innerH - (value / max) * innerH;
  const path = (key: keyof StatusCounts) =>
    series.map((bucket, index) => `${index === 0 ? 'M' : 'L'}${x(index)},${y(bucket.counts[key])}`).join(' ');

  const ticks = [...new Set([0, 0.5, 1].map((ratio) => Math.round(max * ratio)))];
  const xLabels = series.length > 8
    ? series.filter((_, index) => index === 0 || index === series.length - 1 || index % Math.ceil(series.length / 5) === 0)
    : series;

  return (
    <div className="min-w-0">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-36 w-full sm:h-44" role="img" aria-label="Health over time">
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={pad.left}
              x2={width - pad.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--ink)"
              strokeOpacity="0.12"
            />
            <text x={pad.left - 6} y={y(tick) + 3} textAnchor="end" className="fill-muted" fontSize="10">
              {tick}
            </text>
          </g>
        ))}
        {(['READY', 'AT_RISK', 'BLOCKED'] as const).map((status) => (
          <path key={status} d={path(status)} fill="none" stroke={TRIAGE[status]} strokeWidth="2.25" />
        ))}
        {xLabels.map((bucket) => {
          const index = series.indexOf(bucket);
          return (
            <text key={bucket.start} x={x(index)} y={height - 6} textAnchor="middle" className="fill-muted" fontSize="10">
              {bucket.label}
            </text>
          );
        })}
      </svg>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {(['READY', 'AT_RISK', 'BLOCKED'] as const).map((status) => (
          <li key={status} className="flex items-center gap-2">
            <span className="inline-block h-2 w-4 border border-ink" style={{ background: TRIAGE[status] }} />
            {labels[status]}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function IssuesBarChart({ items, unit }: {
  items: Array<{ id: string; title: string; problems: number }>;
  unit: string;
}): React.ReactElement {
  const max = Math.max(...items.map((item) => item.problems), 1);
  return (
    <ul className="mt-4 space-y-3">
      {items.map((item) => (
        <li key={item.id}>
          <div className="flex justify-between gap-3 text-sm">
            <span className="font-semibold">{item.title}</span>
            <span className="font-mono text-muted">
              {item.problems} {unit}
            </span>
          </div>
          <div className="mt-1 h-3 border-2 border-ink bg-paper">
            <div className="h-full bg-ink" style={{ width: `${(item.problems / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Donut from real status counts. Empty slices are omitted. */
export function HealthDonut({ counts, labels }: {
  counts: StatusCounts;
  labels: Record<keyof StatusCounts, string>;
}): React.ReactElement {
  const total = bucketTotal(counts);
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <svg viewBox="0 0 120 120" className="h-32 w-32 shrink-0 sm:h-36 sm:w-36" role="img" aria-label="Health distribution">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--ink)" strokeWidth="2" />
        {ORDER.map((status) => {
          const value = counts[status];
          if (value === 0) return null;
          const length = (value / total) * circumference;
          const circle = (
            <circle
              key={status}
              cx="60"
              cy="60"
              r={radius}
              fill="none"
              stroke={TRIAGE[status]}
              strokeWidth="16"
              strokeDasharray={`${length} ${circumference - length}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 60 60)"
            />
          );
          offset += length;
          return circle;
        })}
        <text x="60" y="64" textAnchor="middle" className="fill-ink font-display text-xl font-black">
          {total}
        </text>
      </svg>
      <ul className="w-full min-w-0 space-y-2 text-sm sm:w-auto">
        {ORDER.filter((status) => counts[status] > 0).map((status) => (
          <li key={status} className="grid grid-cols-[0.75rem_1fr_auto] items-center gap-2">
            <span className="inline-block h-3 w-3 border border-ink" style={{ background: TRIAGE[status] }} />
            <span className="font-semibold">{labels[status]}</span>
            <span className="font-mono text-muted tabular-nums">
              {counts[status]} · {Math.round((counts[status] / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
