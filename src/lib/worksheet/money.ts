import type { DrawOp } from '@/lib/glyphs/types';
import { textWidthMm } from '@/lib/book/text';
import { needsDe } from '@/components/worksheet/plural';
import { INK, MUTED } from './rows';

/**
 * „Bani”: the money exercises of the math sheets, after the programme „Matematică și explorarea
 * mediului” (Măsurări → Bani):
 *   CP: „Leul (bancnotele de 1 leu, 5 lei, 10 lei)”, „Schimburi echivalente valoric în concentrul 0-31”
 *   clasa I: „Leul (1 leu = 100 de bani); monede și bancnote (maxim 100 lei)”,
 *            „Schimburi echivalente valoric în concentrul 0-100”
 *   clasa a II-a: „Leul: bancnote de 200 de lei, 500 de lei”, „Schimburi echivalente valoric în
 *            concentrul 0-1000”
 *
 * The notes are simple drawn rectangles with the value written on them (never pictures of real
 * banknotes): 1 leu, 5 lei, 10 lei, from 0–100 also 50 de lei, and in 0–1000 also 100, 200 and
 * 500 de lei. Coins (bani) and euro are left out: they need 1 leu = 100 de bani (1 euro = 100 de
 * cenți), i.e. amounts that are not whole lei.
 *
 * One page, six rows: two „Câți lei sunt?”, two „Unde sunt mai mulți bani?”, one „Colorează
 * bancnotele cu care plătești…” and one row of exchanges („schimburi echivalente”).
 */

export type Note = 1 | 5 | 10 | 50 | 100 | 200 | 500;

export type MoneyExercise =
  | { kind: 'count'; notes: Note[]; answer: string }
  | { kind: 'compare'; left: Note[]; right: Note[]; answer: string }
  | { kind: 'pay'; target: number; notes: Note[]; answer: string }
  | { kind: 'exchange'; pairs: { give: Note[]; get: Note; count: number }[]; answer: string };

/** „1 leu”, „7 lei”, „20 de lei”, „31 de lei”, „100 de lei”. */
export function lei(n: number): string {
  if (n === 1) return '1 leu';
  return `${n} ${needsDe(n) ? 'de ' : ''}lei`;
}

/**
 * The notes used in a range: 1 and 5 lei up to 5; 1, 5, 10 up to 31 (CP); 50 de lei too up to 100
 * (clasa I); 100, 200 and 500 de lei too up to 1000 (clasa a II-a).
 */
export function notesFor(range: number): Note[] {
  if (range <= 5) return [5, 1];
  if (range <= 31) return [10, 5, 1];
  if (range <= 100) return [50, 10, 5, 1];
  return [500, 200, 100, 50, 10, 5, 1];
}

