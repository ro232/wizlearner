import type { DrawOp, PageOps, Pt } from '@/lib/glyphs/types';
import type { Tier, WorksheetConfig } from '@/types';
import { ACCENT, INK, MUTED, PAPER } from './rows';
import type { KeySection } from './answer-key';
import { CELL_STROKE, SOFT, fitSize } from './page-kit';
import { blockAnswers, blockHeight, blockScore, blocksKeySection, buildBlocksPage, drawBlock, exprOps, exprWidth, fractionOps, gridOps, inkText, letterOf, LIGHT, type Block } from './blocks34';
import {
  M34_KINDS, M34_SETS, M34_TITLES, SHAPE_NAMES, SHAPE_WORD, inmColumns, isM34Item, m34Data, m34Fractions, m34Geometry, m34Parts, m34Patterns, m34Perimeter, m34Sheet,
  type AngleKind, type FracFigure, type LineKind, type M34Kind, type PairKind, type PerFigure, type ShapePattern,
} from './m34';

/**
 * The Matematică sheets of clasa a III-a and a IV-a (data in m34.ts): full pages in the „Jocuri” category, made of the
 * blocks of blocks34.ts. The drawings (figures to read, shapes, charts, squares to work on) are added here.
 */

const LEVEL_TAG = { III: 'clasa a III-a', IV: 'clasa a IV-a' } as const;

export const M34_KIND_TITLES = M34_TITLES;

export function m34ShortLabel(item: string): string {
  const [kind, n] = m34Parts(item);
  const levels = M34_SETS[kind];
  const level = levels[n - 1];
  const sameClass = levels.filter((l) => l === level).length;
  const k = levels.slice(0, n).filter((l) => l === level).length;
  return sameClass > 1 ? `${LEVEL_TAG[level]} (${k})` : LEVEL_TAG[level];
}

export function m34Label(item: string): string {
  const [kind] = m34Parts(item);
  return `${M34_TITLES[kind]}, ${m34ShortLabel(item)}`;
}

// ───────────────────────── drawings ─────────────────────────

const FILL = '#CFE6FB';
const STROKE = INK;

/** A figure divided into equal parts, `shaded` of them coloured, in a box of w × h centred at (cx, cy). */
export function fracFigureOps(fig: FracFigure, cx: number, cy: number, size: number, shade = true): DrawOp[] {
  const ops: DrawOp[] = [];
  const k = shade ? fig.shaded : 0;
  if (fig.shape === 'circle') {
    const r = size / 2;
    for (let i = 0; i < fig.parts; i++) {
      const a0 = -Math.PI / 2 + (i * 2 * Math.PI) / fig.parts;
      const a1 = a0 + (2 * Math.PI) / fig.parts;
      const steps = Math.max(3, Math.ceil(24 / fig.parts));
      const pts: Pt[] = [{ x: cx, y: cy }];
      for (let s = 0; s <= steps; s++) {
        const a = a0 + ((a1 - a0) * s) / steps;
        pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
      }
      ops.push({ t: 'polygon', points: pts, fill: i < k ? FILL : PAPER, stroke: STROKE, strokeWidth: 0.4 });
    }
    return ops;
  }
  if (fig.shape === 'bar') {
    const w = size * 1.5, h = size * 0.42;
    const pw = w / fig.parts;
    for (let i = 0; i < fig.parts; i++) ops.push({ t: 'rect', x: cx - w / 2 + i * pw, y: cy - h / 2, w: pw, h, fill: i < k ? FILL : PAPER, stroke: STROKE, strokeWidth: 0.4 });
    return ops;
  }
  // 10 × 10 squares, the shaded ones by rows
  const c = size / 10;
  for (let i = 0; i < 100; i++) {
    const row = Math.floor(i / 10), col = i % 10;
    ops.push({ t: 'rect', x: cx - size / 2 + col * c, y: cy - size / 2 + row * c, w: c, h: c, fill: i < k ? FILL : PAPER, stroke: '#7A8CA5', strokeWidth: 0.18 });
  }
  ops.push({ t: 'rect', x: cx - size / 2, y: cy - size / 2, w: size, h: size, stroke: STROKE, strokeWidth: 0.45 });
  return ops;
}

