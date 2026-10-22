/** Same-site path to send the user to after sign-in; anything else falls back. */
export function safeNextPath(requested: string | null, fallback = '/generator'): string {
  if (!requested) return fallback;
  // "/x" stays on this site; "//evil.com", "/\evil.com" or "@evil.com" would leave it.
  return /^\/(?!\/)[^\\@]*$/.test(requested) ? requested : fallback;
}
