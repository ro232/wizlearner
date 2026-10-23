import { MetadataRoute } from 'next';
import { SEO_SHEETS } from '@/lib/seo/catalog';
import { SITE_URL } from '@/lib/seo/site';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const page = (path: string, priority: number, changeFrequency: 'weekly' | 'monthly' | 'yearly' = 'monthly') => ({ url: `${SITE_URL}${path}`, lastModified: now, changeFrequency, priority });
  return [
    page('', 1, 'weekly'),
    page('/generator', 0.9, 'weekly'),
    page('/fise', 0.9, 'weekly'),
    page('/grupa', 0.9),
    page('/nume', 0.8),
    page('/preturi', 0.8),
    page('/book', 0.7),
    ...SEO_SHEETS.map((s) => page(`/fise/${s.slug}`, 0.7)),
    page('/confidentialitate', 0.2, 'yearly'),
    page('/termeni', 0.2, 'yearly'),
  ];
}
