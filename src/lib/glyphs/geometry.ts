import type { Pt, Seg, Subpath, Stroke, GlyphDef, Glyph, DrawOp } from './types';

/**
 * Stroke DSL
 * ----------
 *   M x y                      start a new pen-down run at (x, y)
 *   L x y                      straight line to (x, y)
 *   C x1 y1 x2 y2 x y          cubic bezier to (x, y)
 *   A cx cy rx ry a0 a1        elliptical arc around (cx, cy) from angle a0 to a1
 *                              (degrees, screen angles: 0 = right, 90 = down,
 *                              -90 = up; a1 < a0 goes counter-clockwise on screen)
 *   l x y                      lift the pen and continue from (x, y) (not drawn,
 *                              same numbered stroke)
 * An arc may open a stroke; otherwise the pen must already be at its start point
 * (a short connecting line is inserted when it is not).
 */

const DEG = Math.PI / 180;

export function arcPoint(cx: number, cy: number, rx: number, ry: number, deg: number): Pt {
  return { x: cx + rx * Math.cos(deg * DEG), y: cy + ry * Math.sin(deg * DEG) };
}

/** Convert an elliptical arc into cubic segments (max 90° each). */
export function arcToCubics(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number): Seg[] {
  const segs: Seg[] = [];
  const total = a1 - a0;
  if (Math.abs(total) < 1e-9) return segs;
  const pieces = Math.max(1, Math.ceil(Math.abs(total) / 90 - 1e-9));
  const step = total / pieces;
  for (let i = 0; i < pieces; i++) {
    const t1 = (a0 + step * i) * DEG;
    const t2 = (a0 + step * (i + 1)) * DEG;
    const k = (4 / 3) * Math.tan((t2 - t1) / 4);
    const p0 = { x: Math.cos(t1), y: Math.sin(t1) };
    const p3 = { x: Math.cos(t2), y: Math.sin(t2) };
    const c1 = { x: p0.x - k * Math.sin(t1), y: p0.y + k * Math.cos(t1) };
    const c2 = { x: p3.x + k * Math.sin(t2), y: p3.y - k * Math.cos(t2) };
    segs.push({
      kind: 'C',
      c1: { x: cx + rx * c1.x, y: cy + ry * c1.y },
      c2: { x: cx + rx * c2.x, y: cy + ry * c2.y },
      p: { x: cx + rx * p3.x, y: cy + ry * p3.y },
    });
  }
  return segs;
}

export function parseStroke(dsl: string): Subpath[] {
  const tok = dsl.trim().split(/[\s,]+/);
  const subpaths: Subpath[] = [];
  let cur: Subpath | null = null;
  let pen: Pt | null = null;
  let i = 0;
  const num = () => {
    const v = parseFloat(tok[i++]);
    if (Number.isNaN(v)) throw new Error(`Bad number in stroke "${dsl}"`);
    return v;
  };
  const begin = (p: Pt): Subpath => {
    const sp: Subpath = { start: p, segs: [] };
    subpaths.push(sp);
    pen = p;
    return sp;
  };
  while (i < tok.length) {
    const cmd = tok[i++];
    switch (cmd) {
      case 'M':
      case 'l': {
        cur = begin({ x: num(), y: num() });
        break;
      }
      case 'L': {
        const p = { x: num(), y: num() };
        if (!cur) cur = begin(p);
        else {
          cur.segs.push({ kind: 'L', p });
          pen = p;
        }
        break;
      }
      case 'C': {
        const c1 = { x: num(), y: num() };
        const c2 = { x: num(), y: num() };
        const p = { x: num(), y: num() };
        if (!cur) throw new Error(`C before M in stroke "${dsl}"`);
        cur.segs.push({ kind: 'C', c1, c2, p });
        pen = p;
        break;
      }
      case 'A': {
        const cx = num(), cy = num(), rx = num(), ry = num(), a0 = num(), a1 = num();
        const start = arcPoint(cx, cy, rx, ry, a0);
        if (!cur) cur = begin(start);
        else if (pen && dist(pen, start) > 0.05) cur.segs.push({ kind: 'L', p: start });
        for (const s of arcToCubics(cx, cy, rx, ry, a0, a1)) cur.segs.push(s);
        pen = arcPoint(cx, cy, rx, ry, a1);
        break;
      }
      case '':
        break;
      default:
        throw new Error(`Unknown command "${cmd}" in stroke "${dsl}"`);
    }
  }
  return subpaths;
}

export function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function cubicAt(p0: Pt, c1: Pt, c2: Pt, p3: Pt, t: number): Pt {
  const mt = 1 - t;
  const a = mt * mt * mt, b = 3 * mt * mt * t, c = 3 * mt * t * t, d = t * t * t;
  return { x: a * p0.x + b * c1.x + c * c2.x + d * p3.x, y: a * p0.y + b * c1.y + c * c2.y + d * p3.y };
}

/** Sample a subpath into a polyline (for lengths, arrows, bounding boxes). */
export function flattenSubpath(sp: Subpath, samplesPerCurve = 16): Pt[] {
  const pts: Pt[] = [sp.start];
  let pen = sp.start;
  for (const s of sp.segs) {
    if (s.kind === 'L') pts.push(s.p);
    else for (let k = 1; k <= samplesPerCurve; k++) pts.push(cubicAt(pen, s.c1, s.c2, s.p, k / samplesPerCurve));
    pen = s.p;
  }
  return pts;
}

