import type { DrawOp, Subpath } from '@/lib/glyphs/types';
import type { Tier, WorksheetConfig } from '@/types';
import { iconOps } from '@/lib/hints/icons';
import { madeWith } from '@/lib/brand';
import { textWidthMm, wrapText } from '@/lib/book/text';
import { isItemAllowed } from '@/lib/access';
import { countOf } from '@/components/worksheet/plural';
import { sheetCompetences, type SchoolLevel } from '@/lib/curriculum/sheet';
import type { ProgrammeId } from '@/lib/curriculum';
import { ACCENT, INK, MUTED, PAPER } from './rows';
import {
  FREE_MATH_RANGE, INSTRUCTIONS, bigBoxChars, grid, isBigRange, MATH_LABELS, PICTURES, exerciseOps, isMathType, mathCarryOf, mathExercises, mathRangeOf, picturesOps, typeRange,
  problemAnswer, rng, seedOf, topicOptions, type Exercise, type MathRange, type MathType,
} from './math';
import { isMulType } from './multiply';
import { clockTimes, clocksOps, digital, timeWords, type ClockTime } from './clock';
import { lei, moneyExercises, moneyPageOps, type MoneyExercise } from './money';
import { problemsHeight, problemsPageOps, wordProblems, type WordProblem } from './problems';
import { countSet } from './activities';
import { caseOf, firstSet, glyphText, glyphTextWidth, inkExtent, soundSet, splitSet, sylSet } from './phonology-pages';
import type { PhonoWord } from './phonology';
import { SORT_SETS, oddRows, shapeOps, sortPictures, type OddRow, type SortPicture } from './sorting-pages';
import { CATEGORY_NAMES } from './sorting';
import { answerKeyPages, type KeyExtra, type KeySection, type SheetPage } from './answer-key';
import { drawParts, onePart, rowParts, type EvalArea, type EvalBlock, type EvalPart } from './eval-block';
import { hasIcon } from '@/lib/hints/icons';
import { readingEvalBlock, readingPictureWords } from './reading-pages';
import { m34EvalBlock } from './m34-pages';
import { isM34Item } from './m34';
import { r34EvalBlocks } from './r34-pages';
import { isR34Item } from './r34';
import { isReadingItem } from './reading';

/**
 * „Evaluare”: a short test of the chosen exercise types, on one or two pages, then the answers.
 *
 * It is a way of printing the items of one sheet (config.evaluation), not a new kind of sheet:
 * the math or game items the teacher chose each become one numbered item („1. Compară numerele.”)
 * with a handful of exercises, taken from the very generators of the ordinary pages (the first
 * exercises of the same seeded set, the first pictures of the same word set), so the evaluation and
 * its answers page always agree. The header names the subject and the class („Evaluare — Matematică
 * și explorarea mediului, clasa I”), the last page ends with the total and the calificativ to fill in
 * (clasa pregătitoare – a IV-a) and a self-check row (optional, the „Stelele de recompensă” setting),
 * and the answers page gives the teacher an orientative table of calificative (FB, B, S, I) by the
 * number of correct answers; at grădiniță there are no calificative, only an optional observation grid.
 * The answers page is the teacher's: it is left out with config.evaluationAnswers = false, for the
 * print run of the whole class.
 *
 * Paper: a class of 25 prints every pupil page 25 times, so the items are packed (see `plan`): as few
 * pages as they fit on when drawn at their tightest still comfortable size, then as roomy as that
 * number of pages allows; an item with several rows may go on on the next page (between two rows,
 * its heading never alone at the bottom), and two items of small picture rows may stand side by side
 * when that saves a page.
 *
 * Items without a short form (connect the dots, find the letter, group and count, orientation, read
 * and draw, copy) are left out of an evaluation; see isEvaluationItem.
 */

const W = 210;
const H = 297;
const M = 12;
const X0 = M;
const X1 = W - M;
/** Where the items start, under the header. */
const TOP = M + 23;
/** Bottom of the items: under it the page number and the curriculum line. */
const BOTTOM = H - M - 7;
/** Comfortable and tightest: the heading of an item, the gap between two items, the self-check row (mm). */
const HEADING_H = 9;
const HEADING_MIN = 7.5;
const GAP = 5;
const GAP_MIN = 3.5;
const SELF_H = 23;
const SELF_MIN = 20;
/** „Total: ____ / 19     Calificativ: ____”, over the self-check row. */
const TOTAL_H = 7;
/** Between two items side by side. */
const PAIR_GUTTER = 6;
const CELL_STROKE = '#E6DECD';
const SOFT = '#FBF7EE';

type Area = EvalArea;

const letter = (i: number) => `${String.fromCharCode(97 + i)})`;

/** Math topics without a short form in an evaluation (their pages are whole exercises of their own). */
const EVAL_LESS_MATH = new Set<string>(['groups', 'clockdraw', 'week', 'months', 'calmonth', 'length', 'mass', 'ruler', 'units', 'frac', 'figures']);

/** Whether an item has a short form for an evaluation. */
export function isEvaluationItem(item: string): boolean {
  // of the other math topics: multiplication, division and reading the clock
  if (isMathType(item)) return !EVAL_LESS_MATH.has(item);
  if (/^read:(match|gap|fill|order|text):/.test(item)) return isReadingItem(item); // „Citire și scriere”: every set there is (reading-pages.ts)
  // clasa a III-a și a IV-a: the kinds with a short form (m34-pages.ts, r34-pages.ts)
  if (isM34Item(item)) return m34EvalBlock(item, X1 - X0) !== null;
  if (isR34Item(item)) return r34EvalBlocks(item, X1 - X0).length > 0;
  return /^(count:(5|10)|sound:[A-Z]|(first|syl|split|sort|odd):[1-6])$/.test(item);
}

// ───────────────────────── header, self-check, footer ─────────────────────────

const SUBJECTS: Partial<Record<ProgrammeId, string>> = {
  'clr-p-ii': 'Comunicare în limba română', 'mem-p-ii': 'Matematică și explorarea mediului', 'llr-iii-iv': 'Limba și literatura română', 'mate-iii-iv': 'Matematică',
};
const CLASS_NAMES: Record<Exclude<SchoolLevel, 'presc'>, string> = { CP: 'clasa pregătitoare', I: 'clasa I', II: 'clasa a II-a', III: 'clasa a III-a', IV: 'clasa a IV-a' };
const PHONO = /^(sound|first|syl|split|read):/;

/** „Evaluare — Matematică și explorarea mediului, clasa I”; „Evaluare — nivel preșcolar”. */
export function evaluationTitle(config: WorksheetConfig): string {
  const level = config.curriculumLevel;
  if (level === 'presc') return 'Evaluare — nivel preșcolar';
  const upper = level === 'III' || level === 'IV' || config.selectedItems.some((i) => isM34Item(i) || isR34Item(i));
  const fallback = upper ? (config.selectedItems.some(isR34Item) ? 'llr-iii-iv' : 'mate-iii-iv') : config.category === 'games' && config.selectedItems.some((i) => PHONO.test(i)) ? 'clr-p-ii' : 'mem-p-ii';
  const programme = (level ? sheetCompetences(config, level)[0]?.programme : undefined) ?? fallback;
  const subject = SUBJECTS[programme] ?? SUBJECTS['mem-p-ii']!;
  return level ? `Evaluare — ${subject}, ${CLASS_NAMES[level]}` : `Evaluare — ${subject}`;
}

