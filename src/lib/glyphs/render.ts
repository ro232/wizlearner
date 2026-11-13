import type { DrawOp, Glyph, Pt, Seg, Stroke, Subpath } from './types';
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
  /**
   * Length of one dash + gap of the `dashed` variant, in glyph units. Left out, it is worked out
   * from the letter (see dashPeriod); a word passes the same value to all its letters.
   */
  dashPeriod?: number;
  /** Gap between dots of the `dotted` variant, in stroke widths (default 1.5). */
  dotGap?: number;
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
  const period = style.variant === 'dashed' ? style.dashPeriod ?? dashPeriod(glyph, style) : 0;
  for (const stroke of glyph.strokes) {
    if (isDotStroke(stroke)) {
      const p = strokeStart(stroke);
      ops.push({ t: 'circle', cx: p.x, cy: p.y, r: w * 0.62, fill: style.color });
      continue;
    }
    const subpaths = stroke.subpaths;
    const pen = stroke.pen ?? 1; // the comma of Ș/Ț is finer than the letter
    // A breve, circumflex or comma is too short to survive a dash pattern drawn at letter
    // thickness: it breaks into one or two blobs and the letter stops being recognisable.
    // Trace copies draw it as a slimmer continuous mark in the same faded colour.
    if (stroke.mark && (style.variant === 'dashed' || style.variant === 'dotted')) {
      ops.push({ t: 'path', subpaths, stroke: style.color, strokeWidth: w * 0.6, cap: 'round' });
      continue;
    }
    switch (style.variant) {
      case 'solid':
        ops.push({ t: 'path', subpaths, stroke: style.color, strokeWidth: w * pen, cap: 'round' });
        break;
      case 'dashed': {
        // Every straight or curved piece gets its own pattern, fitted to its length: it starts
        // and ends on a dash, so stroke ends and corners are always drawn.
        const spec = dashSpec(style, w);
        for (const piece of dashPieces(subpaths, w)) {
          const dash = fitDash(piece.length, period, spec, piece.closed);
          ops.push({ t: 'path', subpaths: [piece.subpath], stroke: style.color, strokeWidth: w, cap: 'round', ...(dash ? { dash } : {}) });
        }
        break;
      }
      case 'dotted':
        ops.push({ t: 'path', subpaths, stroke: style.color, strokeWidth: w, cap: 'round', dash: [0.01, w * (style.dotGap ?? 1.5)] });
        break;
      case 'outline':
        ops.push({ t: 'path', subpaths, stroke: style.color, strokeWidth: w * (1 + 0.3 * pen), cap: 'round' });
        ops.push({ t: 'path', subpaths, stroke: style.paper, strokeWidth: w * (1 + 0.3 * pen) - w * 0.6 * Math.min(1, pen + 0.1), cap: 'round' });
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
  const rings: { p: Pt; r: number }[] = [];
  if (style.startDots || style.startRings) {
    const lines = glyph.strokes.map((st) => st.subpaths.map((sp) => densify(flattenSubpath(sp), w * 0.3)));
    glyph.strokes.forEach((stroke, i) => {
      if (i >= (style.maxDots ?? Infinity) || isDotStroke(stroke)) return;
      // no ring on the comma of Ș/Ț: a circle on so small a sign would change its shape
      if (!stroke.pen || stroke.pen >= 1) rings.push({ p: flattenSubpath(stroke.subpaths[0])[0], r: ringR });
      if (!style.startDots) return;
      const others = lines.filter((_, j) => j !== i).flat(2);
      const p = dotPosition(stroke, outline, numbers.map((d) => d.p), r * 0.8, w, centre, others);
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
  for (const ring of rings) {
    ops.push({ t: 'circle', cx: ring.p.x, cy: ring.p.y, r: ring.r, fill: style.paper, stroke: ringColor, strokeWidth: w * 0.2 });
  }
  for (const { p, n } of numbers) {
    ops.push({ t: 'text', x: p.x, y: p.y + r * 0.04, text: String(n), size: r * 1.9, fill: ink, align: 'center', baseline: 'middle' });
  }

  return ops;
}

/** Colour of the stroke-order marks: start rings, numbers and arrows. */
export const MARK_INK = '#2B2F38';

/** Shortest distance from p to a set of points (Infinity for none). */
function nearest(p: Pt, pts: Pt[]): number {
  let m = Infinity;
  for (const q of pts) m = Math.min(m, dist(p, q));
  return m;
}

/**
 * The first stretch of a stroke that is its own: where the stroke begins on another one
 * (the arch of n starts on the stem, the two lines of A leave the same point) the part still
 * running over or beside the other stroke is skipped. This is what the number must sit next to.
 */
export function ownLead(stroke: Stroke, others: Pt[], w: number): { pts: Pt[]; dirs: Pt[] } {
  const line = densify(flattenSubpath(stroke.subpaths[0]), 2);
  const along: number[] = [0];
  for (let i = 1; i < line.length; i++) along.push(along[i - 1] + dist(line[i - 1], line[i]));
  const LEAD = w * 3;
  let from = line.findIndex((p, i) => along[i] <= w * 3 && nearest(p, others) > w * 0.75);
  if (from < 0) from = 0;
  const pts: Pt[] = [];
  const dirs: Pt[] = [];
  for (let i = from; i < line.length && along[i] <= along[from] + LEAD; i++) {
    const a = line[Math.max(0, i - 1)], b = line[Math.min(line.length - 1, i + 1)];
    const l = dist(a, b) || 1;
    pts.push(line[i]);
    dirs.push({ x: (b.x - a.x) / l, y: (b.y - a.y) / l });
  }
  return { pts, dirs };
}

/**
 * The number of a stroke goes just outside its start, off the ink: first behind the start
 * (where the pen comes from), then turning round it, outer side first. It keeps clear of
 * every stroke and of the numbers already placed.
 *
 * It must also read as the number of this stroke and no other: closer to this stroke's own
 * first stretch than to any other stroke. So when two strokes leave the same point (A, E, F, 5)
 * or one starts on another (the arch of n on its stem), the number moves beside its own stroke,
 * a little way along it, where the arrow of that stroke follows.
 */
export function dotPosition(stroke: Stroke, outline: Pt[], placed: Pt[], r: number, w: number, centre: Pt, others: Pt[] = []): Pt {
  const pts = flattenSubpath(stroke.subpaths[0]);
  const start = pts[0];
  const total = polylineLength(pts);
  const ahead = total > 0.5 ? pointAlong(pts, Math.min(1, (w * 1.5) / total)).p : { x: start.x, y: start.y + 1 };
  const len = dist(start, ahead) || 1;
  const fwd = { x: (ahead.x - start.x) / len, y: (ahead.y - start.y) / len };
  const back = Math.atan2(-fwd.y, -fwd.x);
  const needInk = r + w * 0.6;
  const needDot = r * 2.15;
  const lead = ownLead(stroke, others, w);
  // the other strokes, without the parts this stroke runs over (u: the second line goes back down the first)
  const mine = densify(pts, w * 0.3);
  const apart = others.filter((q) => nearest(q, mine) > w * 0.75);
  const room = (c: Pt) => {
    const own = apart.length ? nearest(c, apart) - nearest(c, lead.pts) - OWN_MARGIN : Infinity;
    return Math.min(nearest(c, outline) - needInk, nearest(c, placed) - needDot, own);
  };
  let best: { c: Pt; room: number } | null = null;
  const tryAll = (cands: Pt[]): Pt | null => {
    for (const c of cands) {
      const free = room(c);
      if (free >= 0) return c;
      if (!best || free > best.room) best = { c, room: free };
    }
    return null;
  };
  const outerFirst = (c1: Pt, c2: Pt) => dist(c2, centre) - dist(c1, centre) || c1.y - c2.y || c1.x - c2.x;
  // round the start: behind it first
  for (const reach of [1, 1.35]) {
    const d = (r + w * 0.65) * reach;
    for (const turn of [0, 45, 90, 135]) {
      const sides = turn === 0 ? [0] : [turn, -turn].map((t) => (t * Math.PI) / 180);
      const hit = tryAll(sides.map((t) => ({ x: start.x + Math.cos(back + t) * d, y: start.y + Math.sin(back + t) * d })).sort(outerFirst));
      if (hit) return hit;
    }
  }
  // beside the stroke's own first stretch, as near its beginning as there is room
  for (const off of [needInk + 0.5, (needInk + 0.5) * 1.3]) {
    for (let i = 0; i < lead.pts.length; i++) {
      const p = lead.pts[i], t = lead.dirs[i];
      const hit = tryAll([1, -1].map((k) => ({ x: p.x - t.y * off * k, y: p.y + t.x * off * k })).sort(outerFirst));
      if (hit) return hit;
    }
  }
  return best!.c;
}

/** A number is this much nearer to its own stroke than to any other one (glyph units). */
export const OWN_MARGIN = 3;

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

// ───────────────────────── dashes ─────────────────────────

/** The dash pattern of a style, in glyph units: its usual size and the smallest it may shrink to. */
interface DashSpec {
  on: number;
  off: number;
  minOn: number;
  minOff: number;
}

function dashSpec(style: GlyphStyle, w: number): DashSpec {
  const on = w * (style.dash?.[0] ?? 1);
  const off = w * (style.dash?.[1] ?? 2);
  // Round caps make a dash look one pen width longer and a gap one pen width shorter:
  // the tightest pattern still shows a gap of about half a pen width between short dashes.
  return { on, off, minOn: Math.min(on, w * 0.6), minOff: Math.min(off, w * 1.5) };
}

/** The gap that goes with a period (dash + gap): both shrink together from the usual size to the smallest. */
function gapAt(period: number, spec: DashSpec): number {
  const lo = spec.minOn + spec.minOff, hi = spec.on + spec.off;
  if (hi - lo < 1e-6 || period >= hi) return spec.off;
  if (period <= lo) return spec.minOff;
  return spec.minOff + ((spec.off - spec.minOff) * (period - lo)) / (hi - lo);
}

interface DashPiece {
  subpath: Subpath;
  length: number;
  /** Ends where it starts (O, 0, the bowl of b). */
  closed: boolean;
  /** Mean radius of its curves (Infinity for straight pieces). */
  radius: number;
}

const tangentIn = (from: Pt, s: Seg): Pt => (s.kind === 'L' ? sub(s.p, from) : dist(from, s.c1) > 1e-6 ? sub(s.c1, from) : sub(s.c2, from));
const tangentOut = (from: Pt, s: Seg): Pt => (s.kind === 'L' ? sub(s.p, from) : dist(s.c2, s.p) > 1e-6 ? sub(s.p, s.c2) : sub(s.p, s.c1));
function sub(a: Pt, b: Pt): Pt {
  return { x: a.x - b.x, y: a.y - b.y };
}
function angleBetween(a: Pt, b: Pt): number {
  let d = Math.abs(Math.atan2(b.y, b.x) - Math.atan2(a.y, a.x));
  if (d > Math.PI) d = 2 * Math.PI - d;
  return d;
}

/**
 * The pen-down runs of a stroke, cut at their sharp corners (V, Z, M, 7 …): each piece is dashed
 * on its own, so a corner is never lost in a gap. Smooth joins and the tiny segments of a
 * handwriting curve are not cut.
 */
export function dashPieces(subpaths: Subpath[], w: number): DashPiece[] {
  const out: DashPiece[] = [];
  for (const sp of subpaths) {
    const cuts: Subpath[] = [];
    let cur: Subpath = { start: sp.start, segs: [] };
    let pen = sp.start;
    sp.segs.forEach((seg, i) => {
      const next = sp.segs[i + 1];
      cur.segs.push(seg);
      if (next) {
        const here = tangentOut(pen, seg), there = tangentIn(seg.p, next);
        const long = Math.hypot(here.x, here.y) > w * 0.8 && Math.hypot(there.x, there.y) > w * 0.8;
        if (long && angleBetween(here, there) > (40 * Math.PI) / 180) {
          cuts.push(cur);
          cur = { start: seg.p, segs: [] };
        }
      }
      pen = seg.p;
    });
    cuts.push(cur);
    for (const piece of cuts) {
      const pts = flattenSubpath(piece);
      const length = polylineLength(pts);
      // how much the piece turns, over its curves only
      let turn = 0, curved = 0;
      let p0 = piece.start;
      for (const seg of piece.segs) {
        if (seg.kind === 'C') {
          const c = flattenSubpath({ start: p0, segs: [seg] });
          for (let k = 1; k < c.length; k++) {
            curved += dist(c[k - 1], c[k]);
            if (k > 1) turn += angleBetween(sub(c[k - 1], c[k - 2]), sub(c[k], c[k - 1]));
          }
        }
        p0 = seg.p;
      }
      out.push({
        subpath: piece,
        length,
        closed: length > w * 3 && dist(pts[0], pts[pts.length - 1]) < w * 0.3,
        radius: turn > 0.9 ? curved / turn : Infinity,
      });
    }
  }
  return out;
}

/** Dash + gap per unit of curve radius: a dash never spans more than about a tenth of a circle. */
const PERIOD_PER_RADIUS = 0.63;

/**
 * The dash period (dash + gap, glyph units) that suits a letter: the usual pattern for big, open
 * shapes (O, C, straight capitals), shorter dashes the tighter its curves are (the arch of n, the
 * bowl of a, the bends of s), so that a curve always shows as several dashes following its shape.
 */
export function dashPeriod(glyph: Glyph, style: GlyphStyle): number {
  const w = style.strokeWidth;
  const spec = dashSpec(style, w);
  let period = spec.on + spec.off;
  for (const stroke of glyph.strokes) {
    if (stroke.mark || isDotStroke(stroke)) continue;
    for (const piece of dashPieces(stroke.subpaths, w)) period = Math.min(period, piece.radius * PERIOD_PER_RADIUS);
  }
  return Math.max(spec.minOn + spec.minOff, period);
}

/**
 * [dash, gap] for a piece of the given length, as close to `period` as lets a whole number of
 * dashes fit exactly: the piece begins and ends on a dash (a closed one ends on a gap, so its
 * first and last dash do not run together). Undefined = too short to dash, draw it whole.
 */
export function fitDash(length: number, period: number, spec: DashSpec, closed = false): [number, number] | undefined {
  const lo = spec.minOn + spec.minOff, hi = spec.on + spec.off;
  const target = Math.max(lo, Math.min(hi, period));
  if (closed) {
    let n = Math.max(3, Math.round(length / target));
    while (n > 3 && length / n < lo) n--;
    const p = length / n;
    const g = Math.min(gapAt(p, spec), p * 0.75);
    return [p - g, g];
  }
  let n = Math.round((length + gapAt(target, spec)) / target);
  if (n < 2) n = length >= 2 * spec.minOn + spec.minOff ? 2 : 1;
  // n dashes and n − 1 gaps make up the length: n·period − gap(period) = length
  const b = hi - lo > 1e-6 ? (spec.off - spec.minOff) / (hi - lo) : 0;
  const a = spec.minOff - b * lo;
  for (; n >= 2; n--) {
    const p = (length + a) / (n - b);
    const g = p >= hi ? spec.off : p <= lo ? spec.minOff : a + b * p;
    const d = (length - (n - 1) * g) / n;
    if (d >= spec.minOn * 0.7) return [d, g];
  }
  return undefined;
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
