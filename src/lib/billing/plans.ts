/**
 * The paid plans. Prices live in Stripe (so they can change without a deploy); here we only
 * name them and point at the Stripe Price IDs from the environment.
 */
export type PlanId = 'monthly' | 'school-year';

export interface Plan {
  id: PlanId;
  title: string;
  /** Shown under the price. */
  period: string;
  envPrice: string | undefined;
}

export const PLANS: Plan[] = [
  { id: 'monthly', title: 'Lunar', period: 'pe lună, anulezi oricând', envPrice: process.env.STRIPE_PRICE_MONTHLY },
  { id: 'school-year', title: 'An școlar', period: 'pe an, cu reducere', envPrice: process.env.STRIPE_PRICE_YEARLY },
];

export function priceIdFor(plan: string): string | undefined {
  return PLANS.find((p) => p.id === plan)?.envPrice;
}

export function billingConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY && PLANS.some((p) => !!p.envPrice);
}
