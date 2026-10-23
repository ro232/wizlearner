import type { Tier } from '@/types';

/** Stripe subscription statuses that give access. `past_due` keeps access while Stripe retries the card. */
const ACTIVE = new Set(['active', 'trialing', 'past_due']);

export function subscriptionGivesAccess(status: string | null | undefined): boolean {
  return !!status && ACTIVE.has(status);
}

/**
 * The tier an account should have: an active subscription gives `full`; otherwise whatever
 * an access code gave (codes never expire); otherwise `free`. The higher of the two wins.
 */
export function effectiveTier(subscriptionStatus: string | null | undefined, codeTier: Tier | null | undefined): Tier {
  if (subscriptionGivesAccess(subscriptionStatus)) return 'full';
  return codeTier ?? 'free';
}
