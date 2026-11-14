import type Stripe from 'stripe';
import { ownPriceIds } from './plans';

/**
 * Is this Stripe object about this app? The Stripe account may also sell other things; only
 * subscriptions and invoices on one of our configured prices (see ownPriceIds) are ours.
 */

type WithId = string | { id?: string } | null | undefined;
const idOf = (x: WithId): string | undefined => (typeof x === 'string' ? x : x?.id ?? undefined);

/** Price IDs on a subscription's items. */
export function subscriptionPriceIds(sub: Stripe.Subscription): string[] {
  return (sub.items?.data ?? []).map((item) => idOf(item.price as WithId)).filter((id): id is string => !!id);
}

/** Price IDs on an invoice's lines: newer API under pricing.price_details, older under price / plan. */
export function invoicePriceIds(inv: Stripe.Invoice): string[] {
  return (inv.lines?.data ?? [])
    .map((line) => {
      const legacy = line as Stripe.InvoiceLineItem & { price?: WithId; plan?: WithId };
      return idOf(line.pricing?.price_details?.price as WithId) ?? idOf(legacy.price) ?? idOf(legacy.plan);
    })
    .filter((id): id is string => !!id);
}

export function subscriptionIsOurs(sub: Stripe.Subscription): boolean {
  const ours = ownPriceIds();
  return subscriptionPriceIds(sub).some((id) => ours.has(id));
}

export function invoiceIsOurs(inv: Stripe.Invoice): boolean {
  const ours = ownPriceIds();
  return invoicePriceIds(inv).some((id) => ours.has(id));
}
