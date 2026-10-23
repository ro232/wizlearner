import type { Glyph, Pt, Seg, Stroke, Subpath } from './types';
import { flattenSubpath } from './geometry';
import { normalizeKey } from './data';
import MODEL from './cursive-model.json';

/**
 * Handwriting letters ("litere de mână") as taught in the first grade.
 *
 * The shapes are traced from the handwriting alphabet of the approved first-grade textbook
 * (Comunicare în limba română, clasa I, Editura Art, 2023 — manuale.edu.ro), where every letter
 * is drawn as a centre line on "tip I" ruling. scripts/trace-cursive.py turns those lines into
 * cursive-model.json: one polyline per stroke, in writing order (lead-in first), in glyph units
 * (x-height line 50, baseline 100). The slant is the book's own.
 *
 * Words are joined the way the book joins them: each small letter carries on from where the
 * previous one ended — its lead-in is cut where it reaches that height, or, for letters that
 * start at the top (m, n, v, w, y, z), a short bridge leads up to their first arch.
 */

/** Slope of the oblique lines of the ruling (horizontal shift per unit of height), matching the book. */
export const SLANT = 0.36;

export type Entry = 'start' | 'low' | 'high' | 'none';

interface ModelLetter {
  strokes: number[][][];
  marks: number[];
}

const DATA = MODEL as unknown as Record<string, ModelLetter>;
/** Letters made of a closed oval that the lead-in runs into. */
const OVAL_LETTERS = ['a', 'ă', 'â', 'd', 'g', 'q', 'o'];
const UPPER_GAP = 3; // capitals are not joined: a little room before the next letter
const SPACE = 34;

export function hasCursive(ch: string): boolean {
  return normalizeKey(ch) in DATA;
}

const isUpper = (k: string) => k !== k.toLowerCase();

function toPts(poly: number[][]): Pt[] {
  return poly.map(([x, y]) => ({ x, y }));
}

function subpathOf(pts: Pt[]): Subpath {
  const segs: Seg[] = pts.slice(1).map((p) => ({ kind: 'L', p }));
  return { start: pts[0], segs };
}

function shift(pts: Pt[], dx: number): Pt[] {
  return pts.map((p) => ({ x: p.x + dx, y: p.y }));
}

/** The stroke that carries the exit tail: the long stroke ending furthest to the right. */
function exitStrokeIndex(letter: ModelLetter): number {
  const lens = letter.strokes.map((s) => s.length);
  const big = Math.max(...lens);
  let best = 0;
  letter.strokes.forEach((s, i) => {
    if (letter.marks.includes(i) || s.length < big * 0.3) return;
    if (s[s.length - 1][0] > letter.strokes[best][letter.strokes[best].length - 1][0]) best = i;
  });
  return best;
}

function strokesToGlyph(key: string, polys: { pts: Pt[]; mark: boolean; main: boolean }[]): Glyph {
  const strokes: Stroke[] = polys.map((p) => ({
    subpaths: [subpathOf(p.pts)],
    arrowAt: p.mark ? null : p.main ? [0.3, 0.72] : undefined,
    ...(p.mark ? { mark: true } : {}),
  }));
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const st of strokes)
    for (const sp of st.subpaths)
      for (const p of flattenSubpath(sp)) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      }
  return { key, strokes, width: maxX - minX, bbox: { minX, minY, maxX, maxY } };
}

const cache = new Map<string, Glyph>();

/** One handwriting letter on its own, as in the book (lead-in, letter, exit tail). */
export function cursiveGlyph(ch: string): Glyph | undefined {
  const k = normalizeKey(ch);
  const hit = cache.get(k);
  if (hit) return hit;
  const letter = DATA[k];
  if (!letter) return undefined;
  const g = strokesToGlyph(
    `cur:${k}`,
    letter.strokes.map((s, i) => ({ pts: toPts(s), mark: letter.marks.includes(i), main: i === 0 })),
  );
  cache.set(k, g);
  return g;
}

/** A smooth bridge (sampled cubic) from a to b, leaving along da and arriving along db. */
function bridge(a: Pt, da: Pt, b: Pt, db: Pt): Pt[] {
  const k = Math.hypot(b.x - a.x, b.y - a.y) * 0.4;
  const c1 = { x: a.x + da.x * k, y: a.y + da.y * k };
  const c2 = { x: b.x - db.x * k, y: b.y - db.y * k };
  const out: Pt[] = [];
  for (let i = 1; i <= 12; i++) {
    const t = i / 12, u = 1 - t;
    out.push({
      x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x,
      y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y,
    });
  }
  return out;
}

function dirAt(pts: Pt[], i: number, forward: boolean): Pt {
  const j = forward ? Math.min(pts.length - 1, i + 4) : Math.max(0, i - 4);
  const a = forward ? pts[i] : pts[j];
  const b = forward ? pts[j] : pts[i];
  const n = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: (b.x - a.x) / n, y: (b.y - a.y) / n };
}

/**
 * For a, ă, â, d, g, q, o (traced as: lead-in up to the top of the oval, round the oval to the
 * left, then the stem): the same path started at the top of the oval, without the lead-in.
 */
function ovalFromTop(main: Pt[]): Pt[] | undefined {
  const half = Math.floor(main.length * 0.5);
  let top = 0;
  for (let i = 1; i < half; i++) if (main[i].y < main[top].y) top = i;
  return top > 2 ? main.slice(top) : undefined;
}

