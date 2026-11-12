import { describe, expect, it } from 'vitest';
import { safeNextPath } from '@/lib/safe-redirect';

const FALLBACK = '/generator';

describe('where to go after sign-in', () => {
  it.each([
    ['/generator', '/generator'],
    ['/grupa', '/grupa'],
    ['/cont?tab=copii#istoric', '/cont?tab=copii#istoric'],
    ['/fise/litera-m-de-mana', '/fise/litera-m-de-mana'],
    ['/nume/../grupa', '/grupa'],
    ['/', '/'],
  ])('keeps a page of this site: %s', (requested, expected) => {
    expect(safeNextPath(requested)).toBe(expected);
  });

  it.each([
    // straight to another site
    'https://evil.example',
    'http://evil.example/login',
    '//evil.example',
    '///evil.example',
    'evil.example',
    'javascript:alert(1)',
    // dot segments that the URL parser folds into "//evil.example"
    '/..//evil.example',
    '/.//evil.example',
    '/a/../..//evil.example',
    '/..//evil.example/login?x=1',
    // encoded slashes and backslashes
    '/./%2f/evil.example',
    '/%2f%2fevil.example',
    '/%2Fevil.example',
    '/%5cevil.example',
    '/%5Cevil.example',
    '/%255cevil.example',
    '/%252f%252fevil.example',
    '/..%2f..%2f%2fevil.example',
    // backslashes, credentials, control characters
    '/\\evil.example',
    '\\\\evil.example',
    '/\\/evil.example',
    '/@evil.example',
    '/\t/evil.example',
    '/\n/evil.example',
    ' //evil.example',
    '/%00/evil.example',
    '/%0a/evil.example',
    '/%zz',
  ])('refuses %j', (requested) => {
    expect(safeNextPath(requested)).toBe(FALLBACK);
  });

  it('falls back when there is nothing to go to', () => {
    expect(safeNextPath(null)).toBe(FALLBACK);
    expect(safeNextPath(undefined)).toBe(FALLBACK);
    expect(safeNextPath('')).toBe(FALLBACK);
    expect(safeNextPath('//evil.example', '/cont')).toBe('/cont');
  });

  it('always answers with one leading slash, whatever it is given', () => {
    const pieces = ['/', '//', '..', '.', '%2f', '%5c', '\\', 'evil.example', 'a', '?x=1', '#h', '%2e%2e', '@', ':'];
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 3000; i++) {
      const s = '/' + Array.from({ length: 1 + Math.floor(rnd() * 6) }, () => pieces[Math.floor(rnd() * pieces.length)]).join('');
      const out = safeNextPath(s);
      expect(out, s).toMatch(/^\/(?![/\\])/);
      // the browser must resolve it on our own origin
      expect(new URL(out, 'https://site.example').origin, s).toBe('https://site.example');
      expect(decodeURIComponent(new URL(out, 'https://site.example').pathname), s).not.toMatch(/^\/[/\\]/);
    }
  });
});