function header(ops: DrawOp[], config: WorksheetConfig, title: string): void {
  const room = W - 2 * M - 26;
  const size = Math.max(4, Math.min(6.5, (6.5 * room) / Math.max(1, textWidthMm(title, 6.5) * 1.08)));
  ops.push({ t: 'text', x: M, y: M + 6.5, text: title, size, fill: INK, weight: 'bold' });
  const fields = [`Nume: ${config.childName?.trim() || '______________'}`, 'Data: ____________'];
  if (config.schoolName?.trim()) fields.push(config.schoolName.trim());
  ops.push({ t: 'text', x: M, y: M + 14.5, text: fields.join('     '), size: 3.6, fill: '#334155' });
  ops.push({ t: 'text', x: W - M, y: M + 6, text: 'WorksheetWiz', size: 3.2, fill: MUTED, weight: 'bold', align: 'right' });
  ops.push({ t: 'line', x1: M, y1: M + 18.5, x2: W - M, y2: M + 18.5, stroke: ACCENT, strokeWidth: 0.6 });
}

/** A face to colour: `mood` 1 a big smile, 0 a straight mouth, below 0 a little sad. */
export function faceOps(cx: number, cy: number, r: number, mood: number): DrawOp[] {
  const w = r * 0.45;
  const my = cy + r * 0.32 - mood * r * 0.12;
  const bend = mood * r * 0.42;
  const mouth: Subpath = { start: { x: cx - w, y: my }, segs: [{ kind: 'C', c1: { x: cx - w * 0.45, y: my + bend }, c2: { x: cx + w * 0.45, y: my + bend }, p: { x: cx + w, y: my } }] };
  return [
    { t: 'circle', cx, cy, r, fill: PAPER, stroke: INK, strokeWidth: 0.5 },
    { t: 'circle', cx: cx - r * 0.33, cy: cy - r * 0.22, r: r * 0.09, fill: INK },
    { t: 'circle', cx: cx + r * 0.33, cy: cy - r * 0.22, r: r * 0.09, fill: INK },
    { t: 'path', subpaths: [mouth], stroke: INK, strokeWidth: 0.5, cap: 'round' },
  ];
}

const SELF_CHECK: Record<'presc' | 'school', { title: string[]; faces: [string, number][] }> = {
  presc: { title: ['Cum am lucrat?', 'Colorează fața potrivită.'], faces: [['Am reușit singur', 1], ['cu puțin ajutor', 0.45], ['cu ajutor', 0]] },
  school: { title: ['Autoevaluare:', 'colorează fața potrivită.'], faces: [['Mi-a fost ușor', 1], ['Am avut nelămuriri', 0], ['Mi-a fost greu', -0.6]] },
};

/** The last row, `selfH` mm with the gap over it: three faces to colour, each with its words under it. */
function selfCheck(ops: DrawOp[], presc: boolean, selfH: number): void {
  const by = BOTTOM - selfH + 3;
  const h = selfH - 3;
  const def = SELF_CHECK[presc ? 'presc' : 'school'];
  ops.push({ t: 'rect', x: X0, y: by, w: X1 - X0, h, rx: 2.5, fill: '#FFFBEB', stroke: '#FBBF24', strokeWidth: 0.4 });
  def.title.forEach((line, k) => ops.push({ t: 'text', x: X0 + 5, y: by + h / 2 - 1 + k * 5, text: line, size: 3.8, fill: '#92400E', weight: 'bold' }));
  const start = X0 + 5 + Math.max(...def.title.map((l) => textWidthMm(l, 3.8))) + 8;
  const cell = (X1 - 3 - start) / 3;
  // the faces a little smaller in the tightest row, so their words keep their room
  const r = Math.min(5, (h - 7.5) / 2.5);
  def.faces.forEach(([label, mood], i) => {
    const cx = start + (i + 0.5) * cell;
    ops.push(...faceOps(cx, by + 2.5 + r, r, mood));
    ops.push({ t: 'text', x: cx, y: by + h - 2.6, text: label, size: fit(label, 3.1, cell - 3), fill: '#92400E', weight: 'bold', align: 'center' });
  });
}

/** „Total: ____ / 19” and „Calificativ: ____”, for the teacher to fill in: on the last page, its baseline at `y`. */
function totalLine(ops: DrawOp[], total: number, y: number): void {
  const grade = 'Calificativ: ________';
  ops.push({ t: 'text', x: X1, y, text: grade, size: 3.8, fill: INK, weight: 'bold', align: 'right' });
  ops.push({ t: 'text', x: X1 - textWidthMm(grade, 3.8) - 9, y, text: `Total: ____ / ${total}`, size: 3.8, fill: INK, weight: 'bold', align: 'right' });
}

function footer(ops: DrawOp[], tier: Tier, pageNo: number, pages: number): void {
  if (pages > 1) ops.push({ t: 'text', x: W / 2, y: H - M + 2, text: `Pagina ${pageNo} din ${pages}`, size: 3, fill: MUTED, align: 'center' });
  if (tier === 'free') ops.push({ t: 'text', x: W - M, y: H - M + 2, text: madeWith('ro'), size: 2.6, fill: '#94a3b8', align: 'right' });
}

function fit(text: string, size: number, room: number): number {
  return Math.min(size, (size * room) / Math.max(1, textWidthMm(text, size) * 1.04));
}

// ───────────────────────── math items ─────────────────────────

/** How many exercises of a type an evaluation asks (two columns, three rows; one column for the sequences). */
const GRID_COUNT: Partial<Record<MathType, number>> = { cmp: 6, add: 6, sub: 6, mix: 6, missing: 6, nbr: 6, seq: 3, addpic: 3, mul: 6, div: 6, mulmiss: 6 };
const GRID_PROMPT: Partial<Record<MathType, string>> = {
  cmp: 'Compară numerele. Scrie semnul potrivit: <, > sau =.',
  add: 'Calculează.',
  sub: 'Calculează.',
  mix: 'Calculează. Atenție la semn!',
  missing: 'Scrie numărul care lipsește.',
  nbr: 'Scrie vecinii fiecărui număr.',
  seq: INSTRUCTIONS.seq,
  addpic: INSTRUCTIONS.addpic,
  mul: 'Calculează.',
  div: 'Calculează.',
  mulmiss: 'Scrie numărul care lipsește.',
};

/** The exercise written out with its answer in the box: „4 + 3 = 7”, „8 > 5”, „3, 4, 5, 6”. */
export function solved(e: Exercise): string {
  const parts = e.answer.split(', ');
  let k = 0;
  const cells = e.cells.map((c) => c ?? parts[k++] ?? e.answer);
  // a sequence (only numbers, „12 345” with its spaces from 10 000 up) is listed with commas
  return cells.every((c) => /^\d+$/.test(c) || /^\d{1,3}( \d{3})+$/.test(c)) ? cells.join(', ') : cells.join(' ');
}

