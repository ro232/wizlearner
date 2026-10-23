import 'server-only';
import Stripe from 'stripe';

let client: Stripe | null = null;

/** Server-side Stripe client (API version pinned by the SDK). */
export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  client ??= new Stripe(key, { appInfo: { name: 'WorksheetWiz' } });
  return client;
}

/** Absolute site URL for Stripe redirects. */
export function siteUrl(request: Request): string {
  return process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
}
