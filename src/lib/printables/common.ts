import type { DrawOp, Glyph, PageOps } from '@/lib/glyphs/types';
import type { Tier } from '@/types';
import { renderGlyph, glyphBounds, type TraceVariant } from '@/lib/glyphs/render';
import { iconOps } from '@/lib/hints/icons';
import { madeWith } from '@/lib/brand';
import { INK, ACCENT, PAPER, MUTED, starPoints } from '@/lib/worksheet/rows';
import { textRoom } from '@/lib/worksheet/page-kit';

/**
 * What the classroom printables („Planșe pentru clasă”: the alphabet on the wall, cards, tokens,
 * diplomas, the timetable) share: page sizes, colours, borders, the cut lines and the way a few
 * vector letters (the same glyphs as the tracing sheets) are set on a page. Millimetres throughout.
 */

export const A4 = { w: 210, h: 297 } as const;
export const A4_LANDSCAPE = { w: 297, h: 210 } as const;

export { INK, ACCENT, PAPER, MUTED };

/** Bright colours that still print well on an office printer (one per letter, by its place in the alphabet). */
export const PALETTE = ['#D7263D', '#1B6CA8', '#2E9E5B', '#E8913A', '#7B4B94', '#0E8A8A', '#C2410C', '#3A5BC7', '#B5367A', '#5B8C1A'] as const;
export const GOLD = '#C9A227';
export const GOLD_LIGHT = '#F3E3A0';
/** Vowels red, consonants blue: the colours of the Romanian primer. */
export const VOWEL = '#D7263D';
export const CONSONANT = '#1B6CA8';
export const CUT = '#7C8796';

export type BorderStyle = 'simple' | 'dots' | 'none';
export type InkMode = 'color' | 'outline';

export const colorAt = (i: number): string => PALETTE[((i % PALETTE.length) + PALETTE.length) % PALETTE.length];

/** The small „Creat cu …” line of the free pages (src/lib/brand.ts), inside the printable area. */
export function freeMark(ops: DrawOp[], tier: Tier, page: { w: number; h: number }, x = page.w - 14, y = page.h - 12): void {
  if (tier === 'free') ops.push({ t: 'text', x, y, text: madeWith('ro'), size: 2.6, fill: '#94a3b8', align: 'right' });
}

/** A frame around the page: a double line, a ring of coloured dots, or nothing. */
export function pageBorder(ops: DrawOp[], style: BorderStyle, page: { w: number; h: number }, color: string, ink: InkMode = 'color', inset = 8): void {
  const { w, h } = page;
  if (style === 'none') return;
  if (style === 'simple') {
    ops.push({ t: 'rect', x: inset, y: inset, w: w - 2 * inset, h: h - 2 * inset, rx: 6, stroke: ink === 'outline' ? INK : color, strokeWidth: 1.4 });
    ops.push({ t: 'rect', x: inset + 3, y: inset + 3, w: w - 2 * inset - 6, h: h - 2 * inset - 6, rx: 4, stroke: ink === 'outline' ? INK : color, strokeWidth: 0.35 });
    return;
  }
  // dots: an even ring of circles, the corners included, each a colour of the palette
  const r = 2.3;
  const x0 = inset + r, y0 = inset + r, x1 = w - inset - r, y1 = h - inset - r;
  const along = (len: number) => Math.max(2, Math.round(len / 8.5));
  const pts: { x: number; y: number }[] = [];
  const nx = along(x1 - x0), ny = along(y1 - y0);
  for (let i = 0; i < nx; i++) pts.push({ x: x0 + ((x1 - x0) * i) / nx, y: y0 });
  for (let i = 0; i < ny; i++) pts.push({ x: x1, y: y0 + ((y1 - y0) * i) / ny });
  for (let i = 0; i < nx; i++) pts.push({ x: x1 - ((x1 - x0) * i) / nx, y: y1 });
  for (let i = 0; i < ny; i++) pts.push({ x: x0, y: y1 - ((y1 - y0) * i) / ny });
  pts.forEach((p, i) => {
    ops.push(ink === 'outline'
      ? { t: 'circle', cx: p.x, cy: p.y, r, stroke: INK, strokeWidth: 0.35 }
      : { t: 'circle', cx: p.x, cy: p.y, r, fill: colorAt(i) });
  });
}

