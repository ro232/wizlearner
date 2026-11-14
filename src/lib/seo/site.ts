/**
 * The public address of the site. One source for metadataBase, canonical links, the sitemap,
 * robots.txt, Open Graph and JSON-LD, so they can never point at somebody else's domain.
 *
 * Order: NEXT_PUBLIC_SITE_URL (the domain you own), else the project's production host on
 * Vercel, else localhost for local work. There is deliberately no hard-coded domain.
 */

export const LOCAL_SITE_URL = 'http://localhost:3000';

type SiteEnv = {
  NEXT_PUBLIC_SITE_URL?: string;
  VERCEL_PROJECT_PRODUCTION_URL?: string;
  NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL?: string;
};

/** "example.ro", "https://example.ro/", "https://example.ro/ceva" → "https://example.ro"; anything unusable → null. */
function toOrigin(value: string | undefined): string | null {
  const v = value?.trim();
  if (!v) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    return url.hostname.includes('.') || url.hostname === 'localhost' ? url.origin : null;
  } catch {
    return null;
  }
}

export function resolveSiteUrl(env: SiteEnv): string {
  return (
    toOrigin(env.NEXT_PUBLIC_SITE_URL) ??
    // Vercel sets this (without the protocol) to the shortest production domain of the project.
    toOrigin(env.VERCEL_PROJECT_PRODUCTION_URL || env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL) ??
    LOCAL_SITE_URL
  );
}

// Each variable is named in full so the public ones are also available in the browser bundle.
export const SITE_URL = resolveSiteUrl({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL,
  NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL: process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL,
});

/** Absolute address of a path on this site: absoluteUrl('/fise') → "https://…/fise". */
export function absoluteUrl(path = ''): string {
  if (!path || path === '/') return SITE_URL;
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/** Date of the last content change, for the sitemap (not the build time, which changes on every deploy). */
export const CONTENT_UPDATED = '2026-11-13';