/** An empty fraction to write: two boxes over a bar. */
function fracBoxOps(cx: number, top: number): DrawOp[] {
  return [
    { t: 'rect', x: cx - 4.5, y: top, w: 9, h: 6.4, rx: 1.2, fill: PAPER, stroke: INK, strokeWidth: 0.45 },
    { t: 'line', x1: cx - 5.5, y1: top + 7.6, x2: cx + 5.5, y2: top + 7.6, stroke: INK, strokeWidth: 0.5 },
    { t: 'rect', x: cx - 4.5, y: top + 8.8, w: 9, h: 6.4, rx: 1.2, fill: PAPER, stroke: INK, strokeWidth: 0.45 },
  ];
}

function tileLabel(ops: DrawOp[], i: number, x: number, y: number): void {
  ops.push({ t: 'text', x, y, text: letterOf(i), size: 3.5, fill: MUTED, weight: 'bold' });
}

/** A polygon with its sides labelled (the lengths in cm), in a box of w × h at (x, y). */
function perFigureOps(p: PerFigure, x: number, y: number, w: number, h: number): DrawOp[] {
  const ops: DrawOp[] = [];
  const cx = x + w / 2, cy = y + h / 2;
  const lab = (t: string, px: number, py: number, align: 'left' | 'center' | 'right' = 'center') => ops.push({ t: 'text', x: px, y: py, text: t, size: 3.6, fill: INK, weight: 'bold', align });
  const u = p.unit;
  let pts: Pt[];
  if (p.shape === 'square') {
    const s = Math.min(w, h) * 0.62;
    pts = [{ x: cx - s / 2, y: cy - s / 2 }, { x: cx + s / 2, y: cy - s / 2 }, { x: cx + s / 2, y: cy + s / 2 }, { x: cx - s / 2, y: cy + s / 2 }];
    lab(`${p.sides[0]} ${u}`, cx, cy - s / 2 - 1.8);
    lab(`${p.sides[0]} ${u}`, cx + s / 2 + 1.5, cy + 1.2, 'left');
  } else if (p.shape === 'rectangle' || p.shape === 'parallelogram') {
    const L = w * 0.7, l = Math.min(h * 0.6, (L * p.sides[1]) / p.sides[0]);
    const skew = p.shape === 'parallelogram' ? l * 0.45 : 0;
    pts = [{ x: cx - L / 2 + skew / 2, y: cy - l / 2 }, { x: cx + L / 2 + skew / 2, y: cy - l / 2 }, { x: cx + L / 2 - skew / 2, y: cy + l / 2 }, { x: cx - L / 2 - skew / 2, y: cy + l / 2 }];
    lab(`${p.sides[0]} ${u}`, cx + skew / 2, cy - l / 2 - 1.8);
    lab(`${p.sides[1]} ${u}`, cx + L / 2 + 1.5, cy + 1.2, 'left');
  } else if (p.shape === 'rhombus') {
    // clearly not a square: the diagonals 1.7 : 1
    const a = Math.min(w / 1.7, h) * 0.45;
    pts = [{ x: cx, y: cy - a }, { x: cx + a * 1.7, y: cy }, { x: cx, y: cy + a }, { x: cx - a * 1.7, y: cy }];
    lab(`${p.sides[0]} ${u}`, cx + a * 0.75, cy - a / 2 - 1.5, 'left');
  } else {
    // a triangle drawn with its three sides labelled
    const [a, b, c] = p.sides;
    const base = w * 0.62;
    // the apex where the two other sides meet (to scale)
    const k = base / a;
    const bx = (a * a + b * b - c * c) / (2 * a);
    const hy = Math.sqrt(Math.max(1, b * b - bx * bx));
    const scale = Math.min(k, (h * 0.68) / hy);
    const x0 = cx - (a * scale) / 2, y0 = cy + (hy * scale) / 2;
    pts = [{ x: x0, y: y0 }, { x: x0 + a * scale, y: y0 }, { x: x0 + bx * scale, y: y0 - hy * scale }];
    lab(`${a} ${u}`, cx, y0 + 4.6);
    lab(`${b} ${u}`, (pts[0].x + pts[2].x) / 2 - 1.5, (pts[0].y + pts[2].y) / 2, 'right');
    lab(`${c} ${u}`, (pts[1].x + pts[2].x) / 2 + 1.5, (pts[1].y + pts[2].y) / 2, 'left');
  }
  ops.unshift({ t: 'polygon', points: pts, fill: FILL, stroke: STROKE, strokeWidth: 0.5 });
  return ops;
}