function gridBlock(type: MathType, exercises: Exercise[], range: MathRange): EvalBlock {
  // 0–1 000 000: one exercise a line, so the six-digit numbers stay big enough to read
  const big = isBigRange(range) && !isMulType(type);
  const cols = type === 'seq' || type === 'addpic' || (range === 1000000 && big && type !== 'nbr') ? 1 : 2;
  const rows = Math.ceil(exercises.length / cols);
  const pic = type === 'addpic';
  // a row: comfortable, tightest (the answer box is 13 mm tall), and what it gains from a roomy page
  const [rowH, rowMin, rowGrow] = pic ? [22, 19, 6] : [15.5, 14.5, 4];
  const size = big ? 7.5 : type === 'seq' ? 8.5 : range >= 100 ? 8 : 8.5;
  const exercise = (ops: DrawOp[], i: number, x: number, cy: number, colW: number) => {
    const e = exercises[i];
    ops.push({ t: 'text', x, y: cy + 1.4, text: letter(i), size: 3.6, fill: MUTED, weight: 'bold' });
    ops.push(...exerciseOps(e, x + 8, cy, size, colW - 16, range === 1000, big ? bigBoxChars(e) : 0));
  };
  const pictures = (ops: DrawOp[], i: number, a: Area) => {
    const pics = PICTURES.filter(hasIcon);
    const e = exercises[i];
    const cy = a.y + a.h / 2;
    ops.push({ t: 'rect', x: a.x, y: a.y + 1, w: a.w, h: a.h - 2, rx: 4, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.4 });
    ops.push({ t: 'text', x: a.x + 4, y: cy + 1.4, text: letter(i), size: 3.6, fill: MUTED, weight: 'bold' });
    const s = Math.min(8, (a.h - 6) / 2 - 1.2);
    const groupW = 3 * (s + 1.2);
    const [p, q] = e.pictures!;
    const x = a.x + 11;
    ops.push(...picturesOps(p, pics[i % pics.length], x, cy, s));
    ops.push({ t: 'text', x: x + groupW + 5, y: cy + 3.2, text: '+', size: 9, fill: INK, weight: 'bold', align: 'center' });
    ops.push(...picturesOps(q, pics[i % pics.length], x + groupW + 10, cy, s));
    ops.push(...exerciseOps(e, x + 2 * groupW + 20, cy, 8.5, a.x + a.w - (x + 2 * groupW + 24)));
  };
  return {
    item: type,
    title: MATH_LABELS[type].title,
    prompt: GRID_PROMPT[type]!,
    // one exercise a line: a page break may fall between two lines; two columns (lettered down each column) stay together
    parts: cols === 1
      ? rowParts(rows, rowH, rowMin, rowGrow, (ops, a, i) => (pic ? pictures(ops, i, a) : exercise(ops, i, a.x + 4, a.y + a.h / 2, a.w)))
      : onePart(rows * rowH, rows * rowGrow, (ops, a) => {
          const rh = a.h / rows;
          const colW = a.w / cols;
          exercises.forEach((_, i) => exercise(ops, i, a.x + Math.floor(i / rows) * colW + 4, a.y + (i % rows) * rh + rh / 2, colW));
        }, rows * rowMin),
    answers: exercises.map((e, i) => `${letter(i)} ${solved(e)}`),
    perLine: big ? (type === 'seq' || type === 'nbr' ? 1 : type === 'cmp' ? 3 : 2) : type === 'seq' ? 2 : type === 'nbr' || type === 'addpic' ? 3 : 4,
    score: exercises.length,
  };
}

function problemsBlock(problems: WordProblem[], range: MathRange): EvalBlock {
  return {
    item: 'problems',
    title: MATH_LABELS.problems.title,
    prompt: range <= 5 ? 'Ascultă problema, numără imaginile și completează căsuțele.' : 'Rezolvă problemele.',
    // each problem a row of its own height (its text, its pictures, its answer area)
    parts: problems.map((p, i) => ({
      height: problemsHeight([p], range, X0, X1),
      min: problemsHeight([p], range, X0, X1),
      grow: 5,
      draw: (ops: DrawOp[], a: Area) => void ops.push(...problemsPageOps([p], range, a.x, a.x + a.w, a.y, a.y + a.h, () => letter(i))),
    })),
    answers: problems.map((p, i) => `${letter(i)} ${problemAnswer(p, range)}`),
    perLine: 1,
    score: problems.length,
  };
}

function moneyAnswer(e: MoneyExercise): string {
  if (e.kind === 'exchange') return e.pairs.map((p) => `${p.count} (bancnote de ${lei(p.get)})`).join('; ');
  return e.answer;
}

function moneyBlock(exercises: MoneyExercise[], range: MathRange): EvalBlock {
  return {
    item: 'money',
    title: MATH_LABELS.money.title,
    prompt: 'Numără, compară și schimbă banii.',
    // the banknotes keep their size: a row is never tighter than 34 mm
    parts: rowParts(exercises.length, 34, 34, 6, (ops, a, i) => void ops.push(...moneyPageOps([exercises[i]], a.x, a.x + a.w, a.y, a.y + a.h, () => letter(i), range === 1000))),
    answers: exercises.map((e, i) => `${letter(i)} ${moneyAnswer(e)}`),
    perLine: 1,
    score: exercises.reduce((n, e) => n + (e.kind === 'exchange' ? e.pairs.length : 1), 0),
  };
}

/** Four clocks to read, of every kind the page has (ore fixe, jumătăți, sferturi, minute). */
function clockBlock(times: ClockTime[]): EvalBlock {
  return {
    item: 'clock',
    title: MATH_LABELS.clock.title,
    prompt: 'Cât este ceasul? Scrie ora în căsuțe.',
    parts: onePart(50, 2, (ops, a) => void ops.push(...clocksOps(times, true, a.x, a.x + a.w, a.y, a.y + a.h, times.length, letter)), 46),
    answers: times.map((t, i) => `${letter(i)} ${digital(t)} – ${timeWords(t)}`),
    perLine: 2,
    score: times.length,
  };
}

const minuteKind = (t: ClockTime) => (t.m === 0 ? 'h' : t.m === 30 ? 'half' : t.m % 15 === 0 ? 'quarter' : 'five');

function mathBlocks(config: WorksheetConfig, tier: Tier): EvalBlock[] {
  let range = mathRangeOf(config);
  if (tier === 'free' && range > FREE_MATH_RANGE) range = FREE_MATH_RANGE;
  const seed = config.mathSeed ?? 1;
  const carry = mathCarryOf({ ...config, mathRange: range });
  const opts = topicOptions(config, tier);
  return config.selectedItems.filter((t): t is MathType => isMathType(t) && isEvaluationItem(t) && isItemAllowed(t, 'math', tier)).map((type) => {
    if (type === 'clock') {
      // the clocks of the ordinary page (same seed), four of them with every kind of time among them
      const all = clockTimes(opts.clock, rng(seedOf(`clock:${opts.clock}:${seed}`)));
      return clockBlock(varied(all, 4, minuteKind));
    }
    if (isMulType(type)) {
      // with one table, from the mixed-up half of the page (not 3 · 1, 3 · 2, 3 · 3 in a row)
      const page = mathExercises(type, range, seed, grid(type, range).count, carry, opts.table);
      return gridBlock(type, opts.table ? page.slice(10, 16) : page.slice(0, 6), range);
    }
    if (type === 'problems') {
      // the first problem of the page's set, and the next one of another kind (at most 0–1000: typeRange)
      const small = typeRange(type, range);
      const all = wordProblems(small, rng(seedOf(`problems:${small}:${seed}`)));
      const second = all.find((p, i) => i > 0 && p.kind !== all[0].kind) ?? all[1];
      return problemsBlock([all[0], second], small);
    }
    if (type === 'money') {
      // one of each: count, compare, exchange (as many as the range has), from the page's set
      const small = typeRange(type, range);
      const all = moneyExercises(small, rng(seedOf(`money:${small}:${seed}`)));
      const pick = (['count', 'compare', 'exchange'] as const).map((k) => all.find((e) => e.kind === k)).filter((e): e is MoneyExercise => !!e && (e.kind !== 'exchange' || e.pairs.length > 0));
      return moneyBlock(pick, small);
    }
    // the first exercises of the ordinary page, with every sign among them (cmp: <, >, =; mix: +, −)
    const page = mathExercises(type, range, seed, grid(type, range).count, carry);
    const n = GRID_COUNT[type] ?? 6;
    const exercises = type === 'cmp' ? varied(page, n, (e) => e.answer) : type === 'mix' ? varied(page, n, (e) => e.cells[1] ?? '') : page.slice(0, n);
    return gridBlock(type, exercises, range);
  });
}

// ───────────────────────── game items ─────────────────────────

/**
 * `n` of `xs`, in their order on the ordinary page: first those whose word is not on the evaluation
 * yet (no picture twice), then, if that is not enough, the others. `later`: the words the next items
 * choose from, left to them when there is a choice.
 */
function fresh<T>(xs: T[], n: number, word: (x: T) => string, used: Set<string>, later = new Set<string>()): T[] {
  // first the pictures no other item shows, then those a later item may still pick, then the rest
  const rank = (x: T) => (used.has(word(x)) ? 2 : later.has(word(x)) ? 1 : 0);
  const keep = new Set([0, 1, 2].flatMap((r) => xs.filter((x) => rank(x) === r)).slice(0, n));
  const out = xs.filter((x) => keep.has(x));
  for (const x of out) used.add(word(x));
  return out;
}

