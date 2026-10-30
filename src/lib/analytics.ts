'use client';

/**
 * Product analytics (PostHog, EU servers), only when NEXT_PUBLIC_POSTHOG_KEY is set.
 * Cookieless: nothing is stored in the visitor's browser (persistence "memory"), so no consent
 * banner is needed. Session recordings mask every typed value (children's names stay private).
 * The library is loaded lazily, so pages pay nothing for it when analytics is off.
 */

type PostHog = typeof import('posthog-js').default;

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

let client: Promise<PostHog | null> | null = null;
const queue: [string, Record<string, unknown> | undefined][] = [];

export function initAnalytics(): void {
  if (!KEY || client || typeof window === 'undefined') return;
  client = import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(KEY, {
        api_host: HOST,
        persistence: 'memory',
        disable_persistence: true,
        capture_pageview: 'history_change',
        capture_pageleave: true,
        autocapture: true,
        person_profiles: 'identified_only',
        session_recording: { maskAllInputs: true, maskTextSelector: '[data-private]' },
        respect_dnt: true,
      });
      for (const [e, p] of queue.splice(0)) posthog.capture(e, p);
      return posthog;
    })
    .catch(() => null);
}

/** Record a product event (no-op when analytics is off). Never pass names or e-mails here. */
export function track(event: string, props?: Record<string, unknown>): void {
  if (!KEY) return;
  if (!client) {
    queue.push([event, props]);
    return;
  }
  client.then((p) => p?.capture(event, props));
}
