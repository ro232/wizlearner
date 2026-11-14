import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { syncSubscription } from '@/lib/billing/sync';
import { handleRefund, invoiceSubscriptionId, issueFiscalInvoice } from '@/lib/billing/fiscal';
import { invoiceIsOurs, invoicePriceIds } from '@/lib/billing/ownership';

export const runtime = 'nodejs';

const HANDLED = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid', // → fiscal invoice in Oblio (first payment and every renewal)
  'charge.refunded', // → storno in Oblio
]);
// Keep this list equal to the events selected on the Stripe webhook endpoint (README, „Stripe”).
// The endpoint must send "Snapshot" payloads: the code reads event.data.object.

/** Whose payment this is: the user_id put on the subscription at checkout, else the profile with this customer. */
async function invoiceUser(inv: Stripe.Invoice): Promise<string | null> {
  const fromMeta = inv.parent?.subscription_details?.metadata?.user_id;
  if (fromMeta) return fromMeta;
  const customer = typeof inv.customer === 'string' ? inv.customer : inv.customer?.id;
  if (!customer) return null;
  const { data, error } = await createAdminSupabase().from('users_profile').select('id').eq('stripe_customer_id', customer).maybeSingle();
  // A failed read is not "no account": the invoice would be saved with no owner and never show in their account.
  if (error) throw new Error(`reading the account of customer ${customer} failed: ${error.message ?? 'unknown error'}`);
  return (data?.id as string | undefined) ?? null;
}

/**
 * The only place a paid tier is granted or removed. Signature-checked, and each event is
 * processed once (Stripe retries until it gets a 2xx).
 *
 * The Stripe account may sell other things too. Only subscriptions and invoices on this app's
 * prices (STRIPE_PRICE_MONTHLY / STRIPE_PRICE_YEARLY, plus STRIPE_PRICE_LEGACY) are acted on;
 * everything else is acknowledged with 200 and logged, never synced and never invoiced.
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

  try {
    if (event.type === 'invoice.paid') {
      const inv = event.data.object as Stripe.Invoice;
      if (!invoiceIsOurs(inv)) {
        console.info(`stripe webhook ${event.id}: invoice ${inv.id} (${invoicePriceIds(inv).join(', ') || 'no price'}) is not a WorksheetWiz price; ignored`);
      } else {
        const subscriptionId = invoiceSubscriptionId(inv);
        if (subscriptionId) await syncSubscription(subscriptionId);
        await issueFiscalInvoice(inv.id!, await invoiceUser(inv));
      }
    } else if (event.type === 'charge.refunded') {
      await handleRefund(event.data.object as Stripe.Charge);
    } else {
      let subscriptionId: string | null = null;
      if (event.type === 'checkout.session.completed') {
        const s = event.data.object as Stripe.Checkout.Session;
        subscriptionId = typeof s.subscription === 'string' ? s.subscription : s.subscription?.id ?? null;
      } else {
        subscriptionId = (event.data.object as Stripe.Subscription).id;
      }
      if (subscriptionId) await syncSubscription(subscriptionId);
    }
  } catch (err) {
    console.error('stripe webhook', event.id, err);
    return NextResponse.json({ error: 'processing failed' }, { status: 500 }); // Stripe will retry
  }

  await admin.from('stripe_events').insert({ id: event.id, type: event.type });
  return NextResponse.json({ received: true });
}
