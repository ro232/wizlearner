'use client';

/**
 * Product analytics (PostHog, EU servers), only when NEXT_PUBLIC_POSTHOG_KEY is set.
 *
 * What is sent: page views, page leaves, and the explicit product events fired with `track()`.
 * Nothing else. The pages show children's names (the chips on /grupa, "Copiii mei") and the
 * account's e-mail, so everything that reads the page itself is switched off:
 *  - no autocapture (it would send the text and aria-labels of whatever is clicked),
 *  - no session recording (it masks typed values only, not text on the page),
 *  - no heatmaps, dead-click or rage-click capture, no surveys, no exception capture,
 *  - `identify()` is never called: visitors stay anonymous.
 * `mask_all_text` / `mask_all_element_attributes` stay on as a second lock, and `before_send`
 * drops any event that is not on the list below, even if a PostHog project setting turns a
 * feature back on remotely.
 *
 * Cookieless: nothing is stored in the visitor's browser (persistence "memory"), so no consent
 * banner is needed for this. The library is loaded lazily, so pages pay nothing for it when
 * analytics is off.
 *
 * ── Event properties: allow-list ────────────────────────────────────────────────────────────────
 * `track(event, props)` forwards a property only when its KEY is in ALLOWED_PROPS and its VALUE is
 * a number, a boolean, or a short lowercase identifier ("monthly", "school-year", "upper").
 * Everything else is dropped without error: unknown keys (name, email, title, child, words typed
 * by the user…), free text, anything with "@", spaces, capitals or diacritics, objects and arrays.
 * To record something new, add its key here and keep the value an identifier from the code,
 * never something a person typed.
 *
 *   plan      which paid plan: monthly | school-year
 *   tier      the account level at that moment: free | starter | full
 *   category  the generator's sheet category
 *   book      a ready-made workbook id
 *   level     difficulty level
 *   preset    a quick-start preset id
 *   kind      what was made: sheet | workbook | book | name-book | group
 *   format    output format or paper size
 *   script    print | cursive
 *   theme     a weekly theme id
 *   source    where a click came from: account | paywall | navbar …
 *   result    how something ended: success | cancel
 *   status    an HTTP status code
 *   pages     number of pages
 *   count     a count (e.g. children in a group, never their names)
 *   words     true/false: the workbook includes words
 */
export const ALLOWED_PROPS: ReadonlySet<string> = new Set([
  'plan', 'tier', 'category', 'book', 'level', 'preset', 'kind', 'format', 'script', 'theme', 'source', 'result', 'status', 'pages', 'count', 'words',
]);

type PostHog = typeof import('posthog-js').default;
type Props = Record<string, unknown>;

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';

/** Event names are identifiers from the code: lowercase words joined by "_". */
const EVENT_NAME = /^[a-z][a-z0-9_]{1,40}$/;
/** A value that can only be an identifier from the code, not a name, an e-mail or a sentence. */
const IDENTIFIER = /^[a-z0-9][a-z0-9_-]{0,31}$/;
/** PostHog's own events that may leave the browser. */
const BUILT_IN = new Set(['$pageview', '$pageleave']);

/** Keep only allow-listed keys with identifier-like values (see the list at the top of this file). */
export function safeProps(props?: Props): Props | undefined {
  if (!props) return undefined;
  const out: Props = {};
  for (const [key, v] of Object.entries(props)) {
    if (!ALLOWED_PROPS.has(key)) continue;
    if (typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && IDENTIFIER.test(v))) out[key] = v;
  }
  return Object.keys(out).length ? out : undefined;
}

/** May this event be sent at all? Page views/leaves and our own named events; nothing else. */
export function allowedEvent(name: unknown): boolean {
  return typeof name === 'string' && (BUILT_IN.has(name) || EVENT_NAME.test(name));
}

let client: Promise<PostHog | null> | null = null;
const queue: [string, Props | undefined][] = [];

export function initAnalytics(): void {
  if (!KEY || client || typeof window === 'undefined') return;
  client = import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(KEY, {
        api_host: HOST,
        // nothing stored in the browser
        persistence: 'memory',
        disable_persistence: true,
        // anonymous page views only
        capture_pageview: 'history_change',
        capture_pageleave: true,
        person_profiles: 'identified_only',
        respect_dnt: true,
        // nothing that reads the page: its text includes children's names and the account e-mail
        autocapture: false,
        rageclick: false,
        capture_dead_clicks: false,
        capture_heatmaps: false,
        capture_exceptions: false,
        disable_session_recording: true,
        disable_surveys: true,
        mask_all_text: true,
        mask_all_element_attributes: true,
        // last lock: only page views, page leaves and our own events ever leave the browser
        before_send: (event) => (event && allowedEvent(event.event) ? event : null),
      });
      for (const [e, p] of queue.splice(0)) posthog.capture(e, p);
      return posthog;
    })
    .catch(() => null);
}

/**
 * Record a product event (no-op when analytics is off). Only allow-listed properties with
 * identifier-like values are forwarded (see the top of this file); names and e-mails never are.
 */
export function track(event: string, props?: Props): void {
  if (!KEY || !EVENT_NAME.test(event)) return;
  const safe = safeProps(props);
  if (!client) {
    queue.push([event, safe]);
    return;
  }
  client.then((p) => p?.capture(event, safe));
}