function lineTileOps(kind: LineKind, x: number, cy: number, w: number): DrawOp[] {
  const ops: DrawOp[] = [];
  const dot = (px: number, py: number, name: string) => {
    ops.push({ t: 'circle', cx: px, cy: py, r: 0.9, fill: INK });
    ops.push({ t: 'text', x: px, y: py - 2.2, text: name, size: 3.2, fill: INK, weight: 'bold', align: 'center' });
  };
  const x0 = x + 3, x1 = x + w - 3;
  switch (kind) {
    case 'dreaptă':
      ops.push({ t: 'line', x1: x0 - 2, y1: cy + 3, x2: x1 + 2, y2: cy - 3, stroke: INK, strokeWidth: 0.5 });
      ops.push({ t: 'text', x: x1 - 2, y: cy - 4.5, text: 'd', size: 3.2, fill: INK, weight: 'bold', align: 'center' });
      break;
    case 'semidreaptă':
      ops.push({ t: 'line', x1: x0 + 2, y1: cy + 2, x2: x1 + 2, y2: cy - 3, stroke: INK, strokeWidth: 0.5 });
      dot(x0 + 2, cy + 2, 'O');
      break;
    case 'segment':
      ops.push({ t: 'line', x1: x0 + 2, y1: cy + 2, x2: x1 - 2, y2: cy - 2, stroke: INK, strokeWidth: 0.5 });
      dot(x0 + 2, cy + 2, 'A');
      dot(x1 - 2, cy - 2, 'B');
      break;
    case 'linie frântă': {
      const n = 4, step = (x1 - x0) / n;
      for (let i = 0; i < n; i++) ops.push({ t: 'line', x1: x0 + i * step, y1: cy + (i % 2 ? -3 : 3), x2: x0 + (i + 1) * step, y2: cy + (i % 2 ? 3 : -3), stroke: INK, strokeWidth: 0.5 });
      break;
    }
    case 'linie curbă':
      ops.push({ t: 'path', subpaths: [{ start: { x: x0, y: cy + 2 }, segs: [{ kind: 'C', c1: { x: x0 + (x1 - x0) * 0.3, y: cy - 8 }, c2: { x: x0 + (x1 - x0) * 0.6, y: cy + 8 }, p: { x: x1, y: cy - 2 } }] }], stroke: INK, strokeWidth: 0.5 });
      break;
    case 'punct':
      dot((x0 + x1) / 2, cy + 1.5, 'A');
      break;
  }
  return ops;
}

/** An angle of `deg` degrees with its vertex at (vx, vy), the first side turned `turn` degrees. */
function angleOps(deg: number, turn: number, cx: number, cy: number, len: number): DrawOp[] {
  const rad = (d: number) => (d * Math.PI) / 180;
  const a0 = rad(turn), a1 = rad(turn + deg);
  // centre the drawing on the tile: vertex moved so the two arms' middle is at the centre
  const mx = (Math.cos(a0) + Math.cos(a1)) / 2, my = (Math.sin(a0) + Math.sin(a1)) / 2;
  const vx = cx - (mx * len) / 2, vy = cy + (my * len) / 2;
  return [
    { t: 'line', x1: vx, y1: vy, x2: vx + len * Math.cos(a0), y2: vy - len * Math.sin(a0), stroke: INK, strokeWidth: 0.6 },
    { t: 'line', x1: vx, y1: vy, x2: vx + len * Math.cos(a1), y2: vy - len * Math.sin(a1), stroke: INK, strokeWidth: 0.6 },
    { t: 'circle', cx: vx, cy: vy, r: 0.7, fill: INK },
  ];
}

