'use client';

import { useLang } from '@/components/i18n/LanguageProvider';
import { landingFor, type LandingCopy } from './content';

/** The landing copy in the reader's language. */
export function useLanding(): LandingCopy {
  return landingFor(useLang());
}
