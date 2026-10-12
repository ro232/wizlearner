import type { DrawOp, Glyph, Pt, Stroke, Subpath } from './types';
import { dist, flattenSubpath, pointAlong, polylineLength, strokeStart } from './geometry';

export type TraceVariant = 'solid' | 'dashed' | 'dotted' | 'outline';

export interface GlyphStyle {
  /** Stroke colour (blend it toward the paper colour yourself for faded copies). */
  color: string;
  /** Centerline stroke width in glyph units (cap height = 100). */
  strokeWidth: number;
  variant: TraceVariant;
  /** Numbered circles at the start of every stroke. */
  startDots: boolean;
  /** Direction arrows along every stroke. */
  arrows: boolean;
  /** Colour of dots and arrows. */
  accent: string;
  /** Colour of the number inside a start dot. */
  dotText: string;
  /** Paper colour, used to hollow out the `outline` variant. */
  paper: string;
  /** Lower bound for the start-dot radius (glyph units), so numbers stay legible on small letters. */
  minDotRadius?: number;
  /** Only number the first N strokes (patterns made of many identical strokes). */
  maxDots?: number;
  /** Draw at most N arrows in total. */
  maxArrows?: number;
}

export const DEFAULT_GLYPH_STYLE: GlyphStyle = {
  color: '#1e3a5f',
  strokeWidth: 10,
  variant: 'solid',
  startDots: true,
  arrows: true,
  accent: '#E8913A',
  dotText: '#ffffff',
  paper: '#ffffff',
};

const DOT_LENGTH_LIMIT = 0.5; // strokes shorter than this are drawn as dots (i, j)
const MIN_ARROW_STROKE = 24; // no arrows on tiny strokes (diacritics, dots)
const MIN_ARROW_SEGMENT = 26; // per-segment arrows only on segments at least this long

export function isDotStroke(stroke: Stroke): boolean {
  return stroke.subpaths.length === 1 && polylineLength(flattenSubpath(stroke.subpaths[0])) < DOT_LENGTH_LIMIT;
}

/** Draw-ops for one glyph, in glyph units with the origin at the glyph's (0, 0). */
export function renderGlyph(glyph: Glyph, style: GlyphStyle): DrawOp[] {
  const ops: DrawOp[] = [];
  const w = style.strokeWidth;

  // 1. strokes
  for (const stroke of glyph.strokes) {
    if (isDotStroke(stroke)) {
      const p = strokeStart(stroke);
      ops.push({ t: 'circle', cx: p.x, cy: p.y, r: w * 0.62, fill: style.color });
      continue;
    }
    const subpaths = stroke.subpaths;
    switch (style.variant) {
      case 'solid':
        ops.push({ t: 'path', subpaths, stroke: style.color, strokeWidth: w, cap: 'round' });
        break;
      case 'dashed':
        ops.push({ t: 'path', subpaths, stroke: style.color, strokeWidth: w, cap: 'round', dash: [w * 1.0, w * 2.0] });
        break;
      case 'dotted':
        ops.push({ t: 'path', subpaths, stroke: style.color, strokeWidth: w, cap: 'round', dash: [0.01, w * 1.5] });
        break;
      case 'outline':
        ops.push({ t: 'path', subpaths, stroke: style.color, strokeWidth: w * 1.3, cap: 'round' });
        ops.push({ t: 'path', subpaths, stroke: style.paper, strokeWidth: w * 0.7, cap: 'round' });
        break;
    }
  }

  // 2. arrows
  if (style.arrows) {
    let count = 0;
    const limit = style.maxArrows ?? Infinity;
    for (const stroke of glyph.strokes) {
      for (const { p, dir } of arrowPositions(stroke)) {
        if (count++ >= limit) break;
        ops.push(arrowHead(p, dir, w, style.accent));
      }
    }
  }

  // 3. numbered start dots (drawn last so they sit on top)
  if (style.startDots) {
    const r = Math.max(w * 0.85, style.minDotRadius ?? 0);
    const placed: Pt[] = [];
    glyph.strokes.forEach((stroke, i) => {
      if (i >= (style.maxDots ?? Infinity)) return;
      const p = dotPosition(stroke, placed, r);
      placed.push(p);
      ops.push({ t: 'circle', cx: p.x, cy: p.y, r, fill: style.accent, stroke: style.paper, strokeWidth: w * 0.18 });
      ops.push({
        t: 'text',
        x: p.x,
        y: p.y + r * 0.06,
        text: String(i + 1),
        size: r * 1.45,
        fill: style.dotText,
        weight: 'bold',
        align: 'center',
        baseline: 'middle',
      });
    });
  }

  return ops;
}

