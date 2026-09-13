import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DApp Doctor',
    short_name: 'DApp Doctor',
    description: 'Read-only diagnosis of a dApp RPC configuration.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#fff1ee',
    theme_color: '#fff1ee',
    lang: 'en',
    icons: [
      // The brand mark. The maskable one drops the border and fills the square
      // blue, so a launcher can crop it to any shape without cutting the cross.
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/brand/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
