import type { Glyph, Pt, Seg, Stroke, Subpath } from './types';
import { dist, flattenSubpath, parseStroke } from './geometry';
import { normalizeKey as normalizeKeyCursive } from './data';

/**
 * Handwriting letters ("litere de mână"), the joined script children learn from the first grade.
 *
 * Letters are drawn upright in the same units as the print letters (ascender 0, x-height 50,
 * baseline 100, descenders down to about 150) and slanted when built. Every small letter has
 * one main stroke (the body); the lead-in and the joining stroke are added around it:
 *   - at the start of a word the pen comes up from the baseline;
 *   - inside a word it comes from the previous letter: from the middle of the upstroke
 *     after most letters, or along the top after o, b, v, w (they leave from the x-height).
 * So "mama" is written as one line, the way it is taught at school.
 */

export const SLANT = 0.36; // horizontal shift per unit of height (about 20°, the oblique lines of a "tip I" notebook)

type Exit = 'low' | 'high' | 'none';
export type Entry = 'start' | 'low' | 'high' | 'none';

interface CursiveDef {
  /** Advance: where the joining stroke ends (x). */
  w: number;
  /** The main stroke, starting at the point where the lead-in arrives. */
  body: string;
  exit: Exit;
  /** Further strokes in writing order: dots, bars, crossings, diacritics. */
  extra?: string[];
  /** How many of the last extra strokes are diacritic marks. */
  marks?: number;
}

// lead-in and joins (upright coordinates)
const LOW_JOIN = { p: { x: 0, y: 78 }, d: unit({ x: 1, y: -1.6 }) };
const HIGH_JOIN = { p: { x: 0, y: 52 }, d: unit({ x: 1, y: 0.25 }) };
const JOIN_ROOM = 6; // extra room for the joining stroke, so the letters of a word do not crowd
const START = { p: { x: -9, y: 100 }, d: unit({ x: 1, y: -1.1 }) };

// shapes reused by several letters
const OVAL = 'A 22 75 15 23 -75 -435'; // a, d, g, q: the pen arrives at the top and goes round to the left
const LOOP_UP = 'M 4 74 C 16 46 24 8 15 4 C 6 0 4 30 4 60'; // the tall loop of b, h, k, l
const BREVE = 'A 22 38 8 7 160 20';
const HAT = 'M 13 44 L 22 35 L 31 44';