/**
 * `n` of `xs` in their order, the first ones, but with every kind of answer `kind` the list has
 * (a comparison with only „<” checks little): a missing kind takes the place of the last one of the
 * most frequent kind.
 */
export function varied<T>(xs: T[], n: number, kind: (x: T) => string): T[] {
  const picked = xs.slice(0, n);
  const kinds = [...new Set(xs.map(kind))];
  for (const k of kinds) {
    if (picked.some((x) => kind(x) === k)) continue;
    const add = xs.find((x) => kind(x) === k && !picked.includes(x));
    const counts = new Map<string, number>();
    for (const x of picked) counts.set(kind(x), (counts.get(kind(x)) ?? 0) + 1);
    const most = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
    if (!add || !most || most[1] < 2) continue;
    const drop = picked.map(kind).lastIndexOf(most[0]);
    picked.splice(drop, 1);
    picked.push(add);
  }
  return xs.filter((x) => picked.includes(x));
}

function cellRect(ops: DrawOp[], x: number, y: number, w: number, h: number): void {
  ops.push({ t: 'rect', x, y, w, h, rx: 3.5, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.5 });
}

function soundBlock(item: string, sound: string, words: PhonoWord[]): EvalBlock {
  const yes = words.filter((w) => w.initial === sound).map((w) => w.word);
  const no = words.filter((w) => w.initial !== sound).map((w) => w.word);
  return {
    item,
    title: `Sunetul de la început: ${sound}`,
    prompt: `Încercuiește imaginile care încep cu sunetul ${sound}.`,
    // the letter, then the pictures in one row (as large as in two rows of three, in half the height)
    parts: onePart(30, 4, (ops, a) => {
      const tileW = 30;
      const tileH = Math.min(a.h - 2, 40);
      const ty = a.y + (a.h - tileH) / 2;
      const pair = `${sound}${sound.toLocaleLowerCase('ro')}`;
      const ext = inkExtent(pair);
      const s = Math.min((tileH - 10) / (ext.bottom - ext.top), (tileW - 6) / glyphTextWidth(pair, 1));
      ops.push({ t: 'rect', x: a.x, y: ty, w: tileW, h: tileH, rx: 3, fill: '#FFF7ED', stroke: ACCENT, strokeWidth: 0.5 });
      ops.push(glyphText(pair, a.x + tileW / 2 - glyphTextWidth(pair, s) / 2, ty + tileH / 2 - ((ext.top + ext.bottom) / 2) * s, s));
      const gx = a.x + tileW + 4;
      const cw = (a.x + a.w - gx) / words.length;
      const size = Math.min(cw - 5, a.h - 7);
      words.forEach((w, i) => {
        const x = gx + i * cw;
        cellRect(ops, x + 1.2, a.y + 1.2, cw - 2.4, a.h - 2.4);
        ops.push(...iconOps(w.picture, x + cw / 2, a.y + a.h / 2, size));
      });
    }, 27),
    answers: [`Se încercuiesc: ${yes.join(', ')}. Nu se încercuiesc: ${no.join(', ')}.`],
    perLine: 1,
    score: words.length,
  };
}

function firstBlock(item: string, config: WorksheetConfig, words: PhonoWord[]): EvalBlock {
  return {
    item,
    title: 'Primul sunet',
    prompt: 'Scrie în căsuță litera cu care începe cuvântul.',
    parts: onePart(44, 4, (ops, a) => {
      const cw = a.w / words.length;
      const box = 13;
      // the picture between the letter of the cell (top left) and the box to write in
      const room = a.h - box - 9.5;
      const size = Math.min(cw - 11, room);
      words.forEach((w, i) => {
        const x = a.x + i * cw;
        cellRect(ops, x + 1.2, a.y, cw - 2.4, a.h);
        ops.push({ t: 'text', x: x + 3.5, y: a.y + 4.8, text: letter(i), size: 3, fill: MUTED, weight: 'bold' });
        ops.push(...iconOps(w.picture, x + cw / 2, a.y + 5 + room / 2, size));
        const bx = x + cw / 2 - box / 2;
        const by = a.y + a.h - box - 3;
        ops.push({ t: 'rect', x: bx, y: by, w: box, h: box, rx: 2, fill: PAPER, stroke: INK, strokeWidth: 0.6 });
        ops.push({ t: 'line', x1: bx + 2, y1: by + box / 2, x2: bx + box - 2, y2: by + box / 2, stroke: '#DCE6F2', strokeWidth: 0.3, dash: [1, 1] });
      });
    }, 40),
    answers: words.map((w, i) => `${letter(i)} ${caseOf(config, w.word)} – ${caseOf(config, w.initial)}`),
    perLine: 3,
    score: words.length,
  };
}

function sylBlock(item: string, config: WorksheetConfig, words: PhonoWord[]): EvalBlock {
  const rows = Math.ceil(words.length / 2);
  return {
    item,
    title: 'Câte silabe?',
    prompt: 'Colorează câte o bulină pentru fiecare silabă.',
    // two words a row
    parts: rowParts(rows, 27, 23, 4, (ops, a, row) => {
      const cw = a.w / 2;
      const ch = a.h;
      const size = Math.min(22, ch - 6);
      words.slice(row * 2, row * 2 + 2).forEach((w, k) => {
        const i = row * 2 + k;
        const x = a.x + k * cw;
        const y = a.y;
        cellRect(ops, x + 1.2, y + 1.2, cw - 2.4, ch - 2.4);
        ops.push({ t: 'text', x: x + 4, y: y + 6.2, text: letter(i), size: 3, fill: MUTED, weight: 'bold' });
        ops.push(...iconOps(w.picture, x + 9 + size / 2, y + ch / 2, size));
        const tx = x + 14 + size;
        const room = x + cw - 5 - tx;
        const word = caseOf(config, w.word);
        ops.push({ t: 'text', x: tx, y: y + ch / 2 - 3, text: word, size: fit(word, 5, room), fill: INK, weight: 'bold' });
        const gap = 3;
        const r = Math.min(3.6, (room - 3 * gap) / 8);
        for (let c = 0; c < 4; c++) ops.push({ t: 'circle', cx: tx + r + c * (2 * r + gap), cy: y + ch / 2 + 6, r, fill: PAPER, stroke: INK, strokeWidth: 0.55 });
      });
    }),
    answers: words.map((w, i) => `${letter(i)} ${caseOf(config, w.syllables.join('-'))} (${w.syllables.length})`),
    perLine: 4,
    score: words.length,
  };
}

