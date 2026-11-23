import type { DrawOp, PageOps } from '@/lib/glyphs/types';
import { flattenOps } from '@/lib/glyphs/geometry';
import { iconOps } from '@/lib/hints/icons';
import { PHONO_WORDS } from '@/lib/worksheet/phonology';
import { SORT_OBJECTS } from '@/lib/worksheet/sorting';
import { PICTURES } from '@/lib/worksheet/math';
import { countSet } from '@/lib/worksheet/activities';
import { opBox } from './bounds';

/**
 * Reading a drawn page back, for the tests that compare the answers page with what the child sees:
 * which picture is where (the icon groups), the texts, the exercises of a math page.
 */

type Group = Extract<DrawOp, { t: 'group' }>;
const sig = (g: Group) => {
  const first = g.ops[0];
  return first && first.t === 'path' ? `${g.ops.length}|${first.fill}|${JSON.stringify(first.subpaths[0]?.start)}` : '';
};

const EMOJI = [...new Set([...PHONO_WORDS.map((w) => w.picture), ...SORT_OBJECTS.map((o) => o.picture), ...PICTURES, ...countSet(10).pictures].filter(Boolean))];
const BY_SIG = new Map<string, { emoji: string; box: number }>();
for (const e of EMOJI) {
  const g = iconOps(e, 0, 0, 10)[0];
  if (g.t !== 'group') continue;
  if (BY_SIG.has(sig(g)) && BY_SIG.get(sig(g))!.emoji !== e) throw new Error(`two pictures look alike to the tests: ${e}`);
  BY_SIG.set(sig(g), { emoji: e, box: 10 / g.scale });
}

export interface DrawnIcon { emoji: string; cx: number; cy: number; size: number }

/** The pictures on a page (top-level icon groups), in drawing order. */
export function icons(page: PageOps): DrawnIcon[] {
  const out: DrawnIcon[] = [];
  for (const op of page.ops) {
    if (op.t !== 'group') continue;
    const hit = BY_SIG.get(sig(op));
    if (!hit) continue;
    const size = op.scale * hit.box;
    out.push({ emoji: hit.emoji, cx: op.tx + size / 2, cy: op.ty + size / 2, size });
  }
  return out;
}

/** Reading order: by rows (centres within `tol` mm), then left to right. */
export function readingOrder<T extends { cx: number; cy: number }>(xs: T[], tol = 4): T[] {
  return [...xs].sort((a, b) => (Math.abs(a.cy - b.cy) <= tol ? a.cx - b.cx : a.cy - b.cy));
}

export type TextOp = Extract<DrawOp, { t: 'text' }>;
export const texts = (page: PageOps): TextOp[] => flattenOps(page.ops).filter((o): o is TextOp => o.t === 'text');

/** Texts whose boxes overlap (a little slack), as „a / b” pairs. */
export function textOverlaps(page: PageOps, slack = 0.4): string[] {
  const boxes = texts(page).filter((t) => !t.emoji).map((t) => ({ t, b: opBox(t)! }));
  const out: string[] = [];
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i].b, b = boxes[j].b;
      if (a.minX < b.maxX - slack && b.minX < a.maxX - slack && a.minY < b.maxY - slack && b.minY < a.maxY - slack) out.push(`${boxes[i].t.text} / ${boxes[j].t.text}`);
    }
  return out;
}

const INK = '#1e3a5f';

/**
 * The exercises of a math page or block as drawn: for each label („3.” or „c)”), the cells to its
 * right on its line — numbers and signs as texts, `null` for an empty box. `within` limits the area.
 */
export function drawnExercises(page: PageOps, label: RegExp, within: { top: number; bottom: number } = { top: 0, bottom: page.height }, colW = 93): { label: string; cells: (string | null)[] }[] {
  const flat = flattenOps(page.ops);
  const labels = flat.filter((o): o is TextOp => o.t === 'text' && label.test(o.text) && o.size <= 3.8 && o.y > within.top && o.y < within.bottom);
  return labels.map((l) => {
    const cy = l.y - 1.4;
    const cells: { x: number; v: string | null }[] = [];
    for (const o of flat) {
      if (o.t === 'text' && o.weight === 'bold' && o.fill === INK && o.size >= 4.5 && o.x > l.x + 5 && o.x < l.x + colW - 2 && Math.abs(o.y - cy) < 5) cells.push({ x: o.x, v: o.text });
      if (o.t === 'rect' && o.fill === '#FFFFFF' && o.stroke === INK && o.x > l.x + 5 && o.x < l.x + colW - 2 && Math.abs(o.y + o.h / 2 - cy) < 1) cells.push({ x: o.x + o.w / 2, v: null });
    }
    return { label: l.text, cells: cells.sort((a, b) => a.x - b.x).map((c) => c.v) };
  });
}

/** What goes in the boxes of a drawn exercise, worked out from the numbers and signs alone. */
export function solveDrawn(drawn: (string | null)[]): string {
  // picture sums: the sign drawn between the two groups of pictures comes first
  const cells = drawn[0] === '+' ? drawn.slice(1) : drawn;
  const holes = cells.map((c, i) => (c === null ? i : -1)).filter((i) => i >= 0);
  const num = (c: string | null) => Number(c);
  if (cells.length === 3 && holes.length === 1 && holes[0] === 1) {
    const [a, , b] = cells.map(num);
    return a < b ? '<' : a > b ? '>' : '=';
  }
  if (cells.length === 3 && holes.length === 2) return `${num(cells[1]) - 1}, ${num(cells[1]) + 1}`;
  if (cells.length === 5 && cells[3] === '=') {
    const [a, op, b, , c] = cells;
    const plus = op === '+';
    if (holes[0] === 4) return String(plus ? num(a) + num(b) : num(a) - num(b));
    if (holes[0] === 2) return String(plus ? num(c) - num(a) : num(a) - num(c));
    if (holes[0] === 0) return String(plus ? num(c) - num(b) : num(c) + num(b));
  }
  // a sequence: the step from two numbers that are shown
  const known = cells.map((c, i) => ({ c, i })).filter((x) => x.c !== null);
  const step = (num(known[1].c) - num(known[0].c)) / (known[1].i - known[0].i);
  return holes.map((i) => String(num(known[0].c) + step * (i - known[0].i))).join(', ');
}
