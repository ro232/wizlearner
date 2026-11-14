/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Stripe from 'stripe';

// ── in-memory stand-ins for Supabase (service role) and the Stripe API ──
type Row = Record<string, unknown>;
const db: Record<string, Row[]> = {};
let failWrites = false;
/** Tables whose reads fail (a database hiccup), to check that nothing is decided on a failed read. */
const failReads = new Set<string>();
function table(name: string) {
  db[name] ??= [];
  const rows = db[name];
  const read = (filter: (r: Row) => boolean) => async () =>
    failReads.has(name) ? { data: null, error: new Error(`read of ${name} failed`) } : { data: rows.find(filter) ?? null, error: null };
  const q = (filter: (r: Row) => boolean = () => true) => ({
    eq: (col: string, val: unknown) => q((r) => filter(r) && r[col] === val),
    maybeSingle: read(filter),
    single: read(filter),
  });
  return {
    select: () => q(),
    insert: async (row: Row) => { rows.push(row); return { error: null }; },
    upsert: async (row: Row) => {
      const key = Object.keys(row)[0];
      const hit = rows.find((r) => r[key] === row[key]);
      if (hit) Object.assign(hit, row); else rows.push({ ...row });
      return { error: null };
    },
    update: (patch: Row) => ({
      eq: async (col: string, val: unknown) => {
        if (failWrites) return { error: new Error('database unavailable') };
        rows.filter((r) => r[col] === val).forEach((r) => Object.assign(r, patch));
        return { error: null };
      },
    }),
  };
}
vi.mock('@/lib/supabase/admin', () => ({ createAdminSupabase: () => ({ from: table }) }));

const subscriptions: Record<string, Row> = {};
const invoices: Record<string, Row> = {};
/** Which payment intent paid which Stripe invoice. */
let payments: { invoice: string; payment_intent: string }[] = [];
let paymentLookupFails = false;
const real = new Stripe('sk_test_dummy');
vi.mock('@/lib/stripe', () => ({
  stripe: () => ({
    webhooks: real.webhooks,
    subscriptions: {
      retrieve: async (id: string) => subscriptions[id],
      list: async ({ customer }: { customer: string }) => ({ data: Object.values(subscriptions).filter((s) => s.customer === customer) }),
    },
    invoices: { retrieve: async (id: string) => invoices[id] },
    invoicePayments: {
      list: async (params: { invoice?: string; payment?: { payment_intent?: string } }) => {
        if (paymentLookupFails) throw new Error('Stripe is down');
        const hits = payments.filter((p) => (!params.invoice || p.invoice === params.invoice) && (!params.payment?.payment_intent || p.payment_intent === params.payment.payment_intent));
        return { data: hits.map((p) => ({ status: 'paid', invoice: p.invoice, payment: { type: 'payment_intent', payment_intent: p.payment_intent } })) };
      },
    },
  }),
}));

const SECRET = 'whsec_test';
process.env.STRIPE_WEBHOOK_SECRET = SECRET;
// The two prices of this app; anything else on the Stripe account belongs to another product.
process.env.STRIPE_PRICE_MONTHLY = 'price_m';
process.env.STRIPE_PRICE_YEARLY = 'price_y';
const ourItem = { current_period_end: 1767225600, price: { id: 'price_m' } };
const otherItem = { current_period_end: 1767225600, price: { id: 'price_other_product' } };

async function post(event: object, sign = true) {
  const { POST } = await import('@/app/api/stripe/webhook/route');
  const payload = JSON.stringify(event);
  const header = sign ? real.webhooks.generateTestHeaderString({ payload, secret: SECRET }) : 't=1,v1=bad';
  return POST(new Request('http://x/api/stripe/webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': header } }));
}

const USER = 'u-1';
const profile = () => db.users_profile.find((r) => r.id === USER)!;

