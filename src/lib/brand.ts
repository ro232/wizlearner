/**
 * The name printed on the sheets. The small footer of the free sheets names the site only when
 * the site address is configured (NEXT_PUBLIC_SITE_URL): we never print a domain we do not own.
 */
export const BRAND_NAME = 'WorksheetWiz';

/** "wizlearner.vercel.app" from "https://www.wizlearner.vercel.app/": no scheme, no www, no path. */
export function siteHost(url: string | undefined = process.env.NEXT_PUBLIC_SITE_URL): string | null {
  const raw = (url ?? '').trim();
  if (!raw) return null;
  try {
    const host = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `https://${raw}`).hostname.replace(/^www\./i, '');
    return host && host.includes('.') ? host : null;
  } catch {
    return null;
  }
}

/** Footer of the free sheets: "Creat cu <site>" / "Made with <site>", or the brand name alone. */
export function madeWith(lang: 'ro' | 'en' = 'ro', url: string | undefined = process.env.NEXT_PUBLIC_SITE_URL): string {
  return `${lang === 'en' ? 'Made with' : 'Creat cu'} ${siteHost(url) ?? BRAND_NAME}`;
}
