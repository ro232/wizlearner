import 'server-only';
import type Stripe from 'stripe';
import type { Tier } from '@/types';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { stripe } from '@/lib/stripe';
import { effectiveTier, subscriptionGivesAccess } from './tier';
import { subscriptionIsOurs, subscriptionPriceIds } from './ownership';

/** Period end moved onto subscription items in newer Stripe API versions; read either. */
function periodEnd(sub: Stripe.Subscription): string | null {
  const item = sub.items?.data?.[0] as (Stripe.SubscriptionItem & { current_period_end?: number }) | undefined;
  const legacy = (sub as Stripe.Subscription & { current_period_end?: number }).current_period_end;
  const ts = item?.current_period_end ?? legacy;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

/** A failed database read must stop the sync (Stripe retries); it is never treated as "nothing found". */
function readFailed(what: string, error: { message?: string }): Error {
  return new Error(`syncSubscription: reading ${what} failed: ${error.message ?? 'unknown error'}`);
}

/**
 * Write a subscription's current state onto the account it belongs to. The subscription is
 * always re-read from Stripe, so events that arrive late or out of order cannot undo a newer state.
 */
//
// A customer with two subscriptions (e.g. paid twice from two tabs) keeps access while either is
// active. Returns false when there is nothing to do and no reason for Stripe to retry: the
// subscription is on a price that is not ours (another product on the same Stripe account), or it
// belongs to no account of this app.
//
// Rule for errors: "not found" and "could not read" are different. A read that fails throws, so
// the webhook answers 500 and Stripe retries; a tier is never lowered on an error path.
export async function syncSubscription(subscriptionId: string): Promise<boolean> {
  const triggered = await stripe().subscriptions.retrieve(subscriptionId);
  const customerId = typeof triggered.customer === 'string' ? triggered.customer : triggered.customer.id;

  if (!subscriptionIsOurs(triggered)) {
    const prices = subscriptionPriceIds(triggered).join(', ') || 'no price';
    if (triggered.metadata?.user_id) {
      // Started from our checkout, yet on a price we no longer list: almost certainly a price change.
      console.error(`Stripe subscription ${subscriptionId} (${prices}) was created by WorksheetWiz but its price is not configured; ignored. If the price was replaced, add the old price ID to STRIPE_PRICE_LEGACY.`);
    } else {
      console.warn(`Stripe subscription ${subscriptionId} (${prices}) is not a WorksheetWiz price; ignored`);
    }
    return false;
  }

  const admin = createAdminSupabase();
  let userId = triggered.metadata?.user_id;
  if (!userId) {
    const { data, error } = await admin.from('users_profile').select('id').eq('stripe_customer_id', customerId).maybeSingle();
    if (error) throw readFailed(`the account of customer ${customerId}`, error);
    userId = data?.id;
  }
  if (!userId) {
    console.warn(`Stripe subscription ${subscriptionId}: customer ${customerId} has no WorksheetWiz account; ignored`);
    return false;
  }

  const all = await stripe().subscriptions.list({ customer: customerId, status: 'all', limit: 20 });
  // Only our own subscriptions count: one for another product must not keep the paid tier alive.
  const own = all.data.filter(subscriptionIsOurs);
  const subs = own.length ? own : [triggered];
  // The subscription that decides access: an active one if any, else the most recent.
  const sub = subs.find((x) => subscriptionGivesAccess(x.status)) ?? [...subs].sort((x, y) => y.created - x.created)[0];

  const { data: profile, error: profileError } = await admin.from('users_profile').select('access_code').eq('id', userId).maybeSingle();
  if (profileError) throw readFailed(`profile ${userId}`, profileError);
  if (!profile) {
    console.warn(`Stripe subscription ${subscriptionId}: account ${userId} no longer exists; ignored`);
    return false;
  }
  let codeTier: Tier | null = null;
  if (profile.access_code) {
    const { data: code, error: codeError } = await admin.from('access_codes').select('tier').eq('code', profile.access_code).maybeSingle();
    if (codeError) throw readFailed(`the access code of ${userId}`, codeError);
    codeTier = (code?.tier as Tier | undefined) ?? null;
  }

  const { error } = await admin
    .from('users_profile')
    .update({
      stripe_customer_id: customerId,
      subscription_id: sub.id,
      subscription_status: sub.status,
      subscription_period_end: periodEnd(sub),
      tier: effectiveTier(sub.status, codeTier),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (error) throw error;
  return true;
}
