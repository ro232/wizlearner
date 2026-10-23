import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import { stripe, siteUrl } from '@/lib/stripe';

export const runtime = 'nodejs';

/** Stripe's own page for changing card, downloading invoices or cancelling. */
export async function POST(request: Request) {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Intră în cont.' }, { status: 401 });

  const { data: profile } = await supabase.from('users_profile').select('stripe_customer_id').eq('id', user.id).single();
  if (!profile?.stripe_customer_id) return NextResponse.json({ error: 'Nu ai încă un abonament.' }, { status: 404 });

  const session = await stripe().billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    locale: 'ro',
    return_url: `${siteUrl(request)}/cont`,
  });
  return NextResponse.json({ url: session.url });
}