const LOWER: Record<string, CursiveDef> = {
  a: { w: 48, body: `${OVAL} L 37 52 L 37 92`, exit: 'low' },
  b: { w: 40, body: `${LOOP_UP} L 4 92 C 5 100 12 101 20 98 C 30 94 34 74 32 62 C 31 52 20 48 18 56 C 17 64 30 60 40 52`, exit: 'high' },
  c: { w: 40, body: 'M 31 55 C 28 49 20 50 15 54 C 6 60 4 80 8 92 C 12 101 24 101 32 92', exit: 'low' },
  d: { w: 48, body: `${OVAL} L 38 2 L 37 92`, exit: 'low' },
  e: { w: 40, body: 'M 4 82 C 18 78 30 70 30 60 C 30 52 22 49 15 53 C 6 59 4 78 8 90 C 12 100 24 101 32 93', exit: 'low' },
  f: { w: 32, body: 'M 4 74 C 16 46 22 8 14 4 C 6 0 6 30 6 60 L 6 146 L 6 96 C 8 90 16 90 16 96 C 16 102 6 102 8 96 C 14 94 22 94 28 92', exit: 'low' },
  g: { w: 46, body: `${OVAL} L 37 52 L 37 136 C 37 151 22 153 20 143 C 18 132 30 112 42 98`, exit: 'low' },
  h: { w: 44, body: `${LOOP_UP} L 4 100 L 4 80 C 6 62 14 54 22 56 C 30 58 32 66 32 76 L 32 92`, exit: 'low' },
  i: { w: 22, body: 'M 10 52 L 9 92', exit: 'low', extra: ['M 11 34 L 11 34.01'] },
  j: { w: 34, body: 'M 10 52 L 10 138 C 10 151 -1 151 -1 140 C -1 128 16 110 30 96', exit: 'low', extra: ['M 11 34 L 11 34.01'] },
  k: { w: 42, body: `${LOOP_UP} L 4 100 L 4 82 C 10 64 26 54 30 62 C 33 70 22 76 12 76 C 20 78 26 86 30 94`, exit: 'low' },
  l: { w: 18, body: `${LOOP_UP} L 4 92`, exit: 'low' },
  m: {
    w: 66,
    body: 'M 4 56 C 6 52 10 52 10 58 L 10 100 L 10 78 C 12 60 18 54 24 54 C 30 54 32 62 32 72 L 32 100 L 32 78 C 34 60 40 54 46 54 C 52 54 54 62 54 72 L 54 92',
    exit: 'low',
  },
  n: { w: 44, body: 'M 4 56 C 6 52 10 52 10 58 L 10 100 L 10 78 C 12 60 18 54 24 54 C 30 54 32 62 32 72 L 32 92', exit: 'low' },
  o: { w: 38, body: 'A 20 75 15 23 -80 -440 C 24 50 30 50 36 52', exit: 'high' },
  p: { w: 46, body: 'M 8 52 L 6 146 L 7 80 C 10 60 18 54 26 54 C 34 54 36 62 36 72 L 36 92', exit: 'low' },
  q: { w: 50, body: `${OVAL} L 37 52 L 37 136 C 37 144 32 146 30 142 C 28 138 36 136 46 138`, exit: 'none' },
  r: { w: 46, body: 'M 10 54 C 12 40 28 42 18 58 C 13 64 12 80 11 100 L 11 82 C 14 62 20 56 26 56 C 32 56 34 64 34 74 L 34 92', exit: 'low' },
  s: { w: 38, body: 'M 12 50 C 20 62 30 76 26 90 C 23 99 10 101 6 94 C 12 98 26 98 34 88', exit: 'low' },
  t: { w: 26, body: 'M 14 20 L 12 92', exit: 'low', extra: ['M 2 50 L 26 50'] },
  u: { w: 44, body: 'M 8 52 L 6 82 C 6 96 12 100 18 100 C 28 100 32 88 32 74 L 32 52 L 32 92', exit: 'low' },
  v: { w: 44, body: 'M 4 56 C 6 51 12 51 12 58 C 12 76 16 98 24 98 C 32 98 34 80 34 56 C 34 50 30 50 30 54 C 30 58 36 54 42 52', exit: 'high' },
  w: {
    w: 58,
    body: 'M 4 56 C 6 51 12 51 12 58 C 12 76 14 98 21 98 C 28 98 30 86 30 72 C 30 86 32 98 39 98 C 46 98 48 80 48 56 C 48 50 44 50 44 54 C 44 58 50 54 56 52',
    exit: 'high',
  },
  x: { w: 50, body: 'M 6 56 C 12 50 24 52 23 66 C 22 82 14 96 4 96 l 42 58 C 38 50 28 52 24 64 C 21 78 26 98 36 98 C 40 98 44 94 46 90', exit: 'low' },
  y: { w: 50, body: 'M 8 52 L 6 82 C 6 96 12 100 18 100 C 28 100 32 88 32 74 L 32 52 L 32 138 C 32 151 22 151 22 140 C 22 128 36 110 46 98', exit: 'low' },
  z: { w: 48, body: 'M 6 58 C 12 50 22 56 32 52 L 8 98 C 16 94 26 102 36 98 C 40 96 42 94 44 90', exit: 'low', extra: ['M 12 76 L 30 76'] },
};

LOWER['ă'] = { ...LOWER.a, extra: [BREVE], marks: 1 };
LOWER['â'] = { ...LOWER.a, extra: [HAT], marks: 1 };
LOWER['î'] = { ...LOWER.i, extra: ['M 1 44 L 10 35 L 19 44'], marks: 1 };
LOWER['ș'] = { ...LOWER.s, extra: ['M 18 106 C 19 114 16 121 10 126'], marks: 1 };
LOWER['ț'] = { ...LOWER.t, extra: [...LOWER.t.extra!, 'M 13 106 C 14 114 11 121 5 126'], marks: 1 };

/** A capital's stem from the top line down, ending in the little curl to the left of the school model. */
const FOOT = (x: number, top = 8) => `M ${x} ${top} L ${x - 2} 86 C ${x - 2} 98 ${x - 12} 102 ${x - 18} 96 C ${x - 21} 92 ${x - 18} 86 ${x - 14} 88`;
/** Hook at the top left of I, J, H, K, U, V, W, Y. */
const CAP_HOOK = 'M 4 18 C 8 6 24 2 36 6';
/** Wavy bar at the top of F and T. */
const WAVE = 'M 8 16 C 12 6 22 6 32 8 C 44 10 52 6 62 2';
const BOWL_P = 'M 14 26 C 4 18 14 2 32 4 C 50 4 60 12 58 26 C 56 42 40 50 24 50';
const OVAL_O = 'A 32 52 24 46 -80 -440 C 38 -2 50 0 50 10 C 50 18 40 16 36 10';

