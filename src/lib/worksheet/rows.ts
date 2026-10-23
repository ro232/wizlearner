import type { DrawOp, Glyph } from '@/lib/glyphs/types';
import { iconOps } from '@/lib/hints/icons';
import { renderGlyph, glyphBounds, type TraceVariant, type GlyphStyle } from '@/lib/glyphs/render';
import { mixColor } from '@/lib/glyphs/geometry';
import { patternGlyph, patternPeriods, type PatternId } from '@/lib/glyphs/patterns';

/**
 * Row builders shared by the worksheet generator and the book composer.
 * Everything is in millimetres except glyph units, which are scaled by `s`
 * (mm per unit; cap height = 100 units).
 */

export const INK = '#1e3a5f';
export const ACCENT = '#E8913A';
export const PAPER = '#ffffff';
export const MUTED = '#64748B';

export const MIN_GLYPH_WIDTH = 30; // I, l, i, 1 … still get a sensible cell
export const CELL_PAD = 16; // glyph units, each side of a cell

/** Words need more air between copies than single letters, or "BradBrad" reads as one word. */
export function cellPad(glyphs: Glyph[]): number {
  return glyphs.length > 2 ? CELL_PAD * 2.4 : CELL_PAD;
}
export const INNER_GAP = 18; // between the glyphs of a pair / two-digit number / word letters

export interface RowGeometry {
  /** Left edge and width of the row (mm). */
  x: number;
  width: number;
  /** Baseline y (mm). */
  baseline: number;
}

export interface RowStyle {
  /** mm per glyph unit. */
  s: number;
  /** Stroke width in glyph units. */
  stroke: number;
  variant: TraceVariant;
  /** Darkness of the traced copies, 0..1. */
  vis: number;
  /** Visibility multiplier reached by the last traced copy (1 = no fade). */
  fadeTo: number;
  showModel: boolean;
  modelDots: boolean;
  modelArrows: boolean;
  /** Cells left empty at the end of the row (for writing without help). */
  blankCells: number;
  /** Upper bound on traced copies (0 = as many as fit). */
  maxCopies: number;
  leftHanded: boolean;
  /** Draw the 3-line guides in this colour (null = none). */
  guideColor: string | null;
  hint?: { word: string; emoji: string } | null;
  ink?: string;
  accent?: string;
  paper?: string;
}

export const DEFAULT_ROW_STYLE: RowStyle = {
  s: 0.14,
  stroke: 10,
  variant: 'dashed',
  vis: 0.7,
  fadeTo: 0.5,
  showModel: true,
  modelDots: true,
  modelArrows: true,
  blankCells: 0,
  maxCopies: 0,
  leftHanded: false,
  guideColor: '#cbd5e1',
  hint: null,
};

export function itemWidth(glyphs: Glyph[]): number {
  return glyphs.reduce((acc, g, i) => acc + Math.max(g.bbox.maxX - g.bbox.minX, MIN_GLYPH_WIDTH) + (i ? INNER_GAP : 0), 0);
}

/** Vertical extent of a row in glyph units above the cap line and below the baseline. */
export function rowExtents(glyphs: Glyph[], stroke: number): { ascent: number; descent: number } {
  let minY = 0, maxY = 100;
  for (const g of glyphs) {
    const b = glyphBounds(g, stroke);
    minY = Math.min(minY, b.minY);
    maxY = Math.max(maxY, b.maxY);
  }
  return { ascent: Math.max(8, -minY + 4), descent: Math.max(8, maxY - 100 + 4) };
}

/** Total row height in mm (ascent + cap height + descent). */
export function rowHeightMm(glyphs: Glyph[], s: number, stroke = 10): number {
  const e = rowExtents(glyphs, stroke);
  return (e.ascent + 100 + e.descent) * s;
}

/** Draw the glyphs of one item side by side; origin = top-left of the cap box (y = 0 is the cap line). */
export function itemOps(glyphs: Glyph[], style: GlyphStyle): DrawOp[] {
  const ops: DrawOp[] = [];
  let x = 0;
  glyphs.forEach((g, i) => {
    const w = Math.max(g.bbox.maxX - g.bbox.minX, MIN_GLYPH_WIDTH);
    const shift = (w - (g.bbox.maxX - g.bbox.minX)) / 2 - g.bbox.minX; // centre narrow glyphs in their slot
    ops.push({ t: 'group', tx: x + shift, ty: 0, scale: 1, ops: renderGlyph(g, style) });
    x += w + (i < glyphs.length - 1 ? INNER_GAP : 0);
  });
  return ops;
}