function pairOps(kind: PairKind, turn: number, cx: number, cy: number, len: number): DrawOp[] {
  const rad = (d: number) => (d * Math.PI) / 180;
  const line = (ang: number, ox: number, oy: number): DrawOp => ({ t: 'line', x1: ox - (len / 2) * Math.cos(rad(ang)), y1: oy + (len / 2) * Math.sin(rad(ang)), x2: ox + (len / 2) * Math.cos(rad(ang)), y2: oy - (len / 2) * Math.sin(rad(ang)), stroke: INK, strokeWidth: 0.6 });
  if (kind === 'paralele') {
    const n = rad(turn + 90);
    return [line(turn, cx + 3.5 * Math.cos(n), cy - 3.5 * Math.sin(n)), line(turn, cx - 3.5 * Math.cos(n), cy + 3.5 * Math.sin(n))];
  }
  return [line(turn, cx, cy), line(turn + (kind === 'perpendiculare' ? 90 : 55), cx, cy)];
}

function shapeOps(s: ShapePattern['unit'][number], cx: number, cy: number, r: number): DrawOp {
  if (s === 'circle') return { t: 'circle', cx, cy, r, fill: FILL, stroke: INK, strokeWidth: 0.45 };
  if (s === 'square') return { t: 'rect', x: cx - r, y: cy - r, w: 2 * r, h: 2 * r, fill: '#FDE68A', stroke: INK, strokeWidth: 0.45 };
  if (s === 'triangle') return { t: 'polygon', points: [{ x: cx, y: cy - r }, { x: cx + r, y: cy + r * 0.8 }, { x: cx - r, y: cy + r * 0.8 }], fill: '#BBF7D0', stroke: INK, strokeWidth: 0.45 };
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    pts.push({ x: cx + rr * Math.cos(a), y: cy + rr * Math.sin(a) });
  }
  return { t: 'polygon', points: pts, fill: '#FBCFE8', stroke: INK, strokeWidth: 0.45 };
}

/** The pills to circle under a tile. */
function picksUnder(ops: DrawOp[], options: string[], cx: number, y: number, maxW: number): void {
  const size = 3.6;
  const width = Math.min(maxW, exprWidth([{ pick: options }], size));
  exprOps(ops, [{ pick: options }], cx - width / 2, y, size, maxW);
}

