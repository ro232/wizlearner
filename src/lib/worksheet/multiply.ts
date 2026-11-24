import type { DrawOp } from '@/lib/glyphs/types';
import type { WorksheetConfig } from '@/types';
import { hasIcon, iconOps } from '@/lib/hints/icons';
import { ACCENT, INK, MUTED, PAPER } from './rows';
import type { Exercise } from './math';

/**
 * „Înmulțire și împărțire”, clasa a II-a: „Înmulțirea în concentrul 0-100”, „Împărțirea cu rest 0 în
 * concentrul 0-100” (programme contents). The products of the tables 2…10 (a factor 1…10), so every
 * number is at most 100 and every division is exact.
 *
 *   mul      3 · 4 = □
 *   div      12 : 3 = □
 *   mulmiss  3 · □ = 12, □ · 4 = 12, □ : 3 = 4, 12 : □ = 4
 *
 * One table („tabla înmulțirii cu 3”, config.mathTable) or all of them mixed (0 / unset). With one
 * table the first column is the table in order (3 · 1 … 3 · 10), the second the same facts mixed up.
 *
 * „Grupe egale” (groups) is the way in: „3 grupe a câte 4” drawn with pictures, the child counts and
 * writes 4 + 4 + 4 = 12 (CP and clasa I: „adunări repetate … prin numărare și reprezentări
 * obiectuale”); in 0–1000 (clasa a II-a) also 3 · 4 = 12.
 */