/** A five-pointed star (filled, or only its outline to colour in). */
export function star(cx: number, cy: number, r: number, fill: string | null, stroke = '#B7791F', strokeWidth = 0.5): DrawOp {
  return { t: 'polygon', points: starPoints(cx, cy, r), ...(fill ? { fill } : {}), stroke, strokeWidth };
}

/**
 * A picture (Twemoji, as vector shapes) centred on (cx, cy). In the ink-saving mode every shape is
 * drawn white with a dark outline, in the picture's own order: the upper shapes hide the lines
 * under them, so what is left is a clean drawing to colour in.
 */
export function pictureOps(emoji: string, cx: number, cy: number, size: number, ink: InkMode = 'color'): DrawOp[] {
  const ops = iconOps(emoji, cx, cy, size);
  if (ink === 'color') return ops;
  return ops.map((op) => {
    if (op.t !== 'group') return op;
    const width = 0.45 / op.scale; // 0.45 mm on paper, in the picture's own units
    return { ...op, ops: op.ops.map((o) => (o.t === 'path' ? { ...o, fill: PAPER, stroke: INK, strokeWidth: width } : o)) };
  });
}

// ───────────────────────── letters set with the glyph engine ─────────────────────────

export interface RunStyle {
  variant: TraceVariant;
  /** Pen width in glyph units (cap height 100). */
  stroke: number;
  /** One colour for the whole run, or one per glyph. */
  colors: string | string[];
  /** Numbered start dots and arrows (the order of the strokes). */
  strokeOrder?: boolean;
}

/** Room between two glyphs of a run, in glyph units. */
export const RUN_GAP = 16;

/** Width of a run of glyphs in glyph units, stroke included. */
export function runWidth(glyphs: Glyph[], stroke: number, gap = RUN_GAP): number {
  if (!glyphs.length) return 0;
  return glyphs.reduce((acc, g, i) => acc + (g.bbox.maxX - g.bbox.minX) + (i ? gap : 0), 0) + stroke;
}

/** Highest and lowest ink of a run, in glyph units (0 = cap line, 100 = baseline). */
export function runExtent(glyphs: Glyph[], stroke: number): { top: number; bottom: number } {
  let top = 0, bottom = 100;
  for (const g of glyphs) {
    const b = glyphBounds(g, stroke);
    top = Math.min(top, b.minY);
    bottom = Math.max(bottom, b.maxY);
  }
  return { top, bottom };
}

/** Draw a run of glyphs centred on cx, sitting on `baseline`, `s` mm per glyph unit. Returns its width in mm. */
export function drawRun(ops: DrawOp[], glyphs: Glyph[], cx: number, baseline: number, s: number, st: RunStyle, gap = RUN_GAP): number {
  const width = runWidth(glyphs, st.stroke, gap) * s;
  let x = cx - width / 2 + (st.stroke / 2) * s;
  glyphs.forEach((g, i) => {
    const color = Array.isArray(st.colors) ? st.colors[i] ?? st.colors[0] : st.colors;
    ops.push({
      t: 'group',
      tx: x - g.bbox.minX * s,
      ty: baseline - 100 * s,
      scale: s,
      ops: renderGlyph(g, {
        color,
        strokeWidth: st.stroke,
        variant: st.variant,
        startDots: !!st.strokeOrder,
        arrows: !!st.strokeOrder,
        accent: ACCENT,
        dotText: PAPER,
        paper: PAPER,
      }),
    });
    x += (g.bbox.maxX - g.bbox.minX + gap) * s;
  });
  return width;
}

/** The largest scale (mm per unit) at which every run fits a box w × h mm. */
export function fitScale(runs: Glyph[][], stroke: number, w: number, h: number, max = Infinity, gap = RUN_GAP): number {
  let s = max;
  for (const r of runs) {
    if (!r.length) continue;
    const e = runExtent(r, stroke);
    s = Math.min(s, w / runWidth(r, stroke, gap), h / (e.bottom - e.top));
  }
  return s;
}

