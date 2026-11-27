/**
 * Sent with every response. There is deliberately no full Content-Security-Policy yet (it needs a
 * tested pass with Supabase, Stripe and PostHog); the one below only forbids framing the site.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async redirects() {
    // The name sheet moved to a Romanian address.
    return [{ source: '/custom-name', destination: '/nume', permanent: true }];
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // „Temă pentru acasă” links are someone's homework: never in a search engine, never sent on as a referrer.
      { source: '/tema/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }, { key: 'Referrer-Policy', value: 'no-referrer' }] },
      // „Caută fișe”: the page itself is indexed, a search in its address (?q=…, ?clasa=…) is not.
      ...['q', 'clasa', 'materie', 'tip', 'gratuite', 'raspunsuri'].map((key) => ({ source: '/cauta', has: [{ type: 'query', key: key }], headers: [{ key: 'X-Robots-Tag', value: 'noindex, follow' }] })),
      // The web font carries its version in the file name, so it can be cached for good.
      { source: '/fonts/:file(.*\\.woff2)', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
      // The TTFs embedded in PDFs and the app icons keep their names: cache for a day, refresh in the background.
      { source: '/fonts/:file(.*\\.ttf)', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }] },
      { source: '/icons/:file*', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }] },
    ];
  },
};

export default nextConfig;
