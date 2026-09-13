import type { Metadata } from 'next';
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
});

// Stencil cut of the same family, used only for the diagnosis stamp.
const bigShouldersStencil = Big_Shoulders_Stencil({
  variable: '--font-big-shoulders-stencil',
  subsets: ['latin'],
  weight: ['900'],
});

// Designed for government forms, which is what a clinical report is.
const publicSans = Public_Sans({
  variable: '--font-public-sans',
  subsets: ['latin'],
});

const DESCRIPTION: Record<Lang, string> = {
  en: 'Finds why your dApp is reading the wrong blockchain data, and proves the fix worked.',
  es: 'Encuentra por qué tu dApp lee datos equivocados de la blockchain, y prueba que el arreglo funcionó.',
};

/** The reader's language, from the cookie the language buttons set. English when there is none. */
async function readLang(): Promise<Lang> {
  return parseLang((await cookies()).get(LANG_COOKIE)?.value);
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'DApp Doctor',
    description: DESCRIPTION[await readLang()],
    // The brand mark: SVG where supported, a PNG where not, and a full tile for iOS.
    icons: {
      icon: [
        { url: '/brand/favicon.svg', type: 'image/svg+xml' },
        { url: '/brand/favicon-32.png', sizes: '32x32', type: 'image/png' },
      ],
      apple: '/brand/apple-touch-icon.png',
    },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const [lang, session] = await Promise.all([readLang(), currentSession()]);
  return (
    <html lang={lang}>
      <body
        className={`${bigShoulders.variable} ${bigShouldersStencil.variable} ${publicSans.variable} antialiased`}
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