// ───────────────────────── cut lines ─────────────────────────

export interface Grid {
  x: number;
  y: number;
  cols: number;
  rows: number;
  cw: number;
  ch: number;
}

/** Top-left corner of cell `i` (row by row). */
export function cellAt(g: Grid, i: number): { x: number; y: number; row: number; col: number } {
  const row = Math.floor(i / g.cols), col = i % g.cols;
  return { x: g.x + col * g.cw, y: g.y + row * g.ch, row, col };
}

/** The same cell on the back of the sheet, printed both sides (flipped on the long edge): its column mirrored. */
export function mirroredCell(g: Grid, i: number): { x: number; y: number; row: number; col: number } {
  const row = Math.floor(i / g.cols), col = g.cols - 1 - (i % g.cols);
  return { x: g.x + col * g.cw, y: g.y + row * g.ch, row, col };
}

export const CUT_DASH = [2.2, 1.6];

/**
 * Dashed cut lines around the first `count` cells of a grid: one straight line per edge, shared by
 * neighbouring cards (one cut separates two cards), with a pair of scissors on the top line.
 */
export function cutLines(ops: DrawOp[], g: Grid, count: number, scissors = true): void {
  const rows = Math.ceil(count / g.cols);
  const inRow = (r: number) => (r < 0 || r >= rows ? 0 : Math.min(g.cols, count - r * g.cols));
  const line = (x1: number, y1: number, x2: number, y2: number): DrawOp => ({ t: 'line', x1, y1, x2, y2, stroke: CUT, strokeWidth: 0.3, dash: CUT_DASH });
  for (let k = 0; k <= rows; k++) {
    const span = Math.max(inRow(k - 1), inRow(k));
    if (span) ops.push(line(g.x, g.y + k * g.ch, g.x + span * g.cw, g.y + k * g.ch));
  }
  for (let c = 0; c <= g.cols; c++) {
    let last = -1;
    for (let r = 0; r < rows; r++) if (inRow(r) >= Math.max(c, 1)) last = r;
    if (last >= 0) ops.push(line(g.x + c * g.cw, g.y, g.x + c * g.cw, g.y + (last + 1) * g.ch));
  }
  if (scissors && count > 0) {
    // the line breaks under the scissors
    ops.push({ t: 'rect', x: g.x + 5, y: g.y - 3, w: 8, h: 6, fill: PAPER });
    ops.push(...iconOps('✂️', g.x + 9, g.y, 5.5));
  }
}

/** A short line of text, shrunk to fit `room` mm (measured with Nunito Bold). */
export function fitText(text: string, size: number, room: number): number {
  return Math.min(size, (size * room) / Math.max(1, textRoom(text, size) * 1.04));
}

/** A page of the given size with its ops. */
export const page = (size: { w: number; h: number }, ops: DrawOp[]): PageOps => ({ width: size.w, height: size.h, ops });

// ───────────────────────── Romanian number words ─────────────────────────

const UNITS = ['zero', 'unu', 'doi', 'trei', 'patru', 'cinci', 'șase', 'șapte', 'opt', 'nouă'];
const TEENS = ['zece', 'unsprezece', 'doisprezece', 'treisprezece', 'paisprezece', 'cincisprezece', 'șaisprezece', 'șaptesprezece', 'optsprezece', 'nouăsprezece'];
const TENS = ['', '', 'douăzeci', 'treizeci', 'patruzeci', 'cincizeci', 'șaizeci', 'șaptezeci', 'optzeci', 'nouăzeci'];

/** How a number from 0 to 100 is said when counting: „șapte”, „paisprezece”, „douăzeci și unu”, „o sută”. */
export function numberWord(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 100) throw new Error(`numberWord: ${n}`);
  if (n === 100) return 'o sută';
  if (n < 10) return UNITS[n];
  if (n < 20) return TEENS[n - 10];
  const t = Math.floor(n / 10), u = n % 10;
  return u ? `${TENS[t]} și ${UNITS[u]}` : TENS[t];
}
