import { describe, expect, it } from 'vitest';
import { ALPHABETS } from '@/lib/glyphs/data';
import { cursiveGlyph, cursiveWord } from '@/lib/glyphs/cursive';
import { flattenSubpath } from '@/lib/glyphs/geometry';
import { buildWorksheetPages, isCursive } from '@/lib/worksheet/layout';
import { DEFAULT_CONFIG } from '@/types';
import type { Pt, Stroke } from '@/lib/glyphs/types';

const first = (st: Stroke): Pt => st.subpaths[0].start;
const last = (st: Stroke): Pt => {
  const pts = flattenSubpath(st.subpaths[st.subpaths.length - 1]);
  return pts[pts.length - 1];
};

describe('handwriting letters', () => {
  it('cover the whole Romanian alphabet, capitals and small letters', () => {
    for (const l of ALPHABETS.ro) {
      expect(cursiveGlyph(l), l).toBeDefined();
      expect(cursiveGlyph(l.toLowerCase()), l.toLowerCase()).toBeDefined();
    }
    expect(cursiveGlyph('ş')?.key).toBe('cur:ș'); // cedilla typed by mistake
  });

  it('stay between the top line and the tail line', () => {
    for (const l of [...ALPHABETS.ro, ...ALPHABETS.ro.map((x) => x.toLowerCase())]) {
      const g = cursiveGlyph(l)!;
      expect(g.bbox.minY, l).toBeGreaterThanOrEqual(-20);
      expect(g.bbox.maxY, l).toBeLessThanOrEqual(155);
    }
  });

  it('join the small letters of a word into one line', () => {
    const word = cursiveWord('mama')!;
    // m, a, m, a: one stroke each, each starting where the previous one ends
    expect(word.strokes).toHaveLength(4);
    for (let i = 1; i < word.strokes.length; i++) {
      const a = last(word.strokes[i - 1]), b = first(word.strokes[i]);
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(0.01);
    }
  });

  it('join along the top after o, b, v, w', () => {
    const word = cursiveWord('ou')!;
    const a = last(word.strokes[0]), b = first(word.strokes[1]);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(0.01);
    expect(a.y).toBeLessThan(60); // near the x-height line, not the baseline
  });

  it('keep dots, bars and diacritics as their own strokes', () => {
    expect(cursiveWord('ți')!.strokes).toHaveLength(5); // t, bar, comma, i, dot
  });
});

describe('handwriting worksheets', () => {
  it('only change letters and words, not digits', () => {
    expect(isCursive({ ...DEFAULT_CONFIG, script: 'cursive' })).toBe(true);
    expect(isCursive({ ...DEFAULT_CONFIG, script: 'cursive', category: 'numbers' })).toBe(false);
    expect(isCursive({ ...DEFAULT_CONFIG, fontStyle: 'cursive' })).toBe(true); // older saved sheets
  });

  it('write a word as one joined glyph', () => {
    const [page] = buildWorksheetPages({ ...DEFAULT_CONFIG, script: 'cursive', selectedItems: [], customWords: ['mama'] }, 'full');
    expect(page.ops.length).toBeGreaterThan(5);
  });
});
