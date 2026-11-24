import type { DrawOp } from '@/lib/glyphs/types';
import type { Tier, WorksheetConfig } from '@/types';
import { hasIcon, iconOps } from '@/lib/hints/icons';
import { madeWith } from '@/lib/brand';
import { isItemAllowed } from '@/lib/access';
import { textWidthMm } from '@/lib/book/text';
import { ACCENT, INK, MUTED, PAPER, starPoints } from './rows';
import { lei, moneyExercises, moneyPageOps } from './money';
import { counted, problemsInstruction, problemsPageOps, wordProblems, type WordProblem } from './problems';
import { answerKeyPages, type KeySection, type SheetPage } from './answer-key';
import { FREE_MATH_TABLE, groupsAnswer, groupsInstruction, groupsItems, groupsPageOps, groupsTitle, groupsWithProduct, isMulType, mathTableOf, mulExercises, mulTitle } from './multiply';
import { FREE_CLOCK_STEPS, clockStepOf, clockTimes, clockTitle, clocksOps, digital, handsWords, timeWords, type ClockStep } from './clock';
import { CALENDAR_TITLES, calendarAnswers, calendarOps, calmonthSheet, monthsSheet, weekSheet, type CalendarSheet } from './calendar-pages';
import { UNIT_NAMES, lengthAnswers, lengthOps, lengthSheet, massAnswers, massItems, massOps, rulerAnswers, rulerSheet, rulerSheetOps, unitsAnswers, unitsOps, unitsSheet } from './measure';
import { fracAnswers, fracOps, fracSheet } from './fractions';
import { figuresAnswers, figuresOps, figuresSheet } from './figures';

/**
 * Math sheets ("Matematică"), new every time on request: compare numbers, add, subtract,
 * add with pictures, missing number, number sequences, neighbours, money, word problems.
 *
 * Each chosen exercise type is one page; an optional last page has the answers for the
 * grown-up. The exercises are random but seeded (type + range + seed), so the preview and
 * the PDF match; „Alte exerciții” just changes the seed.
 *
 * Ranges follow the programme „Matematică și explorarea mediului”: 0–5 / 0–10 for preschool and
 * the start of clasa pregătitoare, 0–31 for clasa pregătitoare („Numerele naturale 0-31”), 0–20
 * and 0–100 for clasa I, 0–1000 for clasa a II-a („Numerele naturale 0-1000”). Additions and
 * subtractions from 0–20 up can be „fără” or „cu trecere peste ordin” („Adunarea și scăderea în
 * concentrul 0 – 31 / 0 – 100, fără și cu trecere peste ordin”), see MathCarry; clasa a II-a has
 * „Adunarea și scăderea în concentrul 0 – 1000, fără trecere peste ordin”, so 0–1000 starts
 * without. In 0–31 one term is always 1–5 (CP 1.4: „…prin adăugarea /extragerea a 1-5 elemente
 * dintr-o mulțime dată”).
 */

/** The sheets of numbers and operations with them (0–5 … 0–1000). */
export const NUMBER_MATH_TYPES = ['cmp', 'add', 'sub', 'mix', 'addpic', 'missing', 'seq', 'nbr', 'money', 'problems'] as const;
/**
 * The other topics of the programme: equal groups, multiplication and division (clasa a II-a), the
 * clock, the calendar, measuring, halves and quarters, shapes (multiply.ts, clock.ts,
 * calendar-pages.ts, measure.ts, fractions.ts, figures.ts). Only „groups” goes by the number range.
 */
