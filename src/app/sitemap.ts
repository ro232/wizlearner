import { MetadataRoute } from 'next';
import { SEO_SHEETS } from '@/lib/seo/catalog';
import { CLASS_PAGES } from '@/lib/curriculum/presets';
import { CONTENT_UPDATED, absoluteUrl } from '@/lib/seo/site';

export default function sitemap(): MetadataRoute.Sitemap {
  // The date of the last content change, not of the build: search engines ignore a lastmod that moves on every deploy.
  const lastModified = CONTENT_UPDATED;
  const page = (path: string, priority: number, changeFrequency: 'weekly' | 'monthly' | 'yearly' = 'monthly') => ({ url: absoluteUrl(path), lastModified, changeFrequency, priority });
  return [
    page('', 1, 'weekly'),
    page('/generator', 0.9, 'weekly'),
    page('/fise', 0.9, 'weekly'),
    page('/grupa', 0.9),
    page('/nume', 0.8),
    page('/caiete', 0.8),
    page('/advent', 0.8),
    page('/planse', 0.8),
    page('/preturi', 0.8),
    page('/book', 0.7),
    ...SEO_SHEETS.map((s) => page(`/fise/${s.slug}`, 0.7)),
    page('/programa', 0.8),
    ...CLASS_PAGES.map((c) => page(`/programa/${c.slug}`, 0.7)),
    page('/planificare', 0.8),
    page('/confidentialitate', 0.2, 'yearly'),
    page('/termeni', 0.2, 'yearly'),
  ];
}
