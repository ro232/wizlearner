import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// A stand-in for posthog-js that records what the app asks of it.
const posthog = { init: vi.fn(), capture: vi.fn(), identify: vi.fn() };
vi.mock('posthog-js', () => ({ default: posthog }));

type Analytics = typeof import('@/lib/analytics');
let analytics: Analytics;

beforeAll(async () => {
  process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test';
  vi.stubGlobal('window', {});
  analytics = await import('@/lib/analytics');
});

describe('analytics privacy', () => {
  it('forwards only allow-listed properties: a name and an e-mail never leave', async () => {
    analytics.track('workbook_download', { name: 'Ana', email: 'a@b.ro', book: 'upper' }); // queued before init
    analytics.initAnalytics();
    await vi.waitFor(() => expect(posthog.capture).toHaveBeenCalledTimes(1));
    expect(posthog.capture).toHaveBeenLastCalledWith('workbook_download', { book: 'upper' });

    analytics.track('workbook_download', { name: 'Ana', email: 'a@b.ro', book: 'upper' }); // and after init
    await vi.waitFor(() => expect(posthog.capture).toHaveBeenCalledTimes(2));
    expect(posthog.capture).toHaveBeenLastCalledWith('workbook_download', { book: 'upper' });
    expect(JSON.stringify(posthog.capture.mock.calls)).not.toMatch(/Ana|a@b\.ro/);
  });

  it('drops values that look like a name, an e-mail or free text even under an allowed key', () => {
    expect(analytics.safeProps({ book: 'Ana' })).toBeUndefined();
    expect(analytics.safeProps({ source: 'a@b.ro' })).toBeUndefined();
    expect(analytics.safeProps({ theme: 'ștefan' })).toBeUndefined();
    expect(analytics.safeProps({ category: 'caietul lui ionut' })).toBeUndefined();
    expect(analytics.safeProps({ kind: { name: 'Ana' }, preset: ['Ana'] })).toBeUndefined();
    expect(analytics.safeProps({ plan: 'school-year', tier: 'free', pages: 12, words: true, status: 503, child: 'Ana' }))
      .toEqual({ plan: 'school-year', tier: 'free', pages: 12, words: true, status: 503 });
  });

  it('ignores an event whose name is not an identifier', () => {
    const before = posthog.capture.mock.calls.length;
    analytics.track('Ana Popescu a descărcat', { book: 'upper' });
    analytics.track('$identify', { book: 'upper' });
    expect(posthog.capture.mock.calls.length).toBe(before);
  });

  it('starts PostHog with autocapture and session recording off, text masked, nothing stored', () => {
    expect(posthog.init).toHaveBeenCalledTimes(1);
    const [key, options] = posthog.init.mock.calls[0];
    expect(key).toBe('phc_test');
    expect(options).toMatchObject({
      autocapture: false,
      disable_session_recording: true,
      mask_all_text: true,
      mask_all_element_attributes: true,
      persistence: 'memory',
      disable_persistence: true,
      rageclick: false,
      capture_dead_clicks: false,
      capture_heatmaps: false,
      capture_exceptions: false,
      disable_surveys: true,
      person_profiles: 'identified_only',
      api_host: 'https://eu.i.posthog.com',
    });
    expect(options.session_recording).toBeUndefined();
  });

  it('lets only page views, page leaves and our own events out, whatever PostHog turns on remotely', () => {
    const before = posthog.init.mock.calls[0][1].before_send as (e: { event: string } | null) => unknown;
    for (const ok of ['$pageview', '$pageleave', 'pdf_download', 'checkout_return']) expect(before({ event: ok })).toEqual({ event: ok });
    for (const no of ['$autocapture', '$snapshot', '$rageclick', '$dead_click', '$identify', '$set', '$exception', '$web_vitals', 'survey sent']) expect(before({ event: no })).toBeNull();
    expect(before(null)).toBeNull();
  });

  it('never identifies a visitor', () => {
    expect(posthog.identify).not.toHaveBeenCalled();
  });
});

// Every track() call in the app must pass only allow-listed property keys (a typo or a new key would be dropped silently).
describe('track() call sites', () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) {
        if (name !== '__tests__') walk(path);
      } else if (/\.tsx?$/.test(name)) files.push(path);
    }
  };
  walk(join(process.cwd(), 'src'));

  it('use only allow-listed property keys, and never call identify', () => {
    const calls: { file: string; event: string; keys: string[] }[] = [];
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      if (!file.endsWith(join('lib', 'analytics.ts'))) expect(source, file).not.toMatch(/posthog\s*\.\s*identify|\.identify\(/);
      for (const m of source.matchAll(/\btrack\(\s*([^,)]+)(?:,\s*\{([^}]*)\})?\s*\)/g)) {
        if (file.endsWith(join('lib', 'analytics.ts'))) continue;
        const keys = (m[2] ?? '').split(',').map((part) => part.split(':')[0].trim()).filter(Boolean);
        calls.push({ file, event: m[1].trim(), keys });
      }
    }
    expect(calls.length).toBeGreaterThanOrEqual(5);
    for (const call of calls) {
      for (const key of call.keys) expect(analytics.ALLOWED_PROPS.has(key), `${call.file}: track(${call.event}) passes "${key}", which is not on the allow-list`).toBe(true);
    }
  });
});