const UPPER: Record<string, CursiveDef> = {
  A: { w: 72, body: 'M 0 90 C 2 100 12 100 18 90 C 28 70 36 30 42 4 C 46 34 50 70 54 90 C 56 98 62 100 68 94', exit: 'none', extra: ['M 12 58 C 24 50 36 64 56 54'] },
  B: { w: 62, body: FOOT(20, 6), exit: 'none', extra: ['M 6 18 C 14 2 50 -2 54 18 C 56 34 40 46 26 48 C 36 46 52 52 54 70 C 56 92 36 102 22 98'] },
  C: { w: 60, body: 'M 44 26 C 34 26 34 10 46 6 C 56 4 60 10 56 16 C 54 4 40 0 30 6 C 14 16 8 60 14 82 C 20 102 42 100 52 86', exit: 'none' },
  D: { w: 70, body: 'M 28 6 L 24 86 C 22 98 12 100 6 96 C 0 92 4 86 12 88 C 24 92 34 100 46 96 C 62 90 68 64 66 40 C 64 14 48 2 32 4 C 18 6 14 20 26 22', exit: 'none' },
  E: { w: 58, body: 'M 52 14 C 50 2 30 0 24 12 C 20 22 26 40 38 46 C 22 46 10 58 12 76 C 14 96 40 104 54 88', exit: 'none' },
  F: { w: 64, body: WAVE, exit: 'none', extra: [FOOT(34), 'M 20 52 L 44 52'] },
  G: { w: 66, body: 'M 44 26 C 34 26 34 10 46 6 C 56 4 60 10 56 16 C 54 4 40 0 30 6 C 14 16 8 60 14 82 C 20 102 42 100 50 86 C 54 76 56 62 56 50 L 56 92 C 56 100 62 100 66 96', exit: 'none' },
  H: { w: 76, body: `${CAP_HOOK} L 34 86 C 34 98 24 102 18 96 C 15 92 18 86 22 88`, exit: 'none', extra: ['M 10 66 C 34 58 54 30 60 10 C 62 2 70 2 70 10 L 64 88 C 64 98 72 100 78 94'] },
  I: { w: 46, body: `${CAP_HOOK} L 34 86 C 34 98 26 102 20 96 C 17 92 20 86 24 88`, exit: 'none' },
  J: { w: 52, body: `${CAP_HOOK} L 34 86 C 34 100 22 102 18 96 C 14 88 28 74 50 66`, exit: 'none' },
  K: { w: 68, body: `${CAP_HOOK} L 34 86 C 34 98 24 102 18 96 C 15 92 18 86 22 88`, exit: 'none', extra: ['M 70 10 C 64 2 54 6 46 18 C 40 28 34 44 30 54 C 44 50 48 70 52 90 C 54 98 62 100 68 94'] },
  L: { w: 60, body: 'M 40 20 C 50 14 52 2 44 2 C 34 2 30 30 28 56 C 26 80 22 94 12 96 C 2 98 2 88 10 88 C 22 88 32 98 44 98 C 52 98 56 94 58 90', exit: 'none' },
  M: { w: 84, body: 'M 0 90 C 2 100 12 100 18 90 C 26 70 32 30 38 4 C 40 40 42 70 44 96 C 52 70 62 30 72 4 L 68 88 C 68 98 76 100 82 94', exit: 'none' },
  N: { w: 78, body: 'M 0 90 C 2 100 12 100 18 90 C 26 70 32 30 38 4 C 40 40 42 70 44 96 C 52 70 60 30 66 8 C 68 2 74 2 76 8', exit: 'none' },
  O: { w: 60, body: OVAL_O, exit: 'none' },
  P: { w: 62, body: FOOT(26), exit: 'none', extra: [BOWL_P] },
  Q: { w: 62, body: OVAL_O, exit: 'none', extra: ['M 18 88 C 26 100 40 104 56 98'] },
  R: { w: 66, body: FOOT(26), exit: 'none', extra: [`${BOWL_P} C 38 54 44 76 50 90 C 52 98 60 100 66 94`] },
  S: { w: 64, body: 'M 2 90 C 4 100 14 100 20 90 C 28 74 32 40 38 18 C 42 4 58 -2 66 6 C 74 16 60 30 44 26 C 34 22 28 14 28 8', exit: 'none' },
  T: { w: 64, body: WAVE, exit: 'none', extra: [FOOT(34)] },
  U: { w: 68, body: 'M 4 18 C 8 6 20 4 22 14 L 18 72 C 16 92 26 100 36 100 C 48 100 54 86 54 64 L 56 6 L 54 90 C 54 98 60 100 66 94', exit: 'none' },
  V: { w: 72, body: 'M 4 18 C 8 6 20 4 22 14 C 22 50 20 80 26 94 C 30 100 38 100 44 90 C 52 74 56 30 60 10 C 62 0 74 0 74 10 C 74 20 62 20 58 12', exit: 'none' },
  W: { w: 90, body: 'M 4 18 C 8 6 20 4 22 14 C 22 50 18 80 22 94 C 26 100 34 100 38 90 C 42 76 42 50 42 36 C 42 60 44 86 50 96 C 56 102 64 98 68 86 C 74 66 76 30 78 10 C 80 0 92 0 92 10 C 92 20 80 20 76 12', exit: 'none' },
  X: { w: 70, body: 'M 6 12 C 16 2 32 10 32 40 C 32 70 22 92 10 96 C 4 98 0 94 2 90', exit: 'none', extra: ['M 66 12 C 58 2 40 10 38 40 C 36 70 44 92 56 96 C 62 98 68 94 68 90', 'M 22 52 L 48 52'] },
  Y: { w: 66, body: 'M 4 18 C 8 6 20 4 22 14 L 18 60 C 16 76 24 84 34 84 C 46 84 52 70 52 52 L 56 6 L 52 120 C 50 146 30 148 30 134 C 30 120 46 106 62 98', exit: 'none' },
  Z: { w: 64, body: 'M 6 16 C 12 4 30 10 42 6 C 48 4 54 2 58 4 C 42 30 22 70 6 96 C 20 92 34 102 52 96 C 56 94 60 92 62 90', exit: 'none', extra: ['M 18 52 L 46 52'] },
};

