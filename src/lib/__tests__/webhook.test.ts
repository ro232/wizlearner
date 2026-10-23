import { beforeEach, describe, expect, it, vi } from 'vitest';
import Stripe from 'stripe';

// ── in-memory stand-ins for Supabase (service role) and the Stripe API ──
type Row = Record<string, unknown>;
const db: Record<string, Row[]> = {};
function table(name: string) {
  db[name] ??= [];
  const rows = db[name];
  const q = (filter: (r: Row) => boolean = () => true) => ({
    eq: (col: string, val: unknown) => q((r) => filter(r) && r[col] === val),
    maybeSingle: async () => ({ data: rows.find(filter) ?? null, error: null }),
    single: async () => ({ data: rows.find(filter) ?? null, error: null }),
  });
  return {
    select: () => q(),
    insert: async (row: Row) => { rows.push(row); return { error: null }; },
    update: (patch: Row) => ({
      eq: async (col: string, val: unknown) => {
        rows.filter((r) => r[col] === val).forEach((r) => Object.assign(r, patch));
        return { error: null };
      },
    }),
  };
}
vi.mock('@/lib/supabase/admin', () => ({ createAdminSupabase: () => ({ from: table }) }));

const subscriptions: Record<string, Row> = {};
const real = new Stripe('sk_test_dummy');
vi.mock('@/lib/stripe', () => ({
  stripe: () => ({
    webhooks: real.webhooks,
    subscriptions: { retrieve: async (id: string) => subscriptions[id] },
  }),
}));

const SECRET = 'whsec_test';
process.env.STRIPE_WEBHOOK_SECRET = SECRET;

async function post(event: object, sign = true) {
  const { POST } = await import('@/app/api/stripe/webhook/route');
  const payload = JSON.stringify(event);
  const header = sign ? real.webhooks.generateTestHeaderString({ payload, secret: SECRET }) : 't=1,v1=bad';
  return POST(new Request('http://x/api/stripe/webhook', { method: 'POST', body: payload, headers: { 'stripe-signature': header } }));
}

const USER = 'u-1';
const profile = () => db.users_profile.find((r) => r.id === USER)!;

beforeEach(() => {
  for (const k of Object.keys(db)) delete db[k];
  db.users_profile = [{ id: USER, tier: 'free', access_code: 'WIZ-AAAA-BBBB', stripe_customer_id: 'cus_1' }];
  db.access_codes = [{ code: 'WIZ-AAAA-BBBB', tier: 'starter' }];
  db.stripe_events = [];
  subscriptions.sub_1 = { id: 'sub_1', customer: 'cus_1', status: 'active', metadata: { user_id: USER }, items: { data: [{ current_period_end: 1767225600 }] } };
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

  it('answers 500 (so Stripe retries) and does not mark the event done when the account is unknown', async () => {
    subscriptions.sub_1 = { ...subscriptions.sub_1, customer: 'cus_unknown', metadata: {} };
    const res = await post({ id: 'evt_4', type: 'customer.subscription.updated', data: { object: { id: 'sub_1' } } });
    expect(res.status).toBe(500);
    expect(db.stripe_events).toHaveLength(0);
  });

  it('ignores events it does not handle', async () => {
    const res = await post({ id: 'evt_5', type: 'invoice.paid', data: { object: {} } });
    expect(res.status).toBe(200);
    expect(profile().tier).toBe('free');
  });
});
