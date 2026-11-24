import type { DrawOp, Pt } from '@/lib/glyphs/types';
import { INK, MUTED, PAPER } from './rows';

/**
 * „Jumătate și sfert”, clasa a II-a: „Fracții: ½ (jumătate/doime), ¼ (sfert/pătrime)”, „Fracții
 * echivalente: ½= 2/4”. Every shape is cut into equal parts (two or four), so the only question is how
 * many of them are coloured:
 *   1. colour half of each shape (cut in two)
 *   2. colour a quarter of each shape (cut in four)
 *   3. circle the shapes with half coloured: 1 of 2 and 2 of 4 are, 1 of 4 and 3 of 4 are not
 *   4. write „jumătate” or „sfert” under the coloured part
 */

export type FracShape = 'circle' | 'square' | 'rect';

export interface FracItem {
  shape: FracShape;
  /** 2 or 4 equal parts. */
  parts: 2 | 4;
  /** How they are cut: 0, 1, 2 (see partsOf). */
  cut: number;
  /** The parts drawn coloured. */
  coloured: number[];
}

export interface FracSheet {
  half: FracItem[];
  quarter: FracItem[];
  /** Section 3: which of them show a half. */
  which: FracItem[];
  /** Section 4: a half or a quarter coloured. */
  name: FracItem[];
}

