import type { MetadataRoute } from 'next';
import { BRAND_NAME } from '@/lib/brand';

/** Web app manifest (served at /manifest.webmanifest and linked from every page). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND_NAME} – fișe de lucru`,
    short_name: BRAND_NAME,
    description: 'Fișe de lucru pe programă, de la grădiniță la clasa a IV-a, gata de printat.',
    lang: 'ro',
    start_url: '/',
    display: 'standalone',
    background_color: '#FFFFFF',
    theme_color: '#2448E8',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
