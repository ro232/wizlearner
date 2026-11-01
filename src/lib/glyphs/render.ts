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
  /** A small ring where each stroke starts, without number or arrows (traced copies). */
  startRings?: boolean;
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
  const taken: Pt[] = []; // numbers and arrows already placed, so the next ones keep clear of them
  const ink = MARK_INK;

  // 2. where each stroke starts: a small ring on the start of the stroke, its number beside it
  const numbers: { p: Pt; n: number }[] = [];
  const r = Math.max(w * 0.85, style.minDotRadius ?? 0);
  const ringR = w * 0.42;
  const rings: Pt[] = [];
  if (style.startDots || style.startRings) {
    glyph.strokes.forEach((stroke, i) => {
      if (i >= (style.maxDots ?? Infinity) || isDotStroke(stroke)) return;
      rings.push(flattenSubpath(stroke.subpaths[0])[0]);
      if (!style.startDots) return;
      const p = dotPosition(stroke, outline, numbers.map((d) => d.p), r * 0.8, w, centre);
      numbers.push({ p, n: i + 1 });
      taken.push(p, ...Array.from({ length: 8 }, (_, k) => ({ x: p.x + r * 0.8 * Math.cos((k * Math.PI) / 4), y: p.y + r * 0.8 * Math.sin((k * Math.PI) / 4) })));
    });
  }

  // 3. arrows: long and thin, beside the stroke and following it (curved on round strokes)
  if (style.arrows) {
    let count = 0;
    const limit = style.maxArrows ?? Infinity;
    for (const stroke of glyph.strokes) {
      for (const span of arrowSpans(stroke)) {
        if (count++ >= limit) break;
        ops.push(...strokeArrow(span, outline, centre, w, ink, taken, glyph.bbox));
      }
    }
  }

  const ringColor = style.startDots ? ink : style.color;
  for (const p of rings) {
    ops.push({ t: 'circle', cx: p.x, cy: p.y, r: ringR, fill: style.paper, stroke: ringColor, strokeWidth: w * 0.2 });
  }
  for (const { p, n } of numbers) {
    ops.push({ t: 'text', x: p.x, y: p.y + r * 0.04, text: String(n), size: r * 1.9, fill: ink, align: 'center', baseline: 'middle' });
  }

  return ops;
}

/** Colour of the stroke-order marks: start rings, numbers and arrows. */
export const MARK_INK = '#2B2F38';

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

/** A stretch of one pen-down run that an arrow follows: the run's points and an arc range on it. */
export interface ArrowSpan {
  pts: Pt[];
  from: number;
  to: number;
}

const ARROW_MAX = 46; // longest arrow, in glyph units (about half the letter height)
const ARROW_MIN = 14;

function spanAround(pts: Pt[], total: number, centre: number, room: number): ArrowSpan {
  const len = Math.max(ARROW_MIN, Math.min(ARROW_MAX, room));
  const from = Math.max(0, Math.min(total - len, centre - len / 2));
  return { pts, from, to: Math.min(total, from + len) };
}

/**
 * Which part of each stroke gets an arrow:
 *  - explicit fractions from the glyph data win (null = none);
 *  - a polyline of 2+ straight segments gets one arrow per long segment;
 *  - otherwise one arrow on the middle of each pen-down run.
 */
export function arrowSpans(stroke: Stroke): ArrowSpan[] {
  if (stroke.arrowAt === null) return [];
  if (isDotStroke(stroke)) return [];
  const runs = stroke.subpaths.map((sp) => flattenSubpath(sp));
  const lengths = runs.map(polylineLength);
  const total = lengths.reduce((a, b) => a + b, 0);
  if (total < MIN_ARROW_STROKE) return [];

  if (stroke.arrowAt !== undefined) {
    const fractions = Array.isArray(stroke.arrowAt) ? stroke.arrowAt : [stroke.arrowAt];
    const share = total / (fractions.length + 1);
    return fractions.map((f) => {
      let target = Math.max(0, Math.min(1, f)) * total;
      let i = 0;
      while (i < runs.length - 1 && target > lengths[i]) target -= lengths[i++];
      return spanAround(runs[i], lengths[i], target, Math.min(share, lengths[i] * 0.6));
    });
  }

  const out: ArrowSpan[] = [];
  stroke.subpaths.forEach((sp, i) => {
    const pts = runs[i];
    const straight = sp.segs.every((sg) => sg.kind === 'L');
    if (straight && sp.segs.length >= 2) {
      let pen = sp.start;
      for (const sg of sp.segs) {
        if (sg.kind !== 'L') continue;
        const len = dist(pen, sg.p);
        if (len >= MIN_ARROW_SEGMENT) {
          const seg = [pen, sg.p];
          out.push(spanAround(seg, len, len / 2, len * 0.6));
        }
        pen = sg.p;
      }
    } else if (lengths[i] >= MIN_ARROW_STROKE) {
      out.push(spanAround(pts, lengths[i], lengths[i] / 2, lengths[i] * 0.45));
    }
  });
  return out;
}

export const ARROW_OFFSET = 1.9; // arrow from the stroke centreline, in stroke widths

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

/** Points of the span (every ~2 units) with their unit tangents. */
function sampleSpan(span: ArrowSpan): { p: Pt; t: Pt }[] {
  const n = Math.max(2, Math.ceil((span.to - span.from) / 2));
  const total = polylineLength(span.pts) || 1;
  return Array.from({ length: n + 1 }, (_, k) => {
    const a = pointAlong(span.pts, (span.from + ((span.to - span.from) * k) / n) / total);
    return { p: a.p, t: a.dir };
  });
}