const int = (rand: () => number, lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
function shuffle<T>(xs: T[], rand: () => number): T[] {
  const out = xs.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
const letter = (i: number) => `${String.fromCharCode(97 + i)})`;
const SHAPES: FracShape[] = ['circle', 'square', 'rect'];
/** How many ways each shape is cut in two / in four. */
const CUTS: Record<FracShape, Record<2 | 4, number>> = { circle: { 2: 2, 4: 1 }, square: { 2: 3, 4: 3 }, rect: { 2: 2, 4: 2 } };

function item(rand: () => number, shape: FracShape, parts: 2 | 4, colouredCount: number): FracItem {
  const cut = int(rand, 0, CUTS[shape][parts] - 1);
  const coloured = shuffle(Array.from({ length: parts }, (_, i) => i), rand).slice(0, colouredCount).sort();
  return { shape, parts, cut, coloured };
}

const shapes4 = (rand: () => number) => shuffle([...SHAPES, SHAPES[int(rand, 0, 2)]], rand);

export function fracSheet(rand: () => number): FracSheet {
  const half = shapes4(rand).map((s) => item(rand, s, 2, 0));
  const quarter = shapes4(rand).map((s) => item(rand, s, 4, 0));
  // three that show a half (1 of 2, 2 of 4, one more of either), three that do not (1 of 4, 3 of 4)
  const kinds: [2 | 4, number][] = shuffle([[2, 1], [4, 2], rand() < 0.5 ? [2, 1] : [4, 2], [4, 1], [4, 3], rand() < 0.5 ? [4, 1] : [4, 3]], rand);
  const which = kinds.map(([p, k]) => item(rand, SHAPES[int(rand, 0, 2)], p, k));
  const names = shuffle([2, 4, 2, 4] as (2 | 4)[], rand);
  const name = shapes4(rand).map((s, i) => item(rand, s, names[i], 1));
  return { half, quarter, which, name };
}

export const showsHalf = (it: FracItem) => it.coloured.length * 2 === it.parts;

export function fracAnswers(s: FracSheet): string[] {
  const yes = s.which.map((it, i) => (showsHalf(it) ? letter(i) : '')).filter(Boolean);
  const no = s.which.map((it, i) => (showsHalf(it) ? '' : letter(i))).filter(Boolean);
  return [
    '1. Oricare dintre cele două părți egale: o jumătate.',
    '2. Oricare dintre cele patru părți egale: un sfert.',
    `3. Se încercuiesc: ${yes.join(', ')} (jumătate colorată). Nu: ${no.join(', ')}.`,
    `4. ${s.name.map((it, i) => `${letter(i)} ${it.parts === 2 ? 'jumătate' : 'sfert'}`).join('; ')}`,
  ];
}

/** The parts of a shape centred on (cx, cy), `size` mm tall, as polygons (a circle's parts with 24 points per quarter). */
export function partsOf(it: Pick<FracItem, 'shape' | 'parts' | 'cut'>, cx: number, cy: number, size: number): Pt[][] {
  const h = size;
  const w = it.shape === 'rect' ? size * 1.6 : size;
  const x0 = cx - w / 2, y0 = cy - h / 2, x1 = cx + w / 2, y1 = cy + h / 2;
  const R = (ax: number, ay: number, bx: number, by: number): Pt[] => [{ x: ax, y: ay }, { x: bx, y: ay }, { x: bx, y: by }, { x: ax, y: by }];
  if (it.shape === 'circle') {
    const r = size / 2;
    const sector = (from: number, to: number): Pt[] => {
      const pts: Pt[] = [{ x: cx, y: cy }];
      const n = Math.round(((to - from) / 90) * 24);
      for (let k = 0; k <= n; k++) {
        const a = ((from + ((to - from) * k) / n) * Math.PI) / 180;
        pts.push({ x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) });
      }
      return pts;
    };
    if (it.parts === 2) return it.cut === 0 ? [sector(0, 180), sector(180, 360)] : [sector(90, 270), sector(270, 450)];
    return [sector(0, 90), sector(90, 180), sector(180, 270), sector(270, 360)];
  }
  const mx = cx, my = cy;
  if (it.parts === 2) {
    if (it.cut === 0) return [R(x0, y0, mx, y1), R(mx, y0, x1, y1)];
    if (it.cut === 1) return [R(x0, y0, x1, my), R(x0, my, x1, y1)];
    // a square cut along its diagonal
    return [[{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }], [{ x: x0, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }]];
  }
  if (it.cut === 0) return [R(x0, y0, mx, my), R(mx, y0, x1, my), R(mx, my, x1, y1), R(x0, my, mx, y1)];
  if (it.cut === 1) {
    const q = w / 4;
    return [0, 1, 2, 3].map((k) => R(x0 + k * q, y0, x0 + (k + 1) * q, y1));
  }
  // a square cut along both diagonals
  const c = { x: cx, y: cy };
  return [[{ x: x0, y: y0 }, { x: x1, y: y0 }, c], [{ x: x1, y: y0 }, { x: x1, y: y1 }, c], [{ x: x1, y: y1 }, { x: x0, y: y1 }, c], [{ x: x0, y: y1 }, { x: x0, y: y0 }, c]];
}

/** Area of a polygon (the tests check that the parts are equal). */
export function area(pts: Pt[]): number {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

export const FRAC_FILL = '#93C5FD';

function shapeOps(it: FracItem, cx: number, cy: number, size: number): DrawOp[] {
  return partsOf(it, cx, cy, size).map((pts, k) => ({ t: 'polygon', points: pts, fill: it.coloured.includes(k) ? FRAC_FILL : PAPER, stroke: INK, strokeWidth: 0.6 }));
}

const HEADS = [
  'Colorează jumătate din fiecare figură.',
  'Colorează un sfert din fiecare figură.',
  'Încercuiește figurile care au colorată jumătate.',
  'Ce parte este colorată? Scrie: jumătate sau sfert.',
];

export function fracOps(s: FracSheet, x0: number, x1: number, top: number, bottom: number): DrawOp[] {
  const ops: DrawOp[] = [];
  const rows = [s.half, s.quarter, s.which, s.name];
  const head = 9;
  const extra = 10; // the writing line of section 4
  const rowH = (bottom - top - 4 * head - extra) / 4;
  let y = top;
  rows.forEach((items, r) => {
    ops.push({ t: 'text', x: x0, y: y + 5, text: `${r + 1}. ${HEADS[r]}`, size: 4.4, fill: INK, weight: 'bold' });
    y += head;
    const h = rowH + (r === 3 ? extra : 0);
    const cw = (x1 - x0) / items.length;
    const size = Math.min(rowH - 8, (cw - 8) / (items.some((it) => it.shape === 'rect') ? 1.6 : 1), 30);
    items.forEach((it, i) => {
      const x = x0 + i * cw;
      ops.push({ t: 'text', x: x + 2, y: y + 5, text: letter(i), size: 3.6, fill: MUTED, weight: 'bold' });
      const cy = y + 2 + (rowH - 2) / 2;
      ops.push(...shapeOps(it, x + cw / 2, cy, size));
      if (r === 3) ops.push({ t: 'line', x1: x + 5, y1: y + h - 3, x2: x + cw - 5, y2: y + h - 3, stroke: INK, strokeWidth: 0.4 });
    });
    y += h;
  });
  return ops;
}
