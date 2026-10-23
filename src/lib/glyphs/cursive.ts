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

export const SLANT = 0.3; // horizontal shift per unit of height (about 17°, like the oblique lines of a "tip I" notebook)

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
  b: { w: 40, body: `${LOOP_UP} L 4 92 C 5 100 12 101 20 98 C 30 94 34 74 32 62 C 31 54 24 50 22 56 C 21 61 30 58 38 52`, exit: 'high' },
  c: { w: 40, body: 'M 31 55 C 28 49 20 50 15 54 C 6 60 4 80 8 92 C 12 101 24 101 32 92', exit: 'low' },
  d: { w: 48, body: `${OVAL} L 38 2 L 37 92`, exit: 'low' },
  e: { w: 40, body: 'M 4 82 C 18 78 30 70 30 60 C 30 52 22 49 15 53 C 6 59 4 78 8 90 C 12 100 24 101 32 93', exit: 'low' },
  f: { w: 36, body: 'M 4 74 C 16 46 22 8 14 4 C 6 0 6 30 6 60 L 6 138 C 6 150 18 150 18 138 C 18 124 10 108 7 99 C 14 100 22 98 28 95', exit: 'low' },
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
  p: { w: 44, body: 'M 8 52 L 6 146 L 7 98 C 8 72 16 54 27 54 C 36 54 39 66 37 78 C 35 92 24 101 14 98 C 24 102 34 98 40 90', exit: 'low' },
  q: { w: 52, body: `${OVAL} L 37 52 L 37 136 C 37 150 48 150 48 138 C 48 124 40 110 38 100 C 42 98 46 97 50 95`, exit: 'low' },
  r: { w: 34, body: 'M 8 50 C 12 58 20 58 28 48 C 27 62 25 80 24 92', exit: 'low' },
  s: { w: 38, body: 'M 12 50 C 20 62 30 76 26 90 C 23 99 10 101 6 94 C 12 98 26 98 34 88', exit: 'low' },
  t: { w: 26, body: 'M 14 20 L 12 92', exit: 'low', extra: ['M 2 50 L 26 50'] },
  u: { w: 44, body: 'M 8 52 L 6 82 C 6 96 12 100 18 100 C 28 100 32 88 32 74 L 32 52 L 32 92', exit: 'low' },
  v: { w: 44, body: 'M 4 56 C 6 51 12 51 12 58 C 12 76 16 98 24 98 C 32 98 34 80 34 56 C 34 50 30 50 30 54 C 30 58 36 54 42 52', exit: 'high' },
  w: {
    w: 58,
    body: 'M 4 56 C 6 51 12 51 12 58 C 12 76 14 98 21 98 C 28 98 30 86 30 72 C 30 86 32 98 39 98 C 46 98 48 80 48 56 C 48 50 44 50 44 54 C 44 58 50 54 56 52',
    exit: 'high',
  },
  x: { w: 40, body: 'M 4 56 C 8 51 16 51 20 58 L 30 94', exit: 'low', extra: ['M 34 56 L 14 96'] },
  y: { w: 50, body: 'M 8 52 L 6 82 C 6 96 12 100 18 100 C 28 100 32 88 32 74 L 32 52 L 32 138 C 32 151 22 151 22 140 C 22 128 36 110 46 98', exit: 'low' },
  z: { w: 44, body: 'M 4 56 C 10 50 26 50 30 56 C 30 64 20 74 14 76 C 26 76 34 88 32 104 C 30 130 18 152 11 142 C 5 132 24 112 40 98', exit: 'low' },
};

LOWER['ă'] = { ...LOWER.a, extra: [BREVE], marks: 1 };
LOWER['â'] = { ...LOWER.a, extra: [HAT], marks: 1 };
LOWER['î'] = { ...LOWER.i, extra: ['M 1 44 L 10 35 L 19 44'], marks: 1 };
LOWER['ș'] = { ...LOWER.s, extra: ['M 18 106 C 19 114 16 121 10 126'], marks: 1 };
LOWER['ț'] = { ...LOWER.t, extra: [...LOWER.t.extra!, 'M 13 106 C 14 114 11 121 5 126'], marks: 1 };

const STEM = (x: number) => `M ${x + 4} 6 C ${x + 4} 40 ${x + 2} 70 ${x - 2} 98`;

