import { describe, expect, it } from 'vitest';
import { SEO_SHEETS, letterSlug, relatedSheets, seoSheetBySlug } from '@/lib/seo/catalog';
import { buildWorksheetPages, hasContent } from '@/lib/worksheet/layout';
import { ALPHABETS } from '@/lib/glyphs/data';

describe('SEO sheet catalog', () => {
  it('has unique, ASCII-only slugs', () => {
    const slugs = SEO_SHEETS.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9-]+$/);
  });

  it('covers every Romanian letter, with readable slugs for the diacritics', () => {
    for (const l of ALPHABETS.ro) expect(seoSheetBySlug(letterSlug(l))?.label).toBe(`Litera ${l}`);
    expect(letterSlug('Ș')).toBe('litera-s-virgula');
    expect(letterSlug('Â')).toBe('litera-a-circumflex');
  });

  it('every sheet draws a non-empty page that stays on the paper', () => {
    for (const s of SEO_SHEETS) {
      expect(hasContent(s.config, 'full'), s.slug).toBe(true);
      const [page] = buildWorksheetPages(s.config, 'full');
      expect(page.ops.length, s.slug).toBeGreaterThan(5);
    }
  });

  it('titles and descriptions fit search results', () => {
    for (const s of SEO_SHEETS) {
      expect(s.description.length, s.slug).toBeLessThanOrEqual(220);
      expect(s.title.length, s.slug).toBeLessThanOrEqual(90);
    }
  });

  it('related links point to other existing pages', () => {
    const rel = relatedSheets('litera-c');
    expect(rel.map((r) => r.slug)).toContain('litera-b');
    expect(rel.map((r) => r.slug)).not.toContain('litera-c');
    expect(rel.some((r) => r.kind === 'cifre')).toBe(true);
  });
});
