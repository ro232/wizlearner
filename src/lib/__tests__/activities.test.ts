import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '@/types';
import { buildWorksheetPages, hasContent } from '@/lib/worksheet/layout';
import { DOT_SHAPES, dotPoints } from '@/lib/worksheet/activities';
import { ALPHABETS } from '@/lib/glyphs/data';
import { opsOutside } from './bounds';

const games = (items: string[], extra = {}) => ({ ...DEFAULT_CONFIG, category: 'games' as const, selectedItems: items, ...extra });

describe('activities', () => {
  it('make one page per selected activity, all on the paper', () => {
    const items = [...ALPHABETS.ro.map((l) => `find:${l}`), 'count:5', 'count:10', ...DOT_SHAPES.map((d) => `dots:${d}`)];
    for (const mode of ['uppercase', 'lowercase'] as const) {
      const pages = buildWorksheetPages(games(items, { letterMode: mode }), 'full');
      expect(pages).toHaveLength(items.length);
      pages.forEach((p, i) => expect(opsOutside(p, { minX: 5, minY: 5, maxX: p.width - 5, maxY: p.height - 5 }), `${mode} ${items[i]}`).toEqual([]));
    }
  });

  it('are the same every time (preview = PDF)', () => {
    const a = JSON.stringify(buildWorksheetPages(games(['find:B', 'count:10']), 'full'));
    const b = JSON.stringify(buildWorksheetPages(games(['find:B', 'count:10']), 'full'));
    expect(a).toBe(b);
  });

  it('hide exactly twelve target letters in the find grid', () => {
    const page = buildWorksheetPages(games(['find:B']), 'full')[0];
    // the model is drawn solid with start dots; grid letters are outlines (two strokes per path)
    const groups = page.ops.filter((o) => o.t === 'group');
    expect(groups.length).toBe(1 + 42);
  });

  it('keep locked activities off the free tier', () => {
    expect(hasContent(games(['find:M', 'count:10', 'dots:fish']), 'free')).toBe(false);
    expect(buildWorksheetPages(games(['find:A', 'find:M', 'count:5', 'dots:star', 'dots:fish']), 'free')).toHaveLength(3);
  });

  it('every dot picture has enough points to be a puzzle', () => {
    for (const d of DOT_SHAPES) expect(dotPoints(d).length, d).toBeGreaterThanOrEqual(9);
  });
});

describe('name workbook', () => {
  it('has a cover, a page per letter, the name three ways, a game and a diploma, all on the paper', async () => {
    const { buildNameBookPages } = await import('@/lib/worksheet/name-book');
    const pages = buildNameBookPages('Ştefan');
    // Ș T E F A N = 6 letters → 1 + 6 + 3 + 1 + 1
    expect(pages).toHaveLength(12);
    pages.forEach((p, i) => expect(opsOutside(p, { minX: 5, minY: 5, maxX: p.width - 5, maxY: p.height - 5 }), `page ${i + 1}`).toEqual([]));
    expect(buildNameBookPages('Ana-Maria Magdalena').length).toBeLessThanOrEqual(1 + 8 + 3 + 1 + 1);
    expect(buildNameBookPages('  ')).toEqual([]);
  });
});