export const TOPIC_MATH_TYPES = ['groups', 'mul', 'div', 'mulmiss', 'clock', 'clockdraw', 'week', 'months', 'calmonth', 'length', 'mass', 'ruler', 'units', 'frac', 'figures'] as const;
export const MATH_TYPES = [...NUMBER_MATH_TYPES, ...TOPIC_MATH_TYPES] as const;
export type MathType = (typeof MATH_TYPES)[number];
export type TopicMathType = (typeof TOPIC_MATH_TYPES)[number];
export const MATH_RANGES = [5, 10, 20, 31, 100, 1000] as const;
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
  money: { title: 'Bani', text: '1 leu, 5 lei, 10 lei', icon: '💵' },
  problems: { title: 'Probleme cu imagini', text: 'citește și rezolvă', icon: '🧺' },
  groups: { title: 'Grupe egale', text: '4 + 4 + 4 = ?', icon: '🍓' },
  mul: { title: 'Înmulțiri', text: '3 · 4 = ?', icon: '✖️' },
  div: { title: 'Împărțiri', text: '12 : 3 = ?', icon: '➗' },
  mulmiss: { title: 'Numărul lipsă (·, :)', text: '3 · ? = 12', icon: '🔍' },
  clock: { title: 'Cât este ceasul?', text: 'citește ora', icon: '🕒' },
  clockdraw: { title: 'Desenează acele', text: 'pe ceas', icon: '🕘' },
  week: { title: 'Zilele săptămânii', text: 'luni, marți…', icon: '📅' },
  months: { title: 'Lunile și anotimpurile', text: 'ianuarie… iarna', icon: '🍂' },
  calmonth: { title: 'Calendarul lunii', text: 'citește calendarul', icon: '🗓️' },
  length: { title: 'Lungimi (cuburi, agrafe)', text: 'măsoară și compară', icon: '🧱' },
  mass: { title: 'Mai greu, mai ușor', text: 'balanța', icon: '🍉' },
  ruler: { title: 'Măsoară cu rigla', text: 'centimetri', icon: '📏' },
  units: { title: 'Unități de măsură', text: 'm, cm, l, kg', icon: '🧪' },
  frac: { title: 'Jumătate și sfert', text: '½ și ¼', icon: '🍕' },
  figures: { title: 'Figuri geometrice', text: 'numără formele', icon: '🔺' },
};

/**
 * Sheets of the full plan only (clasa a II-a topics); on the free plan the other topics come in their
 * easy form: the table of 2, clocks with ore fixe and half hours (see buildMathPages).
 */
export const PAID_MATH_TYPES: readonly MathType[] = ['calmonth', 'units', 'frac'];
/** The topics drawn on pages of their own, not as a grid of exercises. */
const DRAWN_TYPES: readonly MathType[] = ['money', 'problems', 'groups', 'clock', 'clockdraw', 'week', 'months', 'calmonth', 'length', 'mass', 'ruler', 'units', 'frac', 'figures'];
export const isDrawnType = (t: MathType) => DRAWN_TYPES.includes(t);

/**
 * „Fără / cu trecere peste ordin” for additions and subtractions, from 0–20 up. Unset, a sheet
 * stays as it always was: 0–20 and 0–31 mixed, 0–100 (and 0–1000) without carrying.
 *   without: the units never pass 10 (14 + 5, 27 − 4); in 0–1000 no column does (324 + 152)
 *   with:    every exercise carries or borrows, past the ten (8 + 5, 23 − 7); 6 + 4 and 20 − 3
 *            are in neither, they only come in „mixed”. In 0–1000: at least one column carries
 *            or borrows (275 + 148, 503 − 127)
 */
export const MATH_CARRY = ['without', 'with', 'mixed'] as const;
export type MathCarry = (typeof MATH_CARRY)[number];
/** The types the carry option changes. */
export const CARRY_TYPES: readonly MathType[] = ['add', 'sub', 'mix', 'missing'];

export function hasCarryChoice(range: MathRange): boolean {
  return range >= 20;
}

/** What a range does when no carry is chosen: 0–100 and 0–1000 without, the others mixed. */
export function defaultCarry(range: MathRange): MathCarry {
  return range >= 100 ? 'without' : 'mixed';
}

export function mathCarryOf(config: Pick<WorksheetConfig, 'mathRange' | 'mathCarry'>): MathCarry {
  const range = mathRangeOf(config);
  if (!hasCarryChoice(range)) return 'mixed';
  const c = config.mathCarry;
  if (c && (MATH_CARRY as readonly string[]).includes(c)) return c;
  return defaultCarry(range);
}

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

export function seedOf(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619);
  return h >>> 0;
}

