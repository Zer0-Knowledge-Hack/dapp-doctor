'use client';

import { AppShell } from '@/components/app/AppShell';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { useLang } from '@/components/i18n/LanguageProvider';
import type { Lang } from '@/lib/i18n/lang';

const COPY = {
  en: {
    title: 'DApp Health Dashboard',
    intro: 'Monitor the health and reliability of your dApps. Every figure comes from a stored diagnosis. Nothing is estimated.',
  },
  es: {
    title: 'Panel de salud de dApps',
    intro: 'Monitoreá la salud y la fiabilidad de tus dApps. Cada cifra sale de un diagnóstico guardado. Nada se estima.',
  },
} satisfies Record<Lang, unknown>;

export default function DashboardPage() {
  const copy = COPY[useLang()];
  return (
    <AppShell compact title={copy.title} intro={<p>{copy.intro}</p>}>
      <DashboardView />
    </AppShell>
  );
}
