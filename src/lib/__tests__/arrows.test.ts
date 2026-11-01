import { describe, expect, it } from 'vitest';
import { ALPHABETS, getGlyph } from '@/lib/glyphs/data';
import { DEFAULT_GLYPH_STYLE, renderGlyph } from '@/lib/glyphs/render';
import { flattenSubpath } from '@/lib/glyphs/geometry';
import type { Pt } from '@/lib/glyphs/types';

const W = DEFAULT_GLYPH_STYLE.strokeWidth;

/** Distance from p to the nearest point of the segment ab. */
function segDist(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}

describe('direction arrows and start numbers', () => {
  const keys = [...ALPHABETS.ro, ...ALPHABETS.ro.map((l) => l.toLowerCase()), ...'0123456789'.split('')];

  it('sit beside the strokes, never on them', () => {
    for (const key of keys) {
      const g = getGlyph(key)!;
      const lines = g.strokes.flatMap((s) => s.subpaths.map((sp) => flattenSubpath(sp)));
      const arrows = renderGlyph(g, DEFAULT_GLYPH_STYLE).filter((op) => op.t === 'polygon');
      for (const a of arrows) {
        if (a.t !== 'polygon') continue;
        for (const p of a.points) {
          let m = Infinity;
          for (const pts of lines) for (let i = 1; i < pts.length; i++) m = Math.min(m, segDist(p, pts[i - 1], pts[i]));
          // half the pen width plus a hair: the arrow may touch the ink edge, not cover it
          expect(m, `${key}: arrow on a stroke`).toBeGreaterThan(W * 0.5);
        }
      }
    }
  });

  it('start numbers sit beside the ink, not on it, with a ring on each start', () => {
    for (const key of keys) {
      const g = getGlyph(key)!;
      const lines = g.strokes.flatMap((s) => s.subpaths.map((sp) => flattenSubpath(sp)));
      const ops = renderGlyph(g, DEFAULT_GLYPH_STYLE);
      const nums = ops.filter((op) => op.t === 'text' && /^\d+$/.test(op.text));
      const rings = ops.filter((op) => op.t === 'circle' && op.fill === DEFAULT_GLYPH_STYLE.paper);
      expect(nums.length, key).toBeGreaterThan(0);
      expect(rings.length, key).toBe(nums.length);
      const r = W * 0.85 * 0.8;
      for (const d of nums) {
        if (d.t !== 'text') continue;
        let m = Infinity;
        for (const pts of lines) for (let i = 1; i < pts.length; i++) m = Math.min(m, segDist({ x: d.x, y: d.y }, pts[i - 1], pts[i]));
        expect(m, `${key}: number on a stroke`).toBeGreaterThanOrEqual(r + W * 0.5 - 0.01);
      }
    }
  });
});
