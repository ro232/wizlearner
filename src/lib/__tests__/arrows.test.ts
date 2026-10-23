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

describe('direction arrows', () => {
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
});