function splitBlock(item: string, config: WorksheetConfig, words: PhonoWord[]): EvalBlock {
  return {
    item,
    title: 'Desparte în silabe',
    prompt: 'Desparte cuvântul în silabe: scrie fiecare silabă într-o căsuță.',
    parts: rowParts(words.length, 20, 17, 3, (ops, a, i, first) => {
      const w = words[i];
      const rh = a.h;
      const pic = Math.min(16, rh - 4);
      const left = a.x + 66;
      const sep = 7;
      const cy = a.y + rh / 2;
      if (!first) ops.push({ t: 'line', x1: a.x, y1: a.y, x2: a.x + a.w, y2: a.y, stroke: CELL_STROKE, strokeWidth: 0.4 });
      ops.push({ t: 'text', x: a.x + 1, y: cy + 1.2, text: letter(i), size: 3.4, fill: MUTED, weight: 'bold' });
      ops.push(...iconOps(w.picture, a.x + 8 + pic / 2, cy, pic));
      const word = caseOf(config, w.word);
      ops.push({ t: 'text', x: a.x + 12 + pic, y: cy + 1.6, text: word, size: fit(word, 4.6, left - 4 - (a.x + 12 + pic)), fill: INK, weight: 'bold' });
      const k = w.syllables.length;
      const boxW = Math.min(30, (a.x + a.w - left - (k - 1) * sep) / k);
      const boxH = Math.min(14, rh - 4);
      for (let j = 0; j < k; j++) {
        const bx = left + j * (boxW + sep);
        ops.push({ t: 'rect', x: bx, y: cy - boxH / 2, w: boxW, h: boxH, rx: 2, fill: PAPER, stroke: INK, strokeWidth: 0.5 });
        ops.push({ t: 'line', x1: bx + 2, y1: cy + boxH / 2 - 3, x2: bx + boxW - 2, y2: cy + boxH / 2 - 3, stroke: '#CBD5E1', strokeWidth: 0.35 });
        if (j < k - 1) ops.push({ t: 'line', x1: bx + boxW + sep / 2 - 1.6, y1: cy, x2: bx + boxW + sep / 2 + 1.6, y2: cy, stroke: INK, strokeWidth: 0.6 });
      }
    }),
    answers: words.map((w, i) => `${letter(i)} ${caseOf(config, w.syllables.join('-'))}`),
    perLine: 3,
    score: words.length,
  };
}

const BOX_FILLS = ['#EFF6FF', '#F0FDF4', '#FFF7ED'];
const BOX_STROKES = ['#3B82F6', '#22C55E', '#F97316'];

function sortBlock(item: string, n: number, pics: SortPicture[]): EvalBlock {
  const def = SORT_SETS[n - 1];
  const answers = def.groups.map((g, gi) => {
    const mine = pics.map((p, i) => ({ p, i })).filter(({ p }) => p.group === gi);
    return `${g.label.join(' ')}: ${mine.map(({ p, i }) => (def.by === 'shape' ? letter(i) : `${letter(i)} ${p.word}`)).join(', ')}`;
  });
  return {
    item,
    title: def.by === 'shape' ? `Sortează ${def.title}` : `Sortează: ${def.title}`,
    prompt: def.by === 'size' ? 'Unește fiecare imagine cu grupa ei: mare sau mică.' : 'Unește fiecare imagine cu grupa ei.',
    parts: onePart(64, 6, (ops, a) => {
      const cw = a.w / pics.length;
      // the group boxes give up their height first, then the pictures; the room for the lines between them stays
      const bh = Math.max(17, Math.min(22, a.h - 43));
      const cellH = Math.min(30, a.h - bh - 13);
      // the picture under the line of its letter, never on it
      const size = Math.min(cw - 12, cellH - 7);
      pics.forEach((p, i) => {
        const x = a.x + i * cw;
        cellRect(ops, x + 1.5, a.y, cw - 3, cellH);
        ops.push({ t: 'text', x: x + 4, y: a.y + 4.6, text: letter(i), size: 3, fill: MUTED, weight: 'bold' });
        const cx = x + cw / 2;
        const cy = a.y + 5.5 + (cellH - 5.5) / 2;
        const s = size * p.scale;
        if (p.picture) ops.push(...iconOps(p.picture, cx, cy, s));
        else if (p.shape) ops.push(shapeOps(p.shape, cx, cy, s * 0.85, p.colour));
        ops.push({ t: 'circle', cx, cy: a.y + cellH + 3, r: 1.2, fill: INK });
      });
      const g = def.groups.length;
      const gap = 10;
      const bw = Math.min(80, (a.w - (g - 1) * gap) / g);
      const bx0 = a.x + (a.w - (g * bw + (g - 1) * gap)) / 2;
      const by = a.y + a.h - bh;
      def.groups.forEach((grp, gi) => {
        const bx = bx0 + gi * (bw + gap);
        ops.push({ t: 'rect', x: bx, y: by, w: bw, h: bh, rx: 4, fill: BOX_FILLS[gi], stroke: BOX_STROKES[gi], strokeWidth: 0.8 });
        const mark = grp.symbol || grp.shape ? Math.min(15, bh - 5) : 0;
        const label = grp.label.join(' ');
        const fs = fit(label, 5, bw - 8 - (mark ? mark + 3 : 0));
        const lw = textWidthMm(label, fs);
        const start = bx + (bw - (lw + (mark ? mark + 3 : 0))) / 2;
        if (grp.symbol) ops.push(...iconOps(grp.symbol, start + mark / 2, by + bh / 2, mark));
        if (grp.shape) ops.push(shapeOps(grp.shape, start + mark / 2, by + bh / 2, mark * 0.8, PAPER, INK, 0.8));
        ops.push({ t: 'text', x: start + (mark ? mark + 3 : 0), y: by + bh / 2 + fs * 0.36, text: label, size: fs, fill: INK, weight: 'bold' });
      });
    }, 56),
    answers,
    perLine: 1,
    score: pics.length,
  };
}

function oddBlock(item: string, rows: OddRow[]): EvalBlock {
  return {
    item,
    title: 'Ce nu se potrivește?',
    prompt: 'Taie cu un X imaginea care nu se potrivește.',
    narrow: true,
    parts: rowParts(rows.length, 21, 18, 5, (ops, a, r) => {
      const row = rows[r];
      const rh = a.h;
      // in half the page width (two items side by side): a smaller letter, the pictures keep all the room there is
      const half = a.w < 120;
      const mark = half ? 3.4 : 4;
      const left = a.x + 2 * mark + (half ? 1.6 : 3);
      const cw = (a.x + a.w - left) / 4;
      const size = Math.min(19, rh - 4.4, cw - (half ? 5.5 : 10));
      ops.push({ t: 'circle', cx: a.x + mark + 0.5, cy: a.y + rh / 2, r: mark, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.5 });
      ops.push({ t: 'text', x: a.x + mark + 0.5, y: a.y + rh / 2 + 1.4, text: String.fromCharCode(97 + r), size: mark, fill: INK, weight: 'bold', align: 'center' });
      row.objects.forEach((o, k) => {
        const x = left + k * cw;
        cellRect(ops, x + (half ? 0.8 : 1.5), a.y + 1.2, cw - (half ? 1.6 : 3), rh - 2.4);
        ops.push(...iconOps(o.picture, x + cw / 2, a.y + rh / 2, size));
      });
    }),
    answers: rows.map((r, i) => `${letter(i)} ${r.objects[r.intruder].word} (celelalte: ${CATEGORY_NAMES[r.cat]})`),
    perLine: 2,
    score: rows.length,
  };
}

function countBlock(item: string, max: number): EvalBlock {
  const { pictures, numbers } = countSet(max);
  const rows = numbers.slice(0, 3);
  return {
    item,
    title: 'Numără și scrie',
    prompt: 'Numără imaginile și scrie numărul în căsuță.',
    // up to five pictures a row: they stay easy to count in half the page width too
    narrow: max <= 5,
    parts: rowParts(rows.length, 19, 16, 5, (ops, a, r) => {
      const n = rows[r];
      const rh = a.h;
      const half = a.w < 120;
      const cy = a.y + rh / 2;
      const box = Math.min(half ? 13 : 16, rh - 4);
      const areaW = a.w - box - (half ? 8 : 12);
      const lead = half ? 8 : 10;
      const between = half ? 1.8 : 2.5;
      ops.push({ t: 'rect', x: a.x, y: a.y + 1.2, w: areaW, h: rh - 2.4, rx: 4, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.4 });
      ops.push({ t: 'text', x: a.x + 3.5, y: a.y + 5.6, text: letter(r), size: 3, fill: MUTED, weight: 'bold' });
      const size = Math.min(12, rh - 5.5, (areaW - lead - 2) / n - between);
      for (let i = 0; i < n; i++) ops.push(...iconOps(pictures[r % pictures.length], a.x + lead + size / 2 + i * (size + between), cy, size));
      const bx = a.x + a.w - box;
      ops.push({ t: 'rect', x: bx, y: cy - box / 2, w: box, h: box, rx: 2.5, fill: PAPER, stroke: INK, strokeWidth: 0.6 });
      ops.push({ t: 'line', x1: bx + 2.5, y1: cy, x2: bx + box - 2.5, y2: cy, stroke: '#DCE6F2', strokeWidth: 0.3, dash: [1, 1] });
      const tip = half ? 1.8 : 2.5;
      ops.push({ t: 'polygon', points: [{ x: bx - tip * 2.8, y: cy - tip }, { x: bx - tip, y: cy }, { x: bx - tip * 2.8, y: cy + tip }], fill: ACCENT });
    }),
    answers: rows.map((n, i) => `${letter(i)} ${n}`),
    perLine: 3,
    score: rows.length,
  };
}

