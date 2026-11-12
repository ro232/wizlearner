const BASE = 'https://worksheetwiz.invalid';

/** Percent-decode until nothing changes ("%252f" → "%2f" → "/"); null when it is not valid. */
function fullyDecoded(path: string): string | null {
  let out = path;
  try {
    for (let i = 0; i < 4; i++) {
      const next = decodeURIComponent(out);
      if (next === out) return out;
      out = next;
    }
  } catch {
    return null;
  }
  return null; // still changing after four rounds: nobody links to such a page
}

/**
 * Same-site path to send the user to after sign-in; anything else falls back.
 *
 * The answer always starts with exactly one "/" followed by something that is not a slash
 * or a backslash, so the browser and the Next router can only read it as a path of this
 * site, never as "//other-site" (which they would treat as another host).
 */
export function safeNextPath(requested: string | null | undefined, fallback = '/generator'): string {
  if (!requested) return fallback;
  // Control characters and spaces are stripped by URL parsers ("/\t/evil.com" → "//evil.com"),
  // so refuse them outright; then let the URL parser decide, and accept only our own origin.
  if (/[\s\x00-\x1f\x7f\\@]/.test(requested) || !requested.startsWith('/') || requested.startsWith('//')) return fallback;
  try {
    const url = new URL(requested, BASE);
    if (url.origin !== BASE) return fallback;
    // The parser resolves dot segments: "/..//evil.com" and "/a/../..//evil.com" both come out
    // as "//evil.com". Check what it produced, also with %2f and %5c decoded.
    const path = fullyDecoded(url.pathname);
    if (path === null || /^\/[/\\]/.test(path) || path.includes('\\') || /[\x00-\x1f\x7f]/.test(path)) return fallback;
    // No page of ours has an encoded slash in its address; a hidden one ("%2f", "%252f") is refused.
    if (path.split('/').length !== url.pathname.split('/').length) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
