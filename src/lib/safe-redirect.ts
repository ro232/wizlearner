const BASE = 'https://worksheetwiz.invalid';

/** Same-site path to send the user to after sign-in; anything else falls back. */
export function safeNextPath(requested: string | null, fallback = '/generator'): string {
  if (!requested) return fallback;
  // Control characters and spaces are stripped by URL parsers ("/\t/evil.com" → "//evil.com"),
  // so refuse them outright; then let the URL parser decide, and accept only our own origin.
  if (/[\s\x00-\x1f\x7f\\@]/.test(requested) || !requested.startsWith('/') || requested.startsWith('//')) return fallback;
  try {
    const url = new URL(requested, BASE);
    if (url.origin !== BASE) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