const int = (rand: () => number, lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

/** Fewest notes for an amount. */
function greedy(amount: number, kinds: Note[]): Note[] {
  const out: Note[] = [];
  let left = amount;
  for (const k of kinds) while (left >= k) { out.push(k); left -= k; }
  return out;
}

/** What a note breaks into, one step down: 500 → 5 × 100, 200 → 2 × 100, 100 → 2 × 50, 50 → 5 × 10, 10 → 2 × 5, 5 → 5 × 1. */
const SPLIT: Record<Note, Note[]> = {
  500: [100, 100, 100, 100, 100], 200: [100, 100], 100: [50, 50],
  50: [10, 10, 10, 10, 10], 10: [5, 5], 5: [1, 1, 1, 1, 1], 1: [1],
};

/**
 * An amount in notes, not always the fewest (5 + 5 for 10, so the child really counts),
 * at most `max` notes, largest first so they are counted from the biggest.
 */
function decompose(amount: number, kinds: Note[], max: number, rand: () => number): Note[] {
  const notes = greedy(amount, kinds);
  for (let tries = 0; tries < 6; tries++) {
    if (rand() < 0.45) break;
    const candidates = notes.map((n, i) => ({ n, i })).filter(({ n }) => n > 1 && kinds.includes(SPLIT[n][0]) && notes.length - 1 + SPLIT[n].length <= max);
    if (!candidates.length) break;
    const { n, i } = candidates[Math.floor(rand() * candidates.length)];
    notes.splice(i, 1, ...SPLIT[n]);
  }
  return notes.sort((a, b) => b - a);
}

/** The six exercises of a money page, seeded. */
export function moneyExercises(range: number, rand: () => number): MoneyExercise[] {
  const kinds = notesFor(range);
  const out: MoneyExercise[] = [];
  // 0–1000: the amounts to count and to pay have hundreds, the exchanges start from 100 de lei up
  const big = range >= 1000;

  // „Câți lei sunt?”: two different amounts, at most 10 notes
  const seen = new Set<number>();
  while (out.length < 2) {
    const total = int(rand, big ? 100 : Math.min(3, range), range);
    if (seen.has(total) && seen.size < range - 2) continue;
    if (greedy(total, kinds).length > 10) continue;
    seen.add(total);
    let notes = decompose(total, kinds, 10, rand);
    // one note says its own total: break it into smaller ones (10 → 5 + 5)
    if (notes.length === 1 && notes[0] > 1) notes = SPLIT[notes[0]].slice();
    out.push({ kind: 'count', notes, answer: lei(total) });
  }

  // „Unde sunt mai mulți bani?”: one of them equal amounts in different notes when possible
  const equalAt = int(rand, 0, 1);
  for (let i = 0; i < 2; i++) {
    let a = 0, b = 0, left: Note[] = [], right: Note[] = [];
    for (let tries = 0; tries < 200; tries++) {
      a = int(rand, 1, range);
      b = i === equalAt ? a : int(rand, 1, range);
      if (b === a && i !== equalAt) continue;
      if (greedy(a, kinds).length > 6 || greedy(b, kinds).length > 6) continue;
      left = decompose(a, kinds, 6, rand);
      right = decompose(b, kinds, 6, rand);
      // the same amount drawn in the same notes says nothing: try another split
      if (a === b && left.join() === right.join()) right = decompose(b, kinds, 6, rand);
      if (a === b && left.join() === right.join() && tries < 199) continue;
      break;
    }
    out.push({ kind: 'compare', left, right, answer: a < b ? '<' : a > b ? '>' : '=' });
  }

  // „Colorează bancnotele cu care plătești exact … lei”: the notes of the amount and 2–3 others
  {
    let target = 0, pay: Note[] = [];
    for (let tries = 0; tries < 100; tries++) {
      target = int(rand, big ? 100 : Math.min(4, range), range);
      pay = decompose(target, kinds, 6, rand);
      if (pay.length >= 2 && pay.length <= 6) break;
    }
    const extra: Note[] = [];
    const room = Math.min(3, 9 - pay.length);
    for (let i = 0; i < room; i++) extra.push(kinds[int(rand, 0, kinds.length - 1)]);
    const notes = [...pay, ...extra];
    for (let i = notes.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [notes[i], notes[j]] = [notes[j], notes[i]];
    }
    out.push({ kind: 'pay', target, notes, answer: `de exemplu: ${pay.join(' + ')}` });
  }

  // „Schimbă”: the notes on the left for notes of one kind (two exchanges when the range has them)
  {
    const options: { give: Note[]; get: Note; count: number }[] = [];
    for (const get of kinds)
      for (const g of kinds)
        if (g > get && g / get <= 10) {
          options.push({ give: [g], get, count: g / get });
          // two notes on the left: 10 + 5 = 3 × 5, 5 + 5 = 10 × 1 …
          for (const h of kinds) if (h <= g && h >= get && (g + h) % get === 0 && (g + h) / get <= 10 && g + h <= range) options.push({ give: [g, h], get, count: (g + h) / get });
        }
    const pool = big ? options.filter((o) => o.give[0] >= 100) : options;
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const pairs = pool.slice(0, 2);
    out.push({ kind: 'exchange', pairs, answer: pairs.map((p) => String(p.count)).join('; ') });
  }
  return out;
}

// ───────────────────────── drawing ─────────────────────────

const NOTE_W = 23;
const NOTE_H = 11.5;
const GAP = 2;

const NOTE_STYLE: Record<Note, { fill: string; stroke: string; ink: string }> = {
  1: { fill: '#DCFCE7', stroke: '#15803D', ink: '#14532D' },
  5: { fill: '#EDE9FE', stroke: '#6D28D9', ink: '#4C1D95' },
  10: { fill: '#FCE7F3', stroke: '#BE185D', ink: '#831843' },
  50: { fill: '#FEF3C7', stroke: '#B45309', ink: '#78350F' },
  100: { fill: '#DBEAFE', stroke: '#1D4ED8', ink: '#1E3A8A' },
  200: { fill: '#FFEDD5', stroke: '#C2410C', ink: '#7C2D12' },
  500: { fill: '#CCFBF1', stroke: '#0F766E', ink: '#134E4A' },
};

/**
 * One stylised note: a rounded rectangle, an inner frame, its value written out („10 lei”) and
 * the number again in a small circle; „50 de lei” (and 100, 200, 500) is longer, so it goes
 * without the circle.
 */
export function noteOps(note: Note, x: number, y: number, scale = 1): DrawOp[] {
  const w = NOTE_W * scale, h = NOTE_H * scale;
  const s = NOTE_STYLE[note];
  const label = lei(note);
  const circle = note < 50;
  const room = circle ? w - 10 * scale : w - 4.6 * scale;
  const size = Math.min(4.2 * scale, room / Math.max(0.1, textWidthMm(label, 1)));
  const ops: DrawOp[] = [
    { t: 'rect', x, y, w, h, rx: 1.4 * scale, fill: s.fill, stroke: s.stroke, strokeWidth: 0.45 },
    { t: 'rect', x: x + 1.1 * scale, y: y + 1.1 * scale, w: w - 2.2 * scale, h: h - 2.2 * scale, rx: 0.8 * scale, stroke: s.stroke, strokeWidth: 0.2 },
  ];
  if (circle) {
    ops.push({ t: 'circle', cx: x + w - 4 * scale, cy: y + h / 2, r: 2.3 * scale, stroke: s.stroke, strokeWidth: 0.25 });
    ops.push({ t: 'text', x: x + w - 4 * scale, y: y + h / 2 + 0.9 * scale, text: String(note), size: 2.5 * scale, fill: s.ink, weight: 'bold', align: 'center' });
    ops.push({ t: 'text', x: x + 2.3 * scale, y: y + h / 2 + size * 0.36, text: label, size, fill: s.ink, weight: 'bold' });
  } else {
    ops.push({ t: 'text', x: x + w / 2, y: y + h / 2 + size * 0.36, text: label, size, fill: s.ink, weight: 'bold', align: 'center' });
  }
  return ops;
}

/** Notes in rows of `perRow`, centred vertically on cy; returns the ops and the width used. */
function notesBlock(notes: Note[], x: number, cy: number, perRow: number, scale = 1): { ops: DrawOp[]; w: number } {
  const ops: DrawOp[] = [];
  const rows = Math.ceil(notes.length / perRow);
  const w = NOTE_W * scale, h = NOTE_H * scale, g = GAP * scale;
  const top = cy - (rows * h + (rows - 1) * g) / 2;
  notes.forEach((n, i) => {
    const r = Math.floor(i / perRow), c = i % perRow;
    ops.push(...noteOps(n, x + c * (w + g), top + r * (h + g), scale));
  });
  const cols = Math.min(perRow, notes.length);
  return { ops, w: cols * w + (cols - 1) * g };
}

function answerBox(ops: DrawOp[], x: number, cy: number, size = 13, w = size): void {
  ops.push({ t: 'rect', x, y: cy - size / 2, w, h: size, rx: 1.6, fill: '#FFFFFF', stroke: INK, strokeWidth: 0.5 });
}

const PROMPTS: Record<MoneyExercise['kind'], string> = {
  count: 'Câți lei sunt?',
  compare: 'Unde sunt mai mulți bani? Scrie <, > sau =.',
  pay: '', // with the amount, below
  exchange: 'Schimbă banii: câte bancnote primești?',
};

/**
 * The rows of a money page between `top` and `bottom`. `wide`: the box for „Câți lei sunt?” has
 * room for three digits (0–1000).
 */
export function moneyPageOps(
  exercises: MoneyExercise[], left: number, right: number, top: number, bottom: number,
  label: (i: number) => string = (i) => `${i + 1}.`, wide = false,
): DrawOp[] {
  const ops: DrawOp[] = [];
  const rowH = (bottom - top) / exercises.length;
  const width = right - left;
  exercises.forEach((e, i) => {
    const y = top + i * rowH;
    ops.push({ t: 'rect', x: left, y: y + 1.2, w: width, h: rowH - 2.4, rx: 4, fill: '#FBF7EE', stroke: '#E6DECD', strokeWidth: 0.4 });
    const prompt = e.kind === 'pay' ? `Colorează bancnotele cu care plătești exact ${lei(e.target)}.` : PROMPTS[e.kind];
    ops.push({ t: 'text', x: left + 4, y: y + 6.6, text: label(i), size: 3.6, fill: MUTED, weight: 'bold' });
    ops.push({ t: 'text', x: left + 10, y: y + 6.6, text: prompt, size: 3.8, fill: INK, weight: 'bold' });
    const cy = y + 8 + (rowH - 10) / 2;
    const x0 = left + 6;
    switch (e.kind) {
      case 'count': {
        const b = notesBlock(e.notes, x0, cy, 5);
        ops.push(...b.ops);
        const ax = left + 5 * (NOTE_W + GAP) + 16;
        ops.push({ t: 'text', x: ax, y: cy + 3, text: '=', size: 9, fill: INK, weight: 'bold', align: 'center' });
        const bw = wide ? 21 : 13;
        answerBox(ops, ax + 7, cy, 13, bw);
        ops.push({ t: 'text', x: ax + 10 + bw, y: cy + 2.4, text: 'lei', size: 6.5, fill: INK, weight: 'bold' });
        break;
      }
      case 'compare': {
        const scale = 0.82;
        const mid = 26;
        const purseW = (width - 8 - mid) / 2;
        const purse = (px: number, notes: Note[]) => {
          ops.push({ t: 'rect', x: px, y: cy - 12, w: purseW, h: 24, rx: 3, stroke: '#CBBFA6', strokeWidth: 0.35, dash: [1.4, 1.2] });
          ops.push(...notesBlock(notes, px + 3, cy, 3, scale).ops);
        };
        purse(left + 4, e.left);
        answerBox(ops, left + 4 + purseW + mid / 2 - 6.5, cy);
        purse(left + 4 + purseW + mid, e.right);
        break;
      }
      case 'pay': {
        const per = e.notes.length > 6 ? Math.ceil(e.notes.length / 2) : e.notes.length;
        ops.push(...notesBlock(e.notes, x0, cy, per, 1).ops);
        break;
      }
      case 'exchange': {
        // one exchange per line, the boxes under each other
        const lineH = 13.5;
        const scale = 0.9;
        const giveW = Math.max(...e.pairs.map((p) => p.give.length)) * (NOTE_W * scale + GAP);
        e.pairs.forEach((p, k) => {
          const ly = cy + (k - (e.pairs.length - 1) / 2) * lineH;
          let x = x0;
          for (const n of p.give) {
            ops.push(...noteOps(n, x, ly - (NOTE_H * scale) / 2, scale));
            x += NOTE_W * scale + GAP;
          }
          x = x0 + giveW + 2;
          ops.push({ t: 'text', x: x + 2.5, y: ly + 2.8, text: '=', size: 8, fill: INK, weight: 'bold', align: 'center' });
          answerBox(ops, x + 8, ly, 11);
          ops.push({ t: 'text', x: x + 22, y: ly + 1.4, text: 'bancnote de', size: 3.8, fill: INK, weight: 'bold' });
          ops.push(...noteOps(p.get, x + 22 + textWidthMm('bancnote de', 3.8) + 2.5, ly - (NOTE_H * scale) / 2, scale));
        });
        break;
      }
    }
  });
  return ops;
}
