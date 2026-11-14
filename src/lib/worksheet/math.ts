import type { DrawOp, PageOps } from '@/lib/glyphs/types';
import type { Tier, WorksheetConfig } from '@/types';
import { hasIcon, iconOps } from '@/lib/hints/icons';
import { madeWith } from '@/lib/brand';
import { ACCENT, INK, MUTED, PAPER, starPoints } from './rows';

/**
 * Math sheets ("Matematică"), new every time on request: compare numbers, add, subtract,
 * add with pictures, missing number, number sequences, neighbours.
 *
 * Each chosen exercise type is one page; an optional last page has the answers for the
 * grown-up. The exercises are random but seeded (type + range + seed), so the preview and
 * the PDF match; „Alte exerciții” just changes the seed.
 *
 * Ranges follow the Romanian curriculum: 0–5 / 0–10 for preschool and clasa pregătitoare,
 * 0–20 and 0–100 (tens and units, no carrying or borrowing) for clasa I.
 */

export const MATH_TYPES = ['cmp', 'add', 'sub', 'mix', 'addpic', 'missing', 'seq', 'nbr'] as const;
export type MathType = (typeof MATH_TYPES)[number];
export const MATH_RANGES = [5, 10, 20, 100] as const;
export type MathRange = (typeof MATH_RANGES)[number];

export const MATH_LABELS: Record<MathType, { title: string; text: string; icon: string }> = {
  cmp: { title: 'Compară numerele', text: '<, > sau =', icon: '⚖️' },
  add: { title: 'Adunări', text: '3 + 4 = ?', icon: '➕' },
  sub: { title: 'Scăderi', text: '7 − 2 = ?', icon: '➖' },
  mix: { title: 'Adunări și scăderi', text: 'amestecate', icon: '🔀' },
  addpic: { title: 'Adunări cu imagini', text: 'numără și adună', icon: '🍎' },
  missing: { title: 'Numărul lipsă', text: '4 + ? = 9', icon: '❓' },
  seq: { title: 'Completează șirul', text: '3, 4, ?, 6', icon: '🔢' },
  nbr: { title: 'Vecinii numărului', text: '? 7 ?', icon: '🏠' },
};

export function isMathType(item: string): item is MathType {
  return (MATH_TYPES as readonly string[]).includes(item);
}

/** The free plan: every exercise type, numbers up to 10. */
export const FREE_MATH_RANGE: MathRange = 10;

export function mathRangeOf(config: Pick<WorksheetConfig, 'mathRange'>): MathRange {
  const r = config.mathRange ?? 10;
  return (MATH_RANGES as readonly number[]).includes(r) ? (r as MathRange) : 10;
}

// ───────────────────────── seeded randomness ─────────────────────────

function seedOf(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619);
  return h >>> 0;
}

