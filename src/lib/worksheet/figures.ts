import type { DrawOp, Pt } from '@/lib/glyphs/types';
import { INK, MUTED, PAPER } from './rows';

/**
 * „Figuri geometrice”: a picture made of squares, rectangles, triangles and circles (a house, a train,
 * a robot, a rocket, a car), and a table where the child writes how many of each there are.
 *
 * No counting tricks for young children: the shapes never overlap (a window sits inside a wall, a wheel
 * under the car, a roof above the house), so no new shape appears where two meet; a square is exactly
 * square and a rectangle plainly longer than tall (at least 1.4 times), so the two are never confused.
 * Clasa pregătitoare and clasa I name these four shapes: „Pătrat, dreptunghi, triunghi, cerc”.
 */

export type FigKind = 'square' | 'rect' | 'tri' | 'circle';
export const FIG_KINDS: FigKind[] = ['square', 'rect', 'tri', 'circle'];
export const FIG_NAMES: Record<FigKind, { one: string; many: string }> = {
  square: { one: 'pătrat', many: 'pătrate' },
  rect: { one: 'dreptunghi', many: 'dreptunghiuri' },
  tri: { one: 'triunghi', many: 'triunghiuri' },
  circle: { one: 'cerc', many: 'cercuri' },
};

/** One shape in the 100 × 100 box of a picture. */
export type Fig =
  | { kind: 'square' | 'rect'; x: number; y: number; w: number; h: number; fill: string }
  | { kind: 'tri'; pts: [Pt, Pt, Pt]; fill: string }
  | { kind: 'circle'; cx: number; cy: number; r: number; fill: string };

export interface FigPicture {
  name: string;
  figs: Fig[];
}

const Y = '#FDE68A', R = '#FCA5A5', B = '#93C5FD', G = '#86EFAC', P = '#D8B4FE', O = '#FDBA74', S = '#CBD5E1';
const sq = (x: number, y: number, s: number, fill: string): Fig => ({ kind: 'square', x, y, w: s, h: s, fill });
const rc = (x: number, y: number, w: number, h: number, fill: string): Fig => ({ kind: 'rect', x, y, w, h, fill });
const tr = (a: [number, number], b: [number, number], c: [number, number], fill: string): Fig => ({ kind: 'tri', pts: [{ x: a[0], y: a[1] }, { x: b[0], y: b[1] }, { x: c[0], y: c[1] }], fill });
const ci = (cx: number, cy: number, r: number, fill: string): Fig => ({ kind: 'circle', cx, cy, r, fill });

type Template = (rand: () => number) => FigPicture;

const TEMPLATES: Template[] = [
  (rand) => {
    const figs: Fig[] = [sq(10, 45, 50, Y), tr([5, 42], [65, 42], [35, 10], R), rc(29, 65, 12, 28, O), sq(15, 51, 10, G)];
    if (rand() < 0.6) figs.push(sq(45, 51, 10, G));
    // a tree beside the house: its crown touches the trunk, nothing overlaps
    figs.push(rc(78, 68, 8, 27, O), ci(82, 57, 11, G));
    if (rand() < 0.6) figs.push(ci(88, 14, 8, Y));
    return { name: 'casa', figs };
  },
  (rand) => {
    const figs: Fig[] = [rc(4, 50, 42, 24, R), sq(28, 31, 18, B), rc(9, 36, 7, 14, S), rc(52, 50, 44, 24, G)];
    figs.push(sq(57, 55, 12, PAPER));
    if (rand() < 0.6) figs.push(sq(78, 55, 12, PAPER));
    figs.push(ci(14, 80, 5, S), ci(36, 80, 5, S), ci(62, 80, 5, S), ci(86, 80, 5, S));
    const smoke = 1 + Math.floor(rand() * 2);
    for (let k = 0; k < smoke; k++) figs.push(ci(13 + k * 7, 28 - k * 8, 3.5 + k, S));
    return { name: 'trenul', figs };
  },
  (rand) => {
    const figs: Fig[] = [sq(35, 12, 30, S), ci(43, 23, 4, B), ci(57, 23, 4, B), rc(41, 32, 18, 5, R), tr([45, 12], [55, 12], [50, 3], Y)];
    figs.push(rc(27, 45, 46, 28, B));
    const buttons = 1 + Math.floor(rand() * 3);
    for (let k = 0; k < buttons; k++) figs.push(ci(50 + (k - (buttons - 1) / 2) * 11, 59, 3.2, Y));
    figs.push(rc(9, 50, 16, 6, S), rc(75, 50, 16, 6, S), rc(35, 75, 8, 20, S), rc(57, 75, 8, 20, S));
    return { name: 'robotul', figs };
  },
  (rand) => {
    const figs: Fig[] = [rc(38, 26, 24, 54, S), tr([38, 24], [62, 24], [50, 4], R), ci(50, 40, 6, B)];
    if (rand() < 0.6) figs.push(ci(50, 58, 6, B));
    figs.push(tr([36, 62], [36, 80], [24, 80], R), tr([64, 62], [64, 80], [76, 80], R), tr([42, 82], [58, 82], [50, 97], O));
    if (rand() < 0.5) figs.push(ci(15, 20, 4, Y));
    return { name: 'racheta', figs };
  },
  (rand) => {
    const figs: Fig[] = [rc(4, 46, 92, 24, P), rc(24, 22, 50, 22, P), sq(29, 26, 14, PAPER), sq(53, 26, 14, PAPER)];
    figs.push(ci(25, 81, 9, S), ci(75, 81, 9, S), ci(89, 53, 3, Y));
    if (rand() < 0.5) figs.push(ci(89, 12, 7, Y));
    return { name: 'mașina', figs };
  },
];

