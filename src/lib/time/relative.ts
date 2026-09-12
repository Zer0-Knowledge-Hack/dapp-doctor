import { LOCALE, type Lang } from '../i18n/lang';

/** Short relative time. The full timestamp stays available for a tooltip. */
export function formatRelative(iso: string, lang: Lang, nowMs: number = Date.now()): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return iso;
  const delta = Math.round((nowMs - then) / 1000);
  const abs = Math.abs(delta);
  const rtf = new Intl.RelativeTimeFormat(LOCALE[lang], { numeric: 'auto' });
  if (abs < 60) return rtf.format(-Math.trunc(delta), 'second');
  if (abs < 3600) return rtf.format(-Math.trunc(delta / 60), 'minute');
  if (abs < 86400) return rtf.format(-Math.trunc(delta / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(-Math.trunc(delta / 86400), 'day');
  return new Date(then).toLocaleString(LOCALE[lang], { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatDurationMs(ms: number, lang: Lang): string {
  if (ms >= 1000) return `${(ms / 1000).toLocaleString(LOCALE[lang], { maximumFractionDigits: 1 })} s`;
  return `${Math.round(ms).toLocaleString(LOCALE[lang])} ms`;
}
