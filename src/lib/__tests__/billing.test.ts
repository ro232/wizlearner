import { describe, expect, it } from 'vitest';
import { effectiveTier, subscriptionGivesAccess } from '@/lib/billing/tier';
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