UPPER['Ă'] = { ...UPPER.A, extra: [...UPPER.A.extra!, 'A 44 -12 10 7 160 20'], marks: 1 };
UPPER['Â'] = { ...UPPER.A, extra: [...UPPER.A.extra!, 'M 34 -6 L 44 -16 L 54 -6'], marks: 1 };
UPPER['Î'] = { ...UPPER.I, extra: ['M 24 -6 L 34 -16 L 44 -6'], marks: 1 };
UPPER['Ș'] = { ...UPPER.S, extra: ['M 12 108 C 13 116 10 123 4 128'], marks: 1 };
UPPER['Ț'] = { ...UPPER.T, extra: [...UPPER.T.extra!, 'M 22 108 C 23 116 20 123 14 128'], marks: 1 };

const DEFS: Record<string, CursiveDef> = { ...LOWER, ...UPPER };

export function hasCursive(ch: string): boolean {
  return normalizeKeyCursive(ch) in DEFS;
}

// ───────────────────────── building ─────────────────────────

function unit(p: Pt): Pt {
  const n = Math.hypot(p.x, p.y) || 1;
  return { x: p.x / n, y: p.y / n };
}

function firstDir(sp: Subpath): Pt {
  const s = sp.segs[0];
  if (!s) return { x: 0, y: 1 };
  if (s.kind === 'L') return unit({ x: s.p.x - sp.start.x, y: s.p.y - sp.start.y });
  const c = dist(s.c1, sp.start) > 0.01 ? s.c1 : s.c2;
  return unit({ x: c.x - sp.start.x, y: c.y - sp.start.y });
}

function lastPointDir(sp: Subpath): { p: Pt; d: Pt } {
  const s = sp.segs[sp.segs.length - 1];
  if (!s) return { p: sp.start, d: { x: 0, y: 1 } };
  const prev = sp.segs.length > 1 ? sp.segs[sp.segs.length - 2].p : sp.start;
  if (s.kind === 'L') return { p: s.p, d: unit({ x: s.p.x - prev.x, y: s.p.y - prev.y }) };
  const c = dist(s.c2, s.p) > 0.01 ? s.c2 : s.c1;
  return { p: s.p, d: unit({ x: s.p.x - c.x, y: s.p.y - c.y }) };
}

/** A smooth cubic from a (leaving along da) to b (arriving along db). */
function bridge(a: Pt, da: Pt, b: Pt, db: Pt, reach = 0.4, min = 6): Seg {
  const k = Math.max(dist(a, b) * reach, min);
  return { kind: 'C', c1: { x: a.x + da.x * k, y: a.y + da.y * k }, c2: { x: b.x - db.x * k, y: b.y - db.y * k }, p: b };
}

const slantPt = (p: Pt, dx: number): Pt => ({ x: p.x + (100 - p.y) * SLANT + dx, y: p.y });