export function polylineLength(pts: Pt[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += dist(pts[i - 1], pts[i]);
  return len;
}

/** Point and unit tangent at a fraction (0..1) of a polyline's length. */
export function pointAlong(pts: Pt[], fraction: number): { p: Pt; dir: Pt } {
  const total = polylineLength(pts);
  if (pts.length < 2 || total === 0) return { p: pts[0], dir: { x: 1, y: 0 } };
  let target = Math.max(0, Math.min(1, fraction)) * total;
  for (let i = 1; i < pts.length; i++) {
    const d = dist(pts[i - 1], pts[i]);
    if (target <= d || i === pts.length - 1) {
      const t = d === 0 ? 0 : target / d;
      const p = { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t };
      // Tangent from a small window around the point for smoother curves.
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i)];
      let dx = b.x - a.x, dy = b.y - a.y;
      const n = Math.hypot(dx, dy) || 1;
      dx /= n; dy /= n;
      return { p, dir: { x: dx, y: dy } };
    }
    target -= d;
  }
  return { p: pts[pts.length - 1], dir: { x: 1, y: 0 } };
}

export function strokeLength(stroke: Stroke): number {
  return stroke.subpaths.reduce((acc, sp) => acc + polylineLength(flattenSubpath(sp)), 0);
}

export function strokeStart(stroke: Stroke): Pt {
  return stroke.subpaths[0].start;
}

export function buildGlyph(key: string, def: GlyphDef): Glyph {
  const strokes: Stroke[] = def.strokes.map((dsl, i) => {
    const a = def.arrows?.[i];
    return { subpaths: parseStroke(dsl), arrowAt: a === undefined ? undefined : a };
  });
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const st of strokes)
    for (const sp of st.subpaths)
      for (const p of flattenSubpath(sp)) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      }
  return { key, strokes, width: def.width, bbox: { minX, minY, maxX, maxY } };
}

// ───────────────────────── draw-op helpers ─────────────────────────

export function transformPt(p: Pt, tx: number, ty: number, s: number): Pt {
  return { x: tx + p.x * s, y: ty + p.y * s };
}

function transformSubpath(sp: Subpath, tx: number, ty: number, s: number): Subpath {
  return {
    start: transformPt(sp.start, tx, ty, s),
    segs: sp.segs.map((seg) =>
      seg.kind === 'L'
        ? { kind: 'L', p: transformPt(seg.p, tx, ty, s) }
        : { kind: 'C', c1: transformPt(seg.c1, tx, ty, s), c2: transformPt(seg.c2, tx, ty, s), p: transformPt(seg.p, tx, ty, s) }
    ),
  };
}

/** Resolve nested groups into a flat list of ops in the outer coordinate system. */
export function flattenOps(ops: DrawOp[], tx = 0, ty = 0, s = 1): Exclude<DrawOp, { t: 'group' }>[] {
  const out: Exclude<DrawOp, { t: 'group' }>[] = [];
  for (const op of ops) {
    switch (op.t) {
      case 'group':
        out.push(...flattenOps(op.ops, tx + op.tx * s, ty + op.ty * s, s * op.scale));
        break;
      case 'path':
        out.push({
          ...op,
          subpaths: op.subpaths.map((sp) => transformSubpath(sp, tx, ty, s)),
          strokeWidth: op.strokeWidth === undefined ? undefined : op.strokeWidth * s,
          dash: op.dash?.map((d) => d * s),
        });
        break;
      case 'circle':
        out.push({ ...op, cx: tx + op.cx * s, cy: ty + op.cy * s, r: op.r * s, strokeWidth: op.strokeWidth === undefined ? undefined : op.strokeWidth * s });
        break;
      case 'rect':
        out.push({
          ...op,
          x: tx + op.x * s,
          y: ty + op.y * s,
          w: op.w * s,
          h: op.h * s,
          rx: op.rx === undefined ? undefined : op.rx * s,
          strokeWidth: op.strokeWidth === undefined ? undefined : op.strokeWidth * s,
          dash: op.dash?.map((d) => d * s),
        });
        break;
      case 'line':
        out.push({ ...op, x1: tx + op.x1 * s, y1: ty + op.y1 * s, x2: tx + op.x2 * s, y2: ty + op.y2 * s, strokeWidth: op.strokeWidth * s, dash: op.dash?.map((d) => d * s) });
        break;
      case 'polygon':
        out.push({ ...op, points: op.points.map((p) => transformPt(p, tx, ty, s)), strokeWidth: op.strokeWidth === undefined ? undefined : op.strokeWidth * s });
        break;
      case 'text':
        out.push({ ...op, x: tx + op.x * s, y: ty + op.y * s, size: op.size * s });
        break;
    }
  }
  return out;
}

export type FlatOp = Exclude<DrawOp, { t: 'group' }>;

/** Mix a hex colour toward another (amount 0 = colour a, 1 = colour b). */
export function mixColor(a: string, b: string, amount: number): string {
  const pa = hexToRgb(a), pb = hexToRgb(b);
  const t = Math.max(0, Math.min(1, amount));
  const r = Math.round(pa[0] + (pb[0] - pa[0]) * t);
  const g = Math.round(pa[1] + (pb[1] - pa[1]) * t);
  const bl = Math.round(pa[2] + (pb[2] - pa[2]) * t);
  return '#' + [r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('');
}

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
