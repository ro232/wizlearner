import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { syncSubscription } from '@/lib/billing/sync';

export const runtime = 'nodejs';

const HANDLED = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
]);

/**
 * The only place a paid tier is granted or removed. Signature-checked, and each event is
 * processed once (Stripe retries until it gets a 2xx).
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get('stripe-signature');
  if (!secret || !signature) return NextResponse.json({ error: 'not configured' }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return NextResponse.json({ error: 'bad signature' }, { status: 400 });
  }
  if (!HANDLED.has(event.type)) return NextResponse.json({ received: true });

  const admin = createAdminSupabase();
  const { data: seen } = await admin.from('stripe_events').select('id').eq('id', event.id).maybeSingle();
  if (seen) return NextResponse.json({ received: true, duplicate: true });

  let subscriptionId: string | null = null;
  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as Stripe.Checkout.Session;
    subscriptionId = typeof s.subscription === 'string' ? s.subscription : s.subscription?.id ?? null;
  } else {
    subscriptionId = (event.data.object as Stripe.Subscription).id;
  }

  try {
    if (subscriptionId) await syncSubscription(subscriptionId);
  } catch (err) {
    console.error('stripe webhook', event.id, err);
    return NextResponse.json({ error: 'sync failed' }, { status: 500 }); // Stripe will retry
  }

  await admin.from('stripe_events').insert({ id: event.id, type: event.type });
  return NextResponse.json({ received: true });
}