/**
 * A word written as one joined line. Small letters join; capitals stand on their own, as in the
 * book. Characters without a handwriting form are skipped.
 */
export function cursiveWord(text: string): Glyph | undefined {
  const out: { pts: Pt[]; mark: boolean; main: boolean }[] = [];
  let cursorX = 0; // right edge of what is written so far (for capitals, spaces and the first letter)
  let prevEnd: { p: Pt; d: Pt } | null = null;
  let prevMaxX = -Infinity;
  for (const raw of normalizeKey(text)) {
    if (raw === ' ' || raw === '-') {
      cursorX += SPACE;
      prevEnd = null;
      continue;
    }
    const letter = DATA[raw];
    if (!letter) continue;
    const exitIdx = exitStrokeIndex(letter);
    const strokes = letter.strokes.map(toPts);
    let main = strokes[0];
    let dx: number;
    let lead: Pt[] = [];

    if (prevEnd && !isUpper(raw)) {
      const E = prevEnd.p;
      const startsLow = main[0].y > 80; // lead-in from the baseline (most letters)
      const MID = 76; // middle of the small-letter body
      const half = Math.floor(main.length * 0.5);
      const firstAt = (h: number) => { for (let i = 0; i < half; i++) if (main[i].y <= h) return i; return -1; };
      const oval = OVAL_LETTERS.includes(raw) ? ovalFromTop(main) : undefined;
      const afterHigh = E.y < MID;
      if (startsLow && afterHigh && (raw === 'e' || raw === 'r') && firstAt(88) >= 0) {
        // e and r after o, b, v, w: the joining line dips to the foot of the lead-in, so it stays clear of the loop
        const i = firstAt(88);
        const target = main[i];
        dx = E.x + 7 - target.x;
        const rest = main.slice(i);
        lead = bridge(E, prevEnd.d, { x: target.x + dx, y: target.y }, dirAt(rest, 0, true));
        main = rest;
      } else if (startsLow && !(afterHigh && oval) && firstAt(E.y) >= 0) {
        // the previous letter ended low: carry on where this lead-in reaches that height
        const cut = firstAt(E.y);
        dx = E.x - main[cut].x;
        main = main.slice(cut);
        lead = [E]; // start exactly where the previous letter ended
      } else if (startsLow && oval) {
        // after o, b, v, w the pen comes along the top: a, d, g, q, o start at the top of their oval
        const target = oval[0];
        dx = E.x + Math.max(8, Math.abs(target.y - E.y) * 0.6) - target.x;
        lead = bridge(E, prevEnd.d, { x: target.x + dx, y: target.y }, dirAt(oval, 0, true));
        main = oval;
      } else if (startsLow && firstAt(MID) > 0) {
        // after o, b, v, w: swing down to the middle of this letter's lead-in
        const i = firstAt(MID);
        const target = main[i];
        dx = E.x + Math.max(6, (target.y - E.y) * 0.5) - target.x;
        const rest = main.slice(i);
        lead = bridge(E, prevEnd.d, { x: target.x + dx, y: target.y }, dirAt(rest, 0, true));
        main = rest;
      } else {
        // m, n, v, w, y, z start at the top: a short bridge leads up to them
        const rise = Math.max(4, E.y - main[0].y);
        dx = E.x + rise * 0.55 - main[0].x;
        const start = { x: main[0].x + dx, y: main[0].y };
        lead = bridge(E, prevEnd.d, start, dirAt(main, 0, true));
      }
    } else {
      const minX = Math.min(...strokes.flat().map((p) => p.x));
      dx = cursorX + (out.length ? UPPER_GAP : 0) - minX;
    }

    strokes[0] = main;
    // never write over the previous letter (s ends inside itself; c curls back to the left):
    // move this letter right and join it with a short line instead
    if (prevEnd && !isUpper(raw)) {
      const minX = Math.min(...strokes.flat().map((p) => p.x + dx));
      const extra = prevMaxX - 4 - minX;
      if (extra > 0) {
        dx += extra;
        const start = { x: main[0].x + dx, y: main[0].y };
        lead = [...bridge(prevEnd.p, prevEnd.d, start, dirAt(main, 0, true))];
      }
    }
    const from = prevEnd;
    strokes.forEach((s, i) => {
      const moved = shift(s, dx);
      out.push({ pts: i === 0 && lead.length && from ? (lead.length === 1 ? [from.p, ...moved] : [from.p, ...lead.slice(0, -1), ...moved]) : moved, mark: letter.marks.includes(i), main: i === 0 });
    });
    const ex = shift(strokes[exitIdx], dx);
    cursorX = Math.max(cursorX, ...strokes.flat().map((p) => p.x + dx));
    prevEnd = isUpper(raw) ? null : { p: ex[ex.length - 1], d: dirAt(ex, ex.length - 1, false) };
    // right edge of this letter's body (its exit tail left out: the next letter may start over it)
    const body = strokes.flatMap((st, i) => (i === exitIdx ? st.slice(0, Math.max(1, st.length - 8)) : st));
    prevMaxX = Math.max(...body.map((p) => p.x + dx));
  }
  if (!out.length) return undefined;
  return strokesToGlyph(`cur:${text}`, out);
}
