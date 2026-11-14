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

  // Stripe refuses when the customer portal was never saved in this mode (test and live are set up
  // separately), or when the keys are wrong. Answer with JSON either way, so the page can say what to do.
  try {
    const session = await stripe().billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      locale: 'ro',
      return_url: `${siteUrl(request)}/cont`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('stripe portal: could not open the customer portal (is it configured in this Stripe mode?)', err);
    return NextResponse.json({ error: 'Pagina de abonament nu poate fi deschisă acum.', code: 'portal_unavailable' }, { status: 502 });
  }
}