function slantSubpath(sp: Subpath, dx: number): Subpath {
  return {
    start: slantPt(sp.start, dx),
    segs: sp.segs.map((s) => (s.kind === 'L' ? { kind: 'L', p: slantPt(s.p, dx) } : { kind: 'C', c1: slantPt(s.c1, dx), c2: slantPt(s.c2, dx), p: slantPt(s.p, dx) })),
  };
}

const advance = (def: CursiveDef) => def.w + (def.exit === 'none' ? 0 : JOIN_ROOM);

/** The strokes of one letter, upright, with the lead-in for `entry` and the joining stroke at the end. */
function letterStrokes(def: CursiveDef, entry: Entry, withExit: boolean): Stroke[] {
  const body = parseStroke(def.body);
  const first = body[0];
  const last = body[body.length - 1];
  if (entry !== 'none') {
    const from = entry === 'start' ? START : entry === 'high' ? HIGH_JOIN : LOW_JOIN;
    // When the body sets off backwards (the oval of a, the down stroke of i), the pen stops
    // and turns: arrive straight along the way it came, so the turn is a clean point.
    const tb = firstDir(first);
    const chord = unit({ x: first.start.x - from.p.x, y: first.start.y - from.p.y });
    const turns = tb.x * chord.x + tb.y * chord.y < 0.35;
    first.segs.unshift(bridge(from.p, from.d, first.start, turns ? unit({ x: chord.x + from.d.x * 0.3, y: chord.y + from.d.y * 0.3 }) : tb));
    first.start = from.p;
  }
  if (withExit && def.exit !== 'none') {
    const end = lastPointDir(last);
    const x = advance(def);
    const to = def.exit === 'high' ? { p: { x, y: HIGH_JOIN.p.y }, d: HIGH_JOIN.d } : { p: { x, y: LOW_JOIN.p.y }, d: LOW_JOIN.d };
    last.segs.push(bridge(end.p, end.d, to.p, to.d, 0.45, 8));
  }
  const strokes: Stroke[] = [{ subpaths: body, arrowAt: [0.3, 0.72] }];
  const extra = def.extra ?? [];
  extra.forEach((dsl, i) => {
    const mark = def.marks !== undefined && i >= extra.length - def.marks;
    strokes.push({ subpaths: parseStroke(dsl), arrowAt: mark ? null : undefined, ...(mark ? { mark: true } : {}) });
  });
  return strokes;
}

function toGlyph(key: string, strokes: Stroke[], width: number): Glyph {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const st of strokes)
    for (const sp of st.subpaths)
      for (const p of flattenSubpath(sp)) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      }
  return { key, strokes, width, bbox: { minX, minY, maxX, maxY } };
}

const cache = new Map<string, Glyph>();

/** One handwriting letter on its own (with the lead-in from the baseline and its joining tail). */
export function cursiveGlyph(ch: string): Glyph | undefined {
  const k = normalizeKeyCursive(ch);
  const hit = cache.get(k);
  if (hit) return hit;
  const def = DEFS[k];
  if (!def) return undefined;
  const isUpper = k in UPPER;
  const strokes = letterStrokes(def, isUpper ? 'none' : 'start', true).map((st) => ({ ...st, subpaths: st.subpaths.map((sp) => slantSubpath(sp, 0)) }));
  const g = toGlyph(`cur:${k}`, strokes, advance(def));
  cache.set(k, g);
  return g;
}

const UPPER_GAP = 6; // between a capital and the small letter after it (capitals are not joined)

/**
 * A word written as one joined line: each small letter takes over where the previous one
 * left (low or high). Characters without a handwriting form are skipped.
 */
export function cursiveWord(text: string): Glyph | undefined {
  const strokes: Stroke[] = [];
  let x = 0;
  let next: Entry = 'start';
  let any = false;
  for (const raw of text.normalize('NFC')) {
    const k = normalizeKeyCursive(raw);
    if (k === ' ' || k === '-') {
      x += 30;
      next = 'start';
      continue;
    }
    const def = DEFS[k];
    if (!def) continue;
    const isUpper = k in UPPER;
    if (isUpper && any) x += UPPER_GAP;
    const entry: Entry = isUpper ? 'none' : next;
    for (const st of letterStrokes(def, entry, true)) strokes.push({ ...st, subpaths: st.subpaths.map((sp) => slantSubpath(sp, x)) });
    any = true;
    x += advance(def) + (isUpper ? UPPER_GAP : 0);
    next = isUpper ? 'start' : def.exit === 'high' ? 'high' : def.exit === 'low' ? 'low' : 'start';
  }
  if (!any) return undefined;
  return toGlyph(`cur:${text}`, strokes, x);
}
