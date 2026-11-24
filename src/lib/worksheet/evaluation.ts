import type { DrawOp, Subpath } from '@/lib/glyphs/types';
import type { Tier, WorksheetConfig } from '@/types';
import { iconOps } from '@/lib/hints/icons';
import { madeWith } from '@/lib/brand';
import { textWidthMm } from '@/lib/book/text';
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
import { hasIcon } from '@/lib/hints/icons';
import { readingEvalBlock, readingPictureWords } from './reading-pages';
import { m34EvalBlock } from './m34-pages';
import { isM34Item } from './m34';
import { r34EvalBlocks } from './r34-pages';
import { isR34Item } from './r34';

/**
 * „Evaluare”: a short test of the chosen exercise types, on two or three pages, then the answers.
 *
 * It is a way of printing the items of one sheet (config.evaluation), not a new kind of sheet:
 * the math or game items the teacher chose each become one numbered item („1. Compară numerele.”)
 * with a handful of exercises, taken from the very generators of the ordinary pages (the first
 * exercises of the same seeded set, the first pictures of the same word set), so the evaluation and
 * its answers page always agree. The header names the subject and the class („Evaluare — Matematică
 * și explorarea mediului, clasa I”), the last page ends with a self-check row (optional, the
 * „Stelele de recompensă” setting), and the answers page — always printed — gives the teacher of
 * clasa pregătitoare, I or a II-a an orientative table of calificative (FB, B, S, I) by the number of
 * correct answers; at grădiniță there are no calificative, only an optional observation grid.
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
const TOP = M + 25;
/** Bottom of the items: under it the page number and the curriculum line. */
const BOTTOM = H - M - 7;
const HEADING_H = 9;
const GAP = 5;
const SELF_H = 23;
/** The tallest body an item can have: one page from TOP to BOTTOM with its heading (the self-check row can move on). */
const MAX_BODY = BOTTOM - TOP - HEADING_H;
const CELL_STROKE = '#E6DECD';
const SOFT = '#FBF7EE';

interface Area { x: number; y: number; w: number; h: number }

interface EvalBlock {
  item: string;
  /** Short name, for the answers page („Compară numerele”). */
  title: string;
  /** The instruction after the item's number. */
  prompt: string;
  /** Height of the body (mm), without the heading. */
  height: number;
  /** How much taller it can usefully be drawn when the page has room. */
  grow: number;
  draw: (ops: DrawOp[], a: Area) => void;
  answers: string[];
  perLine: number;
  /** How many answers the child gives (the count the calificative go by). */
  score: number;
}

const letter = (i: number) => `${String.fromCharCode(97 + i)})`;

/** Math topics without a short form in an evaluation (their pages are whole exercises of their own). */
const EVAL_LESS_MATH = new Set<string>(['groups', 'clockdraw', 'week', 'months', 'calmonth', 'length', 'mass', 'ruler', 'units', 'frac', 'figures']);