export const MUL_TYPES = ['mul', 'div', 'mulmiss'] as const;
export type MulType = (typeof MUL_TYPES)[number];
/** 0: all the tables mixed; 2…10: that table. */
export const MATH_TABLES = [0, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;
/** The free plan: the table of 2. */
export const FREE_MATH_TABLE = 2;

export function isMulType(t: string): t is MulType {
  return (MUL_TYPES as readonly string[]).includes(t);
}

export function mathTableOf(config: Pick<WorksheetConfig, 'mathTable'>): number {
  const t = config.mathTable;
  return typeof t === 'number' && (MATH_TABLES as readonly number[]).includes(t) ? t : 0;
}

const DOT = '·';
const int = (rand: () => number, lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

function shuffle<T>(xs: T[], rand: () => number): T[] {
  const out = xs.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const mul = (a: number, b: number): Exercise => ({ cells: [String(a), DOT, String(b), '=', null], answer: String(a * b) });
const div = (a: number, b: number): Exercise => ({ cells: [String(a), ':', String(b), '=', null], answer: String(a / b) });

/** The four ways of hiding a number of k · b = p (k, b ≥ 1). */
function missing(k: number, b: number, form: number): Exercise {
  const p = k * b;
  switch (form % 4) {
    case 0: return { cells: [String(k), DOT, null, '=', String(p)], answer: String(b) };
    case 1: return { cells: [null, DOT, String(b), '=', String(p)], answer: String(k) };
    case 2: return { cells: [null, ':', String(k), '=', String(b)], answer: String(p) };
    default: return { cells: [String(p), ':', null, '=', String(b)], answer: String(k) };
  }
}

const key = (e: Exercise) => e.cells.join(' ');

/**
 * The exercises of one page, `count` of them (20 on a page), never one twice. With a table: the
 * table in order, then the same facts mixed up (the factors swapped, the other division, 0).
 */
export function mulExercises(type: MulType, table: number, rand: () => number, count = 20): Exercise[] {
  const out: Exercise[] = [];
  const seen = new Set<string>();
  const add = (e: Exercise) => {
    if (out.length >= count || seen.has(key(e))) return;
    seen.add(key(e));
    out.push(e);
  };
  if (table) {
    const k = table;
    const half = Math.ceil(count / 2);
    // the table in order: 3 · 1 … 3 · 10; 3 : 3 … 30 : 3; 3 · □ = 3 … 3 · □ = 30
    for (let b = 1; b <= 10 && out.length < half; b++) add(type === 'mul' ? mul(k, b) : type === 'div' ? div(k * b, k) : missing(k, b, 0));
    // then mixed up
    const rest: Exercise[] = [];
    for (let b = 1; b <= 10; b++) {
      if (type === 'mul') rest.push(mul(b, k));
      else if (type === 'div') rest.push(div(k * b, b));
      else for (let f = 1; f < 4; f++) rest.push(missing(k, b, f));
    }
    for (const e of shuffle(rest, rand)) add(e);
    if (type === 'mul') add(mul(k, 0));
    if (type === 'div') add({ cells: ['0', ':', String(k), '=', null], answer: '0' });
    return out;
  }
  for (let tries = 0; out.length < count && tries < count * 60; tries++) {
    const a = int(rand, 2, 10);
    const b = int(rand, 1, 10);
    if (type === 'mul') add(rand() < 0.5 ? mul(a, b) : mul(b, a));
    else if (type === 'div') add(div(a * b, a));
    else add(missing(a, b, int(rand, 0, 3)));
  }
  return out;
}

/** „Înmulțiri: tabla înmulțirii cu 3”, „Împărțiri (tabla împărțirii)”. */
export function mulTitle(type: MulType, table: number): string {
  if (type === 'mul') return table ? `Înmulțiri: tabla înmulțirii cu ${table}` : 'Înmulțiri (tabla înmulțirii, 0–100)';
  if (type === 'div') return table ? `Împărțiri: tabla împărțirii la ${table}` : 'Împărțiri (tabla împărțirii, 0–100)';
  return table ? `Numărul lipsă: înmulțirea cu ${table} și împărțirea la ${table}` : 'Numărul lipsă la înmulțire și împărțire (0–100)';
}

// ───────────────────────── equal groups ─────────────────────────

export interface GroupsItem {
  /** How many groups. */
  groups: number;
  /** How many pictures in each. */
  each: number;
  picture: string;
}

/** The largest total of a groups sheet: 10 up to 0–10, 20 in 0–20, 30 from 0–31 up (5 groups of 6). */
export function groupsLimit(range: number): number {
  return range <= 10 ? 10 : range <= 20 ? 20 : 30;
}

/** 0–1000 is clasa a II-a: the repeated addition is also written as a multiplication. */
export const groupsWithProduct = (range: number) => range >= 1000;

const GROUP_PICTURES = ['🍎', '🍓', '🐟', '⭐', '🌷', '🐝', '🎈', '🦋', '🍐', '🥕'];
export const GROUPS_PER_PAGE = 5;

/** Five rows of equal groups: 2–5 groups of 2–6 pictures, no row twice, one picture per row. */
export function groupsItems(range: number, rand: () => number): GroupsItem[] {
  const limit = groupsLimit(range);
  const pairs: [number, number][] = [];
  for (let g = 2; g <= 5; g++) for (let e = 2; e <= 6; e++) if (g * e <= limit) pairs.push([g, e]);
  // from 0–20 up, not only the smallest totals: prefer pairs above 10 for most rows
  const big = pairs.filter(([g, e]) => g * e > 10);
  const small = pairs.filter(([g, e]) => g * e <= 10);
  const order = limit > 10 ? [...shuffle(big, rand).slice(0, 3), ...shuffle(small, rand)] : shuffle(pairs, rand);
  const chosen = shuffle(order.slice(0, GROUPS_PER_PAGE), rand);
  while (chosen.length < GROUPS_PER_PAGE) chosen.push(pairs[chosen.length % pairs.length]);
  const pics = shuffle(GROUP_PICTURES.filter(hasIcon), rand);
  return chosen.map(([groups, each], i) => ({ groups, each, picture: pics[i % pics.length] }));
}

export function groupsAnswer(it: GroupsItem, withProduct: boolean): string {
  const sum = Array.from({ length: it.groups }, () => it.each).join(' + ');
  const total = it.groups * it.each;
  return `${it.groups} grupe a câte ${it.each}: ${sum} = ${total}${withProduct ? `; ${it.groups} ${DOT} ${it.each} = ${total}` : ''}`;
}

export function groupsTitle(range: number): string {
  return groupsWithProduct(range) ? 'Grupe egale: adunare repetată și înmulțire' : `Grupe egale: adunare repetată (0–${groupsLimit(range)})`;
}

export function groupsInstruction(range: number): string {
  return groupsWithProduct(range)
    ? 'Numără grupele și imaginile din fiecare grupă. Scrie adunarea și înmulțirea.'
    : 'Numără grupele și imaginile din fiecare grupă. Scrie adunarea.';
}

/** An empty box the child writes in. */
function box(ops: DrawOp[], x: number, cy: number, w: number, h: number): void {
  ops.push({ t: 'rect', x, y: cy - h / 2, w, h, rx: 1.6, fill: '#FFFFFF', stroke: INK, strokeWidth: 0.5 });
}

/**
 * A line of boxes and signs („□ + □ + □ = □”), left aligned at x. Returns its right end.
 * Each entry: `null` a box, a string a sign or word.
 */
function boxLine(ops: DrawOp[], cells: (string | null)[], x: number, cy: number, size: number, boxW: number): number {
  const boxH = size * 1.45;
  const gap = size * 0.32;
  let cx = x;
  for (const c of cells) {
    if (c === null) {
      box(ops, cx, cy, boxW, boxH);
      cx += boxW + gap;
    } else {
      const w = c.length * size * 0.56;
      ops.push({ t: 'text', x: cx + w / 2, y: cy + size * 0.36, text: c, size, fill: INK, weight: 'bold', align: 'center' });
      cx += w + gap;
    }
  }
  return cx - gap;
}

/** Width of a group of `n` pictures of `s` mm, in rows of three (two rows from four up). */
const groupCols = (n: number) => (n <= 3 ? n : Math.ceil(n / 2));

/**
 * The rows of a groups sheet: each a card with the groups (a rounded frame each), then
 * „□ grupe a câte □”, „□ + □ + □ = □” and, in 0–1000, „□ · □ = □”.
 */
export function groupsPageOps(items: GroupsItem[], withProduct: boolean, x0: number, x1: number, top: number, bottom: number, label: (i: number) => string = (i) => `${i + 1}.`): DrawOp[] {
  const ops: DrawOp[] = [];
  const rowH = (bottom - top) / items.length;
  const w = x1 - x0;
  items.forEach((it, i) => {
    const y = top + i * rowH;
    ops.push({ t: 'rect', x: x0, y: y + 1.2, w, h: rowH - 2.4, rx: 4, fill: '#FBF7EE', stroke: '#E6DECD', strokeWidth: 0.4 });
    ops.push({ t: 'text', x: x0 + 3, y: y + 6.4, text: label(i), size: 3.6, fill: MUTED, weight: 'bold' });
    // the pictures: the upper part of the card, the groups side by side
    const picH = rowH * 0.5;
    const gap = 4;
    const left = x0 + 10;
    const room = w - 14;
    const cols = groupCols(it.each);
    const rows = it.each <= 3 ? 1 : 2;
    const s = Math.min(8, (picH - 4) / rows - 1, (room - (it.groups - 1) * gap) / it.groups / cols - 1.6);
    const gw = cols * (s + 1.2) + 2.4;
    const gh = rows * (s + 1.2) + 2.4;
    const total = it.groups * gw + (it.groups - 1) * gap;
    const gx0 = left + (room - total) / 2;
    const gy = y + 3 + (picH - gh) / 2;
    for (let g = 0; g < it.groups; g++) {
      const gx = gx0 + g * (gw + gap);
      ops.push({ t: 'rect', x: gx, y: gy, w: gw, h: gh, rx: 3, fill: PAPER, stroke: ACCENT, strokeWidth: 0.6 });
      for (let k = 0; k < it.each; k++) {
        const r = Math.floor(k / cols), c = k % cols;
        // a short last row is centred
        const inRow = r === rows - 1 ? it.each - r * cols : cols;
        const ox = (cols - inRow) * (s + 1.2) / 2;
        ops.push(...iconOps(it.picture, gx + 1.2 + ox + c * (s + 1.2) + (s + 1.2) / 2, gy + 1.2 + r * (s + 1.2) + (s + 1.2) / 2, s));
      }
    }
    // the lines to fill in, in the lower part: „□ grupe a câte □”, the sum beside it, the product under the sum
    const low = rowH - picH - 5;
    const lines = withProduct ? 2 : 1;
    const size = Math.min(5.6, low / (lines * 1.75));
    const bw = size * 1.6;
    const lineY = (k: number) => y + 3 + picH + (low * (k + 0.5)) / lines + 0.5;
    const end = boxLine(ops, [null, 'grupe a câte', null], left, lineY(0), size * 0.82, bw);
    const sum: (string | null)[] = [];
    for (let g = 0; g < it.groups; g++) sum.push(...(g ? ['+', null] : [null]));
    sum.push('=', null);
    const sx = Math.max(end + 7, left + w * 0.36);
    boxLine(ops, sum, sx, lineY(0), size, bw);
    if (withProduct) boxLine(ops, [null, DOT, null, '=', null], sx, lineY(1), size, bw);
  });
  return ops;
}
