import 'server-only';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { createOblioInvoice, createOblioStorno, oblioConfigured } from './oblio';

/**
 * Fiscal invoices for Stripe payments: every paid Stripe invoice (first payment and each renewal)
 * becomes one invoice in Oblio; a full refund becomes a storno. Each Stripe invoice is invoiced
 * once (table fiscal_invoices + Oblio's idempotency key), so webhook retries are safe.
 */

const dateRO = (ts: number) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Bucharest' }).format(new Date(ts * 1000));
const dayRO = (ts: number) => new Intl.DateTimeFormat('ro-RO', { timeZone: 'Europe/Bucharest', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(ts * 1000));

function countryName(code: string | null | undefined): string {
  if (!code) return 'Romania';
  if (code.toUpperCase() === 'RO') return 'Romania';
  try {
    return new Intl.DisplayNames(['ro'], { type: 'region' }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** The subscription a Stripe invoice belongs to (newer API: under parent.subscription_details). */
export function invoiceSubscriptionId(inv: Stripe.Invoice): string | null {
  const legacy = (inv as Stripe.Invoice & { subscription?: string | { id: string } | null }).subscription;
  const sub = inv.parent?.subscription_details?.subscription ?? legacy ?? null;
  return typeof sub === 'string' ? sub : sub?.id ?? null;
}

async function paymentIntentOf(inv: Stripe.Invoice): Promise<string | null> {
  const legacy = (inv as Stripe.Invoice & { payment_intent?: string | { id: string } | null }).payment_intent;
  if (legacy) return typeof legacy === 'string' ? legacy : legacy.id;
  try {
    const list = await stripe().invoicePayments.list({ invoice: inv.id!, limit: 3 });
    const paid = list.data.find((p) => p.status === 'paid') ?? list.data[0];
    const pi = paid?.payment?.payment_intent;
    return typeof pi === 'string' ? pi : pi?.id ?? null;
  } catch {
    return null;
  }
}

/** What the invoice line says: the plan and the period it pays for. */
function productLine(inv: Stripe.Invoice): { name: string; description: string } {
  const line = inv.lines?.data?.[0];
  const start = line?.period?.start, end = line?.period?.end;
  const yearly = start && end ? end - start > 60 * 86400 : false;
  return {
    name: `Abonament WorksheetWiz Complet — ${yearly ? 'an școlar' : 'lunar'}`,
    description: start && end ? `Perioada ${dayRO(start)} – ${dayRO(end)}` : '',
  };
}

export type FiscalResult = 'issued' | 'already' | 'skipped' | 'not-configured';

/** Issue the fiscal invoice for a paid Stripe invoice (once). Throws when Oblio fails, so Stripe retries. */
export async function issueFiscalInvoice(stripeInvoiceId: string, userId: string | null): Promise<FiscalResult> {
  if (!oblioConfigured()) {
    console.warn(`Oblio not configured: no fiscal invoice for ${stripeInvoiceId}`);
    return 'not-configured';
  }
  const admin = createAdminSupabase();
  const { data: existing } = await admin.from('fiscal_invoices').select('status').eq('stripe_invoice_id', stripeInvoiceId).maybeSingle();
  if (existing && existing.status !== 'failed') return 'already';

  const inv = await stripe().invoices.retrieve(stripeInvoiceId);
  const amount = (inv.amount_paid ?? 0) / 100;
  const currency = (inv.currency || 'ron').toUpperCase();
  const paidAt = inv.status_transitions?.paid_at ?? inv.created;
  const base = {
    stripe_invoice_id: stripeInvoiceId,
    user_id: userId,
    amount,
    currency,
    paid_at: new Date(paidAt * 1000).toISOString(),
  };
  if (amount <= 0) {
    // Free period (100% coupon): nothing was paid, nothing to invoice.
    await admin.from('fiscal_invoices').upsert({ ...base, status: 'skipped' });
    return 'skipped';
  }

  const taxId = inv.customer_tax_ids?.find((t) => t.type === 'eu_vat' || t.type === 'ro_tin')?.value ?? '';
  const addr = inv.customer_address;
  const paymentIntent = await paymentIntentOf(inv);
  const line = productLine(inv);
  try {
    const doc = await createOblioInvoice({
      client: {
        name: inv.customer_name || inv.customer_email || 'Client',
        cif: taxId,
        vatPayer: /^RO/i.test(taxId),
        address: [addr?.line1, addr?.line2].filter(Boolean).join(', '),
        city: addr?.city ?? '',
        state: addr?.state ?? '',
        country: countryName(addr?.country),
        email: inv.customer_email ?? '',
      },
      product: { ...line, price: amount },
      currency,
      issueDate: dateRO(paidAt),
      paymentReference: paymentIntent ?? stripeInvoiceId,
      idempotencyKey: `ww-${stripeInvoiceId}`,
    });
    const { error } = await admin.from('fiscal_invoices').upsert({
      ...base,
      payment_intent: paymentIntent,
      status: 'issued',
      oblio_series: doc.seriesName,
      oblio_number: String(doc.number),
      oblio_link: doc.link,
      error: null,
    });
    if (error) throw error;
    return 'issued';
  } catch (err) {
    await admin.from('fiscal_invoices').upsert({ ...base, payment_intent: paymentIntent, status: 'failed', error: String((err as Error).message ?? err) });
    throw err;
  }
}

export type RefundResult = 'storno' | 'already' | 'partial' | 'unknown' | 'not-configured';

/** A refunded card payment: full refund → storno of its invoice; partial refunds are left for manual handling. */
export async function handleRefund(charge: Stripe.Charge): Promise<RefundResult> {
  if (!oblioConfigured()) return 'not-configured';
  const pi = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
  if (!pi) return 'unknown';
  const admin = createAdminSupabase();
  const { data: row } = await admin.from('fiscal_invoices').select('*').eq('payment_intent', pi).maybeSingle();
  if (!row || !row.oblio_series) return 'unknown';
  if (row.storno_number) return 'already';
  if (!charge.refunded) {
    await admin.from('fiscal_invoices').update({ status: 'refund_partial', error: `Rambursare parțială: ${charge.amount_refunded / 100} ${row.currency}. Fă storno parțial manual în Oblio.` }).eq('stripe_invoice_id', row.stripe_invoice_id);
    console.warn(`Partial refund on ${pi}: storno left for manual handling`);
    return 'partial';
  }
  const doc = await createOblioStorno(row.oblio_series as string, row.oblio_number as string, `ww-storno-${row.stripe_invoice_id}`);
  const { error } = await admin
    .from('fiscal_invoices')
    .update({ status: 'refunded', storno_series: doc.seriesName, storno_number: String(doc.number), storno_link: doc.link, error: null })
    .eq('stripe_invoice_id', row.stripe_invoice_id);
  if (error) throw error;
  return 'storno';
}