export const FIG_TITLES: Record<string, string> = { casa: 'Casa', trenul: 'Trenul', robotul: 'Robotul', racheta: 'Racheta', mașina: 'Mașina' };

/** Two different pictures for a page. */
export function figuresSheet(rand: () => number): FigPicture[] {
  const a = Math.floor(rand() * TEMPLATES.length);
  const b = (a + 1 + Math.floor(rand() * (TEMPLATES.length - 1))) % TEMPLATES.length;
  return [TEMPLATES[a](rand), TEMPLATES[b](rand)];
}

export const countKind = (p: FigPicture, k: FigKind) => p.figs.filter((f) => f.kind === k).length;

const counted = (n: number, k: FigKind) => `${n} ${n === 1 ? FIG_NAMES[k].one : FIG_NAMES[k].many}`;

export function figuresAnswers(pics: FigPicture[]): string[] {
  return pics.map((p, i) => `${String.fromCharCode(97 + i)}) ${FIG_TITLES[p.name]}: ${FIG_KINDS.map((k) => counted(countKind(p, k), k)).join(', ')}`);
}

/** The bounding box of a shape (box units). */
export function figBox(f: Fig): { minX: number; minY: number; maxX: number; maxY: number } {
  if (f.kind === 'circle') return { minX: f.cx - f.r, minY: f.cy - f.r, maxX: f.cx + f.r, maxY: f.cy + f.r };
  if (f.kind === 'tri') return { minX: Math.min(...f.pts.map((p) => p.x)), minY: Math.min(...f.pts.map((p) => p.y)), maxX: Math.max(...f.pts.map((p) => p.x)), maxY: Math.max(...f.pts.map((p) => p.y)) };
  return { minX: f.x, minY: f.y, maxX: f.x + f.w, maxY: f.y + f.h };
}

/** A small outline of a shape, for the table (centred on cx, cy). */
export function figIconOps(k: FigKind, cx: number, cy: number, s: number): DrawOp {
  if (k === 'circle') return { t: 'circle', cx, cy, r: s / 2, fill: PAPER, stroke: INK, strokeWidth: 0.5 };
  if (k === 'tri') return { t: 'polygon', points: [{ x: cx - s / 2, y: cy + s / 2 }, { x: cx + s / 2, y: cy + s / 2 }, { x: cx, y: cy - s / 2 }], fill: PAPER, stroke: INK, strokeWidth: 0.5 };
  const w = k === 'rect' ? s * 1.5 : s;
  const h = k === 'rect' ? s * 0.75 : s;
  return { t: 'rect', x: cx - w / 2, y: cy - h / 2, w, h, fill: PAPER, stroke: INK, strokeWidth: 0.5 };
}

function pictureOps(p: FigPicture, x: number, y: number, size: number): DrawOp[] {
  const k = size / 100;
  return p.figs.map((f): DrawOp => {
    if (f.kind === 'circle') return { t: 'circle', cx: x + f.cx * k, cy: y + f.cy * k, r: f.r * k, fill: f.fill, stroke: INK, strokeWidth: 0.6 };
    if (f.kind === 'tri') return { t: 'polygon', points: f.pts.map((q) => ({ x: x + q.x * k, y: y + q.y * k })), fill: f.fill, stroke: INK, strokeWidth: 0.6 };
    return { t: 'rect', x: x + f.x * k, y: y + f.y * k, w: f.w * k, h: f.h * k, fill: f.fill, stroke: INK, strokeWidth: 0.6 };
  });
}

/** Each picture with its table beside it: the four shapes, their names, a box for the number. */
export function figuresOps(pics: FigPicture[], x0: number, x1: number, top: number, bottom: number): DrawOp[] {
  const ops: DrawOp[] = [];
  const h = (bottom - top) / pics.length;
  pics.forEach((p, i) => {
    const y = top + i * h;
    ops.push({ t: 'rect', x: x0, y: y + 1.5, w: x1 - x0, h: h - 3, rx: 4, fill: '#FBF7EE', stroke: '#E6DECD', strokeWidth: 0.4 });
    ops.push({ t: 'text', x: x0 + 4, y: y + 8.5, text: `${String.fromCharCode(97 + i)}) ${FIG_TITLES[p.name]}`, size: 4.4, fill: INK, weight: 'bold' });
    const size = Math.min(h - 16, 98);
    ops.push({ t: 'rect', x: x0 + 4, y: y + 11, w: size, h: size, rx: 2, fill: PAPER, stroke: '#E6DECD', strokeWidth: 0.3 });
    ops.push(...pictureOps(p, x0 + 4, y + 11, size));
    const tx = x0 + size + 14;
    const rowH = Math.min(18, (h - 18) / 4);
    const ty = y + 11 + (size - 4 * rowH) / 2;
    FIG_KINDS.forEach((kind, r) => {
      const cy = ty + r * rowH + rowH / 2;
      ops.push(figIconOps(kind, tx + 6, cy, 8));
      ops.push({ t: 'text', x: tx + 16, y: cy + 1.6, text: FIG_NAMES[kind].many, size: 4.4, fill: INK, weight: 'bold' });
      ops.push({ t: 'rect', x: x1 - 22, y: cy - 5.5, w: 14, h: 11, rx: 1.6, fill: '#FFFFFF', stroke: INK, strokeWidth: 0.5 });
    });
    ops.push({ t: 'text', x: tx, y: ty - 3, text: 'Câte sunt?', size: 3.6, fill: MUTED, weight: 'bold' });
  });
  return ops;
}