function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const int = (rand: () => number, lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

// ───────────────────────── exercises ─────────────────────────

/** One exercise: cells shown left to right; `null` is the box the child fills in. */
export interface Exercise {
  cells: (string | null)[];
  answer: string;
  /** For picture sums: how many pictures on each side. */
  pictures?: [number, number];
}

const MINUS = '−';

/** a + b within the range; for 0–100 no carrying (units stay under 10). */
function sumPair(rand: () => number, range: MathRange): [number, number] {
  if (range === 100) {
    const ta = int(rand, 1, 8), tb = int(rand, 0, 9 - ta);
    const ua = int(rand, 0, 9), ub = int(rand, 0, 9 - ua);
    return [ta * 10 + ua, tb * 10 + ub];
  }
  const total = int(rand, 2, range);
  const a = int(rand, 1, total - 1);
  return [a, total - a];
}

/** a − b ≥ 0; for 0–100 no borrowing. */
function diffPair(rand: () => number, range: MathRange): [number, number] {
  if (range === 100) {
    const ta = int(rand, 2, 9), tb = int(rand, 0, ta - 1);
    const ua = int(rand, 0, 9), ub = int(rand, 0, ua);
    return [ta * 10 + ua, tb * 10 + ub];
  }
  const a = int(rand, 2, range);
  return [a, int(rand, 1, a)];
}

function makeExercise(type: MathType, rand: () => number, range: MathRange): Exercise {
  switch (type) {
    case 'cmp': {
      const a = int(rand, 0, range);
      // about one in five equal, so "=" is practised too
      const b = rand() < 0.2 ? a : int(rand, 0, range);
      return { cells: [String(a), null, String(b)], answer: a < b ? '<' : a > b ? '>' : '=' };
    }
    case 'add': {
      const [a, b] = sumPair(rand, range);
      return { cells: [String(a), '+', String(b), '=', null], answer: String(a + b) };
    }
    case 'sub': {
      const [a, b] = diffPair(rand, range);
      return { cells: [String(a), MINUS, String(b), '=', null], answer: String(a - b) };
    }
    case 'mix':
      return makeExercise(rand() < 0.5 ? 'add' : 'sub', rand, range);
    case 'addpic': {
      const max = Math.min(range, 10);
      const a = int(rand, 1, Math.max(1, Math.min(5, max - 1)));
      const b = int(rand, 1, Math.max(1, Math.min(5, max - a)));
      return { cells: [String(a), '+', String(b), '=', null], answer: String(a + b), pictures: [a, b] };
    }
    case 'missing': {
      if (rand() < 0.6) {
        const [a, b] = sumPair(rand, range);
        return rand() < 0.5
          ? { cells: [String(a), '+', null, '=', String(a + b)], answer: String(b) }
          : { cells: [null, '+', String(b), '=', String(a + b)], answer: String(a) };
      }
      const [a, b] = diffPair(rand, range);
      return { cells: [String(a), MINUS, null, '=', String(a - b)], answer: String(b) };
    }
    case 'seq': {
      const step = range === 100 && rand() < 0.5 ? 10 : 1;
      const len = 6;
      const down = rand() < 0.3;
      const span = step * (len - 1);
      const start = down ? int(rand, span, range) : int(rand, 0, range - span);
      const values = Array.from({ length: len }, (_, i) => start + (down ? -1 : 1) * step * i);
      // two holes, never both at the ends
      const holes = new Set<number>();
      while (holes.size < 2) holes.add(int(rand, 1, len - 1));
      return { cells: values.map((v, i) => (holes.has(i) ? null : String(v))), answer: values.filter((_, i) => holes.has(i)).join(', ') };
    }
    case 'nbr': {
      const n = int(rand, 1, range - 1);
      return { cells: [null, String(n), null], answer: `${n - 1}, ${n + 1}` };
    }
  }
}

/**
 * The exercises of one page: no exercise twice. A small range has fewer different exercises
 * than the page has room for ("Vecinii numărului" 0–5 has four): then the page is still filled,
 * with every exercise coming back in turn, in a new order each round, the same number of times
 * (give or take one) and never twice in a row.
 */
export function mathExercises(type: MathType, range: MathRange, seed: number, count: number): Exercise[] {
  const rand = rng(seedOf(`${type}:${range}:${seed}`));
  const out: Exercise[] = [];
  const seen = new Set<string>();
  const key = (e: Exercise) => e.cells.join(' ');
  for (let tries = 0; out.length < count && tries < count * 40; tries++) {
    const e = makeExercise(type, rand, range);
    if (seen.has(key(e))) continue;
    seen.add(key(e));
    out.push(e);
  }
  const pool = out.slice();
  while (out.length < count && pool.length) {
    const round = pool.slice();
    for (let i = round.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [round[i], round[j]] = [round[j], round[i]];
    }
    // the round must not open with the exercise the last one closed with
    if (round.length > 1 && key(round[0]) === key(out[out.length - 1])) [round[0], round[1]] = [round[1], round[0]];
    out.push(...round.slice(0, count - out.length));
  }
  return out;
}

// ───────────────────────── pages ─────────────────────────

const W = 210;
const H = 297;
const M = 12;
const PICTURES = ['🍎', '🍓', '🐟', '⭐', '🌷', '🐝', '🎈', '🦋', '🐱', '🥕'];

const INSTRUCTIONS: Record<MathType, string> = {
  cmp: 'Scrie în căsuță semnul potrivit: <, > sau =.',
  add: 'Calculează și scrie rezultatul în căsuță.',
  sub: 'Calculează și scrie rezultatul în căsuță.',
  mix: 'Atenție la semn! Calculează și scrie rezultatul.',
  addpic: 'Numără imaginile, apoi scrie cât fac împreună.',
  missing: 'Ce număr lipsește? Scrie-l în căsuță.',
  seq: 'Completează numerele care lipsesc din șir.',
  nbr: 'Scrie vecinii numărului: cel dinainte și cel de după.',
};

/** Title of a sheet and of its answers: picture sums never go above 10, whatever the range. */
export function mathTitle(type: MathType, range: MathRange): string {
  return `${MATH_LABELS[type].title} (0–${type === 'addpic' ? Math.min(range, 10) : range})`;
}

/** How many exercises fit on a page, and in how many columns. */
function grid(type: MathType, range: MathRange): { count: number; cols: number } {
  if (type === 'addpic') return { count: 6, cols: 1 };
  if (type === 'seq') return { count: 10, cols: 1 };
  if (type === 'nbr') return { count: 16, cols: 2 };
  if (type === 'cmp') return { count: range <= 5 ? 8 : 16, cols: 2 };
  return { count: 20, cols: 2 };
}

function frame(ops: DrawOp[], config: WorksheetConfig, title: string, instruction: string): number {
  ops.push({ t: 'text', x: M, y: M + 6.5, text: title, size: 6.5, fill: INK, weight: 'bold' });
  ops.push({ t: 'text', x: M, y: M + 14.5, text: `Nume: ${config.childName?.trim() || '______________'}     Data: ____________`, size: 3.6, fill: '#334155' });
  ops.push({ t: 'text', x: W - M, y: M + 6, text: 'WorksheetWiz', size: 3.2, fill: MUTED, weight: 'bold', align: 'right' });
  ops.push({ t: 'line', x1: M, y1: M + 18.5, x2: W - M, y2: M + 18.5, stroke: ACCENT, strokeWidth: 0.6 });
  ops.push({ t: 'text', x: M, y: M + 28, text: instruction, size: 4.6, fill: INK, weight: 'bold' });
  return M + 34;
}

function rewardBox(ops: DrawOp[], stars: number): void {
  const by = H - M - 18;
  ops.push({ t: 'rect', x: M, y: by, w: W - 2 * M, h: 16, rx: 2.5, fill: '#FFFBEB', stroke: '#FBBF24', strokeWidth: 0.4 });
  ops.push({ t: 'text', x: M + 5, y: by + 6.5, text: 'Bravo!', size: 4.4, fill: '#92400E', weight: 'bold' });
  ops.push({ t: 'text', x: M + 5, y: by + 12, text: 'Colorează o stea pentru fiecare rând rezolvat.', size: 3, fill: '#B45309' });
  const step = Math.min(13, 100 / stars);
  for (let i = 0; i < stars; i++) {
    ops.push({ t: 'polygon', points: starPoints(W - M - 3 - step / 2 - i * step, by + 8, Math.min(5, step * 0.42)), stroke: '#D97706', strokeWidth: 0.5, fill: PAPER });
  }
}

function footer(ops: DrawOp[], tier: Tier, pageNo: number, pages: number): void {
  if (pages > 1) ops.push({ t: 'text', x: W / 2, y: H - M + 2, text: `Pagina ${pageNo} din ${pages}`, size: 3, fill: MUTED, align: 'center' });
  if (tier === 'free') ops.push({ t: 'text', x: W - M, y: H - M + 2, text: madeWith('ro'), size: 2.6, fill: '#94a3b8', align: 'right' });
}

/** One exercise as a line of cells (numbers, signs, boxes), left aligned at x, centred on cy. */
function exerciseOps(e: Exercise, x: number, cy: number, size: number, maxW: number): DrawOp[] {
  const ops: DrawOp[] = [];
  const box = size * 1.55;
  const gap = size * 0.35;
  const widthOf = (c: string | null) => (c === null ? box : c.length > 1 && /\d/.test(c) ? size * 0.62 * c.length : size * 0.75);
  const total = e.cells.reduce((a, c) => a + widthOf(c) + gap, -gap);
  const scale = Math.min(1, maxW / total);
  let cx = x;
  for (const c of e.cells) {
    const w = widthOf(c) * scale;
    if (c === null) {
      const b = box * scale;
      ops.push({ t: 'rect', x: cx, y: cy - b / 2, w: b, h: b, rx: 1.6, fill: '#FFFFFF', stroke: INK, strokeWidth: 0.5 });
    } else {
      ops.push({ t: 'text', x: cx + w / 2, y: cy + size * 0.36 * scale, text: c, size: size * scale, fill: INK, weight: 'bold', align: 'center' });
    }
    cx += w + gap * scale;
  }
  return ops;
}

function picturesOps(n: number, emoji: string, x: number, cy: number, size: number): DrawOp[] {
  const ops: DrawOp[] = [];
  const perRow = 3;
  const rows = Math.ceil(n / perRow);
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / perRow), c = i % perRow;
    ops.push(...iconOps(emoji, x + size / 2 + c * (size + 1.2), cy + (r - (rows - 1) / 2) * (size + 1.2), size));
  }
  return ops;
}

