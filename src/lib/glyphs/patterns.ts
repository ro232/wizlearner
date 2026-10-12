import type { Glyph } from './types';
import { buildGlyph } from './geometry';

/**
 * Pre-writing patterns ("exerciții grafice"): the strokes children practise
 * before letters. Each pattern is generated for a given width (glyph units,
 * cap height = 100, baseline = 100) as one or more strokes, so it renders
 * through the same pipeline as letters (solid model, dashed copy, start dot,
 * arrows).
 */

export const PATTERN_IDS = ['vertical', 'horizontal', 'slant', 'zigzag', 'waves', 'cups', 'loops', 'circles', 'castle'] as const;
export type PatternId = (typeof PATTERN_IDS)[number];

export const PATTERN_LABELS: Record<'ro' | 'en', Record<PatternId, string>> = {
  ro: {
    vertical: 'Linii verticale',
    horizontal: 'Linii orizontale',
    slant: 'Linii oblice',
    zigzag: 'Zigzag',
    waves: 'Valuri',
    cups: 'Cupe',
    loops: 'Bucle',
    circles: 'Cercuri',
    castle: 'Castel',
  },
  en: {
    vertical: 'Vertical lines',
    horizontal: 'Horizontal lines',
    slant: 'Slanted lines',
    zigzag: 'Zigzag',
    waves: 'Waves',
    cups: 'Cups',
    loops: 'Loops',
    circles: 'Circles',
    castle: 'Castle',
  },
};

export const PATTERN_ICONS: Record<PatternId, string> = {
  vertical: '┃┃┃',
  horizontal: '━━',
  slant: '╱╱╱',
  zigzag: '⟋⟍⟋',
  waves: '∩∩∩',
  cups: '∪∪∪',
  loops: 'ℓℓℓ',
  circles: '○○○',
  castle: '⊓⊔⊓',
};

/** Natural period (glyph units) of each pattern; widths are rounded to whole periods. */
export const PATTERN_PERIOD: Record<PatternId, number> = {
  vertical: 50,
  horizontal: 100,
  slant: 44,
  zigzag: 60,
  waves: 60,
  cups: 60,
  loops: 80,
  circles: 100,
  castle: 80,
};

export function isPatternId(id: string): id is PatternId {
  return (PATTERN_IDS as readonly string[]).includes(id);
}

const f = (n: number) => (Math.round(n * 100) / 100).toString();

/** Number of whole periods that fit in `width`, at least `min`. */
export function patternPeriods(id: PatternId, width: number, min = 1): number {
  return Math.max(min, Math.floor(width / PATTERN_PERIOD[id]));
}

/** Build the pattern as a glyph covering `periods` periods. */
export function patternGlyph(id: PatternId, periods: number): Glyph {
  const P = PATTERN_PERIOD[id];
  const n = Math.max(1, Math.round(periods));
  const W = P * n;
  const strokes: string[] = [];
  const arrows: (number | number[] | null | undefined)[] = [];

  switch (id) {
    case 'vertical':
      for (let i = 0; i < n; i++) {
        const x = i * P + P / 2;
        strokes.push(`M ${f(x)} 0 L ${f(x)} 100`);
      }
      break;
    case 'horizontal':
      strokes.push(`M 0 50 L ${f(W)} 50`);
      arrows.push([0.12, 0.5, 0.88]);
      break;
    case 'slant':
      for (let i = 0; i < n; i++) {
        const x = i * P + 6;
        strokes.push(`M ${f(x + 30)} 0 L ${f(x)} 100`);
      }
      break;
    case 'zigzag': {
      let d = 'M 0 100';
      for (let i = 0; i < n; i++) d += ` L ${f(i * P + P / 2)} 0 L ${f((i + 1) * P)} 100`;
      strokes.push(d);
      break;
    }
    case 'waves': {
      // arches: up over the top, back down to the baseline
      let d = '';
      for (let i = 0; i < n; i++) d += ` A ${f(i * P + P / 2)} 100 ${f(P / 2)} 100 180 360`;
      strokes.push(d.trim());
      arrows.push(Array.from({ length: Math.min(n, 3) }, (_, k) => (k + 0.5) / Math.min(n, 3)));
      break;
    }
    case 'cups': {
      let d = '';
      for (let i = 0; i < n; i++) d += ` A ${f(i * P + P / 2)} 0 ${f(P / 2)} 100 180 0`;
      strokes.push(d.trim());
      arrows.push(Array.from({ length: Math.min(n, 3) }, (_, k) => (k + 0.5) / Math.min(n, 3)));
      break;
    }
    case 'loops': {
      // prolate cycloid: the pen moves right while looping (cursive "e" chain)
      const pts: string[] = [];
      const R = 30; // loop radius
      const advance = P; // per full turn
      const turns = n;
      const steps = 36;
      for (let k = 0; k <= turns * steps; k++) {
        const t = (k / steps) * Math.PI * 2;
        const x = (t / (Math.PI * 2)) * advance - R * Math.sin(t) + R;
        const y = 60 - R * Math.cos(t);
        pts.push(`${k === 0 ? 'M' : 'L'} ${f(x)} ${f(y)}`);
      }
      strokes.push(pts.join(' '));
      arrows.push(Array.from({ length: Math.min(n, 3) }, (_, k) => (k + 0.35) / Math.min(n, 3)));
      break;
    }
    case 'circles':
      for (let i = 0; i < n; i++) {
        const cx = i * P + P / 2;
        strokes.push(`A ${f(cx)} 50 44 48 -90 -450`);
        arrows.push(0.25);
      }
      break;
    case 'castle': {
      let d = 'M 0 100';
      for (let i = 0; i < n; i++) {
        const x = i * P;
        d += ` L ${f(x)} 15 L ${f(x + P / 2)} 15 L ${f(x + P / 2)} 100 L ${f(x + P)} 100`;
      }
      strokes.push(d);
      break;
    }
  }

  return buildGlyph(`pattern:${id}:${n}`, { strokes, width: W, arrows: arrows.length ? arrows : undefined });
}
