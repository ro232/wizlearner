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
  /** Dash pattern for the `dashed` variant, in stroke widths (default 1 on, 2 off). */
  dash?: [number, number];
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
    // A breve, circumflex or comma is too short to survive a dash pattern drawn at letter
    // thickness: it breaks into one or two blobs and the letter stops being recognisable.
    // Trace copies draw it as a slimmer continuous mark in the same faded colour.
    if (stroke.mark && (style.variant === 'dashed' || style.variant === 'dotted')) {
      ops.push({ t: 'path', subpaths, stroke: style.color, strokeWidth: w * 0.6, cap: 'round' });
      continue;
    }
    switch (style.variant) {
      case 'solid':
        ops.push({ t: 'path', subpaths, stroke: style.color, strokeWidth: w, cap: 'round' });
        break;
      case 'dashed':
        ops.push({ t: 'path', subpaths, stroke: style.color, strokeWidth: w, cap: 'round', dash: [w * (style.dash?.[0] ?? 1), w * (style.dash?.[1] ?? 2)] });
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

  const outline = glyph.strokes.flatMap((st) => st.subpaths.flatMap((sp) => densify(flattenSubpath(sp), w * 0.4)));
  const centre = { x: (glyph.bbox.minX + glyph.bbox.maxX) / 2, y: (glyph.bbox.minY + glyph.bbox.maxY) / 2 };
  const taken: Pt[] = []; // dots and arrows already placed, so the next ones keep clear of them

  // 2. numbered start dots, beside the start of each stroke (placed first: they matter most)
  const dots: { p: Pt; n: number }[] = [];
  const r = Math.max(w * 0.85, style.minDotRadius ?? 0);
  if (style.startDots) {
    glyph.strokes.forEach((stroke, i) => {
      if (i >= (style.maxDots ?? Infinity)) return;
      const p = dotPosition(stroke, outline, dots.map((d) => d.p), r, w, centre);
      dots.push({ p, n: i + 1 });
      taken.push(p, ...Array.from({ length: 8 }, (_, k) => ({ x: p.x + r * Math.cos((k * Math.PI) / 4), y: p.y + r * Math.sin((k * Math.PI) / 4) })));
    });
  }

  // 3. arrows, beside the stroke (not on it) so they stay readable on the model
  if (style.arrows) {
    let count = 0;
    const limit = style.maxArrows ?? Infinity;
    for (const stroke of glyph.strokes) {
      for (const pos of arrowPositions(stroke)) {
        if (count++ >= limit) break;
        ops.push(...sideArrow(pos, outline, centre, w, style.accent, taken));
      }
    }
  }

  for (const { p, n } of dots) {
    ops.push({ t: 'circle', cx: p.x, cy: p.y, r, fill: style.accent, stroke: style.paper, strokeWidth: w * 0.18 });
    ops.push({
      t: 'text',
      x: p.x,
      y: p.y + r * 0.06,
      text: String(n),
      size: r * 1.45,
      fill: style.dotText,
      weight: 'bold',
      align: 'center',
      baseline: 'middle',
    });
  }

  return ops;
}

/**
 * The number of a stroke goes just outside its start, off the ink: first behind the start
 * (where the pen comes from), then turning round it, outer side first. It keeps clear of
 * every stroke and of the numbers already placed.
 */
