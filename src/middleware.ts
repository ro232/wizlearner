import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

/**
 * The middleware only refreshes the Supabase session cookies; it never redirects or blocks.
 * The server reads the session in exactly three places — /api/stripe/checkout, /api/stripe/portal
 * and /auth/callback — so it runs for /api, /auth and /cont. Every page is static HTML and shows
 * the signed-in state from the browser client, which refreshes its own tokens; running the
 * middleware on public pages, their prefetches, fonts and icons only added invocations.
 */
export const config = {
  matcher: ['/api/:path*', '/auth/:path*', '/cont/:path*'],
};