/** The drawing of each „draw” block of an item, in order. */
function drawingsFor(item: string): ((ops: DrawOp[], x: number, y: number, w: number, h: number) => void)[] {
  const [kind, n] = m34Parts(item);
  switch (kind) {
    case 'inm': {
      const cols = inmColumns(n);
      return [(ops, x, y, w, h) => {
        const cw = w / cols.length;
        cols.forEach((c, i) => {
          const cx = x + i * cw;
          tileLabel(ops, i, cx, y + 4.5);
          inkText(ops, c.text, cx + 6, y + 4.8, 4.2, INK, 'bold');
          gridOps(ops, cx + 1, y + 8, cw - 4, h - 9);
        });
      }];
    }
    case 'fr': {
      const s = m34Fractions(n);
      if (n === 1) {
        return [
          (ops, x, y, w) => {
            const cw = w / s.figures.length;
            s.figures.forEach((fig, i) => {
              const cx = x + i * cw + cw / 2;
              tileLabel(ops, i, x + i * cw, y + 4);
              ops.push(...fracFigureOps(fig, cx, y + 16, Math.min(22, cw - 8)));
              ops.push(...fracBoxOps(cx, y + 31));
            });
          },
          (ops, x, y, w) => {
            const cw = w / s.color.length;
            s.color.forEach((fig, i) => {
              const cx = x + i * cw + cw * 0.38;
              tileLabel(ops, i, x + i * cw, y + 4);
              ops.push(...fracFigureOps(fig, cx, y + 15, 22, false));
              ops.push(...fractionOps(fig.shaded, fig.parts, x + i * cw + cw * 0.82, y + 15, 5.2));
            });
          },
        ];
      }
      if (n === 4) {
        return [(ops, x, y, w) => {
          const cw = w / s.figures.length;
          s.figures.forEach((fig, i) => {
            const cx = x + i * cw + cw * 0.4;
            tileLabel(ops, i, x + i * cw, y + 4);
            ops.push(...fracFigureOps(fig, cx, y + 20, 36));
            ops.push(...fracBoxOps(x + i * cw + cw * 0.84, y + 12));
          });
        }];
      }
      return [];
    }
    case 'per': {
      const s = m34Perimeter(n);
      const figures = (ops: DrawOp[], x: number, y: number, w: number, h: number) => {
        const cw = w / s.figures.length;
        s.figures.forEach((p, i) => {
          tileLabel(ops, i, x + i * cw, y + 4);
          ops.push(...perFigureOps(p, x + i * cw + 4, y + 3, cw - 8, h - 17));
          const label = `${SHAPE_NAMES[p.shape]}: P =`;
          ops.push({ t: 'text', x: x + i * cw + 4, y: y + h - 4, text: label, size: 3.8, fill: INK });
          ops.push({ t: 'line', x1: x + i * cw + 6 + label.length * 1.9, y1: y + h - 3.4, x2: x + (i + 1) * cw - 4, y2: y + h - 3.4, stroke: INK, strokeWidth: 0.3, dash: [0.8, 0.8] });
        });
      };
      if (n === 1) return [figures];
      return [figures, (ops, x, y, w, h) => {
        const cw = w / s.areas.length;
        const cell = 10;
        s.areas.forEach((a, i) => {
          const gx = x + i * cw + 6, gy = y + 2;
          tileLabel(ops, i, x + i * cw, y + 4);
          const cols = 5, rows = 3;
          for (let r = 0; r <= rows; r++) ops.push({ t: 'line', x1: gx, y1: gy + r * cell, x2: gx + cols * cell, y2: gy + r * cell, stroke: '#C9D6E6', strokeWidth: 0.2 });
          for (let c = 0; c <= cols; c++) ops.push({ t: 'line', x1: gx + c * cell, y1: gy, x2: gx + c * cell, y2: gy + rows * cell, stroke: '#C9D6E6', strokeWidth: 0.2 });
          for (const [cx, cy] of a.cells) ops.push({ t: 'rect', x: gx + cx * cell, y: gy + cy * cell, w: cell, h: cell, fill: FILL, stroke: INK, strokeWidth: 0.4 });
          ops.push({ t: 'text', x: gx, y: y + h - 3, text: 'Aria =', size: 3.8, fill: INK });
          ops.push({ t: 'rect', x: gx + 13, y: y + h - 8.4, w: 13, h: 7, rx: 1.2, fill: PAPER, stroke: INK, strokeWidth: 0.45 });
          ops.push({ t: 'text', x: gx + 28, y: y + h - 3, text: 'cm²', size: 3.8, fill: INK });
        });
      }];
    }
    case 'geo': {
      const s = m34Geometry(n);
      if (n === 1) {
        return [
          (ops, x, y, w, h) => {
            const cw = w / s.lines.length;
            s.lines.forEach((l, i) => {
              tileLabel(ops, i, x + i * cw, y + 4);
              ops.push({ t: 'rect', x: x + i * cw + 1, y: y + 6, w: cw - 2, h: h - 18, rx: 2, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.4 });
              ops.push(...lineTileOps(l, x + i * cw + 3, y + 6 + (h - 18) / 2 + 1, cw - 6));
              ops.push({ t: 'line', x1: x + i * cw + 2, y1: y + h - 3, x2: x + (i + 1) * cw - 2, y2: y + h - 3, stroke: INK, strokeWidth: 0.3, dash: [0.8, 0.8] });
            });
          },
          (ops, x, y, w, h) => {
            const cw = w / s.polygons.length;
            s.polygons.forEach((p, i) => {
              tileLabel(ops, i, x + i * cw, y + 4);
              const fig: PerFigure = p === 'triangle' ? { shape: 'triangle', sides: [6, 5, 5], unit: 'cm' } : p === 'square' ? { shape: 'square', sides: [4], unit: 'cm' } : { shape: 'rectangle', sides: [7, 4], unit: 'cm' };
              const cx = x + i * cw;
              // the figure without lengths: only the shape matters here
              const drawn = perFigureOps(fig, cx + 4, y + 1, cw * 0.38, h - 2).filter((o) => o.t !== 'text');
              ops.push(...drawn);
              ['laturi', 'vârfuri', 'unghiuri'].forEach((wd, k) => {
                ops.push({ t: 'text', x: cx + cw * 0.44, y: y + 10 + k * 11, text: wd, size: 3.4, fill: INK });
                ops.push({ t: 'rect', x: cx + cw - 13, y: y + 5 + k * 11, w: 10, h: 7, rx: 1.2, fill: PAPER, stroke: INK, strokeWidth: 0.45 });
              });
            });
          },
          (ops, x, y, w, h) => {
            const cw = w / s.angles.length;
            s.angles.forEach((a, i) => {
              tileLabel(ops, i, x + i * cw, y + 4);
              ops.push(...angleOps(a.deg, a.turn, x + i * cw + cw / 2, y + h / 2 + 1, Math.min(18, cw - 10)));
            });
          },
        ];
      }
      const ANG: AngleKind[] = ['drept', 'ascuțit', 'obtuz'];
      const PAIRS: PairKind[] = ['paralele', 'perpendiculare', 'concurente'];
      return [
        (ops, x, y, w, h) => {
          const cw = w / 3, rh = h / 2;
          s.angles.forEach((a, i) => {
            const col = i % 3, row = Math.floor(i / 3);
            const tx = x + col * cw, ty = y + row * rh;
            tileLabel(ops, i, tx, ty + 4);
            ops.push(...angleOps(a.deg, a.turn, tx + cw / 2, ty + (rh - 9) / 2 + 1, Math.min(14, rh - 14)));
            picksUnder(ops, ANG, tx + cw / 2, ty + rh - 4.5, cw - 6);
          });
        },
        (ops, x, y, w) => {
          const cw = w / s.pairs.length;
          s.pairs.forEach((p, i) => {
            tileLabel(ops, i, x + i * cw, y + 4);
            ops.push(...pairOps(p.kind, p.turn, x + i * cw + cw / 2, y + 14, Math.min(22, cw - 8)));
            PAIRS.forEach((o, k) => {
              const py = y + 28 + k * 4.2;
              ops.push({ t: 'text', x: x + i * cw + cw / 2, y: py, text: o, size: 3.2, fill: INK, align: 'center' });
            });
          });
        },
        (ops, x, y, w, h) => {
          const cw = w / s.polygons.length;
          s.polygons.forEach((p, i) => {
            tileLabel(ops, i, x + i * cw, y + 4);
            const sides = p === 'triangle' ? [6, 5, 4] : p === 'square' || p === 'rhombus' ? [4] : [7, 4];
            ops.push(...perFigureOps({ shape: p, sides, unit: 'cm' }, x + i * cw + 3, y + 2, cw - 6, h - 12).filter((o) => o.t !== 'text'));
            ops.push({ t: 'line', x1: x + i * cw + 3, y1: y + h - 3, x2: x + (i + 1) * cw - 3, y2: y + h - 3, stroke: INK, strokeWidth: 0.3, dash: [0.8, 0.8] });
          });
        },
      ];
    }
    case 'date': {
      const s = m34Data(n);
      const axes = (ops: DrawOp[], gx: number, gy: number, gw: number, gh: number, max: number, step: number, labels: string[]) => {
        const rows = max / step;
        for (let r = 0; r <= rows; r++) {
          const ly = gy + gh - (r * gh) / rows;
          ops.push({ t: 'line', x1: gx, y1: ly, x2: gx + gw, y2: ly, stroke: r ? '#D7E0EC' : INK, strokeWidth: r ? 0.2 : 0.5 });
          ops.push({ t: 'text', x: gx - 1.8, y: ly + 1.2, text: String(r * step), size: 3, fill: MUTED, align: 'right' });
        }
        ops.push({ t: 'line', x1: gx, y1: gy - 2, x2: gx, y2: gy + gh, stroke: INK, strokeWidth: 0.5 });
        const cw = gw / labels.length;
        labels.forEach((l, i) => ops.push({ t: 'text', x: gx + i * cw + cw / 2, y: gy + gh + 4.6, text: l, size: fitSize(l, 3.4, cw - 1), fill: INK, align: 'center' }));
        return cw;
      };
      if (n === 1) {
        return [(ops, x, y, w, h) => {
          // the table on the left, the empty chart on the right
          const tw = 54, rh = 8;
          ops.push({ t: 'rect', x, y: y + 2, w: tw, h: rh * (s.labels.length + 1), rx: 1.5, fill: PAPER, stroke: INK, strokeWidth: 0.45 });
          ops.push({ t: 'text', x: x + 3, y: y + 7.6, text: 'Copilul', size: 3.6, fill: INK, weight: 'bold' });
          ops.push({ t: 'text', x: x + tw - 3, y: y + 7.6, text: 'Cărți', size: 3.6, fill: INK, weight: 'bold', align: 'right' });
          s.labels.forEach((l, i) => {
            const ry = y + 2 + (i + 1) * rh;
            ops.push({ t: 'line', x1: x, y1: ry, x2: x + tw, y2: ry, stroke: i ? CELL_STROKE : INK, strokeWidth: 0.35 });
            ops.push({ t: 'text', x: x + 3, y: ry + 5.6, text: l, size: 3.8, fill: INK });
            ops.push({ t: 'text', x: x + tw - 5, y: ry + 5.6, text: String(s.values[i]), size: 3.8, fill: INK, weight: 'bold', align: 'right' });
          });
          ops.push({ t: 'line', x1: x + tw - 16, y1: y + 2, x2: x + tw - 16, y2: y + 2 + rh * (s.labels.length + 1), stroke: INK, strokeWidth: 0.35 });
          const gx = x + tw + 16, gw = w - tw - 18, gy = y + 4, gh = h - 14;
          const cw = axes(ops, gx, gy, gw, gh, 10, 1, s.labels);
          // light squares inside each column, to colour
          s.labels.forEach((_, i) => ops.push({ t: 'rect', x: gx + i * cw + cw * 0.25, y: gy, w: cw * 0.5, h: gh, stroke: '#E2E8F0', strokeWidth: 0.25, dash: [0.8, 0.8] }));
        }];
      }
      return [
        (ops, x, y, w, h) => {
          const gx = x + 14, gw = w - 20, gy = y + 3, gh = h - 12;
          const cw = axes(ops, gx, gy, gw, gh, 100, 10, s.labels);
          s.values.forEach((v, i) => ops.push({ t: 'rect', x: gx + i * cw + cw * 0.22, y: gy + gh - (v / 100) * gh, w: cw * 0.56, h: (v / 100) * gh, fill: FILL, stroke: INK, strokeWidth: 0.45 }));
        },
        (ops, x, y, w, h) => {
          const line = s.line!;
          const gx = x + 14, gw = w - 20, gy = y + 3, gh = h - 12;
          const max = Math.max(10, Math.ceil(Math.max(...line.values) / 2) * 2 + 2);
          const cw = axes(ops, gx, gy, gw, gh, max, 2, line.labels);
          const pts = line.values.map((v, i) => ({ x: gx + i * cw + cw / 2, y: gy + gh - (v / max) * gh }));
          for (let i = 1; i < pts.length; i++) ops.push({ t: 'line', x1: pts[i - 1].x, y1: pts[i - 1].y, x2: pts[i].x, y2: pts[i].y, stroke: ACCENT, strokeWidth: 0.7 });
          for (const p of pts) ops.push({ t: 'circle', cx: p.x, cy: p.y, r: 1.1, fill: ACCENT });
        },
      ];
    }
    case 'sir': {
      const s = m34Patterns(n);
      if (n !== 1) return [];
      return [(ops, x, y, w, h) => {
        const rh = h / s.shapes.length;
        s.shapes.forEach((sp, i) => {
          const cy = y + i * rh + rh / 2;
          tileLabel(ops, i, x, cy + 1.3);
          const step = 12;
          for (let k = 0; k < sp.shown; k++) ops.push(shapeOps(sp.unit[k % sp.unit.length], x + 12 + k * step, cy, 4.2));
          for (let k = 0; k < 2; k++) ops.push({ t: 'rect', x: x + 12 + (sp.shown + k) * step - 5.5, y: cy - 5.5, w: 11, h: 11, rx: 1.5, stroke: LIGHT, strokeWidth: 0.4, dash: [1, 1] });
        });
      }];
    }
    default:
      return [];
  }
}

