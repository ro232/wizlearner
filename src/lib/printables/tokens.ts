import type { DrawOp, PageOps } from '@/lib/glyphs/types';
import type { Tier } from '@/types';
import { glyphsForWord } from '@/lib/worksheet/layout';
import { A4, INK, MUTED, VOWEL, CONSONANT, ACCENT, CUT, CUT_DASH, cellAt, cutLines, drawRun, fitScale, freeMark, page, runExtent, type Grid } from './common';
import type { LetterCase } from './cards';

/**
 * „Jetoane”: small tokens to cut out, round or square, 30 mm across. Numbers with the signs
 * + − = < > for math games, or letters to build words with (vowels red, consonants blue, as in
 * the primer; more of the letters words need most). The letters fill one sheet: 54 tokens, without
 * Q, W, X, Y, which Romanian words hardly use.
 */

export type TokenSet = 'math' | 'letters';
export type TokenShape = 'round' | 'square';

export interface TokenOptions {
  set: TokenSet;
  shape: TokenShape;
  letterCase: LetterCase;
  /** Math tokens: numbers 0–10 (two of each) or 0–20. */
  numberMax: 10 | 20;
}

export const SIGNS = ['+', '−', '=', '<', '>'] as const;
export type Sign = (typeof SIGNS)[number];

/** How many of each letter a set has: the vowels and the most used consonants several times. */
export const LETTER_COUNTS: Record<string, number> = {
  A: 4, E: 4, I: 4, O: 3, U: 3, Ă: 2, Â: 1, Î: 1,
  M: 3, N: 3, R: 3, S: 2, T: 3, C: 2, L: 2, P: 2,
  B: 1, D: 2, F: 1, G: 1, H: 1, J: 1, K: 1, Ș: 1, Ț: 1, V: 1, Z: 1,
};
const LETTER_ORDER = ['A', 'Ă', 'Â', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'Î', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'Ș', 'T', 'Ț', 'U', 'V', 'Z'];
const VOWELS = new Set(['A', 'Ă', 'Â', 'E', 'I', 'Î', 'O', 'U']);

/** Every token of a set, in order (what is printed on each). */
export function tokenList(o: TokenOptions): string[] {
  if (o.set === 'letters') {
    return LETTER_ORDER.flatMap((l) => Array(LETTER_COUNTS[l]).fill(o.letterCase === 'upper' ? l : l.toLowerCase()));
  }
  const nums = Array.from({ length: o.numberMax + 1 }, (_, i) => String(i));
  const numbers = o.numberMax === 10 ? [...nums, ...nums] : nums;
  const signs: Record<Sign, number> = { '+': 4, '−': 4, '=': 5, '<': 3, '>': 3 };
  return [...numbers, ...SIGNS.flatMap((s) => Array(signs[s]).fill(s))];
}

export const TOKEN_GRID: Grid = { x: 15, y: 16, cols: 6, rows: 9, cw: 30, ch: 30 };

const isSign = (t: string): t is Sign => (SIGNS as readonly string[]).includes(t);

/** The signs, drawn as strokes (the glyph set has letters and digits only). */
function signOps(sign: Sign, cx: number, cy: number, r: number, color: string): DrawOp[] {
  const w = r * 0.3;
  const line = (x1: number, y1: number, x2: number, y2: number): DrawOp => ({ t: 'line', x1, y1, x2, y2, stroke: color, strokeWidth: w });
  switch (sign) {
    case '+': return [line(cx - r, cy, cx + r, cy), line(cx, cy - r, cx, cy + r)];
    case '−': return [line(cx - r, cy, cx + r, cy)];
    case '=': return [line(cx - r, cy - r * 0.42, cx + r, cy - r * 0.42), line(cx - r, cy + r * 0.42, cx + r, cy + r * 0.42)];
    case '<': return [{ t: 'path', subpaths: [{ start: { x: cx + r * 0.8, y: cy - r }, segs: [{ kind: 'L', p: { x: cx - r * 0.8, y: cy } }, { kind: 'L', p: { x: cx + r * 0.8, y: cy + r } }] }], stroke: color, strokeWidth: w, cap: 'round' }];
    case '>': return [{ t: 'path', subpaths: [{ start: { x: cx - r * 0.8, y: cy - r }, segs: [{ kind: 'L', p: { x: cx + r * 0.8, y: cy } }, { kind: 'L', p: { x: cx - r * 0.8, y: cy + r } }] }], stroke: color, strokeWidth: w, cap: 'round' }];
  }
}

