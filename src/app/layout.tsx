import type { Metadata, Viewport } from 'next';
import { Big_Shoulders, Big_Shoulders_Stencil, Public_Sans } from 'next/font/google';
import { cookies } from 'next/headers';
import { AccountProvider } from '@/components/account/AccountProvider';
import { LanguageProvider } from '@/components/i18n/LanguageProvider';
import { isAuthConfigured } from '@/lib/auth/options';
import { currentSession } from '@/lib/auth/session';
import { LANG_COOKIE, parseLang, type Lang } from '@/lib/i18n/lang';
import './globals.css';

// Condensed and heavy for headlines: the voice of a chart header.
const bigShoulders = Big_Shoulders({
  variable: '--font-big-shoulders',
  subsets: ['latin'],
  weight: ['700', '900'],
  display: 'swap',
  // Next cannot compute size-adjust for this family; a missing override
  // floods the console and delays first paint. The CSS fallback stack still holds.
  adjustFontFallback: false,
});

// Stencil cut of the same family, used only for the diagnosis stamp.
const bigShouldersStencil = Big_Shoulders_Stencil({
  variable: '--font-big-shoulders-stencil',
  subsets: ['latin'],
  weight: ['900'],
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
});

// Designed for government forms, which is what a clinical report is.
const publicSans = Public_Sans({
  variable: '--font-public-sans',
  subsets: ['latin'],
  display: 'swap',
});

const DESCRIPTION: Record<Lang, string> = {
  en: 'Finds why your dApp is reading the wrong blockchain data, and proves the fix worked.',
  es: 'Encuentra por qué tu dApp lee datos equivocados de la blockchain, y prueba que el arreglo funcionó.',
};

/** The reader's language, from the cookie the language buttons set. English when there is none. */
async function readLang(): Promise<Lang> {
  return parseLang((await cookies()).get(LANG_COOKIE)?.value);
}

export const viewport: Viewport = {
  themeColor: '#fff1ee',
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'DApp Doctor',
    description: DESCRIPTION[await readLang()],
    manifest: '/manifest.webmanifest',
    appleWebApp: { capable: true, title: 'DApp Doctor', statusBarStyle: 'default' },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [lang, session] = await Promise.all([readLang(), currentSession()]);
  return (
    <html lang={lang} suppressHydrationWarning>
      <body
        className={`${bigShoulders.variable} ${bigShouldersStencil.variable} ${publicSans.variable} antialiased`}
        suppressHydrationWarning
      >
        <LanguageProvider initial={lang}>
          <AccountProvider enabled={isAuthConfigured()} session={session}>
            {children}
          </AccountProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
