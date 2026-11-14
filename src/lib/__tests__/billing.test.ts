import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { effectiveTier, subscriptionGivesAccess } from '@/lib/billing/tier';
import { billingConfigured, missingBillingConfig, ownPriceIds, priceIdFor } from '@/lib/billing/plans';
import { PORTAL_BUTTON, subscriptionSummary } from '@/lib/billing/summary';
import { configForSaving } from '@/lib/worksheet/saved';
import { DEFAULT_CONFIG } from '@/types';

describe('subscription → tier', () => {
  it('gives full access while the subscription is paid or being retried', () => {
    for (const s of ['active', 'trialing', 'past_due']) expect(subscriptionGivesAccess(s)).toBe(true);
    for (const s of ['canceled', 'unpaid', 'incomplete', 'incomplete_expired', null, undefined]) expect(subscriptionGivesAccess(s)).toBe(false);
  });

  it('falls back to the access-code tier, then to free, when the subscription ends', () => {
    expect(effectiveTier('active', null)).toBe('full');
    expect(effectiveTier('active', 'starter')).toBe('full');
    expect(effectiveTier('canceled', 'starter')).toBe('starter');
    expect(effectiveTier('canceled', null)).toBe('free');
    expect(effectiveTier(null, 'full')).toBe('full');
  });
});

describe('saving a sheet', () => {
  it('never stores the child name', () => {
    const saved = configForSaving({ ...DEFAULT_CONFIG, childName: 'Ştefan', customWords: ['Ștefan', 'MAMA'] });
    expect(saved.childName).toBe('');
    expect(saved.customWords).toEqual(['MAMA']);
  });
});

// ── "billing is on" needs the whole chain, not just a Stripe key ──
const BILLING_ENV = {
  STRIPE_SECRET_KEY: 'sk_test_x',
  STRIPE_PRICE_MONTHLY: 'price_m',
  STRIPE_WEBHOOK_SECRET: 'whsec_x',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role',
  NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
};
const ALL_BILLING_VARS = [...Object.keys(BILLING_ENV), 'STRIPE_PRICE_YEARLY', 'STRIPE_PRICE_LEGACY'];

describe('billingConfigured', () => {
  beforeEach(() => {
    for (const k of ALL_BILLING_VARS) vi.stubEnv(k, '');
    for (const [k, v] of Object.entries(BILLING_ENV)) vi.stubEnv(k, v);
  });
  afterEach(() => vi.unstubAllEnvs());

  it('is on only with Stripe key, a price, the webhook secret and the Supabase service role', () => {
    expect(missingBillingConfig()).toEqual([]);
    expect(billingConfigured()).toBe(true);
  });

  it.each(Object.keys(BILLING_ENV))('is off when %s is missing', (name) => {
    vi.stubEnv(name, '');
    expect(billingConfigured()).toBe(false);
    expect(missingBillingConfig().join(' ')).toContain(name);
  });

  it('is off with the audit case: Stripe key and price set, webhook secret forgotten', () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    expect(billingConfigured()).toBe(false);
    expect(missingBillingConfig()).toEqual(['STRIPE_WEBHOOK_SECRET', 'SUPABASE_SERVICE_ROLE_KEY']);
  });

  it('does not count the placeholders copied from .env.example as real values', () => {
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_...');
    expect(billingConfigured()).toBe(false);
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'whsec_x');
    vi.stubEnv('STRIPE_PRICE_MONTHLY', 'price_...');
    expect(billingConfigured()).toBe(false);
    expect(priceIdFor('monthly')).toBeUndefined();
  });

  it('works with only the yearly price, and knows which prices are ours', () => {
    vi.stubEnv('STRIPE_PRICE_MONTHLY', '');
    vi.stubEnv('STRIPE_PRICE_YEARLY', 'price_y');
    vi.stubEnv('STRIPE_PRICE_LEGACY', ' price_old1 ,price_old2,');
    expect(billingConfigured()).toBe(true);
    expect(priceIdFor('school-year')).toBe('price_y');
    expect(priceIdFor('monthly')).toBeUndefined();
    expect(priceIdFor('altceva')).toBeUndefined();
    expect([...ownPriceIds()].sort()).toEqual(['price_old1', 'price_old2', 'price_y']);
  });
});

// ── what the account page says about the subscription: only what the stored data can back ──
describe('subscriptionSummary', () => {
  const END = '2027-03-15T10:00:00.000Z';

  it('says nothing when there was never a subscription', () => {
    expect(subscriptionSummary(null, null, 'free')).toBeNull();
    expect(subscriptionSummary(undefined, END, 'full')).toBeNull();
  });

  it('never asserts a renewal for an active subscription (it may be set to end; that is not stored)', () => {
    const s = subscriptionSummary('active', END, 'full')!;
    expect(s.text).toBe(`Abonament activ. Perioada curentă: până la 15 martie 2027. Reînnoirea și anularea le gestionezi din „${PORTAL_BUTTON}”.`);
    expect(s.text).not.toMatch(/reînnoiește/);
    expect(s.offerPlans).toBe(false);
    expect(subscriptionSummary('trialing', END, 'full')!.text).toContain('perioada de probă');
    expect(subscriptionSummary('active', null, 'full')!.text).toBe(`Abonament activ. Reînnoirea și anularea le gestionezi din „${PORTAL_BUTTON}”.`);
  });

  it('never promises access after a cancellation, even when the stored period end is in the future', () => {
    const s = subscriptionSummary('canceled', '2099-01-01T00:00:00.000Z', 'free')!;
    expect(s.text).toBe('Abonamentul s-a încheiat. Acum ai varianta gratuită.');
    expect(s.text).not.toMatch(/până la|2099|acces/);
    expect(s.offerPlans).toBe(true);
  });

  it('says where the remaining access comes from when a code outlives the subscription', () => {
    expect(subscriptionSummary('canceled', END, 'starter')).toEqual({ text: 'Abonamentul s-a încheiat. Varianta Starter rămâne a ta prin codul de acces.', offerPlans: false });
    expect(subscriptionSummary('canceled', END, 'full')!.text).toContain('Varianta Complet rămâne a ta prin codul de acces.');
  });

  it('asks for a card check while Stripe retries, with no date', () => {
    const s = subscriptionSummary('past_due', END, 'full')!;
    expect(s.text).toContain('Plata abonamentului nu a reușit');
    expect(s.text).toContain(PORTAL_BUTTON);
    expect(s.text).not.toMatch(/2027/);
  });

  it('has Romanian words for every status without access, including ones Stripe may add', () => {
    for (const status of ['unpaid', 'paused', 'incomplete', 'incomplete_expired', 'something_new']) {
      const s = subscriptionSummary(status, END, 'free')!;
      expect(s.text, status).not.toContain(status);
      expect(s.text, status).not.toMatch(/până la|reînnoiește/);
      expect(s.offerPlans, status).toBe(true);
    }
  });
});