function exercisePage(config: WorksheetConfig, type: MathType, range: MathRange, exercises: Exercise[]): DrawOp[] {
  const ops: DrawOp[] = [];
  const top = frame(ops, config, mathTitle(type, range), INSTRUCTIONS[type]);
  const { cols } = grid(type, range);
  const bottom = H - M - 24;
  const rows = Math.ceil(exercises.length / cols);
  const rowH = (bottom - top) / rows;
  const colW = (W - 2 * M) / cols;

  if (type === 'addpic') {
    const pics = PICTURES.filter(hasIcon);
    exercises.forEach((e, i) => {
      const y = top + i * rowH;
      const cy = y + rowH / 2;
      const emoji = pics[i % pics.length];
      ops.push({ t: 'rect', x: M, y: y + 1.5, w: W - 2 * M, h: rowH - 3, rx: 4, fill: '#FBF7EE', stroke: '#E6DECD', strokeWidth: 0.4 });
      const s = Math.min(9, (rowH - 8) / 2 - 1.2);
      const [a, b] = e.pictures!;
      const groupW = 3 * (s + 1.2);
      ops.push(...picturesOps(a, emoji, M + 5, cy, s));
      ops.push({ t: 'text', x: M + 5 + groupW + 6, y: cy + 3.5, text: '+', size: 10, fill: INK, weight: 'bold', align: 'center' });
      ops.push(...picturesOps(b, emoji, M + 5 + groupW + 12, cy, s));
      ops.push(...exerciseOps(e, M + 5 + 2 * groupW + 22, cy, 9, W - 2 * M - (2 * groupW + 30)));
    });
  } else {
    const size = type === 'seq' ? 9 : range === 100 ? 8.5 : 9.5;
    exercises.forEach((e, i) => {
      const col = Math.floor(i / rows);
      const row = i % rows;
      const x = M + col * colW + 4;
      const cy = top + row * rowH + rowH / 2;
      // a light number before each exercise, to talk about them ("la 5 ai greșit")
      ops.push({ t: 'text', x, y: cy + 1.4, text: `${i + 1}.`, size: 3.6, fill: MUTED, weight: 'bold' });
      ops.push(...exerciseOps(e, x + 8, cy, size, colW - 16));
      if (type === 'cmp' && range <= 5) {
        // small ranges: dots under the numbers, so the child can count
        const [a, , b] = e.cells;
        ops.push(...countDots(Number(a), x + 8, cy + size, size));
        ops.push(...countDots(Number(b), x + 8 + size * 0.75 + size * 0.35 + size * 1.55 + size * 0.35, cy + size, size));
      }
    });
  }
  rewardBox(ops, Math.min(10, cols === 2 ? rows : exercises.length));
  return ops;
}

