import 'server-only';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createAdminSupabase } from '@/lib/supabase/admin';
import { createOblioInvoice, createOblioStorno, oblioConfigured } from './oblio';
import { invoiceIsOurs } from './ownership';

/**
 * Fiscal invoices for Stripe payments: every paid Stripe invoice of this app (first payment and
 * each renewal) becomes one invoice in Oblio; a full refund becomes a storno. Each Stripe invoice
 * is invoiced once (table fiscal_invoices + Oblio's idempotency key), so webhook retries are safe.
 *
 * Every payment leaves a row in fiscal_invoices, whatever happens. The `status` column (free text):
 *   issued          invoice issued in Oblio
 *   skipped         nothing was paid (0 lei, 100% coupon): nothing to invoice
 *   failed          paid, but no invoice yet; `error` says why ("Oblio neconfigurat", or Oblio's message)
 *   refunded        fully refunded, storno issued
 *   refund_partial  partly refunded; the partial storno is done by hand in Oblio
 *   refund_unbilled refunded before any invoice existed; invoice + storno are decided by hand,
 *                   and nothing is issued automatically for it any more
 * Rows that need a person: every status except issued, skipped and refunded.
 *
 * Rule for errors: "not found" and "could not read" are different. A database or Stripe lookup that
 * fails throws, so the webhook answers 500 and Stripe retries; it is never treated as "nothing there".
 */

/** The `error` text of a payment taken while Oblio had no keys. The webhook still answers 200: a retry would not help. */
export const OBLIO_NOT_CONFIGURED = 'Oblio neconfigurat';

/** Separates the refund note from the reason the invoice was missing, on a refund_unbilled row. */
const WHY = ' Motivul lipsei facturii: ';

interface FiscalRow {
  stripe_invoice_id: string;
  user_id: string | null;
  payment_intent: string | null;
  currency: string;
  status: string;
  oblio_series: string | null;
  oblio_number: string | null;
  storno_number: string | null;
  error: string | null;
}

async function findRow(column: 'stripe_invoice_id' | 'payment_intent', value: string): Promise<FiscalRow | null> {
  const { data, error } = await createAdminSupabase().from('fiscal_invoices').select('*').eq(column, value).maybeSingle();
  if (error) throw new Error(`fiscal_invoices: reading ${column}=${value} failed: ${error.message ?? 'unknown error'}`);
  return (data as FiscalRow | null) ?? null;
}

/** A write that must not fail silently. */
function written(what: string, result: { error: { message?: string } | null }): void {
  if (result.error) throw new Error(`fiscal_invoices: ${what} failed: ${result.error.message ?? 'unknown error'}`);
}

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

/**
 * The card payment behind a Stripe invoice. Null only when Stripe says there is none (paid outside
 * Stripe). A failed lookup throws: an invoice saved without its payment could not be matched to a
 * later refund, so it is better to let Stripe retry the whole event.
 */
async function paymentIntentOf(inv: Stripe.Invoice): Promise<string | null> {
  const legacy = (inv as Stripe.Invoice & { payment_intent?: string | { id: string } | null }).payment_intent;
  if (legacy) return typeof legacy === 'string' ? legacy : legacy.id;
  const list = await stripe().invoicePayments.list({ invoice: inv.id!, limit: 3 });
  const paid = list.data.find((p) => p.status === 'paid') ?? list.data[0];
  const pi = paid?.payment?.payment_intent;
  return typeof pi === 'string' ? pi : pi?.id ?? null;
}