const SHORT_STROKE = 36; // dots, diacritics and commas: number sits beside them, not on them

/** Start of the stroke, slid along it when it would overlap an earlier dot. */
function dotPosition(stroke: Stroke, placed: Pt[], r: number): Pt {
  const pts = flattenSubpath(stroke.subpaths[0]);
  const total = polylineLength(pts);
  const clear = (p: Pt) => placed.every((q) => dist(p, q) >= r * 2.15);
  const p = pts[0];
  if (total < SHORT_STROKE) {
    // Keep tiny marks visible: put the number to the left of them (or right).
    const left = { x: p.x - r * 1.9, y: p.y };
    if (clear(left)) return left;
    const right = { x: p.x + r * 1.9, y: p.y };
    if (clear(right)) return right;
    return { x: p.x, y: p.y - r * 1.9 };
  }
  if (clear(p) || total < 1) return p;
  const maxSlide = Math.min(total * 0.45, r * 6);
  for (let d = r; d <= maxSlide; d += r * 0.5) {
    const cand = pointAlong(pts, d / total).p;
    if (clear(cand)) return cand;
  }
  return pointAlong(pts, maxSlide / total).p;
}

interface ArrowPos {
  p: Pt;
  dir: Pt;
}

/**
 * Arrow placement rules:
 *  - explicit fractions from the glyph data win (null = none);
 *  - a polyline of 2+ straight segments gets one arrow per long segment;
 *  - otherwise one arrow in the middle of each pen-down run.
 */
export function arrowPositions(stroke: Stroke): ArrowPos[] {
  if (stroke.arrowAt === null) return [];
  if (isDotStroke(stroke)) return [];
  const runs = stroke.subpaths;
  const allPts = runs.map((sp) => flattenSubpath(sp));
  const lengths = allPts.map(polylineLength);
  const total = lengths.reduce((a, b) => a + b, 0);
  if (total < MIN_ARROW_STROKE) return [];

  if (stroke.arrowAt !== undefined) {
    const fractions = Array.isArray(stroke.arrowAt) ? stroke.arrowAt : [stroke.arrowAt];
    return fractions.map((f) => pointAlongStroke(allPts, lengths, f));
  }

  const out: ArrowPos[] = [];
  for (const sp of runs) {
    const straight = sp.segs.every((s) => s.kind === 'L');
    if (straight && sp.segs.length >= 2) {
      let pen = sp.start;
      for (const s of sp.segs) {
        if (s.kind !== 'L') continue;
        const len = dist(pen, s.p);
        if (len >= MIN_ARROW_SEGMENT) {
          const dir = { x: (s.p.x - pen.x) / len, y: (s.p.y - pen.y) / len };
          out.push({ p: { x: (pen.x + s.p.x) / 2, y: (pen.y + s.p.y) / 2 }, dir });
        }
        pen = s.p;
      }
    } else {
      const pts = flattenSubpath(sp);
      if (polylineLength(pts) >= MIN_ARROW_STROKE) out.push(pointAlong(pts, 0.5));
    }
  }
  return out;
}

function pointAlongStroke(runs: Pt[][], lengths: number[], fraction: number): ArrowPos {
  const total = lengths.reduce((a, b) => a + b, 0);
  let target = Math.max(0, Math.min(1, fraction)) * total;
  for (let i = 0; i < runs.length; i++) {
    if (target <= lengths[i] || i === runs.length - 1) return pointAlong(runs[i], lengths[i] === 0 ? 0 : target / lengths[i]);
    target -= lengths[i];
  }
  return pointAlong(runs[0], 0.5);
}

function arrowHead(p: Pt, dir: Pt, w: number, fill: string): DrawOp {
  const len = w * 1.5;
  const half = w * 0.8;
  const nx = -dir.y, ny = dir.x;
  const tip = { x: p.x + dir.x * len * 0.55, y: p.y + dir.y * len * 0.55 };
  const back = { x: p.x - dir.x * len * 0.45, y: p.y - dir.y * len * 0.45 };
  return {
    t: 'polygon',
    points: [tip, { x: back.x + nx * half, y: back.y + ny * half }, { x: back.x - nx * half, y: back.y - ny * half }],
    fill,
  };
}

/** Visual bounding box including stroke width, diacritics and dots. */
export function glyphBounds(glyph: Glyph, strokeWidth = 10): { minX: number; minY: number; maxX: number; maxY: number } {
  const pad = strokeWidth * 0.95;
  return {
    minX: glyph.bbox.minX - pad,
    minY: glyph.bbox.minY - pad,
    maxX: glyph.bbox.maxX + pad,
    maxY: glyph.bbox.maxY + pad,
  };
}

export type { Subpath };