function countDots(n: number, x: number, y: number, size: number): DrawOp[] {
  const ops: DrawOp[] = [];
  const r = size * 0.09;
  for (let i = 0; i < n; i++) ops.push({ t: 'circle', cx: x + r + i * r * 2.6, cy: y, r, fill: ACCENT });
  return ops;
}

/** The answers, as compact as is still easy to read; a second page if they do not fit. */
function answersPages(config: WorksheetConfig, range: MathRange, sets: { type: MathType; exercises: Exercise[] }[]): DrawOp[][] {
  const pages: DrawOp[][] = [];
  let ops: DrawOp[] = [];
  const start = () => {
    ops = [];
    pages.push(ops);
    return frame(ops, config, 'Răspunsuri', 'Pentru părinte sau educatoare: rezultatele fișelor de mai sus.');
  };
  let y = start();
  const bottom = H - M - 8;
  for (const { type, exercises } of sets) {
    const perLine = type === 'seq' || type === 'nbr' ? 4 : 8;
    const lines = Math.ceil(exercises.length / perLine);
    if (y + 7 + lines * 5.5 > bottom) y = start();
    ops.push({ t: 'text', x: M, y: y + 2, text: mathTitle(type, range), size: 4, fill: INK, weight: 'bold' });
    y += 7.5;
    const colW = (W - 2 * M) / perLine;
    exercises.forEach((e, i) => {
      const c = i % perLine;
      if (c === 0 && i > 0) y += 5.5;
      ops.push({ t: 'text', x: M + c * colW, y, text: `${i + 1}. ${e.answer}`, size: 3.4, fill: '#334155' });
    });
    y += 9;
  }
  return pages;
}

/** The chosen math sheets, one page per exercise type, and the answers page if asked for. */
export function buildMathPages(config: WorksheetConfig, tier: Tier): PageOps[] {
  let range = mathRangeOf(config);
  if (tier === 'free' && range > FREE_MATH_RANGE) range = FREE_MATH_RANGE;
  const seed = config.mathSeed ?? 1;
  const types = config.selectedItems.filter(isMathType);
  const sets = types.map((type) => ({ type, exercises: mathExercises(type, range, seed, grid(type, range).count) }));
  const pages: DrawOp[][] = sets.map(({ type, exercises }) => exercisePage(config, type, range, exercises));
  if (config.mathAnswers && sets.length) pages.push(...answersPages(config, range, sets));
  return pages.map((ops, i) => {
    footer(ops, tier, i + 1, pages.length);
    return { width: W, height: H, ops };
  });
}
