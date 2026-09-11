import type { Metadata } from 'next';
import { Big_Shoulders, Big_Shoulders_Stencil, Public_Sans } from 'next/font/google';
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

export const metadata: Metadata = {
  title: 'DApp Doctor',
  description: 'Finds why your dApp is reading the wrong blockchain data, and proves the fix worked.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${bigShoulders.variable} ${bigShouldersStencil.variable} ${publicSans.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
