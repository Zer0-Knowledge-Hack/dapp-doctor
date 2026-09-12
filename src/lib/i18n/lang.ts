/**
 * Interface languages. English is the product's language and the default;
 * Spanish is offered on request. Only what people read changes: the engine,
 * the API and the MCP server stay in English, and the Spanish report is a
 * presentation of the same English report (see engineText.ts).
 */
export type Lang = 'en' | 'es';

export const LANGS: readonly Lang[] = ['en', 'es'];

/** Cookie, so the server renders the chosen language on the first paint. */
export const LANG_COOKIE = 'dapp-doctor-lang';

export function parseLang(value: unknown): Lang {
  return value === 'es' ? 'es' : 'en';
}

/** Locale for dates and numbers, so a Spanish page never shows an English date. */
export const LOCALE: Record<Lang, string> = { en: 'en', es: 'es' };