/** The blocks of an item, with their drawings. */
export function m34Blocks(item: string): Block[] {
  const sheet = m34Sheet(item);
  const draws = drawingsFor(item);
  let k = 0;
  return sheet.blocks.map((b) => (b.t === 'draw' ? { ...b, draw: draws[k++] ?? b.draw } : b));
}

// ───────────────────────── page, answers, evaluation ─────────────────────────

export function buildM34Page(config: WorksheetConfig, item: string, tier: Tier): PageOps | null {
  if (!isM34Item(item)) return null;
  const sheet = m34Sheet(item);
  return buildBlocksPage(config, tier, { title: sheet.title, instruction: sheet.instruction, help: sheet.help, blocks: m34Blocks(item), note: sheet.note });
}

export function m34KeySection(item: string): KeySection | null {
  if (!isM34Item(item)) return null;
  return blocksKeySection(m34Label(item), m34Sheet(item).blocks);
}

/** The block an evaluation takes from each item (the first task with exercises of its own, trimmed to fit). */
export interface M34EvalBlock {
  item: string;
  title: string;
  prompt: string;
  height: number;
  grow: number;
  draw: (ops: DrawOp[], a: { x: number; y: number; w: number; h: number }) => void;
  answers: string[];
  perLine: number;
  score: number;
}