/**
 * The middle of the span, grown both ways only while the stroke turns less than ~100°:
 * an arrow bent round a tight loop (handwriting) would read as a scribble.
 */
function gentlePart(samples: { p: Pt; t: Pt }[]): { p: Pt; t: Pt }[] {
  const turn = (i: number, j: number) => {
    const a = Math.atan2(samples[i].t.y, samples[i].t.x), b = Math.atan2(samples[j].t.y, samples[j].t.x);
    let d = Math.abs(b - a);
    if (d > Math.PI) d = 2 * Math.PI - d;
    return d;
  };
  const mid = Math.floor(samples.length / 2);
  let lo = mid, hi = mid, used = 0;
  while (lo > 0 || hi < samples.length - 1) {
    const left = lo > 0 ? turn(lo - 1, lo) : Infinity;
    const right = hi < samples.length - 1 ? turn(hi, hi + 1) : Infinity;
    const next = Math.min(left, right);
    if (used + next > 1.75) break;
    used += next;
    if (left <= right) lo--; else hi++;
  }
  return samples.slice(lo, hi + 1).length >= 3 ? samples.slice(lo, hi + 1) : samples.slice(Math.max(0, mid - 1), mid + 2);
}

/** A light moving average, so an offset curve has no kinks. */
function smooth(pts: Pt[]): Pt[] {
  return pts.map((q, i) => {
    if (i === 0 || i === pts.length - 1) return q;
    const a = pts[i - 1], b = pts[i + 1];
    return { x: (a.x + 2 * q.x + b.x) / 4, y: (a.y + 2 * q.y + b.y) / 4 };
  });
}

/**
 * The arrow's path: the span moved sideways off the ink, on the side (and at the distance)
 * that keeps it clear of every stroke and of the marks already placed; outer side first.
 */
type Box = { minX: number; minY: number; maxX: number; maxY: number };

export function arrowPath(span: ArrowSpan, outline: Pt[], centre: Pt, w: number, taken: Pt[] = [], box?: Box): Pt[] {
  const total = polylineLength(span.pts);
  const len = span.to - span.from;
  const mid0 = (span.from + span.to) / 2;
  // where along the stroke: the planned place first, then slid toward the end or the start,
  // then a shorter arrow; only then farther from the stroke
  const windows: [number, number][] = [];
  for (const scale of [1, 0.7, 0.5])
    for (const shift of [0, 0.35, -0.35, 0.7, -0.7]) {
      const l = len * scale;
      const c = Math.max(l / 2, Math.min(total - l / 2, mid0 + shift * len));
      windows.push([c - l / 2, c + l / 2]);
    }
  const need = w * 1.05;
  let best: { path: Pt[]; room: number } | null = null;
  for (const off of [ARROW_OFFSET, 2.6]) {
    for (const [from, to] of off === ARROW_OFFSET ? windows : windows.slice(0, 1)) {
      const samples = gentlePart(sampleSpan({ pts: span.pts, from, to }));
      const mid = samples[Math.floor(samples.length / 2)];
      const n = { x: -mid.t.y, y: mid.t.x };
      const sides = [1, -1].sort((k1, k2) => {
        const c1 = { x: mid.p.x + n.x * k1, y: mid.p.y + n.y * k1 };
        const c2 = { x: mid.p.x + n.x * k2, y: mid.p.y + n.y * k2 };
        return dist(c2, centre) - dist(c1, centre);
      });
      for (const k of sides) {
        const path = smooth(samples.map(({ p, t }) => ({ x: p.x - t.y * w * off * k, y: p.y + t.x * w * off * k })));
        let room = Infinity;
        // far out to the left or right an arrow runs into the page margin or the next letter
        if (box) for (const q of path) if (q.x < box.minX - w * 2.4 || q.x > box.maxX + w * 2.4) room = Math.min(room, w * 0.9);
        for (const q of path) {
          for (const o of outline) room = Math.min(room, dist(q, o));
          for (const t of taken) room = Math.min(room, dist(q, t) + w * 0.3);
        }
        if (room >= need) return path;
        if (!best || room > best.room) best = { path, room };
      }
    }
  }
  // nothing beside the stroke is free (a tiny letter): better no arrow than one over the ink
  return best && best.room >= w * 0.95 ? best.path : [];
}

/** A thin arrow along the stroke, beside it, with a small head at the end. */
function strokeArrow(span: ArrowSpan, outline: Pt[], centre: Pt, w: number, ink: string, taken: Pt[], box?: Box): DrawOp[] {
  const path = arrowPath(span, outline, centre, w, taken, box);
  if (path.length < 2) return [];
  taken.push(...path);
  const tip = path[path.length - 1];
  // direction at the tip, from a few points back (the shaft may curve)
  const back0 = path[Math.max(0, path.length - 4)];
  const dl = dist(back0, tip) || 1;
  const dir = { x: (tip.x - back0.x) / dl, y: (tip.y - back0.y) / dl };
  const head = w * 0.9;
  const half = w * 0.42;
  const base = { x: tip.x - dir.x * head, y: tip.y - dir.y * head };
  // the shaft stops under the head so the point stays sharp
  const shaft = path.filter((q) => dist(q, tip) > head * 0.8);
  return [
    { t: 'path', subpaths: [{ start: shaft[0] ?? path[0], segs: [...shaft.slice(1), base].map((q) => ({ kind: 'L' as const, p: q })) }], stroke: ink, strokeWidth: w * 0.2, cap: 'round' },
    { t: 'polygon', points: [tip, { x: base.x - dir.y * half, y: base.y + dir.x * half }, { x: base.x + dir.y * half, y: base.y - dir.x * half }], fill: ink },
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