beforeEach(() => {
  failWrites = false;
  failReads.clear();
  paymentLookupFails = false;
  payments = [{ invoice: 'in_1', payment_intent: 'pi_1' }];
  for (const k of Object.keys(db)) delete db[k];
  for (const k of Object.keys(subscriptions)) delete subscriptions[k];
  for (const k of Object.keys(invoices)) delete invoices[k];
  db.users_profile = [{ id: USER, tier: 'free', access_code: 'WIZ-AAAA-BBBB', stripe_customer_id: 'cus_1' }];
  db.access_codes = [{ code: 'WIZ-AAAA-BBBB', tier: 'starter' }];
  db.stripe_events = [];
  subscriptions.sub_1 = { id: 'sub_1', customer: 'cus_1', status: 'active', metadata: { user_id: USER }, items: { data: [ourItem] } };
});

describe('Stripe webhook', () => {
  it('rejects a request without a valid signature', async () => {
    const res = await post({ id: 'evt_x', type: 'customer.subscription.updated', data: { object: { id: 'sub_1' } } }, false);
    expect(res.status).toBe(400);
    expect(profile().tier).toBe('free');
  });

  it('grants full access after checkout, once per event', async () => {
    const ev = { id: 'evt_1', type: 'checkout.session.completed', data: { object: { subscription: 'sub_1' } } };
    expect((await post(ev)).status).toBe(200);
    expect(profile()).toMatchObject({ tier: 'full', subscription_status: 'active', subscription_id: 'sub_1' });
    expect(profile().subscription_period_end).toBe('2026-01-01T00:00:00.000Z');
    const again = await (await post(ev)).json();
    expect(again.duplicate).toBe(true);
  });

  it('falls back to the access-code tier when the subscription is cancelled', async () => {
    await post({ id: 'evt_1', type: 'checkout.session.completed', data: { object: { subscription: 'sub_1' } } });
    subscriptions.sub_1.status = 'canceled';
    await post({ id: 'evt_2', type: 'customer.subscription.deleted', data: { object: { id: 'sub_1' } } });
    expect(profile().tier).toBe('starter');
  });

  it('finds the account by Stripe customer when metadata is missing', async () => {
    subscriptions.sub_1.metadata = {};
    await post({ id: 'evt_3', type: 'customer.subscription.updated', data: { object: { id: 'sub_1' } } });
    expect(profile().tier).toBe('full');
  });

  it('ignores subscriptions of customers that are not WorksheetWiz accounts (no endless retries)', async () => {
    subscriptions.sub_1 = { ...subscriptions.sub_1, customer: 'cus_other_product', metadata: {} };
    const res = await post({ id: 'evt_4', type: 'customer.subscription.updated', data: { object: { id: 'sub_1' } } });
    expect(res.status).toBe(200);
    expect(profile().tier).toBe('free');
  });

  it('keeps access when one of two subscriptions is cancelled', async () => {
    subscriptions.sub_2 = { id: 'sub_2', customer: 'cus_1', status: 'active', created: 2, metadata: { user_id: USER }, items: { data: [ourItem] } };
    subscriptions.sub_1 = { ...subscriptions.sub_1, status: 'canceled', created: 1 };
    await post({ id: 'evt_6', type: 'customer.subscription.deleted', data: { object: { id: 'sub_1' } } });
    expect(profile()).toMatchObject({ tier: 'full', subscription_id: 'sub_2', subscription_status: 'active' });
  });

  it('answers 500 (so Stripe retries) and does not mark the event done when saving fails', async () => {
    failWrites = true;
    const res = await post({ id: 'evt_7', type: 'customer.subscription.updated', data: { object: { id: 'sub_1' } } });
    expect(res.status).toBe(500);
    expect(db.stripe_events).toHaveLength(0);
  });

  it('ignores a subscription of another product, even when the customer is a WorksheetWiz account', async () => {
    subscriptions.sub_other = { id: 'sub_other', customer: 'cus_1', status: 'active', created: 5, metadata: {}, items: { data: [otherItem] } };
    delete subscriptions.sub_1;
    const res = await post({ id: 'evt_f1', type: 'customer.subscription.created', data: { object: { id: 'sub_other' } } });
    expect(res.status).toBe(200);
    expect(profile()).toMatchObject({ tier: 'free' });
    expect(profile().subscription_id).toBeUndefined();
    expect(db.stripe_events).toHaveLength(1); // acknowledged, so Stripe does not retry
  });

  it('does not let an active subscription of another product keep access after ours is cancelled', async () => {
    subscriptions.sub_other = { id: 'sub_other', customer: 'cus_1', status: 'active', created: 5, metadata: {}, items: { data: [otherItem] } };
    subscriptions.sub_1 = { ...subscriptions.sub_1, status: 'canceled', created: 1 };
    await post({ id: 'evt_f2', type: 'customer.subscription.deleted', data: { object: { id: 'sub_1' } } });
    expect(profile()).toMatchObject({ tier: 'starter', subscription_id: 'sub_1', subscription_status: 'canceled' });
  });

  it('accepts a retired price listed in STRIPE_PRICE_LEGACY (subscribers from before a price change)', async () => {
    subscriptions.sub_1 = { ...subscriptions.sub_1, items: { data: [{ current_period_end: 1767225600, price: { id: 'price_old' } }] } };
    await post({ id: 'evt_l1', type: 'customer.subscription.updated', data: { object: { id: 'sub_1' } } });
    expect(profile().tier).toBe('free');
    process.env.STRIPE_PRICE_LEGACY = 'price_older, price_old';
    try {
      await post({ id: 'evt_l2', type: 'customer.subscription.updated', data: { object: { id: 'sub_1' } } });
      expect(profile().tier).toBe('full');
    } finally {
      delete process.env.STRIPE_PRICE_LEGACY;
    }
  });

  it('never downgrades on a failed read: profile read fails while the subscription is cancelled (audit S8)', async () => {
    db.access_codes.push({ code: 'WIZ-FULL', tier: 'full' });
    Object.assign(profile(), { access_code: 'WIZ-FULL', tier: 'full' });
    subscriptions.sub_1.status = 'canceled';
    failReads.add('users_profile');
    const res = await post({ id: 'evt_s8', type: 'customer.subscription.deleted', data: { object: { id: 'sub_1' } } });
    expect(res.status).toBe(500); // Stripe retries
    expect(profile().tier).toBe('full');
    expect(db.stripe_events).toHaveLength(0);
    // the retry, with the database back, keeps the tier the code gave
    failReads.clear();
    expect((await post({ id: 'evt_s8', type: 'customer.subscription.deleted', data: { object: { id: 'sub_1' } } })).status).toBe(200);
    expect(profile()).toMatchObject({ tier: 'full', subscription_status: 'canceled' });
  });

  it('never downgrades on a failed read: the access code cannot be read', async () => {
    subscriptions.sub_1.status = 'canceled';
    Object.assign(profile(), { tier: 'starter' });
    failReads.add('access_codes');
    const res = await post({ id: 'evt_s8b', type: 'customer.subscription.deleted', data: { object: { id: 'sub_1' } } });
    expect(res.status).toBe(500);
    expect(profile().tier).toBe('starter');
  });

  it('ignores events it does not handle', async () => {
    const res = await post({ id: 'evt_5', type: 'customer.created', data: { object: {} } });
    expect(res.status).toBe(200);
    expect(profile().tier).toBe('free');
  });
});