export function rng(seed: number): () => number {
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

/** Whether a + b carries (the units make a ten or more), and a − b borrows. */
export const carries = (a: number, b: number) => (a % 10) + (b % 10) >= 10;
export const borrows = (a: number, b: number) => a % 10 < b % 10;
/** Whether a + b carries in any column (units, tens, hundreds): 275 + 148 does, 324 + 152 does not. */
export function carriesAny(a: number, b: number): boolean {
  for (let p = 1; p <= Math.max(a, b); p *= 10) if (Math.floor(a / p) % 10 + (Math.floor(b / p) % 10) >= 10) return true;
  return false;
}
/** Whether a − b (a ≥ b) borrows in any column: 503 − 127 does, 768 − 435 does not. */
export function borrowsAny(a: number, b: number): boolean {
  for (let p = 1; p <= a; p *= 10) if (Math.floor(a / p) % 10 < Math.floor(b / p) % 10) return true;
  return false;
}

const PICKS = 400;

/** a + b within the range, with or without carrying. */
function sumPair(rand: () => number, range: MathRange, carry: MathCarry = defaultCarry(range)): [number, number] {
  if (range === 1000) return sumPair1000(rand, carry);
  if (range === 31) {
    // CP 1.4: add 1–5 elements to a set of up to 30
    for (let i = 0; i < PICKS; i++) {
      const b = int(rand, 1, 5);
      const a = int(rand, 1, range - b);
      const ok = carry === 'mixed' || (carry === 'with' ? (a % 10) + b > 10 : a >= 10 && !carries(a, b));
      if (ok) return rand() < 0.25 ? [b, a] : [a, b];
    }
    return carry === 'with' ? [8, 5] : [21, 3];
  }
  if (carry === 'with') {
    for (let i = 0; i < PICKS; i++) {
      // 0–100: past 20, so the sheet is not 0–20 again
      const total = int(rand, range === 100 ? 21 : 11, range);
      const a = int(rand, 1, total - 1);
      if ((a % 10) + ((total - a) % 10) > 10) return [a, total - a];
    }
    return [8, 5];
  }
  if (carry === 'without' && range !== 100) {
    for (let i = 0; i < PICKS; i++) {
      const total = int(rand, 10, range);
      const a = int(rand, 1, total - 1);
      if (!carries(a, total - a)) return [a, total - a];
    }
    return [12, 5];
  }
  if (range === 100 && carry === 'mixed') return sumPair(rand, range, rand() < 0.5 ? 'with' : 'without');
  if (range === 100) {
    const ta = int(rand, 1, 8), tb = int(rand, 0, 9 - ta);
    const ua = int(rand, 0, 9), ub = int(rand, 0, 9 - ua);
    return [ta * 10 + ua, tb * 10 + ub];
  }
  const total = int(rand, 2, range);
  const a = int(rand, 1, total - 1);
  return [a, total - a];
}

/** a − b ≥ 0, with or without borrowing. */
function diffPair(rand: () => number, range: MathRange, carry: MathCarry = defaultCarry(range)): [number, number] {
  if (range === 1000) return diffPair1000(rand, carry);
  if (range === 31) {
    // CP 1.4: take 1–5 elements away
    for (let i = 0; i < PICKS; i++) {
      const b = int(rand, 1, 5);
      const a = int(rand, b, range);
      const ok = carry === 'mixed' || (carry === 'with' ? a > 10 && a % 10 > 0 && borrows(a, b) : a >= 10 && !borrows(a, b));
      if (ok) return [a, b];
    }
    return carry === 'with' ? [13, 5] : [27, 4];
  }
  if (carry === 'with') {
    for (let i = 0; i < PICKS; i++) {
      const a = int(rand, range === 100 ? 21 : 11, range);
      const b = int(rand, 2, a - 1);
      if (a % 10 > 0 && borrows(a, b)) return [a, b];
    }
    return [13, 5];
  }
  if (carry === 'without' && range !== 100) {
    for (let i = 0; i < PICKS; i++) {
      const a = int(rand, 10, range);
      const b = int(rand, 1, a);
      if (!borrows(a, b)) return [a, b];
    }
    return [17, 4];
  }
  if (range === 100 && carry === 'mixed') return diffPair(rand, range, rand() < 0.5 ? 'with' : 'without');
  if (range === 100) {
    const ta = int(rand, 2, 9), tb = int(rand, 0, ta - 1);
    const ua = int(rand, 0, 9), ub = int(rand, 0, ua);
    return [ta * 10 + ua, tb * 10 + ub];
  }
  const a = int(rand, 2, range);
  return [a, int(rand, 1, a)];
}

/**
 * 0–1000 (clasa a II-a): the first number has hundreds, so the sheet is not 0–100 again.
 *   without: no column passes 10, the sum stays under 1000 (324 + 152, 40 + 517)
 *   with:    at least one column carries, both terms from 10, the sum 101…1000 (275 + 148, 650 + 350)
 */
function sumPair1000(rand: () => number, carry: MathCarry): [number, number] {
  if (carry === 'mixed') return sumPair1000(rand, rand() < 0.5 ? 'with' : 'without');
  if (carry === 'with') {
    for (let i = 0; i < PICKS; i++) {
      const total = int(rand, 101, 1000);
      const a = int(rand, 10, total - 10);
      if (carriesAny(a, total - a)) return [a, total - a];
    }
    return [275, 148];
  }
  for (let i = 0; i < PICKS; i++) {
    const ha = int(rand, 1, 8), hb = int(rand, 0, 9 - ha);
    const ta = int(rand, 0, 9), tb = int(rand, 0, 9 - ta);
    const ua = int(rand, 0, 9), ub = int(rand, 0, 9 - ua);
    const b = hb * 100 + tb * 10 + ub;
    if (b >= 10) return [ha * 100 + ta * 10 + ua, b];
  }
  return [324, 152];
}

/** a − b ≥ 0 in 0–1000, a from 101 up: without borrowing in any column (768 − 435), or with (503 − 127). */
function diffPair1000(rand: () => number, carry: MathCarry): [number, number] {
  if (carry === 'mixed') return diffPair1000(rand, rand() < 0.5 ? 'with' : 'without');
  if (carry === 'with') {
    for (let i = 0; i < PICKS; i++) {
      const a = int(rand, 101, 1000);
      const b = int(rand, 10, a - 1);
      if (borrowsAny(a, b)) return [a, b];
    }
    return [503, 127];
  }
  for (let i = 0; i < PICKS; i++) {
    const ha = int(rand, 1, 9), hb = int(rand, 0, ha);
    const ta = int(rand, 0, 9), tb = int(rand, 0, ta);
    const ua = int(rand, 0, 9), ub = int(rand, 0, ua);
    const a = ha * 100 + ta * 10 + ua, b = hb * 100 + tb * 10 + ub;
    if (a > 100 && b >= 10 && b < a) return [a, b];
  }
  return [768, 435];
}

function makeExercise(type: MathType, rand: () => number, range: MathRange, carry?: MathCarry): Exercise {
  switch (type) {
    case 'cmp': {
      if (range === 1000) {
        // 0–1000: often the same hundreds, so the tens and units decide (473 ? 438)
        const a = int(rand, 0, range);
        const r = rand();
        const b = r < 0.2 ? a : r < 0.6 ? Math.min(range, a - (a % 100) + int(rand, 0, 99)) : int(rand, 0, range);
        return { cells: [String(a), null, String(b)], answer: a < b ? '<' : a > b ? '>' : '=' };
      }
      const a = int(rand, 0, range);
      // about one in five equal, so "=" is practised too
      const b = rand() < 0.2 ? a : int(rand, 0, range);
      return { cells: [String(a), null, String(b)], answer: a < b ? '<' : a > b ? '>' : '=' };
    }
    case 'add': {
      const [a, b] = sumPair(rand, range, carry);
      return { cells: [String(a), '+', String(b), '=', null], answer: String(a + b) };
    }
    case 'sub': {
      const [a, b] = diffPair(rand, range, carry);
      return { cells: [String(a), MINUS, String(b), '=', null], answer: String(a - b) };
    }
    case 'mix':
      return makeExercise(rand() < 0.5 ? 'add' : 'sub', rand, range, carry);
    case 'addpic': {
      const max = Math.min(range, 10);
      const a = int(rand, 1, Math.max(1, Math.min(5, max - 1)));
      const b = int(rand, 1, Math.max(1, Math.min(5, max - a)));
      return { cells: [String(a), '+', String(b), '=', null], answer: String(a + b), pictures: [a, b] };
    }
    case 'missing': {
      if (rand() < 0.6) {
        const [a, b] = sumPair(rand, range, carry);
        return rand() < 0.5
          ? { cells: [String(a), '+', null, '=', String(a + b)], answer: String(b) }
          : { cells: [null, '+', String(b), '=', String(a + b)], answer: String(a) };
      }
      const [a, b] = diffPair(rand, range, carry);
      return { cells: [String(a), MINUS, null, '=', String(a - b)], answer: String(b) };
    }
    case 'seq': {
      // 0–1000: by ones (398, 399, 400), by tens or by hundreds
      const pick = range === 1000 ? rand() : 0;
      const step = range === 1000 ? (pick < 0.4 ? 1 : pick < 0.75 ? 10 : 100) : range === 100 && rand() < 0.5 ? 10 : 1;
      const len = 6;
      const down = rand() < 0.3;
      const span = step * (len - 1);
      // 0–1000: from 100 up, so the sheet is not 0–100 again
      const lo = range === 1000 ? 100 : 0;
      const start = down ? int(rand, lo + span, range) : int(rand, lo, range - span);
      const values = Array.from({ length: len }, (_, i) => start + (down ? -1 : 1) * step * i);
      // two holes, never both at the ends
      const holes = new Set<number>();
      while (holes.size < 2) holes.add(int(rand, 1, len - 1));
      return { cells: values.map((v, i) => (holes.has(i) ? null : String(v))), answer: values.filter((_, i) => holes.has(i)).join(', ') };
    }
    case 'nbr': {
      // 0–1000: numbers with hundreds (100 → 99 și 101)
      const n = int(rand, range === 1000 ? 100 : 1, range - 1);
      return { cells: [null, String(n), null], answer: `${n - 1}, ${n + 1}` };
    }
    default:
      // drawn by money.ts, problems.ts and the topics' own files; never asked for here
      return { cells: [], answer: '' };
  }
}

/**
 * The exercises of one page: no exercise twice. A small range has fewer different exercises
 * than the page has room for ("Vecinii numărului" 0–5 has four): then the page is still filled,
 * with every exercise coming back in turn, in a new order each round, the same number of times
 * (give or take one) and never twice in a row.
 */
export function mathExercises(type: MathType, range: MathRange, seed: number, count: number, carry?: MathCarry, table = 0): Exercise[] {
  // multiplication and division: the tables, whatever the range (multiply.ts)
  if (isMulType(type)) return mulExercises(type, table, rng(seedOf(`${type}:t${table}:${seed}`)), count);
  // an explicit carry choice that differs from what the range always did gets its own set
  if (isDrawnType(type)) return []; // see money.ts, problems.ts and the topics' own files
  if (!hasCarryChoice(range)) carry = undefined;
  const own = carry && CARRY_TYPES.includes(type) && hasCarryChoice(range) && carry !== defaultCarry(range);
  const rand = rng(seedOf(`${type}:${range}:${seed}${own ? `:${carry}` : ''}`));
  const out: Exercise[] = [];
  const seen = new Set<string>();
  const key = (e: Exercise) => e.cells.join(' ');
  for (let tries = 0; out.length < count && tries < count * 40; tries++) {
    const e = makeExercise(type, rand, range, carry);
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
export const PICTURES = ['🍎', '🍓', '🐟', '⭐', '🌷', '🐝', '🎈', '🦋', '🐱', '🥕'];

export const INSTRUCTIONS: Record<MathType, string> = {
  cmp: 'Scrie în căsuță semnul potrivit: <, > sau =.',
  add: 'Calculează și scrie rezultatul în căsuță.',
  sub: 'Calculează și scrie rezultatul în căsuță.',
  mix: 'Atenție la semn! Calculează și scrie rezultatul.',
  addpic: 'Numără imaginile, apoi scrie cât fac împreună.',
  missing: 'Ce număr lipsește? Scrie-l în căsuță.',
  seq: 'Completează numerele care lipsesc din șir.',
  nbr: 'Scrie vecinii numărului: cel dinainte și cel de după.',
  money: 'Numără banii, compară, plătește și schimbă.',
  problems: 'Citește problema. Scrie numerele, semnul în cerc și răspunsul.', // see problemsInstruction
  groups: 'Numără grupele și imaginile din fiecare grupă. Scrie adunarea.', // see groupsInstruction
  mul: 'Calculează și scrie rezultatul în căsuță.',
  div: 'Calculează și scrie rezultatul în căsuță.',
  mulmiss: 'Ce număr lipsește? Scrie-l în căsuță.',
  clock: 'Cât este ceasul? Scrie ora în căsuțe.',
  clockdraw: 'Desenează acele: acul mic arată ora, acul mare minutele.',
  week: 'Citește cu atenție și completează.',
  months: 'Citește cu atenție și completează.',
  calmonth: 'Citește calendarul și răspunde.',
  length: 'Numără câte unități are fiecare obiect. Scrie numărul.',
  mass: 'Talerul care coboară are obiectul mai greu.',
  ruler: 'Citește pe riglă cât de lung este fiecare obiect.',
  units: 'Alege unitatea de măsură potrivită și completează.',
  frac: 'Toate figurile sunt împărțite în părți egale.',
  figures: 'Numără figurile din fiecare desen și scrie numărul.',
};

const CARRY_TEXT: Record<MathCarry, string> = { without: 'fără trecere peste ordin', with: 'cu trecere peste ordin', mixed: '' };

/**
 * Title of a sheet and of its answers: picture sums never go above 10, whatever the range;
 * additions and subtractions say whether they carry („Adunări (0–100), fără trecere peste ordin”).
 */
export function mathTitle(type: MathType, range: MathRange, carry: MathCarry = 'mixed', opts: { table?: number; clock?: ClockStep } = {}): string {
  if (type === 'money') return `Bani (până la ${lei(range)})`;
  if (isMulType(type)) return mulTitle(type, opts.table ?? 0);
  if (type === 'groups') return groupsTitle(range);
  if (type === 'clock' || type === 'clockdraw') return clockTitle(type, opts.clock ?? 'half');
  if (type === 'week' || type === 'months' || type === 'calmonth') return CALENDAR_TITLES[type];
  if ((TOPIC_MATH_TYPES as readonly string[]).includes(type)) return MATH_LABELS[type].title;
  const base = `${MATH_LABELS[type].title} (0–${type === 'addpic' ? Math.min(range, 10) : range})`;
  return CARRY_TYPES.includes(type) && CARRY_TEXT[carry] ? `${base}, ${CARRY_TEXT[carry]}` : base;
}

/** How many exercises fit on a page, and in how many columns. */
export function grid(type: MathType, range: MathRange): { count: number; cols: number } {
  if (type === 'addpic') return { count: 6, cols: 1 };
  if (type === 'seq') return { count: 10, cols: 1 };
  if (type === 'nbr') return { count: 16, cols: 2 };
  if (type === 'cmp') return { count: range <= 5 ? 8 : 16, cols: 2 };
  return { count: 20, cols: 2 };
}

function frame(ops: DrawOp[], config: WorksheetConfig, title: string, instruction: string): number {
  // a long title („Adunări și scăderi (0–100), fără trecere peste ordin”) gets smaller, clear of the brand
  const room = W - 2 * M - 26;
  const size = Math.max(4, Math.min(6.5, (6.5 * room) / Math.max(1, textWidthMm(title, 6.5) * 1.08)));
  ops.push({ t: 'text', x: M, y: M + 6.5, text: title, size, fill: INK, weight: 'bold' });
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

/**
 * One exercise as a line of cells (numbers, signs, boxes), left aligned at x, centred on cy.
 * `wide` (0–1000): the boxes for a number are wider, room for three handwritten digits.
 */
export function exerciseOps(e: Exercise, x: number, cy: number, size: number, maxW: number, wide = false): DrawOp[] {
  const ops: DrawOp[] = [];
  const box = size * 1.55;
  const boxW = wide && /\d/.test(e.answer) ? size * 2.4 : box;
  // a sequence of three-digit numbers needs more air between them (621  620  619)
  const gap = size * (wide && e.cells.length > 5 ? 0.7 : 0.35);
  const widthOf = (c: string | null) => (c === null ? boxW : c.length > 1 && /\d/.test(c) ? size * 0.62 * c.length : size * 0.75);
  const total = e.cells.reduce((a, c) => a + widthOf(c) + gap, -gap);
  const scale = Math.min(1, maxW / total);
  let cx = x;
  for (const c of e.cells) {
    const w = widthOf(c) * scale;
    if (c === null) {
      const b = box * scale;
      ops.push({ t: 'rect', x: cx, y: cy - b / 2, w: boxW * scale, h: b, rx: 1.6, fill: '#FFFFFF', stroke: INK, strokeWidth: 0.5 });
    } else {
      ops.push({ t: 'text', x: cx + w / 2, y: cy + size * 0.36 * scale, text: c, size: size * scale, fill: INK, weight: 'bold', align: 'center' });
    }
    cx += w + gap * scale;
  }
  return ops;
}

export function picturesOps(n: number, emoji: string, x: number, cy: number, size: number): DrawOp[] {
  const ops: DrawOp[] = [];
  const perRow = 3;
  const rows = Math.ceil(n / perRow);
  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / perRow), c = i % perRow;
    ops.push(...iconOps(emoji, x + size / 2 + c * (size + 1.2), cy + (r - (rows - 1) / 2) * (size + 1.2), size));
  }
  return ops;
}

function exercisePage(config: WorksheetConfig, type: MathType, range: MathRange, exercises: Exercise[], carry: MathCarry, table = 0): DrawOp[] {
  const ops: DrawOp[] = [];
  const top = frame(ops, config, mathTitle(type, range, carry, { table }), INSTRUCTIONS[type]);
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
    const size = isMulType(type) ? 9 : type === 'seq' ? 9 : range === 1000 ? 8 : range === 100 ? 8.5 : 9.5;
    exercises.forEach((e, i) => {
      const col = Math.floor(i / rows);
      const row = i % rows;
      const x = M + col * colW + 4;
      const cy = top + row * rowH + rowH / 2;
      // a light number before each exercise, to talk about them ("la 5 ai greșit")
      ops.push({ t: 'text', x, y: cy + 1.4, text: `${i + 1}.`, size: 3.6, fill: MUTED, weight: 'bold' });
      ops.push(...exerciseOps(e, x + 8, cy, size, colW - 16, range === 1000 && !isMulType(type)));
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

/** How many answers fit on one line of the answers page. */
function answersPerLine(type: MathType): number {
  if (type === 'problems' || type === 'groups' || type === 'clockdraw' || type === 'frac' || type === 'figures') return 1;
  if (type === 'money' || type === 'clock' || type === 'week' || type === 'months' || type === 'calmonth' || type === 'length') return 2;
  if (type === 'mass' || type === 'ruler' || type === 'units') return 3;
  return type === 'seq' || type === 'nbr' ? 4 : 8;
}

/** A problem's answer for the grown-up: „4 + 3 = 7 — Răspuns: 7 mașini” (up to 0–5 there is no „Răspuns” line). */
export function problemAnswer(p: WordProblem, range: MathRange): string {
  const ops = p.steps.map((s) => `${s.a} ${s.op} ${s.b} = ${s.r}`).join('; ');
  return range <= 5 ? `${ops} (${counted(p.result, p.noun)})` : `${ops} — Răspuns: ${counted(p.result, p.noun)}`;
}

/** The answers of the math sheets, as sections of the answers page (see answer-key.ts). */
function answerSections(range: MathRange, sets: { type: MathType; exercises: Exercise[]; title?: string }[], carry: MathCarry): KeySection[] {
  // the topics label their own items („a)”, „1. b)”): only the exercise grids, groups, money and problems are numbered
  const numbered = (t: MathType) => !isDrawnType(t) || t === 'money' || t === 'problems' || t === 'groups';
  return sets.map(({ type, exercises, title }) => ({ title: title ?? mathTitle(type, range, carry), entries: exercises.map((e) => e.answer), perLine: answersPerLine(type), numbered: numbered(type) }));
}

function moneyPage(config: WorksheetConfig, range: MathRange, exercises: ReturnType<typeof moneyExercises>): DrawOp[] {
  const ops: DrawOp[] = [];
  const top = frame(ops, config, mathTitle('money', range), INSTRUCTIONS.money);
  ops.push(...moneyPageOps(exercises, M, W - M, top, H - M - 24, undefined, range === 1000));
  rewardBox(ops, exercises.length);
  return ops;
}

function problemsPage(config: WorksheetConfig, range: MathRange, problems: WordProblem[]): DrawOp[] {
  const ops: DrawOp[] = [];
  const top = frame(ops, config, mathTitle('problems', range), problemsInstruction(range));
  ops.push(...problemsPageOps(problems, range, M, W - M, top, H - M - 24));
  rewardBox(ops, problems.length);
  return ops;
}

/** One topic page: its title, instruction, drawing and answers (multiply.ts, clock.ts …). */
interface TopicPage {
  title: string;
  instruction: string;
  stars: number;
  answers: string[];
  draw: (top: number, bottom: number) => DrawOp[];
}

/** The page of a topic sheet, seeded by the topic, its option and the seed (the range only for groups). */
function topicPage(type: MathType, range: MathRange, seed: number, opts: { table: number; clock: ClockStep }): TopicPage | null {
  const rand = rng(seedOf(type === 'groups' ? `${type}:${range}:${seed}` : type === 'clock' || type === 'clockdraw' ? `${type}:${opts.clock}:${seed}` : `${type}:${seed}`));
  const title = mathTitle(type, range, 'mixed', opts);
  const page = (instruction: string, stars: number, answers: string[], draw: TopicPage['draw']): TopicPage => ({ title, instruction, stars, answers, draw });
  const X0 = M, X1 = W - M;
  switch (type) {
    case 'groups': {
      const items = groupsItems(range, rand);
      const product = groupsWithProduct(range);
      return page(groupsInstruction(range), items.length, items.map((it) => groupsAnswer(it, product)), (t, b) => groupsPageOps(items, product, X0, X1, t, b));
    }
    case 'clock':
    case 'clockdraw': {
      const times = clockTimes(opts.clock, rand);
      const read = type === 'clock';
      const answers = times.map((t, i) => `${String.fromCharCode(97 + i)}) ${read ? `${digital(t)} – ${timeWords(t)}` : `${timeWords(t)} (${digital(t)}): ${handsWords(t)}`}`);
      return page(INSTRUCTIONS[type], times.length, answers, (t, b) => clocksOps(times, read, X0, X1, t, b));
    }
    case 'week':
    case 'months':
    case 'calmonth': {
      const sheet: CalendarSheet = type === 'week' ? weekSheet(rand) : type === 'months' ? monthsSheet(rand) : calmonthSheet(rand);
      return page(INSTRUCTIONS[type], sheet.sections.length, calendarAnswers(sheet), (t, b) => calendarOps(sheet, X0, X1, t, b));
    }
    case 'length': {
      const sheet = lengthSheet(rand);
      // „Lungimi: măsoară cu cuburi” / „… cu agrafe”, the unit of this sheet
      return { ...page(INSTRUCTIONS.length, sheet.items.length, lengthAnswers(sheet), (t, b) => lengthOps(sheet, X0, X1, t, b)), title: `Lungimi: măsoară cu ${UNIT_NAMES[sheet.unit].many}` };
    }
    case 'mass': {
      const items = massItems(rand);
      return page(INSTRUCTIONS.mass, items.length, massAnswers(items), (t, b) => massOps(items, X0, X1, t, b));
    }
    case 'ruler': {
      const sheet = rulerSheet(rand);
      return page(INSTRUCTIONS.ruler, sheet.measure.length + sheet.draw.length, rulerAnswers(sheet), (t, b) => rulerSheetOps(sheet, X0, X1, t, b));
    }
    case 'units': {
      const sheet = unitsSheet(rand);
      return page(INSTRUCTIONS.units, 3, unitsAnswers(sheet), (t, b) => unitsOps(sheet, X0, X1, t, b));
    }
    case 'frac': {
      const sheet = fracSheet(rand);
      return page(INSTRUCTIONS.frac, 4, fracAnswers(sheet), (t, b) => fracOps(sheet, X0, X1, t, b));
    }
    case 'figures': {
      const pics = figuresSheet(rand);
      return page(INSTRUCTIONS.figures, pics.length, figuresAnswers(pics), (t, b) => figuresOps(pics, X0, X1, t, b));
    }
    default:
      return null;
  }
}

function drawTopicPage(config: WorksheetConfig, p: TopicPage): DrawOp[] {
  const ops: DrawOp[] = [];
  const top = frame(ops, config, p.title, p.instruction);
  ops.push(...p.draw(top, H - M - 24));
  rewardBox(ops, Math.min(10, p.stars));
  return ops;
}

/** The options of the topics on a tier: the free plan has the table of 2 and the clocks with ore fixe and half hours. */
export function topicOptions(config: WorksheetConfig, tier: Tier): { table: number; clock: ClockStep } {
  const table = mathTableOf(config);
  const clock = clockStepOf(config);
  if (tier !== 'free') return { table, clock };
  return { table: FREE_MATH_TABLE, clock: FREE_CLOCK_STEPS.includes(clock) ? clock : 'half' };
}

/** Whether a math item is on the tier: the clasa a II-a topics (calendar, units, fractions) are full plan only. */
export function isMathTypeAllowed(type: MathType, tier: Tier): boolean {
  return isItemAllowed(type, 'math', tier);
}

/** The chosen math sheets, one page per exercise type, and the answers page if asked for. */
export function buildMathPages(config: WorksheetConfig, tier: Tier): SheetPage[] {
  let range = mathRangeOf(config);
  if (tier === 'free' && range > FREE_MATH_RANGE) range = FREE_MATH_RANGE;
  const seed = config.mathSeed ?? 1;
  const types = config.selectedItems.filter(isMathType).filter((t) => isMathTypeAllowed(t, tier));
  const carry = mathCarryOf({ ...config, mathRange: range });
  const opts = topicOptions(config, tier);
  const money = types.includes('money') ? moneyExercises(range, rng(seedOf(`money:${range}:${seed}`))) : [];
  const problems = types.includes('problems') ? wordProblems(range, rng(seedOf(`problems:${range}:${seed}`))) : [];
  const topics = new Map(types.map((t) => [t, topicPage(t, range, seed, opts)] as const));
  const sets = types.map((type) => {
    const topic = topics.get(type);
    return {
      type,
      title: topic?.title ?? (isMulType(type) ? mathTitle(type, range, carry, opts) : undefined),
      exercises:
        type === 'money' ? money.map((m) => ({ cells: [], answer: m.answer }))
        : type === 'problems' ? problems.map((p) => ({ cells: [], answer: problemAnswer(p, range) }))
        : topic ? topic.answers.map((answer) => ({ cells: [], answer }))
        : mathExercises(type, range, seed, grid(type, range).count, carry, opts.table),
    };
  });
  const pages: DrawOp[][] = sets.map(({ type, exercises }) => {
    const topic = topics.get(type);
    if (topic) return drawTopicPage(config, topic);
    return type === 'money' ? moneyPage(config, range, money) : type === 'problems' ? problemsPage(config, range, problems) : exercisePage(config, type, range, exercises, carry, opts.table);
  });
  const sheets = pages.length;
  if (config.mathAnswers && sets.length) pages.push(...answerKeyPages(config, answerSections(range, sets, carry)));
  return pages.map((ops, i): SheetPage => {
    footer(ops, tier, i + 1, pages.length);
    return { width: W, height: H, ops, ...(i >= sheets ? { answerKey: true } : {}) };
  });
}

