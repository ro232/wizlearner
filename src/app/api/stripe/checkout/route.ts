import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { stripe, siteUrl } from '@/lib/stripe';
import { billingConfigured, priceIdFor } from '@/lib/billing/plans';
import { subscriptionGivesAccess } from '@/lib/billing/tier';

export const runtime = 'nodejs';

/** Start a Stripe Checkout for a subscription. The tier is only granted later, by the webhook. */
export async function POST(request: Request) {
  if (!billingConfigured()) return NextResponse.json({ error: 'Plata online nu este încă disponibilă.' }, { status: 503 });

  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Intră în cont ca să te abonezi.' }, { status: 401 });

  const body = (await request.json().catch(() => ({}))) as { plan?: string };
  const price = priceIdFor(body.plan ?? '');
  if (!price) return NextResponse.json({ error: 'Plan necunoscut.' }, { status: 400 });

  const admin = createAdminSupabase();
  const { data: profile } = await admin.from('users_profile').select('stripe_customer_id, subscription_status').eq('id', user.id).single();
  if (subscriptionGivesAccess(profile?.subscription_status)) {
    return NextResponse.json({ error: 'Ai deja un abonament activ. Îl poți schimba din cont.' }, { status: 409 });
  }

  let customer = profile?.stripe_customer_id as string | null | undefined;
  if (!customer) {
    const created = await stripe().customers.create({ email: user.email ?? undefined, metadata: { user_id: user.id } });
    customer = created.id;
    await admin.from('users_profile').update({ stripe_customer_id: customer }).eq('id', user.id);
  }

  const base = siteUrl(request);
  const session = await stripe().checkout.sessions.create({
    mode: 'subscription',
    customer,
    client_reference_id: user.id,
    line_items: [{ price, quantity: 1 }],
    subscription_data: { metadata: { user_id: user.id } },
    allow_promotion_codes: true,
    billing_address_collection: 'required',
    tax_id_collection: { enabled: true },
    customer_update: { address: 'auto', name: 'auto' },
    locale: 'ro',
    success_url: `${base}/cont?plata=ok`,
    cancel_url: `${base}/preturi?plata=anulata`,
  });
  return NextResponse.json({ url: session.url });
}