export function guideOps(geom: RowGeometry, s: number, color: string): DrawOp[] {
  const { x, width, baseline } = geom;
  return [
    { t: 'line', x1: x, y1: baseline - 100 * s, x2: x + width, y2: baseline - 100 * s, stroke: color, strokeWidth: 0.3 },
    { t: 'line', x1: x, y1: baseline - 50 * s, x2: x + width, y2: baseline - 50 * s, stroke: color, strokeWidth: 0.25, dash: [1.5, 1.5] },
    { t: 'line', x1: x, y1: baseline, x2: x + width, y2: baseline, stroke: color, strokeWidth: 0.35 },
  ];
}

function modelStyle(st: RowStyle): GlyphStyle {
  return {
    color: st.ink ?? INK,
    strokeWidth: st.stroke,
    variant: 'solid',
    startDots: st.modelDots,
    arrows: st.modelArrows,
    accent: st.accent ?? ACCENT,
    dotText: st.paper ?? PAPER,
    paper: st.paper ?? PAPER,
    minDotRadius: 1.45 / st.s,
  };
}

function copyStyle(st: RowStyle, fade: number): GlyphStyle {
  return {
    color: mixColor(st.ink ?? INK, st.paper ?? PAPER, 1 - st.vis * 0.85 * fade),
    strokeWidth: st.stroke,
    variant: st.variant,
    startDots: false,
    arrows: false,
    accent: st.accent ?? ACCENT,
    dotText: st.paper ?? PAPER,
    paper: st.paper ?? PAPER,
  };
}

/**
 * One practice row: [model with numbers/arrows] [hint] [traced copies fading] [blank cells].
 * Returns the number of traced copies drawn.
 */
export function buildTraceRow(ops: DrawOp[], glyphs: Glyph[], geom: RowGeometry, st: RowStyle): number {
  const { s } = st;
  const { x, width, baseline } = geom;
  if (st.guideColor) ops.push(...guideOps(geom, s, st.guideColor));
  if (glyphs.length === 0) return 0;

  const pad = cellPad(glyphs);
  const cellMm = (itemWidth(glyphs) + pad * 2) * s;
  const hint = st.hint ?? null;
  const hintW = hint ? Math.max(16, hint.word.length * 2.2 + 4) : 0;
  const modelW = st.showModel ? cellMm + hintW + 3 : 0;
  // No room left after the model (a long hint word on a narrow page): draw no copies
  // rather than one that runs past the margin.
  let copies = Math.max(0, Math.floor((width - modelW) / cellMm));
  if (st.maxCopies > 0) copies = Math.min(copies, st.maxCopies);
  const top = baseline - 100 * s;

  const modelX = st.leftHanded ? x + width - cellMm : x;
  if (st.showModel) {
    // When nothing else fits on the row (a long name), the model itself is drawn to be traced:
    // a solid model with no copy next to it would leave the child nothing to write over.
    const style = copies === 0 ? { ...copyStyle(st, 1), startDots: false, arrows: false } : modelStyle(st);
    ops.push({ t: 'group', tx: modelX + pad * s, ty: top, scale: s, ops: itemOps(glyphs, style) });
    if (hint) {
      const hx = st.leftHanded ? modelX - 3 - hintW / 2 : modelX + cellMm + 3 + hintW / 2;
      const cy = baseline - 50 * s;
      if (hint.word) {
        ops.push(...iconOps(hint.emoji, hx, cy - 1, Math.min(9, 48 * s)));
        ops.push({ t: 'text', x: hx, y: Math.min(baseline, cy + 6), text: hint.word, size: 3.4, fill: MUTED, align: 'center', weight: 'bold' });
      } else {
        // Picture only (a themed word is its own label).
        ops.push(...iconOps(hint.emoji, hx, baseline - 55 * s, Math.min(12, 75 * s)));
      }
    }
  }

  const firstCopyX = st.leftHanded ? x : x + modelW;
  const traced = copies === 0 ? 0 : Math.max(1, copies - (copies >= 4 ? st.blankCells : 0));
  for (let k = 0; k < traced; k++) {
    const fade = traced > 1 ? 1 - (1 - st.fadeTo) * (k / (traced - 1)) : 1;
    ops.push({ t: 'group', tx: firstCopyX + k * cellMm + pad * s, ty: top, scale: s, ops: itemOps(glyphs, copyStyle(st, fade)) });
  }
  return traced;
}

