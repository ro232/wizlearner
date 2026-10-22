import { describe, expect, it } from 'vitest';
import { ALPHABETS, getGlyph, LETTER_HINTS, normalizeKey } from '@/lib/glyphs/data';
import { hasIcon } from '@/lib/hints/icons';
import { isItemAllowed } from '@/lib/access';
import { safeNextPath } from '@/lib/safe-redirect';

describe('glyph data', () => {
  it('has upper- and lowercase glyphs for every letter of both alphabets, and digits', () => {
    for (const alphabet of ['ro', 'en'] as const)
      for (const l of ALPHABETS[alphabet]) {
        expect(getGlyph(l), l).toBeDefined();
        expect(getGlyph(l.toLowerCase()), l.toLowerCase()).toBeDefined();
      }
    for (let d = 0; d <= 9; d++) expect(getGlyph(String(d))).toBeDefined();
  });

  it('marks the diacritic of every Romanian letter, and only that stroke', () => {
    for (const l of ['Ă', 'Â', 'Î', 'Ș', 'Ț', 'ă', 'â', 'î', 'ș', 'ț']) {
      const g = getGlyph(l)!;
      expect(g.strokes.filter((s) => s.mark).length, l).toBe(1);
      expect(g.strokes[g.strokes.length - 1].mark, l).toBe(true);
    }
    expect(getGlyph('A')!.strokes.some((s) => s.mark)).toBe(false);
  });

  it('reads cedilla Ş/Ţ as comma-below Ș/Ț', () => {
    expect(normalizeKey('Ştefan Ţară')).toBe('Ștefan Țară');
  });

  it('has a printable picture for every hint word', () => {
    for (const alphabet of ['ro', 'en'] as const)
      for (const [letter, hint] of Object.entries(LETTER_HINTS[alphabet])) expect(hasIcon(hint.emoji), `${alphabet} ${letter}`).toBe(true);
  });
});

describe('free tier', () => {
  it('allows A–E with their diacritic forms and blocks the rest', () => {
    expect(isItemAllowed('Ă', 'letters', 'free')).toBe(true);
    expect(isItemAllowed('Aa', 'letters', 'free')).toBe(true);
    expect(isItemAllowed('M', 'letters', 'free')).toBe(false);
    expect(isItemAllowed('Șș', 'letters', 'free')).toBe(false);
    expect(isItemAllowed('7', 'numbers', 'free')).toBe(false);
    expect(isItemAllowed('M', 'letters', 'starter')).toBe(true);
  });
});

describe('sign-in redirect', () => {
  it('only allows paths on this site', () => {
    expect(safeNextPath('/book')).toBe('/book');
    expect(safeNextPath(null)).toBe('/generator');
    for (const bad of ['//evil.com', '/\\evil.com', '@evil.com', 'https://evil.com', '/@evil.com']) expect(safeNextPath(bad), bad).toBe('/generator');
  });
});
