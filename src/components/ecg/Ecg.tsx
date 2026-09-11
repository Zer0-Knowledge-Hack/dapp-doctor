import type { OverallStatus } from '@/lib/diagnostics/types';

/**
 * An ECG strip whose rhythm is the diagnosis.
 *
 * READY beats evenly, AT_RISK is arrhythmic, BLOCKED weakens and goes flat.
 * It is the one bold element of the page: the status is readable before a
 * single word is. The shape carries the meaning, so it also works for anyone
 * who cannot tell the triage colours apart.
 */

export type Rhythm = OverallStatus | 'idle';

const WIDTH = 720;
const HEIGHT = 120;
const BASELINE = 72;

/**
 * One PQRST complex, as (dx, dy) from the baseline. Negative dy goes up.
 * Exported so the live heartbeat monitor draws the very same beat.
 */
export const BEAT: Array<[number, number]> = [
  [0, 0], [10, 0], [15, -8], [20, 0], [26, 0], [29, 6], [34, -56],
  [39, 14], [43, 0], [52, 0], [60, -14], [68, 0], [80, 0],
];

interface BeatSpec {
  /** Horizontal gap before this beat. */
  gap: number;
  /** Amplitude multiplier. */
  amp: number;
}

const RHYTHMS: Record<Rhythm, BeatSpec[]> = {
  idle: Array.from({ length: 6 }, () => ({ gap: 40, amp: 0.35 })),
  READY: Array.from({ length: 6 }, () => ({ gap: 40, amp: 1 })),
  AT_RISK: [
    { gap: 30, amp: 1 },
    { gap: 110, amp: 0.55 },
    { gap: 20, amp: 1.1 },
    { gap: 90, amp: 0.4 },
    { gap: 35, amp: 0.9 },
  ],
  BLOCKED: [
    { gap: 40, amp: 1 },
    { gap: 60, amp: 0.45 },
    { gap: 90, amp: 0.15 },
  ],
  NOT_TESTED: [
    { gap: 60, amp: 0.2 },
    { gap: 160, amp: 0.2 },
  ],
};

function pathFor(rhythm: Rhythm): string {
  const points: string[] = [`M0,${BASELINE}`];
  let x = 0;
  for (const { gap, amp } of RHYTHMS[rhythm]) {
    x += gap;
    points.push(`L${x},${BASELINE}`);
    for (const [dx, dy] of BEAT) points.push(`L${x + dx},${BASELINE + dy * amp}`);
    x += BEAT[BEAT.length - 1][0];
  }
  // Whatever is left of the strip is flat: for BLOCKED, that flat line is the point.
  points.push(`L${WIDTH},${BASELINE}`);
  return points.join(' ');
}

const LABEL: Record<Rhythm, string> = {
  idle: 'Waiting for a diagnosis',
  READY: 'Steady rhythm: all checks passed',
  AT_RISK: 'Irregular rhythm: some checks need attention',
  BLOCKED: 'Flatline: a critical check failed',
  NOT_TESTED: 'No signal: nothing could be checked',
};

export function Ecg({ rhythm, className = '', motion }: {
  rhythm: Rhythm;
  className?: string;
  motion?: { pauseLabel: string };
}) {
  // A repeated READY strip joins at its baseline with exactly six equal beats.
  // Failed or untested states must never acquire a healthy looping heartbeat.
  if (motion && rhythm === 'READY') {
    return (
      <div className={`ecg-monitor relative ${className}`}>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={LABEL[rhythm]}
          className="h-full w-full overflow-hidden"
        >
          <g className="ecg-track">
            {[0, WIDTH].map((offset) => (
              <path
                key={offset}
                d={pathFor(rhythm)}
                transform={`translate(${offset} 0)`}
                fill="none"
                stroke="currentColor"
                strokeWidth={3}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </g>
        </svg>
        <label className="ecg-motion-control absolute right-0 bottom-0 flex min-h-6 cursor-pointer items-center gap-1.5 bg-sheet pl-2 font-sans text-[11px] leading-4 text-muted">
          <input type="checkbox" className="h-3.5 w-3.5 accent-ink" />
          {motion.pauseLabel}
        </label>
      </div>
    );
  }

  return (
    // Keyed by rhythm so a new result redraws the strip instead of snapping.
    // The draw animation clips the whole strip (see .ecg-trace in globals.css).
    <svg
      key={rhythm}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={LABEL[rhythm]}
      className={`ecg-trace ${className}`}
    >
      <path
        d={pathFor(rhythm)}
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