/** The Stripe invoice a refunded charge paid, if any (older API: on the charge; newer: via invoice payments). */
async function invoiceOfCharge(charge: Stripe.Charge, paymentIntent: string | undefined): Promise<string | null> {
  const legacy = (charge as Stripe.Charge & { invoice?: string | { id: string } | null }).invoice;
  if (legacy) return typeof legacy === 'string' ? legacy : legacy.id;
  if (!paymentIntent) return null;
  const list = await stripe().invoicePayments.list({ payment: { type: 'payment_intent', payment_intent: paymentIntent }, limit: 1 });
  const inv = list.data[0]?.invoice;
  return typeof inv === 'string' ? inv : inv?.id ?? null;
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

/**
 * Issue the fiscal invoice for a paid Stripe invoice (once). The caller has already checked that
 * the invoice is ours. Throws when Oblio or the database fails, so Stripe retries. Without Oblio
 * keys the payment is still recorded (status failed, "Oblio neconfigurat") so it can be invoiced later.
 */
export async function issueFiscalInvoice(stripeInvoiceId: string, userId: string | null): Promise<FiscalResult> {
  const admin = createAdminSupabase();
  const existing = await findRow('stripe_invoice_id', stripeInvoiceId);
  if (existing && existing.status !== 'failed') return 'already';
  if (existing && !oblioConfigured()) return 'not-configured'; // already on record; nothing new to say

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
    written('saving the skipped invoice', await admin.from('fiscal_invoices').upsert({ ...base, status: 'skipped' }));
    return 'skipped';
  }

  const paymentIntent = await paymentIntentOf(inv);
  if (!oblioConfigured()) {
    console.error(`Oblio not configured: payment ${stripeInvoiceId} (${amount} ${currency}) recorded without a fiscal invoice`);
    written('recording the uninvoiced payment', await admin.from('fiscal_invoices').upsert({ ...base, payment_intent: paymentIntent, status: 'failed', error: OBLIO_NOT_CONFIGURED }));
    return 'not-configured';
  }

  const taxId = inv.customer_tax_ids?.find((t) => t.type === 'eu_vat' || t.type === 'ro_tin')?.value ?? '';
  const addr = inv.customer_address;
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

export type RefundResult = 'storno' | 'already' | 'partial' | 'unbilled' | 'foreign';

/**
 * A refunded card payment. Only refunds of our own invoices are handled: full refund → storno of
 * its invoice; partial refunds are left for manual handling. Refunds of anything else on the
 * Stripe account are ignored ('foreign'). Nothing is skipped silently: a lookup that fails throws.
 */
export async function handleRefund(charge: Stripe.Charge): Promise<RefundResult> {
  const pi = (typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id) ?? undefined;
  let row = pi ? await findRow('payment_intent', pi) : null;
  if (!row) {
    // Not matched by payment: ask Stripe which invoice this charge paid, then decide whose it is.
    const invoiceId = await invoiceOfCharge(charge, pi);
    if (!invoiceId) {
      console.info(`Refund on charge ${charge.id}: not the payment of a Stripe invoice; ignored`);
      return 'foreign';
    }
    row = await findRow('stripe_invoice_id', invoiceId);
    if (!row) {
      if (!invoiceIsOurs(await stripe().invoices.retrieve(invoiceId))) {
        console.info(`Refund on charge ${charge.id}: invoice ${invoiceId} is not a WorksheetWiz price; ignored`);
        return 'foreign';
      }
      // Ours, but its payment has not been recorded yet (events out of order): Stripe retries.
      throw new Error(`Refund on charge ${charge.id}: invoice ${invoiceId} is ours but not recorded yet`);
    }
  }

  const admin = createAdminSupabase();
  const id = row.stripe_invoice_id;
  const paymentIntent = row.payment_intent ?? pi ?? null;
  if (row.storno_number) return 'already';

  const refundText = `Rambursare ${charge.refunded ? 'integrală' : 'parțială'}: ${charge.amount_refunded / 100} ${row.currency}`;
  if (!row.oblio_series || !row.oblio_number) {
    // Refunded before any invoice existed (Oblio off or failing). Keep the trace and stop issuing
    // automatically: an invoice for refunded money needs its storno, which a person decides.
    const reason = row.status === 'refund_unbilled' ? row.error?.split(WHY)[1] : row.error;
    const note = `${refundText}, fără factură emisă. Emite manual factura și storno în Oblio.${reason ? `${WHY}${reason}` : ''}`;
    written('recording the refund', await admin.from('fiscal_invoices').update({ status: 'refund_unbilled', payment_intent: paymentIntent, error: note }).eq('stripe_invoice_id', id));
    console.error(`Refund on ${id}: no fiscal invoice was issued for it; left for manual handling`);
    return 'unbilled';
  }
  if (!charge.refunded) {
    written('recording the partial refund', await admin.from('fiscal_invoices').update({ status: 'refund_partial', payment_intent: paymentIntent, error: `${refundText}. Fă storno parțial manual în Oblio.` }).eq('stripe_invoice_id', id));
    console.warn(`Partial refund on ${id}: storno left for manual handling`);
    return 'partial';
  }
  if (!oblioConfigured()) {
    // The invoice exists in Oblio but the keys are gone: say so on the row and let Stripe retry until they are back.
    written('recording the pending storno', await admin.from('fiscal_invoices').update({ payment_intent: paymentIntent, error: `${refundText}. ${OBLIO_NOT_CONFIGURED}: storno neemis.` }).eq('stripe_invoice_id', id));
    throw new Error(`Refund on ${id}: Oblio is not configured, the storno cannot be issued`);
  }
  const doc = await createOblioStorno(row.oblio_series, row.oblio_number, `ww-storno-${id}`);
  written('saving the storno', await admin
    .from('fiscal_invoices')
    .update({ status: 'refunded', payment_intent: paymentIntent, storno_series: doc.seriesName, storno_number: String(doc.number), storno_link: doc.link, error: null })
    .eq('stripe_invoice_id', id));
  return 'storno';
}