function gameBlocks(config: WorksheetConfig, tier: Tier): EvalBlock[] {
  const used = new Set<string>();
  const blocks: EvalBlock[] = [];
  const items = config.selectedItems.filter((item) => isEvaluationItem(item) && isItemAllowed(item, 'games', tier));
  items.forEach((item, at) => {
    const [kind, arg] = item.split(':');
    const n = Number(arg);
    const later = new Set(items.slice(at + 1).flatMap(pictureWords));
    const pick = <T extends { word: string }>(xs: T[], k: number) => fresh(xs, k, (w) => w.word, used, later);
    if (isM34Item(item)) {
      const b = m34EvalBlock(item, X1 - X0);
      if (b) blocks.push(b);
    } else if (isR34Item(item)) blocks.push(...r34EvalBlocks(item, X1 - X0));
    else if (kind === 'count') blocks.push(countBlock(item, n));
    else if (kind === 'sound') {
      // three pictures that start with the sound and three that do not, in the order of the ordinary page
      const { words } = soundSet(arg);
      const yes = pick(words.filter((w) => w.initial === arg), 3);
      const no = pick(words.filter((w) => w.initial !== arg), 6 - yes.length);
      blocks.push(soundBlock(item, arg, words.filter((w) => yes.includes(w) || no.includes(w))));
    } else if (kind === 'first') blocks.push(firstBlock(item, config, pick(firstSet(n), 6)));
    else if (kind === 'syl') {
      // one word of each length (1–4 syllables), in the order of the ordinary page
      const words = sylSet(n);
      const one = [1, 2, 3, 4].map((c) => pick(words.filter((w) => w.syllables.length === c), 1)[0]).filter(Boolean);
      blocks.push(sylBlock(item, config, words.filter((w) => one.includes(w))));
    }
    else if (kind === 'split') blocks.push(splitBlock(item, config, pick(splitSet(n), 3)));
    else if (kind === 'sort') {
      // the same number of pictures from each group (3 of 2 groups, 2 of 3), in the order of the ordinary page
      const def = SORT_SETS[n - 1];
      const all = sortPictures(n);
      const per = def.groups.length === 2 ? 3 : 2;
      const keep = new Set(def.groups.flatMap((_, gi) => all.filter((p) => p.group === gi).slice(0, per)));
      const pics = all.filter((p) => keep.has(p));
      if (def.by === 'category') pics.forEach((p) => used.add(p.word));
      blocks.push(sortBlock(item, n, pics));
    } else if (kind === 'read') {
      const block = readingEvalBlock(config, item, used);
      if (block) blocks.push(block);
    } else if (kind === 'odd') {
      const rows = oddRows(n);
      const free = rows.filter((r) => r.objects.every((o) => !used.has(o.word)));
      const rowsUsed = (free.length >= 3 ? free : rows).slice(0, 3);
      rowsUsed.forEach((r) => r.objects.forEach((o) => used.add(o.word)));
      blocks.push(oddBlock(item, rowsUsed));
    }
  });
  return blocks;
}

/** Every picture word an item's ordinary page chooses from (to leave them to it). */
function pictureWords(item: string): string[] {
  const [kind, arg] = item.split(':');
  const n = Number(arg);
  if (kind === 'first') return firstSet(n).map((w) => w.word);
  if (kind === 'syl') return sylSet(n).map((w) => w.word);
  if (kind === 'split') return splitSet(n).map((w) => w.word);
  if (kind === 'sort') return sortPictures(n).map((p) => p.word);
  if (kind === 'odd') return oddRows(n).flatMap((r) => r.objects.map((o) => o.word));
  if (kind === 'read') return readingPictureWords(item);
  return [];
}

// ───────────────────────── pages ─────────────────────────

const lerp = (a: number, b: number, c: number) => a + (b - a) * c;
const PAIR_W = (X1 - X0 - PAIR_GUTTER) / 2;
/** The second line of a heading (only two items side by side wrap theirs). */
const HEAD_LINE = 5.2;
const HEAD_SIZE = 4.3;
/** The room of „____ / 6” at the right of a heading. */
const SCORE_W = 24;

/** What is laid out as one piece: an item, or two narrow items side by side. */
interface Unit {
  blocks: EvalBlock[];
  /** The index of its first item (its number, less one). */
  first: number;
  parts: EvalPart[];
  /** The lines of each heading. */
  headings: string[][];
}

/** The rows `from` … `to` of a unit, on one page. */
interface Segment { unit: Unit; from: number; to: number }

/** The items as units; with `pairs`, two narrow items next to each other in the list stand side by side. */
function unitsOf(blocks: EvalBlock[], pairs: boolean, scoreW: number): Unit[] {
  const units: Unit[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const next = blocks[i + 1];
    if (pairs && b.narrow && next?.narrow) {
      const both = [b, next];
      const tallest = (f: (p: EvalPart) => number) => Math.max(...both.map((x) => x.parts.reduce((s, p) => s + f(p), 0)));
      units.push({
        blocks: both,
        first: i,
        headings: both.map((x, k) => wrapText(`${i + k + 1}. ${x.prompt}`, PAIR_W - scoreW - 2, HEAD_SIZE)),
        // one piece: the two items share their rows' height
        parts: [{
          height: tallest((p) => p.height), min: tallest((p) => p.min), grow: tallest((p) => p.grow),
          draw: (ops, a) => both.forEach((x, k) => drawParts(ops, x.parts, { x: a.x + k * (PAIR_W + PAIR_GUTTER), y: a.y, w: PAIR_W, h: a.h })),
        }],
      });
      i++;
    } else units.push({ blocks: [b], first: i, parts: b.parts, headings: [[`${i + 1}. ${b.prompt}`]] });
  }
  return units;
}

/** Heights at comfort `c`: 0 the tightest, 1 the comfortable ones. */
const headingH = (u: Unit, c: number) => lerp(HEADING_MIN, HEADING_H, c) + (Math.max(...u.headings.map((l) => l.length)) - 1) * HEAD_LINE;
const gapH = (c: number) => lerp(GAP_MIN, GAP, c);
const partH = (p: EvalPart, c: number) => lerp(p.min, p.height, c);
const ROOM = BOTTOM - TOP;

/**
 * The units on pages at comfort `c`, in their order, each page filled before the next one starts. A unit that does
 * not fit whole goes on on the next page from the first row that does not fit (its heading is repeated there); a
 * heading always has its first row under it. `tail`: the height of the total line and the self-check row, which
 * stay on the same page as the last row.
 */
function pack(units: Unit[], c: number, tail: number): Segment[][] {
  const pages: Segment[][] = [[]];
  let used = 0;
  units.forEach((unit, ui) => {
    unit.parts.forEach((part, k) => {
      const page = pages[pages.length - 1];
      const open = page[page.length - 1];
      const goesOn = !!open && open.unit === unit;
      const h = partH(part, c);
      const add = goesOn ? h : (page.length ? gapH(c) : 0) + headingH(unit, c) + h;
      const lastRow = ui === units.length - 1 && k === unit.parts.length - 1;
      if (page.length && used + add + (lastRow ? tail : 0) > ROOM + 0.01) {
        pages.push([{ unit, from: k, to: k + 1 }]);
        used = headingH(unit, c) + h;
      } else if (goesOn) {
        open.to = k + 1;
        used += h;
      } else {
        page.push({ unit, from: k, to: k + 1 });
        used += add;
      }
    });
  });
  // a last row as tall as the page: the total and the self-check row get a page of their own
  if (used + tail > ROOM + 0.01 && tail > 0) pages.push([]);
  return pages;
}

