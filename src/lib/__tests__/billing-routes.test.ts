import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// The signed-in user and their profile, as the routes see them; Stripe is a stand-in.
let user: { id: string; email: string } | null = { id: 'u-1', email: 'ana@ex.ro' };
let profile: Record<string, unknown> | null = { stripe_customer_id: 'cus_1', subscription_status: null };
const profileQuery = { select: () => profileQuery, eq: () => profileQuery, single: async () => ({ data: profile, error: null }), update: () => profileQuery };
const supabase = { auth: { getUser: async () => ({ data: { user } }) }, from: () => profileQuery };
vi.mock('@/lib/supabase/server', () => ({ createServerSupabase: () => supabase }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminSupabase: () => supabase }));

const checkoutCreate = vi.fn(async () => ({ url: 'https://checkout.stripe.test/c/1' }));
const portalCreate = vi.fn(async (): Promise<{ url: string }> => ({ url: 'https://billing.stripe.test/p/1' }));
vi.mock('@/lib/stripe', () => ({
  siteUrl: () => 'https://site.test',
  stripe: () => ({
    subscriptions: { list: async () => ({ data: [] }) },
    customers: { create: async () => ({ id: 'cus_new' }) },
    checkout: { sessions: { create: checkoutCreate } },
    billingPortal: { sessions: { create: portalCreate } },
  }),
}));

const ENV = {
  STRIPE_SECRET_KEY: 'sk_test_x',
  STRIPE_PRICE_MONTHLY: 'price_m',
  STRIPE_PRICE_YEARLY: 'price_y',
  STRIPE_WEBHOOK_SECRET: 'whsec_x',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role',
  NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
};
const request = (path: string, body?: unknown) => new Request(`https://site.test${path}`, { method: 'POST', body: body ? JSON.stringify(body) : undefined });

let logged: string[] = [];
beforeEach(() => {
  for (const [k, v] of Object.entries(ENV)) vi.stubEnv(k, v);
  user = { id: 'u-1', email: 'ana@ex.ro' };
  profile = { stripe_customer_id: 'cus_1', subscription_status: null };
  checkoutCreate.mockClear();
  portalCreate.mockClear();
  logged = [];
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => { logged.push(args.map(String).join(' ')); });
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('POST /api/stripe/checkout', () => {
  const checkout = async (body: unknown = { plan: 'monthly' }) => (await import('@/app/api/stripe/checkout/route')).POST(request('/api/stripe/checkout', body));

  it('starts a checkout when the whole chain is configured', async () => {
    const res = await checkout();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: 'https://checkout.stripe.test/c/1' });
    expect(checkoutCreate).toHaveBeenCalledTimes(1);
  });

  it.each(['STRIPE_WEBHOOK_SECRET', 'SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_SUPABASE_URL'])(
    'refuses to take a payment the webhook could not turn into access: %s missing',
    async (name) => {
      vi.stubEnv(name, '');
      const res = await checkout();
      expect(res.status).toBe(503);
      const text = await res.text();
      expect(JSON.parse(text)).toEqual({ error: 'Plata online nu este încă disponibilă.' });
      // the browser never learns which secret is missing…
      expect(text).not.toMatch(/STRIPE|SUPABASE|WEBHOOK|SECRET|KEY/i);
      expect(checkoutCreate).not.toHaveBeenCalled();
      // …the server log does
      expect(logged.join('\n')).toContain(name);
    },
  );

  it('stays quiet in the log when billing was never set up at all', async () => {
    for (const k of Object.keys(ENV)) vi.stubEnv(k, '');
    expect((await checkout()).status).toBe(503);
    expect(logged).toEqual([]);
  });
});

describe('POST /api/stripe/portal', () => {
  const portal = async () => (await import('@/app/api/stripe/portal/route')).POST(request('/api/stripe/portal'));

  it('returns the portal link', async () => {
    const res = await portal();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: 'https://billing.stripe.test/p/1' });
  });

  it('answers with clean JSON when the Stripe customer portal is not configured in this mode', async () => {
    portalCreate.mockRejectedValueOnce(new Error('No configuration provided and your live mode default configuration has not been created. Provide a configuration or create your default by saving your customer portal settings in live mode at https://dashboard.stripe.com/settings/billing/portal.'));
    const res = await portal();
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: 'Pagina de abonament nu poate fi deschisă acum.', code: 'portal_unavailable' });
    expect(text).not.toMatch(/dashboard\.stripe|configuration/i); // Stripe's message stays in the server log
    expect(logged.join('\n')).toContain('customer portal');
  });

  it('asks for sign-in, and says so when there is no subscription yet', async () => {
    profile = { stripe_customer_id: null };
    expect((await portal()).status).toBe(404);
    user = null;
    expect((await portal()).status).toBe(401);
  });
});