export function tokenColor(token: string, set: TokenSet): string {
  if (isSign(token)) return ACCENT;
  if (set === 'math') return CONSONANT;
  return VOWELS.has(token.toUpperCase()) ? VOWEL : CONSONANT;
}

export function buildTokenPages(o: TokenOptions, tier: Tier): PageOps[] {
  const g = TOKEN_GRID;
  const tokens = tokenList(o);
  const runs = tokens.filter((t) => !isSign(t)).map((t) => glyphsForWord(t));
  const round = o.shape === 'round';
  const s = fitScale(runs, 12, g.cw - (round ? 15 : 11), g.ch - (round ? 13 : 9), round ? 0.15 : 0.17, 12);
  let top = 0, bottom = 100;
  for (const r of runs) {
    const e = runExtent(r, 12);
    top = Math.min(top, e.top);
    bottom = Math.max(bottom, e.bottom);
  }
  const per = g.cols * g.rows;
  const pages: PageOps[] = [];
  for (let start = 0; start < tokens.length; start += per) {
    const chunk = tokens.slice(start, start + per);
    const ops: DrawOp[] = [];
    const title = o.set === 'math' ? 'Jetoane · numere și semne' : 'Jetoane · litere';
    ops.push({ t: 'text', x: g.x, y: 10.5, text: title, size: 3.4, fill: INK, weight: 'bold' });
    ops.push({ t: 'text', x: g.x + g.cols * g.cw, y: 10.5, text: o.shape === 'round' ? 'Decupează pe cercul punctat' : 'Decupează pe linia punctată', size: 2.8, fill: MUTED, align: 'right' });
    chunk.forEach((token, i) => {
      const c = cellAt(g, i);
      const cx = c.x + g.cw / 2, cy = c.y + g.ch / 2;
      const color = tokenColor(token, o.set);
      if (o.shape === 'round') {
        ops.push({ t: 'path', subpaths: circlePath(cx, cy, g.cw / 2 - 1), stroke: CUT, strokeWidth: 0.3, dash: CUT_DASH, closed: true });
        ops.push({ t: 'circle', cx, cy, r: g.cw / 2 - 3, stroke: color, strokeWidth: 0.5 });
      } else {
        ops.push({ t: 'rect', x: c.x + 2.5, y: c.y + 2.5, w: g.cw - 5, h: g.ch - 5, rx: 2.5, stroke: color, strokeWidth: 0.5 });
      }
      if (isSign(token)) ops.push(...signOps(token, cx, cy, 6.5, color));
      else {
        // the ink of the whole set centred in the token, the same baseline for every token
        const baseline = cy - ((top + bottom) / 2 - 100) * s;
        drawRun(ops, glyphsForWord(token), cx, baseline, s, { variant: 'solid', stroke: 12, colors: color }, 12);
      }
    });
    if (o.shape === 'square') cutLines(ops, g, chunk.length, false);
    freeMark(ops, tier, A4, A4.w - 15, A4.h - 8);
    pages.push(page(A4, ops));
  }
  return pages;
}

/** A circle as four cubic arcs (so it can be dashed like any path). */
function circlePath(cx: number, cy: number, r: number) {
  const k = 0.5523 * r;
  return [{
    start: { x: cx + r, y: cy },
    segs: [
      { kind: 'C' as const, c1: { x: cx + r, y: cy + k }, c2: { x: cx + k, y: cy + r }, p: { x: cx, y: cy + r } },
      { kind: 'C' as const, c1: { x: cx - k, y: cy + r }, c2: { x: cx - r, y: cy + k }, p: { x: cx - r, y: cy } },
      { kind: 'C' as const, c1: { x: cx - r, y: cy - k }, c2: { x: cx - k, y: cy - r }, p: { x: cx, y: cy - r } },
      { kind: 'C' as const, c1: { x: cx + k, y: cy - r }, c2: { x: cx + r, y: cy - k }, p: { x: cx + r, y: cy } },
    ],
  }];
}