// ── fiscal invoices (Oblio) ──
const oblioCalls: { path: string; body: Record<string, unknown> }[] = [];
let oblioFails = false;
let nextNumber = 1;
const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
  const path = url.replace('https://www.oblio.eu/api', '');
  if (path === '/authorize/token') return new Response(JSON.stringify({ access_token: 'tok', expires_in: '3600' }));
  if (oblioFails) return new Response(JSON.stringify({ status: 500, statusMessage: 'Eroare Oblio' }), { status: 500 });
  const body = JSON.parse(String(init.body));
  oblioCalls.push({ path, body });
  const seriesName = body.referenceDocument ? 'WW' : String(body.seriesName);
  return new Response(JSON.stringify({ status: 200, statusMessage: 'Success', data: { seriesName, number: String(nextNumber++), link: 'https://www.oblio.eu/docs/x' } }));
});

describe('Facturi Oblio', () => {
  beforeEach(async () => {
    Object.assign(process.env, { OBLIO_EMAIL: 'a@b.ro', OBLIO_API_SECRET: 's', OBLIO_CIF: '12345678', OBLIO_SERIES: 'WW' });
    vi.stubGlobal('fetch', fetchMock);
    (await import('@/lib/billing/oblio')).resetOblioToken();
    oblioCalls.length = 0;
    oblioFails = false;
    nextNumber = 1;
    db.fiscal_invoices = [];
    invoices.in_1 = {
      id: 'in_1', customer: 'cus_1', currency: 'ron', amount_paid: 2900, created: 1767225600,
      status_transitions: { paid_at: 1767225600 },
      customer_name: 'Ana Pop', customer_email: 'ana@ex.ro',
      customer_address: { line1: 'Str. Lalelelor 1', city: 'Cluj-Napoca', state: 'Cluj', country: 'RO' },
      customer_tax_ids: [],
      parent: { subscription_details: { subscription: 'sub_1', metadata: { user_id: USER } } },
      lines: { data: [{ period: { start: 1767225600, end: 1769904000 }, pricing: { type: 'price_details', price_details: { price: 'price_m', product: 'prod_ww' } } }] },
    };
  });
  const paid = (id = 'evt_inv1') => ({ id, type: 'invoice.paid', data: { object: invoices.in_1 } });

  it('issues one paid-by-card invoice per Stripe invoice, sent to e-Factura', async () => {
    expect((await post(paid())).status).toBe(200);
    expect(oblioCalls).toHaveLength(1);
    const b = oblioCalls[0].body as Record<string, any>;
    expect(b).toMatchObject({ cif: '12345678', seriesName: 'WW', issueDate: '2026-01-01', currency: 'RON', spvExtern: 1, sendEmail: 1, idempotencyKey: 'ww-in_1' });
    expect(b.client).toMatchObject({ name: 'Ana Pop', city: 'Cluj-Napoca', country: 'Romania', vatPayer: 0 });
    expect(b.products[0]).toMatchObject({ price: 29, vatPercentage: 21, vatIncluded: 1, name: 'Abonament WorksheetWiz Complet — lunar' });
    expect(b.collect).toMatchObject({ type: 'Card', documentNumber: 'pi_1' });
    expect(db.fiscal_invoices[0]).toMatchObject({ user_id: USER, status: 'issued', oblio_number: '1', payment_intent: 'pi_1', amount: 29 });
    expect(profile().tier).toBe('full');
    // the same Stripe invoice delivered again under another event id is not invoiced twice
    await post(paid('evt_inv2'));
    expect(oblioCalls).toHaveLength(1);
  });

  it('invoices a company with its CUI', async () => {
    invoices.in_1.customer_tax_ids = [{ type: 'eu_vat', value: 'RO998877' }];
    invoices.in_1.customer_name = 'Școala Gimnazială SRL';
    await post(paid());
    expect((oblioCalls[0].body as any).client).toMatchObject({ cif: 'RO998877', vatPayer: 1 });
  });

  it('does not invoice a free (0 lei) period', async () => {
    invoices.in_1.amount_paid = 0;
    await post(paid());
    expect(oblioCalls).toHaveLength(0);
    expect(db.fiscal_invoices[0].status).toBe('skipped');
  });

  it('answers 500 when Oblio fails, then issues it on the retry', async () => {
    oblioFails = true;
    expect((await post(paid())).status).toBe(500);
    expect(db.fiscal_invoices[0].status).toBe('failed');
    expect(db.stripe_events).toHaveLength(0);
    oblioFails = false;
    expect((await post(paid())).status).toBe(200);
    expect(db.fiscal_invoices[0].status).toBe('issued');
  });

  it('issues a storno for a full refund, and leaves a partial refund for manual handling', async () => {
    await post(paid());
    await post({ id: 'evt_r1', type: 'charge.refunded', data: { object: { id: 'ch_1', payment_intent: 'pi_1', refunded: false, amount_refunded: 1000 } } });
    expect(oblioCalls).toHaveLength(1);
    expect(db.fiscal_invoices[0].status).toBe('refund_partial');
    await post({ id: 'evt_r2', type: 'charge.refunded', data: { object: { id: 'ch_1', payment_intent: 'pi_1', refunded: true, amount_refunded: 2900 } } });
    expect(oblioCalls).toHaveLength(2);
    expect(oblioCalls[1].body).toMatchObject({ referenceDocument: { type: 'Factura', seriesName: 'WW', number: '1', refund: 1 } });
    expect(db.fiscal_invoices[0]).toMatchObject({ status: 'refunded', storno_number: '2' });
  });

  it('records the payment as "failed: Oblio neconfigurat" when Oblio is not configured, and still answers 200', async () => {
    delete process.env.OBLIO_API_SECRET;
    expect((await post(paid())).status).toBe(200);
    expect(oblioCalls).toHaveLength(0);
    expect(profile().tier).toBe('full'); // the customer is not punished for the missing invoicing setup
    expect(db.fiscal_invoices).toHaveLength(1);
    expect(db.fiscal_invoices[0]).toMatchObject({ stripe_invoice_id: 'in_1', user_id: USER, status: 'failed', error: 'Oblio neconfigurat', amount: 29, currency: 'RON', payment_intent: 'pi_1' });
    expect(db.stripe_events).toHaveLength(1);
    // a refund of that payment leaves a trace too, and the invoice is never issued automatically afterwards
    await post({ id: 'evt_r0', type: 'charge.refunded', data: { object: { id: 'ch_1', payment_intent: 'pi_1', refunded: true, amount_refunded: 2900 } } });
    expect(db.fiscal_invoices[0].status).toBe('refund_unbilled');
    expect(String(db.fiscal_invoices[0].error)).toContain('Oblio neconfigurat');
    process.env.OBLIO_API_SECRET = 's';
    await post(paid('evt_inv_again'));
    expect(oblioCalls).toHaveLength(0);
  });

  it('does not invoice a paid invoice of another product on the same Stripe account (audit S2)', async () => {
    subscriptions.sub_9 = { id: 'sub_9', customer: 'cus_other', status: 'active', created: 1, metadata: {}, items: { data: [otherItem] } };
    invoices.in_9 = {
      ...invoices.in_1, id: 'in_9', customer: 'cus_other', customer_name: 'Client alt produs',
      parent: { subscription_details: { subscription: 'sub_9', metadata: {} } },
      lines: { data: [{ period: { start: 1767225600, end: 1769904000 }, pricing: { type: 'price_details', price_details: { price: 'price_other_product', product: 'prod_other' } } }] },
    };
    const res = await post({ id: 'evt_o1', type: 'invoice.paid', data: { object: invoices.in_9 } });
    expect(res.status).toBe(200);
    expect(oblioCalls).toHaveLength(0);
    expect(db.fiscal_invoices).toHaveLength(0);
    expect(db.stripe_events).toHaveLength(1);
    // …not even when the payer happens to have a WorksheetWiz account
    invoices.in_9.customer = 'cus_1';
    subscriptions.sub_9.customer = 'cus_1';
    await post({ id: 'evt_o2', type: 'invoice.paid', data: { object: invoices.in_9 } });
    expect(oblioCalls).toHaveLength(0);
    expect(db.fiscal_invoices).toHaveLength(0);
    expect(profile().tier).toBe('free');
  });

  it('recognises our price on an invoice line in the older Stripe shape (line.price.id)', async () => {
    invoices.in_1.lines = { data: [{ period: { start: 1767225600, end: 1769904000 }, price: { id: 'price_m' } }] };
    await post(paid());
    expect(oblioCalls).toHaveLength(1);
  });

  it('ignores refunds of payments that are not ours', async () => {
    await post(paid());
    // a refund on another product's invoice
    payments.push({ invoice: 'in_9', payment_intent: 'pi_9' });
    invoices.in_9 = { ...invoices.in_1, id: 'in_9', customer: 'cus_other', lines: { data: [{ pricing: { type: 'price_details', price_details: { price: 'price_other_product', product: 'prod_other' } } }] } };
    const res = await post({ id: 'evt_fr1', type: 'charge.refunded', data: { object: { id: 'ch_9', payment_intent: 'pi_9', refunded: true, amount_refunded: 5000 } } });
    expect(res.status).toBe(200);
    // a refund on a one-off payment with no invoice at all
    const res2 = await post({ id: 'evt_fr2', type: 'charge.refunded', data: { object: { id: 'ch_8', payment_intent: 'pi_8', refunded: true, amount_refunded: 5000 } } });
    expect(res2.status).toBe(200);
    expect(oblioCalls).toHaveLength(1); // only the invoice; no storno
    expect(db.fiscal_invoices).toHaveLength(1);
    expect(db.fiscal_invoices[0].status).toBe('issued');
  });

  it('does not issue an invoice it could not later refund: a failed payment-intent lookup is retried (audit S4)', async () => {
    paymentLookupFails = true;
    expect((await post(paid())).status).toBe(500);
    expect(oblioCalls).toHaveLength(0);
    expect(db.stripe_events).toHaveLength(0);
    paymentLookupFails = false;
    expect((await post(paid())).status).toBe(200);
    expect(db.fiscal_invoices[0]).toMatchObject({ status: 'issued', payment_intent: 'pi_1' });
  });

  it('finds the invoice of a refund through Stripe when the payment intent was not saved on the row', async () => {
    await post(paid());
    db.fiscal_invoices[0].payment_intent = null;
    const res = await post({ id: 'evt_r3', type: 'charge.refunded', data: { object: { id: 'ch_1', payment_intent: 'pi_1', refunded: true, amount_refunded: 2900 } } });
    expect(res.status).toBe(200);
    expect(oblioCalls).toHaveLength(2);
    expect(db.fiscal_invoices[0]).toMatchObject({ status: 'refunded', storno_number: '2', payment_intent: 'pi_1' });
  });

  it('answers 500 for a refund when the invoice table cannot be read (not "unknown refund")', async () => {
    await post(paid());
    failReads.add('fiscal_invoices');
    const refund = { id: 'evt_r4', type: 'charge.refunded', data: { object: { id: 'ch_1', payment_intent: 'pi_1', refunded: true, amount_refunded: 2900 } } };
    expect((await post(refund)).status).toBe(500);
    expect(oblioCalls).toHaveLength(1);
    expect(db.stripe_events.map((e) => e.id)).not.toContain('evt_r4');
    failReads.clear();
    expect((await post(refund)).status).toBe(200);
    expect(db.fiscal_invoices[0].status).toBe('refunded');
  });

  it('asks Stripe to retry a refund of ours that arrives before its invoice was recorded', async () => {
    const refund = { id: 'evt_r5', type: 'charge.refunded', data: { object: { id: 'ch_1', payment_intent: 'pi_1', refunded: true, amount_refunded: 2900 } } };
    expect((await post(refund)).status).toBe(500);
    await post(paid());
    expect((await post(refund)).status).toBe(200);
    expect(db.fiscal_invoices[0].status).toBe('refunded');
  });

  it('does not re-issue an invoice when the invoice table cannot be read', async () => {
    await post(paid());
    failReads.add('fiscal_invoices');
    expect((await post(paid('evt_inv3'))).status).toBe(500);
    expect(oblioCalls).toHaveLength(1);
  });
});
