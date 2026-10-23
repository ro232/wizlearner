import 'server-only';
import type Stripe from 'stripe';
import type { Tier } from '@/types';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { stripe } from '@/lib/stripe';
import { effectiveTier, subscriptionGivesAccess } from './tier';

/** Period end moved onto subscription items in newer Stripe API versions; read either. */
function periodEnd(sub: Stripe.Subscription): string | null {
  const item = sub.items?.data?.[0] as (Stripe.SubscriptionItem & { current_period_end?: number }) | undefined;
  const legacy = (sub as Stripe.Subscription & { current_period_end?: number }).current_period_end;
  const ts = item?.current_period_end ?? legacy;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

/**
 * Write a subscription's current state onto the account it belongs to. The subscription is
 * always re-read from Stripe, so events that arrive late or out of order cannot undo a newer state.
 */
//
// A customer with two subscriptions (e.g. paid twice from two tabs) keeps access while either is
// active. Returns false when the subscription belongs to no account of this app (another product
// on the same Stripe account): nothing to do, and no reason for Stripe to retry.
export async function syncSubscription(subscriptionId: string): Promise<boolean> {
  const triggered = await stripe().subscriptions.retrieve(subscriptionId);
  const admin = createAdminSupabase();
  const customerId = typeof triggered.customer === 'string' ? triggered.customer : triggered.customer.id;

  let userId = triggered.metadata?.user_id;
  if (!userId) {
    const { data } = await admin.from('users_profile').select('id').eq('stripe_customer_id', customerId).maybeSingle();
    userId = data?.id;
  }
  if (!userId) {
    console.warn(`Stripe subscription ${subscriptionId}: customer ${customerId} has no WorksheetWiz account; ignored`);
    return false;
  }

  const all = await stripe().subscriptions.list({ customer: customerId, status: 'all', limit: 20 });
  const subs = all.data.length ? all.data : [triggered];
  // The subscription that decides access: an active one if any, else the most recent.
  const sub = subs.find((x) => subscriptionGivesAccess(x.status)) ?? [...subs].sort((x, y) => y.created - x.created)[0];

  const { data: profile } = await admin.from('users_profile').select('access_code').eq('id', userId).single();
  let codeTier: Tier | null = null;
  if (profile?.access_code) {
    const { data: code } = await admin.from('access_codes').select('tier').eq('code', profile.access_code).maybeSingle();
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
