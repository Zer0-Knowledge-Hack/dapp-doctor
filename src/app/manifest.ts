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
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