/**
 * Where everything goes: the fewest pages the items fit on at their tightest (with two narrow items side by side
 * only when that saves a page), then the most comfortable sizes that still need no more pages.
 */
function plan(blocks: EvalBlock[], tail: (c: number) => number, scoreW: number): Segment[][] {
  const STEPS = 20;
  const tries = (units: Unit[]) => Array.from({ length: STEPS + 1 }, (_, k) => pack(units, 1 - k / STEPS, tail(1 - k / STEPS)));
  const fewest = (all: Segment[][][]) => Math.min(...all.map((p) => p.length));
  const single = tries(unitsOf(blocks, false, scoreW));
  const paired = blocks.some((b, i) => b.narrow && blocks[i + 1]?.narrow) ? tries(unitsOf(blocks, true, scoreW)) : null;
  const best = paired && fewest(paired) < fewest(single) ? paired : single;
  return best.find((p) => p.length === fewest(best))!;
}

/** A page of the plan with its final sizes. */
interface Settled {
  segments: Segment[];
  /** The comfort its heights are drawn at, the height each row gains over that, and the gap between items. */
  comfort: number;
  growth: number[][];
  gap: number;
  /** The share of the page's height its items take (with the total and the self-check row on the last page). */
  fill: number;
}

/** The sizes of a page: as comfortable as it has room for, then the rows a little taller, then the gaps wider. */
function settle(segments: Segment[], tail: (c: number) => number): Settled {
  const rows = (g: Segment) => g.unit.parts.slice(g.from, g.to);
  const used = (c: number) => segments.reduce((s, g) => s + headingH(g.unit, c) + rows(g).reduce((t, p) => t + partH(p, c), 0), 0) + gapH(c) * Math.max(0, segments.length - 1) + tail(c);
  const lo = used(0);
  const hi = used(1);
  const comfort = hi <= ROOM ? 1 : hi - lo < 0.001 ? 0 : Math.max(0, Math.min(1, (ROOM - lo) / (hi - lo)));
  const spare = Math.max(0, ROOM - used(comfort));
  const count = segments.reduce((n, g) => n + g.to - g.from, 0);
  const growth = segments.map((g) => rows(g).map((p) => Math.min(p.grow, spare / Math.max(1, count))));
  const grown = growth.flat().reduce((s, x) => s + x, 0);
  const gap = gapH(comfort) + (segments.length > 1 ? Math.min(10, (spare - grown) / (segments.length - 1)) : 0);
  return { segments, comfort, growth, gap, fill: Math.min(1, (used(comfort) + grown) / ROOM) };
}

interface Layout { blocks: EvalBlock[]; pages: Settled[]; school: boolean; presc: boolean; withSelf: boolean; total: number }

function layoutOf(config: WorksheetConfig, tier: Tier): Layout | null {
  const blocks = config.category === 'math' ? mathBlocks(config, tier) : config.category === 'games' ? gameBlocks(config, tier) : [];
  if (!blocks.length) return null;
  const presc = config.curriculumLevel === 'presc';
  const school = config.curriculumLevel === 'CP' || config.curriculumLevel === 'I' || config.curriculumLevel === 'II' || config.curriculumLevel === 'III' || config.curriculumLevel === 'IV';
  const withSelf = config.showRewardSection !== false;
  const tail = (c: number) => (school ? TOTAL_H : 0) + (withSelf ? lerp(SELF_MIN, SELF_H, c) : 0);
  const pages = plan(blocks, tail, school ? SCORE_W : 0);
  return { blocks, school, presc, withSelf, total: blocks.reduce((s, b) => s + b.score, 0), pages: pages.map((segments, p) => settle(segments, p === pages.length - 1 ? tail : () => 0)) };
}

/** The pupil pages of an evaluation as planned (for the tests and the print hint): the rows of each item on each page, and how full the page is. */
export interface EvaluationPagePlan {
  items: { number: number; item: string; from: number; to: number; rows: number }[];
  fill: number;
}

export function evaluationPlan(config: WorksheetConfig, tier: Tier): EvaluationPagePlan[] {
  const layout = layoutOf(config, tier);
  if (!layout) return [];
  return layout.pages.map((page) => ({
    fill: page.fill,
    items: page.segments.flatMap((g) => g.unit.blocks.map((b, k) => ({ number: g.unit.first + k + 1, item: b.item, from: g.unit.blocks.length > 1 ? 0 : g.from, to: g.unit.blocks.length > 1 ? b.parts.length : g.to, rows: b.parts.length }))),
  }));
}

function calificativExtra(total: number): KeyExtra {
  const bands = calificativBands(total);
  return {
    height: 13 + bands.length * 7.5 + 10,
    draw(ops, top) {
      ops.push({ t: 'text', x: M, y: top + 2, text: `Calificative orientative (din ${countOf(total, 'răspuns', 'răspunsuri')})`, size: 4, fill: INK, weight: 'bold' });
      ops.push({ t: 'text', x: M, y: top + 7.5, text: 'După numărul de răspunsuri corecte. Calificativul îl stabilește cadrul didactic, după descriptorii de performanță.', size: 3, fill: MUTED });
      const tx = M;
      const tw = 120;
      const ty = top + 11;
      const rowH = 7.5;
      ops.push({ t: 'rect', x: tx, y: ty, w: tw, h: rowH * bands.length, rx: 1.5, fill: PAPER, stroke: INK, strokeWidth: 0.4 });
      ops.push({ t: 'line', x1: tx + 62, y1: ty, x2: tx + 62, y2: ty + rowH * bands.length, stroke: INK, strokeWidth: 0.3 });
      bands.forEach((b, i) => {
        const y = ty + i * rowH;
        if (i) ops.push({ t: 'line', x1: tx, y1: y, x2: tx + tw, y2: y, stroke: INK, strokeWidth: 0.3 });
        ops.push({ t: 'text', x: tx + 3, y: y + rowH / 2 + 1.2, text: `${b.name} (${b.code})`, size: 3.4, fill: INK, weight: 'bold' });
        const range = b.min === b.max ? `${b.min}` : `${b.min}–${b.max}`;
        ops.push({ t: 'text', x: tx + 65, y: y + rowH / 2 + 1.2, text: `${range} ${b.max === 1 && b.min === 1 ? 'răspuns corect' : 'răspunsuri corecte'}`, size: 3.4, fill: '#334155' });
      });
    },
  };
}