/**
 * A pre-writing row: a short solid model (with start dot and arrows) followed
 * by the same pattern dashed across the rest of the row.
 */
export function buildPatternRow(ops: DrawOp[], pattern: PatternId, geom: RowGeometry, st: RowStyle): void {
  const { s } = st;
  const { x, width, baseline } = geom;
  if (st.guideColor) ops.push(...guideOps(geom, s, st.guideColor));
  const top = baseline - 100 * s;
  const padMm = CELL_PAD * s;
  const unitsAvailable = (width - padMm * 2) / s;

  const modelPeriods = st.showModel ? 2 : 0;
  const model = modelPeriods ? patternGlyph(pattern, modelPeriods) : null;
  const modelUnits = model ? model.width + 20 : 0;
  const restPeriods = patternPeriods(pattern, unitsAvailable - modelUnits, 1);
  const rest = patternGlyph(pattern, restPeriods);
  const totalUnits = modelUnits + rest.width;
  const startX = st.leftHanded ? x + width - padMm - totalUnits * s : x + padMm;

  if (model) {
    ops.push({
      t: 'group',
      tx: startX,
      ty: top,
      scale: s,
      ops: renderGlyph(model, { ...modelStyle(st), maxDots: 1, maxArrows: 4 }),
    });
  }
  ops.push({ t: 'group', tx: startX + modelUnits * s, ty: top, scale: s, ops: renderGlyph(rest, copyStyle(st, 1)) });
}

/** Five-point star polygon, used for reward boxes and counting pages. */
export function starPoints(cx: number, cy: number, r: number): { x: number; y: number }[] {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.42;
    const a = (-90 + i * 36) * (Math.PI / 180);
    pts.push({ x: cx + rad * Math.cos(a), y: cy + rad * Math.sin(a) });
  }
  return pts;
}

/** Page-wide background behind the rows: school-notebook rulings or a light grid. */
export function backgroundOps(pattern: string, x: number, y: number, w: number, h: number): DrawOp[] {
  const ops: DrawOp[] = [];
  switch (pattern) {
    case 'grid': {
      for (let px = x; px <= x + w + 0.01; px += 5) ops.push({ t: 'line', x1: px, y1: y, x2: px, y2: y + h, stroke: '#e2e8f0', strokeWidth: 0.12 });
      for (let py = y; py <= y + h + 0.01; py += 5) ops.push({ t: 'line', x1: x, y1: py, x2: x + w, y2: py, stroke: '#e2e8f0', strokeWidth: 0.12 });
      break;
    }
    case 'patratele': {
      // caiet de matematică: 5 mm squares
      for (let px = x; px <= x + w + 0.01; px += 5) ops.push({ t: 'line', x1: px, y1: y, x2: px, y2: y + h, stroke: '#cbd5e1', strokeWidth: 0.15 });
      for (let py = y; py <= y + h + 0.01; py += 5) ops.push({ t: 'line', x1: x, y1: py, x2: x + w, y2: py, stroke: '#cbd5e1', strokeWidth: 0.15 });
      break;
    }
    case 'dictando': {
      // caiet dictando: blue lines every 5 mm, red margin on the left
      ops.push({ t: 'line', x1: x + 6, y1: y, x2: x + 6, y2: y + h, stroke: '#f87171', strokeWidth: 0.3 });
      for (let py = y + 5; py < y + h; py += 5) ops.push({ t: 'line', x1: x, y1: py, x2: x + w, y2: py, stroke: '#bfdbfe', strokeWidth: 0.2 });
      break;
    }
    case 'lines': {
      for (let py = y + 6; py < y + h; py += 6) ops.push({ t: 'line', x1: x, y1: py, x2: x + w, y2: py, stroke: '#e2e8f0', strokeWidth: 0.18 });
      break;
    }
    default:
      break; // 'blank' and 'guides' (row guides are drawn with each row)
  }
  return ops;
}