/** Which task of each kind an evaluation uses, and how many of its exercises. */
const EVAL_PICK: Partial<Record<M34Kind, { block: number; take: number }>> = {
  nr: { block: 0, take: 2 }, rom: { block: 0, take: 4 }, rot: { block: 1, take: 3 }, ops: { block: 1, take: 4 }, inm: { block: 0, take: 3 },
  fr: { block: 2, take: 3 }, mas: { block: 1, take: 4 }, prob: { block: 0, take: 1 }, per: { block: 0, take: 3 }, sir: { block: 0, take: 2 },
};

export function m34EvalBlock(item: string, w: number): M34EvalBlock | null {
  if (!isM34Item(item)) return null;
  const [kind] = m34Parts(item);
  const pick = EVAL_PICK[kind];
  if (!pick) return null;
  const blocks = m34Blocks(item);
  let b = blocks[pick.block];
  if (!b) return null;
  if ((b.t === 'fill' || b.t === 'choice' || b.t === 'expr') && b.items.length > pick.take) b = { ...b, items: b.items.slice(0, pick.take) } as Block;
  if (b.t === 'write') b = { ...b, rows: Math.min(typeof b.rows === 'number' ? b.rows : 6, 7) };
  const heading = 'heading' in b ? b.heading ?? '' : '';
  // a problem: its text stays in the body, the heading says what to do
  const prompt = b.t === 'write' ? 'Rezolvă problema.' : heading;
  const body = b.t === 'write' ? { ...b, heading: undefined } : ({ ...b, heading: '' } as Block);
  const answers = blockAnswers(b);
  const height = blockHeight(body, w);
  return {
    item,
    title: m34Sheet(item).title,
    prompt,
    height,
    grow: 6,
    draw: (ops, a) => drawBlock(ops, body, a.x, a.y, a.w, a.h, false),
    answers,
    perLine: Math.max(...answers.map((x) => x.length)) > 40 ? 1 : 2,
    score: Math.max(1, b.t === 'write' ? 1 : blockScore(b)),
  };
}

export function m34Items(): string[] {
  return M34_KINDS.flatMap((k) => M34_SETS[k].map((_, i) => `${k}:${i + 1}`));
}

export type { LineKind, FracFigure };
export { SHAPE_WORD };