const UPPER: Record<string, CursiveDef> = {
  A: { w: 76, body: 'A 34 56 24 44 -30 -390 L 62 8 L 62 92 C 62 100 68 101 74 96', exit: 'none' },
  B: { w: 60, body: STEM(10), exit: 'none', extra: ['M 6 14 C 20 0 50 0 50 24 C 50 40 34 48 22 48 C 44 48 58 58 56 76 C 54 96 30 102 10 96'] },
  C: { w: 64, body: 'M 56 18 C 54 6 44 2 34 4 C 14 8 4 36 6 62 C 8 88 24 100 40 98 C 50 97 58 90 62 82', exit: 'none' },
  D: { w: 66, body: 'M 18 8 C 16 40 14 70 10 96 C 6 102 0 98 4 94 C 20 100 50 100 60 70 C 70 36 50 4 26 4 C 14 4 6 12 8 20', exit: 'none' },
  E: { w: 60, body: 'M 50 14 C 46 2 22 2 18 18 C 15 32 26 44 36 46 C 16 46 6 60 8 76 C 10 96 40 104 56 86', exit: 'none' },
  F: { w: 60, body: 'M 6 10 C 20 2 40 12 58 4', exit: 'none', extra: ['M 30 8 C 30 40 28 70 22 92 C 18 102 8 100 4 92', 'M 16 52 L 42 52'] },
  G: { w: 64, body: 'M 56 18 C 54 6 44 2 34 4 C 14 8 4 36 6 62 C 8 88 24 100 40 98 C 52 96 58 84 58 66 L 58 54 L 40 54', exit: 'none' },
  H: { w: 60, body: STEM(10), exit: 'none', extra: [STEM(50), 'M 12 52 L 52 50'] },
  I: { w: 42, body: 'M 12 14 C 22 2 40 4 38 16 C 36 40 30 70 26 94 C 22 104 8 100 6 90', exit: 'none' },
  J: { w: 46, body: 'M 12 14 C 22 2 44 4 42 16 L 38 120 C 36 146 14 146 14 130 C 14 116 32 104 46 98', exit: 'none' },
  K: { w: 56, body: STEM(8), exit: 'none', extra: ['M 52 8 C 40 26 26 44 14 54 C 28 56 38 80 50 98'] },
  L: { w: 58, body: 'M 40 16 C 40 4 26 2 24 16 C 22 40 22 70 14 90 C 8 100 2 96 8 92 C 20 88 40 100 56 96', exit: 'none' },
  M: { w: 60, body: 'M 4 98 C 8 70 12 30 16 6 C 22 40 28 70 32 90 C 36 70 42 40 50 6 C 52 40 54 70 56 98', exit: 'none' },
  N: { w: 56, body: 'M 4 98 C 8 70 12 30 16 6 C 24 40 34 70 44 96 C 46 70 48 40 52 4', exit: 'none' },
  O: { w: 60, body: 'A 32 52 26 46 -80 -440 C 40 2 48 4 52 10', exit: 'none' },
  P: { w: 58, body: STEM(10), exit: 'none', extra: ['M 8 14 C 20 2 54 0 54 26 C 54 48 30 54 14 50'] },
  Q: { w: 62, body: 'A 32 52 26 46 -80 -440 C 40 2 48 4 52 10', exit: 'none', extra: ['M 28 84 C 38 100 50 106 62 102'] },
  R: { w: 60, body: STEM(10), exit: 'none', extra: ['M 8 14 C 20 2 54 0 54 26 C 54 48 30 54 14 50 C 30 56 40 84 58 98'] },
  S: { w: 58, body: 'M 50 14 C 46 2 26 2 22 16 C 18 32 48 46 50 66 C 52 88 32 100 18 96 C 8 92 6 84 10 78', exit: 'none' },
  T: { w: 62, body: 'M 4 12 C 16 4 40 12 60 4', exit: 'none', extra: ['M 32 8 C 32 40 30 70 24 92 C 20 102 8 100 6 90'] },
  U: { w: 58, body: 'M 6 10 C 10 4 14 6 14 14 L 12 70 C 12 92 20 100 30 100 C 44 100 50 86 50 64 L 50 6 L 50 92 C 50 100 56 101 58 96', exit: 'none' },
  V: { w: 64, body: 'M 6 10 C 10 4 14 6 14 14 C 18 50 22 80 30 98 C 40 70 48 30 56 6 C 58 2 62 4 64 8', exit: 'none' },
  W: { w: 70, body: 'M 4 8 C 8 40 12 80 18 98 C 24 70 28 40 34 30 C 38 50 42 80 46 98 C 52 70 60 30 68 6', exit: 'none' },
  X: { w: 62, body: 'M 6 10 C 20 4 30 30 34 50 C 38 70 46 96 60 92', exit: 'none', extra: ['M 58 8 C 40 30 26 70 8 96'] },
  Y: { w: 62, body: 'M 6 10 C 10 4 14 6 14 14 L 12 60 C 12 76 20 82 28 82 C 40 82 48 70 48 52 L 48 6 L 48 120 C 48 146 26 148 26 134 C 26 120 44 106 60 98', exit: 'none' },
  Z: { w: 60, body: 'M 8 12 C 20 2 46 6 54 6 C 40 30 24 60 8 94 C 24 100 40 92 58 96', exit: 'none' },
};

UPPER['Ă'] = { ...UPPER.A, extra: ['A 36 -12 10 7 160 20'], marks: 1 };
UPPER['Â'] = { ...UPPER.A, extra: ['M 26 -6 L 36 -16 L 46 -6'], marks: 1 };
UPPER['Î'] = { ...UPPER.I, extra: ['M 24 -6 L 34 -16 L 44 -6'], marks: 1 };
UPPER['Ș'] = { ...UPPER.S, extra: ['M 30 106 C 31 114 28 121 22 126'], marks: 1 };
UPPER['Ț'] = { ...UPPER.T, extra: [...UPPER.T.extra!, 'M 26 106 C 27 114 24 121 18 126'], marks: 1 };

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
