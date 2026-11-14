import { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo/site';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/api/', '/auth/', '/cont'] },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
