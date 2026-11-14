/**
 * The paid plans. Prices live in Stripe (so they can change without a deploy); here we only
 * name them and point at the Stripe Price IDs from the environment.
 *
 * Server-side only in practice: every value read here is a server variable (or is read on the server).
 */
export type PlanId = 'monthly' | 'school-year';

export interface Plan {
  id: PlanId;
  title: string;
  /** Shown under the price. */
  period: string;
  /** The environment variable that holds this plan's Stripe Price ID. */
  priceEnv: 'STRIPE_PRICE_MONTHLY' | 'STRIPE_PRICE_YEARLY';
}

export const PLANS: Plan[] = [
  { id: 'monthly', title: 'Lunar', period: 'pe lună, anulezi oricând', priceEnv: 'STRIPE_PRICE_MONTHLY' },
  { id: 'school-year', title: 'An școlar', period: 'pe an, cu reducere', priceEnv: 'STRIPE_PRICE_YEARLY' },
];

/** A variable counts as set only with a real value: empty, or the "sk_test_..." placeholder of .env.example, does not. */
function value(raw: string | undefined): string | undefined {
  const v = raw?.trim();
  return v && !v.endsWith('...') ? v : undefined;
}

/** The Stripe Price ID of a plan, if configured. */
export function planPriceId(plan: Plan): string | undefined {
  return value(process.env[plan.priceEnv]);
}

export function priceIdFor(plan: string): string | undefined {
  const found = PLANS.find((p) => p.id === plan);
  return found ? planPriceId(found) : undefined;
}

/**
 * Every Stripe Price ID that belongs to this app: the two plans, plus retired prices listed in
 * STRIPE_PRICE_LEGACY (comma-separated) that existing subscribers may still be paying after a price change.
 * Webhook events about any other price (another product on the same Stripe account) are ignored:
 * they must never grant access here or become a "WorksheetWiz" fiscal invoice.
 */
export function ownPriceIds(): Set<string> {
  const legacy = (process.env.STRIPE_PRICE_LEGACY ?? '').split(',').map((s) => value(s));
  return new Set([...PLANS.map(planPriceId), ...legacy].filter((id): id is string => !!id));
}

/**
 * What is still missing before payments may be taken, as variable names (for the server log only,
 * never for the browser). A payment needs the whole chain: Stripe must be able to charge
 * (secret key + a price), the webhook must be able to verify Stripe's message (webhook secret) and
 * to write the paid tier (Supabase URL + service-role key). With any link missing, a customer
 * would pay and stay on the free tier.
 */
export function missingBillingConfig(): string[] {
  const missing: string[] = [];
  if (!value(process.env.STRIPE_SECRET_KEY)) missing.push('STRIPE_SECRET_KEY');
  if (!PLANS.some((p) => planPriceId(p))) missing.push('STRIPE_PRICE_MONTHLY / STRIPE_PRICE_YEARLY');
  if (!value(process.env.STRIPE_WEBHOOK_SECRET)) missing.push('STRIPE_WEBHOOK_SECRET');
  if (!value(process.env.SUPABASE_SERVICE_ROLE_KEY)) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!value(process.env.NEXT_PUBLIC_SUPABASE_URL)) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  return missing;
}

/** Payments are on only when nothing is missing (see missingBillingConfig). */
export function billingConfigured(): boolean {
  return missingBillingConfig().length === 0;
}

/**
 * For the server log: say what is missing when billing was started but not finished
 * (a Stripe key is set, something else is not). Silent when nothing at all is configured.
 */
export function warnIfBillingHalfConfigured(where: string): void {
  const missing = missingBillingConfig();
  if (missing.length && value(process.env.STRIPE_SECRET_KEY)) {
    console.error(`[billing] ${where}: plata online rămâne oprită, lipsesc variabilele: ${missing.join(', ')}`);
  }
}