export function dotPosition(stroke: Stroke, outline: Pt[], placed: Pt[], r: number, w: number, centre: Pt): Pt {
  const pts = flattenSubpath(stroke.subpaths[0]);
  const start = pts[0];
  const total = polylineLength(pts);
  const ahead = total > 0.5 ? pointAlong(pts, Math.min(1, (w * 1.5) / total)).p : { x: start.x, y: start.y + 1 };
  const len = dist(start, ahead) || 1;
  const fwd = { x: (ahead.x - start.x) / len, y: (ahead.y - start.y) / len };
  const back = Math.atan2(-fwd.y, -fwd.x);
  const needInk = r + w * 0.6;
  const needDot = r * 2.15;
  const room = (c: Pt) => {
    let ink = Infinity;
    for (const o of outline) ink = Math.min(ink, dist(c, o));
    let dot = Infinity;
    for (const q of placed) dot = Math.min(dot, dist(c, q));
    return Math.min(ink - needInk, dot - needDot);
  };
  let best: { c: Pt; room: number } | null = null;
  for (const reach of [1, 1.35]) {
    const d = (r + w * 0.65) * reach;
    for (const turn of [0, 45, 90, 135]) {
      const sides = turn === 0 ? [0] : [turn, -turn].map((t) => (t * Math.PI) / 180);
      const cands = sides
        .map((t) => ({ x: start.x + Math.cos(back + t) * d, y: start.y + Math.sin(back + t) * d }))
        .sort((c1, c2) => dist(c2, centre) - dist(c1, centre));
      for (const c of cands) {
        const free = room(c);
        if (free >= 0) return c;
        if (!best || free > best.room) best = { c, room: free };
      }
    }
  }
  return best!.c;
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

export const ARROW_OFFSET = 1.9; // arrow centre from the stroke centreline, in stroke widths
const ARROW_LEN = 2.3; // arrow length, in stroke widths

/** The polyline with extra points so no two neighbours are farther apart than `step`. */
function densify(pts: Pt[], step: number): Pt[] {
  const out: Pt[] = pts.slice(0, 1);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const n = Math.max(1, Math.ceil(dist(a, b) / step));
    for (let k = 1; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  return out;
}

/** Points along an arrow centred at c, for clearance checks. */
function arrowSamples(c: Pt, dir: Pt, w: number): Pt[] {
  const h = (w * ARROW_LEN) / 2;
  return [-1, -0.5, 0, 0.5, 1].map((k) => ({ x: c.x + dir.x * h * k, y: c.y + dir.y * h * k }));
}

/**
 * Where a stroke's arrow goes: beside the stroke, never on it. Candidates are tried in order
 * of preference (close to the stroke, at its middle, on the outer side of the letter); the first
 * one that keeps clear of every stroke and of the arrows already placed wins.
 */
export function arrowPlacement(pos: ArrowPos, outline: Pt[], centre: Pt, w: number, taken: Pt[] = []): Pt {
  const n = { x: -pos.dir.y, y: pos.dir.x };
  const need = w * 1.15; // half a stroke + half an arrow head + a small gap
  const clearance = (c: Pt) => {
    let m = Infinity;
    for (const q of arrowSamples(c, pos.dir, w)) {
      for (const o of outline) m = Math.min(m, dist(q, o));
      for (const t of taken) m = Math.min(m, dist(q, t) + w * 0.3);
    }
    return m;
  };
  // outer side first: the one facing away from the middle of the letter
  const sides = [1, -1].sort((k1, k2) => {
    const c1 = { x: pos.p.x + n.x * k1, y: pos.p.y + n.y * k1 };
    const c2 = { x: pos.p.x + n.x * k2, y: pos.p.y + n.y * k2 };
    return dist(c2, centre) - dist(c1, centre);
  });
  const len = w * ARROW_LEN;
  let best: { c: Pt; room: number } | null = null;
  for (const off of [ARROW_OFFSET, 2.5]) {
    for (const slide of [0, -0.8, 0.8]) {
      for (const k of sides) {
        const c = {
          x: pos.p.x + n.x * w * off * k + pos.dir.x * len * slide,
          y: pos.p.y + n.y * w * off * k + pos.dir.y * len * slide,
        };
        const room = clearance(c);
        if (room >= need) return c;
        if (!best || room > best.room) best = { c, room };
      }
    }
  }
  return best!.c;
}

/** A small arrow (shaft and head) parallel to the stroke, beside it. */
function sideArrow(pos: ArrowPos, outline: Pt[], centre: Pt, w: number, fill: string, taken: Pt[]): DrawOp[] {
  const c = arrowPlacement(pos, outline, centre, w, taken);
  taken.push(...arrowSamples(c, pos.dir, w));
  const { dir } = pos;
  const len = w * ARROW_LEN;
  const tail = { x: c.x - dir.x * len * 0.5, y: c.y - dir.y * len * 0.5 };
  const tip = { x: c.x + dir.x * len * 0.5, y: c.y + dir.y * len * 0.5 };
  const head = w * 0.95;
  const half = w * 0.55;
  const nx = -dir.y, ny = dir.x;
  const back = { x: tip.x - dir.x * head, y: tip.y - dir.y * head };
  return [
    { t: 'path', subpaths: [{ start: tail, segs: [{ kind: 'L', p: back }] }], stroke: fill, strokeWidth: w * 0.34, cap: 'round' },
    { t: 'polygon', points: [tip, { x: back.x + nx * half, y: back.y + ny * half }, { x: back.x - nx * half, y: back.y - ny * half }], fill },
  ];
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