function observationExtra(blocks: EvalBlock[]): KeyExtra {
  const cols = ['Singur', 'Cu puțin ajutor', 'Cu ajutor'];
  const rowH = 7;
  return {
    height: 14 + (blocks.length + 1) * rowH + 6,
    draw(ops, top) {
      ops.push({ t: 'text', x: M, y: top + 2, text: 'Observare (opțional): cum a lucrat copilul la fiecare item', size: 4, fill: INK, weight: 'bold' });
      ops.push({ t: 'text', x: M, y: top + 7.5, text: 'La grădiniță nu se acordă calificative. Bifați ce ați observat.', size: 3, fill: MUTED });
      const ty = top + 11;
      const first = 96;
      const cw = (W - 2 * M - first) / cols.length;
      const rows = blocks.length + 1;
      ops.push({ t: 'rect', x: M, y: ty, w: W - 2 * M, h: rows * rowH, rx: 1.5, fill: PAPER, stroke: INK, strokeWidth: 0.4 });
      for (let r = 1; r < rows; r++) ops.push({ t: 'line', x1: M, y1: ty + r * rowH, x2: W - M, y2: ty + r * rowH, stroke: INK, strokeWidth: 0.3 });
      cols.forEach((c, k) => {
        const x = M + first + k * cw;
        ops.push({ t: 'line', x1: x, y1: ty, x2: x, y2: ty + rows * rowH, stroke: INK, strokeWidth: 0.3 });
        ops.push({ t: 'text', x: x + cw / 2, y: ty + rowH / 2 + 1.2, text: c, size: 3.2, fill: INK, weight: 'bold', align: 'center' });
      });
      blocks.forEach((b, i) => {
        const y = ty + (i + 1) * rowH;
        const label = `${i + 1}. ${b.title}`;
        ops.push({ t: 'text', x: M + 3, y: y + rowH / 2 + 1.2, text: label, size: fit(label, 3.3, first - 6), fill: '#334155' });
        cols.forEach((_, k) => ops.push({ t: 'rect', x: M + first + k * cw + cw / 2 - 2, y: y + rowH / 2 - 2, w: 4, h: 4, rx: 0.6, stroke: INK, strokeWidth: 0.35 }));
      });
    },
  };
}

export interface CalificativBand { code: 'FB' | 'B' | 'S' | 'I'; name: string; min: number; max: number }

/**
 * Orientative bands by the number of correct answers out of `total`: FB from 85 %, B from 65 %,
 * S from 45 %, I below (rounded up, every band at least one answer wide).
 */
export function calificativBands(total: number): CalificativBand[] {
  const fb = Math.min(total, Math.ceil(total * 0.85));
  const b = Math.min(fb - 1, Math.ceil(total * 0.65));
  const s = Math.max(1, Math.min(b - 1, Math.ceil(total * 0.45)));
  return [
    { code: 'FB', name: 'Foarte bine', min: fb, max: total },
    { code: 'B', name: 'Bine', min: b, max: fb - 1 },
    { code: 'S', name: 'Suficient', min: s, max: b - 1 },
    { code: 'I', name: 'Insuficient', min: 0, max: s - 1 },
  ];
}

/** The answers of an evaluation, as the sections of its answers page. */
function keySections(blocks: EvalBlock[]): KeySection[] {
  return blocks.map((b, i) => ({ title: `${i + 1}. ${b.title} (${countOf(b.score, 'răspuns', 'răspunsuri')})`, entries: b.answers, perLine: b.perLine }));
}

/** The heading of an item, its first line's baseline `base` mm under `y`: the lines, then at the right the score to fill in or a note. */
function headingOps(ops: DrawOp[], lines: string[], x: number, w: number, y: number, base: number, right: { text: string; size: number; bold: boolean } | null): void {
  const rightW = right ? textWidthMm(right.text, right.size) + 5 : 0;
  lines.forEach((line, k) => ops.push({ t: 'text', x, y: y + base + k * HEAD_LINE, text: line, size: fit(line, HEAD_SIZE, w - (k === 0 ? rightW : 0)), fill: INK, weight: 'bold' }));
  if (right) ops.push({ t: 'text', x: x + w, y: y + base, text: right.text, size: right.size, fill: MUTED, align: 'right', ...(right.bold ? { weight: 'bold' as const } : {}) });
}

/** The pages of an evaluation, then its answers (unless left out); empty when none of the chosen items has a short form. */
export function buildEvaluationPages(config: WorksheetConfig, tier: Tier): SheetPage[] {
  const layout = layoutOf(config, tier);
  if (!layout) return [];
  const { blocks, school, presc, withSelf, total } = layout;
  const title = evaluationTitle(config);
  /** The page each item starts on (where its text is, for the items that go on). */
  const startPage = new Map<EvalBlock, number>();
  const pages: SheetPage[] = layout.pages.map((page, p) => {
    const ops: DrawOp[] = [];
    header(ops, config, title);
    const last = p === layout.pages.length - 1;
    const c = page.comfort;
    const base = 5 - (HEADING_H - lerp(HEADING_MIN, HEADING_H, c)) / 3;
    let y = TOP;
    page.segments.forEach(({ unit, from, to }, i) => {
      if (i) ops.push({ t: 'line', x1: X0, y1: y - page.gap / 2, x2: X1, y2: y - page.gap / 2, stroke: CELL_STROKE, strokeWidth: 0.4 });
      const head = headingH(unit, c);
      const heights = unit.parts.slice(from, to).map((part, k) => partH(part, c) + page.growth[i][k]);
      const body = heights.reduce((s, h) => s + h, 0);
      const pair = unit.blocks.length > 1;
      unit.blocks.forEach((b, k) => {
        if (from === 0) startPage.set(b, p + 1);
        // an item that goes on: its instruction again, and where its text is
        const right = from > 0
          ? { text: b.hasText ? `continuare · Textul este pe pagina ${startPage.get(b)}` : 'continuare', size: 3.2, bold: false }
          : school ? { text: `____ / ${b.score}`, size: 3.4, bold: true } : null;
        headingOps(ops, unit.headings[k], X0 + k * (PAIR_W + PAIR_GUTTER), pair ? PAIR_W : X1 - X0, y, base, right);
      });
      if (pair) ops.push({ t: 'line', x1: W / 2, y1: y + 1, x2: W / 2, y2: y + head + body - 1, stroke: CELL_STROKE, strokeWidth: 0.4 });
      let py = y + head;
      unit.parts.slice(from, to).forEach((part, k) => {
        part.draw(ops, { x: X0, y: py, w: X1 - X0, h: heights[k] }, k === 0);
        py += heights[k];
      });
      y = py + page.gap;
    });
    if (last) {
      const selfH = withSelf ? lerp(SELF_MIN, SELF_H, c) : 0;
      if (school) totalLine(ops, total, BOTTOM - selfH - 1.6);
      if (withSelf) selfCheck(ops, presc, selfH);
    }
    return { width: W, height: H, ops, competenceItems: page.segments.flatMap((g) => g.unit.blocks.map((b) => b.item)) };
  });
  if (config.evaluationAnswers !== false) {
    const extras = school ? [calificativExtra(total)] : presc ? [observationExtra(blocks)] : [];
    const instruction = presc ? 'Pentru educatoare sau părinte: răspunsurile, item cu item.' : 'Pentru cadrul didactic: răspunsurile corecte, item cu item.';
    for (const ops of answerKeyPages(config, keySections(blocks), extras, instruction)) pages.push({ width: W, height: H, ops, answerKey: true });
  }
  pages.forEach((page, i) => footer(page.ops, tier, i + 1, pages.length));
  return pages;
}

/** How many pages of an evaluation are the pupils' and how many the teacher's (the answers); null when it is not an evaluation. */
export function evaluationPageSplit(config: WorksheetConfig, tier: Tier): { pupil: number; key: number } | null {
  if (!config.evaluation || (config.category !== 'math' && config.category !== 'games')) return null;
  const pages = buildEvaluationPages(config, tier);
  if (!pages.length) return null;
  const key = pages.filter((p) => p.answerKey).length;
  return { pupil: pages.length - key, key };
}

const pageRange = (from: number, to: number) => (from === to ? `Pagina ${from} este` : `Paginile ${from}–${to} sunt`);

/**
 * What to print for whom, next to the download button: „Paginile 1–2 sunt pentru elevi; pagina 3 este pentru tine.”
 * (a class set is the pupils' pages times the number of pupils, the answers once).
 */
export function evaluationPrintHint(split: { pupil: number; key: number }): string {
  const pupils = `${pageRange(1, split.pupil)} pentru elevi`;
  if (!split.key) return `${pupils}; pagina de răspunsuri nu este inclusă.`;
  const mine = pageRange(split.pupil + 1, split.pupil + split.key);
  return `${pupils}; ${mine.charAt(0).toLowerCase()}${mine.slice(1)} pentru tine.`;
}