/** Whether an item has a short form for an evaluation. */
export function isEvaluationItem(item: string): boolean {
  // of the other math topics: multiplication, division and reading the clock
  if (isMathType(item)) return !EVAL_LESS_MATH.has(item);
  if (/^read:(match|gap|fill|order|text):[1-6]$/.test(item)) return true; // „Citire și scriere” (reading-pages.ts)
  // clasa a III-a și a IV-a: the kinds with a short form (m34-pages.ts, r34-pages.ts)
  if (isM34Item(item)) return m34EvalBlock(item, X1 - X0) !== null;
  if (isR34Item(item)) return r34EvalBlocks(item, X1 - X0, MAX_BODY).length > 0;
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

/** The last row: three faces to colour, each with its words under it. */
function selfCheck(ops: DrawOp[], presc: boolean): void {
  const by = BOTTOM - SELF_H + 3;
  const h = SELF_H - 3;
  const def = SELF_CHECK[presc ? 'presc' : 'school'];
  ops.push({ t: 'rect', x: X0, y: by, w: X1 - X0, h, rx: 2.5, fill: '#FFFBEB', stroke: '#FBBF24', strokeWidth: 0.4 });
  def.title.forEach((line, k) => ops.push({ t: 'text', x: X0 + 5, y: by + h / 2 - 1 + k * 5, text: line, size: 3.8, fill: '#92400E', weight: 'bold' }));
  const start = X0 + 5 + Math.max(...def.title.map((l) => textWidthMm(l, 3.8))) + 8;
  const cell = (X1 - 3 - start) / 3;
  def.faces.forEach(([label, mood], i) => {
    const cx = start + (i + 0.5) * cell;
    ops.push(...faceOps(cx, by + 7.5, 5, mood));
    ops.push({ t: 'text', x: cx, y: by + h - 2.6, text: label, size: fit(label, 3.1, cell - 3), fill: '#92400E', weight: 'bold', align: 'center' });
  });
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
  const rowH = type === 'addpic' ? 22 : 15.5;
  return {
    item: type,
    title: MATH_LABELS[type].title,
    prompt: GRID_PROMPT[type]!,
    height: rows * rowH,
    grow: rows * (type === 'addpic' ? 6 : 4),
    answers: exercises.map((e, i) => `${letter(i)} ${solved(e)}`),
    perLine: big ? (type === 'seq' || type === 'nbr' ? 1 : type === 'cmp' ? 3 : 2) : type === 'seq' ? 2 : type === 'nbr' || type === 'addpic' ? 3 : 4,
    score: exercises.length,
    draw(ops, a) {
      const rh = a.h / rows;
      const colW = a.w / cols;
      if (type === 'addpic') {
        const pics = PICTURES.filter(hasIcon);
        exercises.forEach((e, i) => {
          const y = a.y + i * rh;
          const cy = y + rh / 2;
          ops.push({ t: 'rect', x: a.x, y: y + 1, w: a.w, h: rh - 2, rx: 4, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.4 });
          ops.push({ t: 'text', x: a.x + 4, y: cy + 1.4, text: letter(i), size: 3.6, fill: MUTED, weight: 'bold' });
          const s = Math.min(8, (rh - 6) / 2 - 1.2);
          const groupW = 3 * (s + 1.2);
          const [p, q] = e.pictures!;
          const x = a.x + 11;
          ops.push(...picturesOps(p, pics[i % pics.length], x, cy, s));
          ops.push({ t: 'text', x: x + groupW + 5, y: cy + 3.2, text: '+', size: 9, fill: INK, weight: 'bold', align: 'center' });
          ops.push(...picturesOps(q, pics[i % pics.length], x + groupW + 10, cy, s));
          ops.push(...exerciseOps(e, x + 2 * groupW + 20, cy, 8.5, a.x + a.w - (x + 2 * groupW + 24)));
        });
        return;
      }
      const size = big ? 7.5 : type === 'seq' ? 8.5 : range >= 100 ? 8 : 8.5;
      exercises.forEach((e, i) => {
        const col = Math.floor(i / rows);
        const row = i % rows;
        const x = a.x + col * colW + 4;
        const cy = a.y + row * rh + rh / 2;
        ops.push({ t: 'text', x, y: cy + 1.4, text: letter(i), size: 3.6, fill: MUTED, weight: 'bold' });
        ops.push(...exerciseOps(e, x + 8, cy, size, colW - 16, range === 1000, big ? bigBoxChars(e) : 0));
      });
    },
  };
}

function problemsBlock(problems: WordProblem[], range: MathRange): EvalBlock {
  return {
    item: 'problems',
    title: MATH_LABELS.problems.title,
    prompt: range <= 5 ? 'Ascultă problema, numără imaginile și completează căsuțele.' : 'Rezolvă problemele.',
    height: problemsHeight(problems, range, X0, X1),
    grow: 10,
    answers: problems.map((p, i) => `${letter(i)} ${problemAnswer(p, range)}`),
    perLine: 1,
    score: problems.length,
    draw: (ops, a) => ops.push(...problemsPageOps(problems, range, a.x, a.x + a.w, a.y, a.y + a.h, letter)),
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
    height: exercises.length * 34,
    grow: exercises.length * 6,
    answers: exercises.map((e, i) => `${letter(i)} ${moneyAnswer(e)}`),
    perLine: 1,
    score: exercises.reduce((n, e) => n + (e.kind === 'exchange' ? e.pairs.length : 1), 0),
    draw: (ops, a) => ops.push(...moneyPageOps(exercises, a.x, a.x + a.w, a.y, a.y + a.h, letter, range === 1000)),
  };
}

/** Four clocks to read, of every kind the page has (ore fixe, jumătăți, sferturi, minute). */
function clockBlock(times: ClockTime[]): EvalBlock {
  return {
    item: 'clock',
    title: MATH_LABELS.clock.title,
    prompt: 'Cât este ceasul? Scrie ora în căsuțe.',
    height: 50,
    grow: 14,
    answers: times.map((t, i) => `${letter(i)} ${digital(t)} – ${timeWords(t)}`),
    perLine: 2,
    score: times.length,
    draw: (ops, a) => ops.push(...clocksOps(times, true, a.x, a.x + a.w, a.y, a.y + a.h, times.length, letter)),
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
    height: 54,
    grow: 14,
    answers: [`Se încercuiesc: ${yes.join(', ')}. Nu se încercuiesc: ${no.join(', ')}.`],
    perLine: 1,
    score: words.length,
    draw(ops, a) {
      const tileW = 30;
      const tileH = Math.min(a.h - 2, 40);
      const ty = a.y + (a.h - tileH) / 2;
      const pair = `${sound}${sound.toLocaleLowerCase('ro')}`;
      const ext = inkExtent(pair);
      const s = Math.min((tileH - 10) / (ext.bottom - ext.top), (tileW - 6) / glyphTextWidth(pair, 1));
      ops.push({ t: 'rect', x: a.x, y: ty, w: tileW, h: tileH, rx: 3, fill: '#FFF7ED', stroke: ACCENT, strokeWidth: 0.5 });
      ops.push(glyphText(pair, a.x + tileW / 2 - glyphTextWidth(pair, s) / 2, ty + tileH / 2 - ((ext.top + ext.bottom) / 2) * s, s));
      const gx = a.x + tileW + 5;
      const cw = (a.x + a.w - gx) / 3;
      const ch = a.h / 2;
      const size = Math.min(cw, ch) - 7;
      words.forEach((w, i) => {
        const x = gx + (i % 3) * cw;
        const y = a.y + Math.floor(i / 3) * ch;
        cellRect(ops, x + 1.2, y + 1.2, cw - 2.4, ch - 2.4);
        ops.push(...iconOps(w.picture, x + cw / 2, y + ch / 2, size));
      });
    },
  };
}

function firstBlock(item: string, config: WorksheetConfig, words: PhonoWord[]): EvalBlock {
  return {
    item,
    title: 'Primul sunet',
    prompt: 'Scrie în căsuță litera cu care începe cuvântul.',
    height: 44,
    grow: 10,
    answers: words.map((w, i) => `${letter(i)} ${caseOf(config, w.word)} – ${caseOf(config, w.initial)}`),
    perLine: 3,
    score: words.length,
    draw(ops, a) {
      const cw = a.w / words.length;
      const box = 13;
      const size = Math.min(cw - 11, a.h - box - 13);
      words.forEach((w, i) => {
        const x = a.x + i * cw;
        cellRect(ops, x + 1.2, a.y, cw - 2.4, a.h);
        ops.push({ t: 'text', x: x + 3.5, y: a.y + 4.8, text: letter(i), size: 3, fill: MUTED, weight: 'bold' });
        ops.push(...iconOps(w.picture, x + cw / 2, a.y + 6 + (a.h - box - 9) / 2, size));
        const bx = x + cw / 2 - box / 2;
        const by = a.y + a.h - box - 3;
        ops.push({ t: 'rect', x: bx, y: by, w: box, h: box, rx: 2, fill: PAPER, stroke: INK, strokeWidth: 0.6 });
        ops.push({ t: 'line', x1: bx + 2, y1: by + box / 2, x2: bx + box - 2, y2: by + box / 2, stroke: '#DCE6F2', strokeWidth: 0.3, dash: [1, 1] });
      });
    },
  };
}

function sylBlock(item: string, config: WorksheetConfig, words: PhonoWord[]): EvalBlock {
  const rows = Math.ceil(words.length / 2);
  return {
    item,
    title: 'Câte silabe?',
    prompt: 'Colorează câte o bulină pentru fiecare silabă.',
    height: rows * 27,
    grow: rows * 6,
    answers: words.map((w, i) => `${letter(i)} ${caseOf(config, w.syllables.join('-'))} (${w.syllables.length})`),
    perLine: 4,
    score: words.length,
    draw(ops, a) {
      const cw = a.w / 2;
      const ch = a.h / rows;
      const size = Math.min(22, ch - 6);
      words.forEach((w, i) => {
        const x = a.x + (i % 2) * cw;
        const y = a.y + Math.floor(i / 2) * ch;
        cellRect(ops, x + 1.2, y + 1.2, cw - 2.4, ch - 2.4);
        ops.push({ t: 'text', x: x + 4, y: y + 6.2, text: letter(i), size: 3, fill: MUTED, weight: 'bold' });
        ops.push(...iconOps(w.picture, x + 9 + size / 2, y + ch / 2, size));
        const tx = x + 14 + size;
        const room = x + cw - 5 - tx;
        const word = caseOf(config, w.word);
        ops.push({ t: 'text', x: tx, y: y + ch / 2 - 3, text: word, size: fit(word, 5, room), fill: INK, weight: 'bold' });
        const gap = 3;
        const r = Math.min(3.6, (room - 3 * gap) / 8);
        for (let k = 0; k < 4; k++) ops.push({ t: 'circle', cx: tx + r + k * (2 * r + gap), cy: y + ch / 2 + 6, r, fill: PAPER, stroke: INK, strokeWidth: 0.55 });
      });
    },
  };
}

function splitBlock(item: string, config: WorksheetConfig, words: PhonoWord[]): EvalBlock {
  return {
    item,
    title: 'Desparte în silabe',
    prompt: 'Desparte cuvântul în silabe: scrie fiecare silabă într-o căsuță.',
    height: words.length * 20,
    grow: words.length * 4,
    answers: words.map((w, i) => `${letter(i)} ${caseOf(config, w.syllables.join('-'))}`),
    perLine: 3,
    score: words.length,
    draw(ops, a) {
      const rh = a.h / words.length;
      const pic = Math.min(16, rh - 4);
      const left = a.x + 66;
      const sep = 7;
      words.forEach((w, i) => {
        const y = a.y + i * rh;
        const cy = y + rh / 2;
        if (i) ops.push({ t: 'line', x1: a.x, y1: y, x2: a.x + a.w, y2: y, stroke: CELL_STROKE, strokeWidth: 0.4 });
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
      });
    },
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
    height: 64,
    grow: 12,
    answers,
    perLine: 1,
    score: pics.length,
    draw(ops, a) {
      const cw = a.w / pics.length;
      const cellH = Math.min(30, a.h - 36);
      // the picture under the line of its letter, never on it
      const size = Math.min(cw - 12, cellH - 11);
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
      const bh = 22;
      const gap = 10;
      const bw = Math.min(80, (a.w - (g - 1) * gap) / g);
      const bx0 = a.x + (a.w - (g * bw + (g - 1) * gap)) / 2;
      const by = a.y + a.h - bh;
      def.groups.forEach((grp, gi) => {
        const bx = bx0 + gi * (bw + gap);
        ops.push({ t: 'rect', x: bx, y: by, w: bw, h: bh, rx: 4, fill: BOX_FILLS[gi], stroke: BOX_STROKES[gi], strokeWidth: 0.8 });
        const mark = grp.symbol || grp.shape ? 15 : 0;
        const label = grp.label.join(' ');
        const fs = fit(label, 5, bw - 8 - (mark ? mark + 3 : 0));
        const lw = textWidthMm(label, fs);
        const start = bx + (bw - (lw + (mark ? mark + 3 : 0))) / 2;
        if (grp.symbol) ops.push(...iconOps(grp.symbol, start + mark / 2, by + bh / 2, mark));
        if (grp.shape) ops.push(shapeOps(grp.shape, start + mark / 2, by + bh / 2, mark * 0.8, PAPER, INK, 0.8));
        ops.push({ t: 'text', x: start + (mark ? mark + 3 : 0), y: by + bh / 2 + fs * 0.36, text: label, size: fs, fill: INK, weight: 'bold' });
      });
    },
  };
}

function oddBlock(item: string, rows: OddRow[]): EvalBlock {
  return {
    item,
    title: 'Ce nu se potrivește?',
    prompt: 'Taie cu un X imaginea care nu se potrivește.',
    height: rows.length * 21,
    grow: rows.length * 5,
    answers: rows.map((r, i) => `${letter(i)} ${r.objects[r.intruder].word} (celelalte: ${CATEGORY_NAMES[r.cat]})`),
    perLine: 2,
    score: rows.length,
    draw(ops, a) {
      const rh = a.h / rows.length;
      const left = a.x + 11;
      const cw = (a.x + a.w - left) / 4;
      const size = Math.min(19, rh - 5, cw - 10);
      rows.forEach((row, r) => {
        const y = a.y + r * rh;
        ops.push({ t: 'circle', cx: a.x + 4.5, cy: y + rh / 2, r: 4, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.5 });
        ops.push({ t: 'text', x: a.x + 4.5, y: y + rh / 2 + 1.4, text: String.fromCharCode(97 + r), size: 4, fill: INK, weight: 'bold', align: 'center' });
        row.objects.forEach((o, k) => {
          const x = left + k * cw;
          cellRect(ops, x + 1.5, y + 1.2, cw - 3, rh - 2.4);
          ops.push(...iconOps(o.picture, x + cw / 2, y + rh / 2, size));
        });
      });
    },
  };
}

function countBlock(item: string, max: number): EvalBlock {
  const { pictures, numbers } = countSet(max);
  const rows = numbers.slice(0, 3);
  return {
    item,
    title: 'Numără și scrie',
    prompt: 'Numără imaginile și scrie numărul în căsuță.',
    height: rows.length * 19,
    grow: rows.length * 5,
    answers: rows.map((n, i) => `${letter(i)} ${n}`),
    perLine: 3,
    score: rows.length,
    draw(ops, a) {
      const rh = a.h / rows.length;
      const box = Math.min(16, rh - 4);
      const areaW = a.w - box - 12;
      rows.forEach((n, r) => {
        const y = a.y + r * rh;
        const cy = y + rh / 2;
        ops.push({ t: 'rect', x: a.x, y: y + 1.2, w: areaW, h: rh - 2.4, rx: 4, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.4 });
        ops.push({ t: 'text', x: a.x + 3.5, y: y + 5.6, text: letter(r), size: 3, fill: MUTED, weight: 'bold' });
        const size = Math.min(12, rh - 7, (areaW - 14) / n - 2.5);
        for (let i = 0; i < n; i++) ops.push(...iconOps(pictures[r % pictures.length], a.x + 10 + size / 2 + i * (size + 2.5), cy, size));
        const bx = a.x + a.w - box;
        ops.push({ t: 'rect', x: bx, y: cy - box / 2, w: box, h: box, rx: 2.5, fill: PAPER, stroke: INK, strokeWidth: 0.6 });
        ops.push({ t: 'line', x1: bx + 2.5, y1: cy, x2: bx + box - 2.5, y2: cy, stroke: '#DCE6F2', strokeWidth: 0.3, dash: [1, 1] });
        ops.push({ t: 'polygon', points: [{ x: bx - 7, y: cy - 2.5 }, { x: bx - 2.5, y: cy }, { x: bx - 7, y: cy + 2.5 }], fill: ACCENT });
      });
    },
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
    } else if (isR34Item(item)) blocks.push(...r34EvalBlocks(item, X1 - X0, MAX_BODY));
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

const need = (b: EvalBlock) => HEADING_H + b.height;

/**
 * Blocks on pages: as few pages as fit, then evened out (the first pages are not crammed while the
 * last one is nearly empty). The self-check row needs its room on the last page.
 */
function paginate(blocks: EvalBlock[], selfH: number): EvalBlock[][] {
  const room = BOTTOM - TOP;
  const pack = (cap: number): EvalBlock[][] => {
    const pages: EvalBlock[][] = [[]];
    let used = 0;
    for (const b of blocks) {
      const h = need(b) + (pages[pages.length - 1].length ? GAP : 0);
      if (used + h > cap && pages[pages.length - 1].length) {
        pages.push([b]);
        used = need(b);
      } else {
        pages[pages.length - 1].push(b);
        used += h;
      }
    }
    // the self-check row counts on the last page, as one more thing that must fit
    if (used + selfH > cap) pages.push([]);
    return pages;
  };
  const fewest = pack(room);
  const total = blocks.reduce((s, b) => s + need(b) + GAP, 0) + selfH;
  for (let cap = Math.min(room, total / fewest.length); cap < room; cap += 4) {
    const p = pack(cap);
    if (p.length === fewest.length && p.every((pg) => pg.length)) return p;
  }
  return fewest;
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

/** The pages of an evaluation, then its answers; empty when none of the chosen items has a short form. */
export function buildEvaluationPages(config: WorksheetConfig, tier: Tier): SheetPage[] {
  const blocks = config.category === 'math' ? mathBlocks(config, tier) : config.category === 'games' ? gameBlocks(config, tier) : [];
  if (!blocks.length) return [];
  const presc = config.curriculumLevel === 'presc';
  const school = config.curriculumLevel === 'CP' || config.curriculumLevel === 'I' || config.curriculumLevel === 'II' || config.curriculumLevel === 'III' || config.curriculumLevel === 'IV';
  const withSelf = config.showRewardSection !== false;
  const title = evaluationTitle(config);
  const layout = paginate(blocks, withSelf ? SELF_H : 0);
  let number = 0;
  const pages: SheetPage[] = layout.map((onPage, p) => {
    const ops: DrawOp[] = [];
    header(ops, config, title);
    const last = p === layout.length - 1;
    const bottom = last && withSelf ? BOTTOM - SELF_H : BOTTOM;
    const used = onPage.reduce((s, b) => s + need(b), 0) + GAP * Math.max(0, onPage.length - 1);
    const spare = Math.max(0, bottom - TOP - used);
    // the room left: first to the blocks that can use it (bigger pictures), the rest between them
    const growth = onPage.map((b) => Math.min(b.grow, spare / onPage.length));
    const gap = onPage.length > 1 ? GAP + Math.min(10, (spare - growth.reduce((s, g) => s + g, 0)) / (onPage.length - 1)) : GAP;
    let y = TOP;
    onPage.forEach((b, i) => {
      number++;
      if (i) ops.push({ t: 'line', x1: X0, y1: y - gap / 2, x2: X1, y2: y - gap / 2, stroke: CELL_STROKE, strokeWidth: 0.4 });
      const scoreW = school ? 24 : 0;
      const heading = `${number}. ${b.prompt}`;
      ops.push({ t: 'text', x: X0, y: y + 5, text: heading, size: fit(heading, 4.3, X1 - X0 - scoreW), fill: INK, weight: 'bold' });
      if (school) ops.push({ t: 'text', x: X1, y: y + 5, text: `____ / ${b.score}`, size: 3.4, fill: MUTED, weight: 'bold', align: 'right' });
      const h = b.height + growth[i];
      b.draw(ops, { x: X0, y: y + HEADING_H, w: X1 - X0, h });
      y += HEADING_H + h + gap;
    });
    if (last && withSelf) selfCheck(ops, presc);
    return { width: W, height: H, ops, competenceItems: onPage.map((b) => b.item) };
  });
  const total = blocks.reduce((s, b) => s + b.score, 0);
  const extras = school ? [calificativExtra(total)] : presc ? [observationExtra(blocks)] : [];
  const instruction = presc ? 'Pentru educatoare sau părinte: răspunsurile, item cu item.' : 'Pentru cadrul didactic: răspunsurile corecte, item cu item.';
  for (const ops of answerKeyPages(config, keySections(blocks), extras, instruction)) pages.push({ width: W, height: H, ops, answerKey: true });
  pages.forEach((page, i) => footer(page.ops, tier, i + 1, pages.length));
  return pages;
}
