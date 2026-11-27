import type { DrawOp } from '@/lib/glyphs/types';
import { textWidthMm } from '@/lib/book/text';
import { ACCENT, INK, MUTED, PAPER } from './rows';

/**
 * „Calendarul”: the days of the week, the months and the seasons, a month's calendar.
 *
 *   week      clasa pregătitoare: „Ziua, săptămâna, luna: denumire, ordonare”: the days in order, the
 *             day after / before, mâine and ieri
 *   months    the months and the seasons in order; clasa a II-a „Anotimpurile: lunile corespunzătoare”
 *   calmonth  clasa a II-a „Ziua (ieri, alaltăieri, mâine, poimâine), săptămâna, luna, anul (calendarul)”:
 *             a real month of the school year 2026–2027 (septembrie 2026 – iunie 2027) and questions about it
 *
 * Names are written as in Romanian, in small letters: luni, marți …; ianuarie …; primăvara, vara ….
 */

export const DAYS = ['luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă', 'duminică'] as const;
export const MONTHS = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'] as const;
/** The seasons as they are named („Ce anotimp urmează?” — „vara”), and after „după” („după vară”). */
export const SEASONS = ['primăvara', 'vara', 'toamna', 'iarna'] as const;
const SEASONS_AFTER = ['primăvară', 'vară', 'toamnă', 'iarnă'] as const;

/** The season of a month (0 = ianuarie): decembrie, ianuarie, februarie are iarna. */
export const seasonOf = (month: number) => SEASONS[Math.floor(((month + 10) % 12) / 3)];

const int = (rand: () => number, lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
function shuffle<T>(xs: T[], rand: () => number): T[] {
  const out = xs.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
/** `n` different numbers of lo…hi. */
const pick = (rand: () => number, lo: number, hi: number, n: number) => shuffle(Array.from({ length: hi - lo + 1 }, (_, i) => lo + i), rand).slice(0, n);

/** A row of names in order, some left out (`null`): the child writes them. */
export interface OrderRow {
  cells: (string | null)[];
  answers: string[];
}

/** A question with its answer: written on a line (`box`: a short number box instead). */
export interface Question {
  text: string;
  answer: string;
  box?: boolean;
  /** Text after the box or line („zile.”). */
  after?: string;
}

export interface CalendarSection {
  heading: string;
  rows?: OrderRow[];
  questions?: Question[];
  /** A month to draw first (calmonth). */
  month?: MonthGrid;
}

export interface CalendarSheet {
  kind: 'week' | 'months' | 'calmonth';
  sections: CalendarSection[];
}

function orderRow(names: readonly string[], start: number, length: number, holes: number, rand: () => number): OrderRow {
  const seq = Array.from({ length }, (_, i) => names[(start + i) % names.length]);
  // never the first name (the row starts from something the child can read), never two holes side by side
  let hide = new Set<number>();
  for (let tries = 0; tries < 200; tries++) {
    hide = new Set(pick(rand, 1, length - 1, holes));
    if (![...hide].some((i) => hide.has(i + 1))) break;
  }
  return { cells: seq.map((n, i) => (hide.has(i) ? null : n)), answers: seq.filter((_, i) => hide.has(i)) };
}

const after = <T extends readonly string[]>(xs: T, i: number) => xs[(i + 1) % xs.length];
const before = <T extends readonly string[]>(xs: T, i: number) => xs[(i + xs.length - 1) % xs.length];

/** „Zilele săptămânii”: two rows to complete (from luni, and from another day), six questions, how many days. */
export function weekSheet(rand: () => number): CalendarSheet {
  const rows = [orderRow(DAYS, 0, 7, 3, rand), orderRow(DAYS, int(rand, 2, 5), 7, 3, rand)];
  const d = pick(rand, 0, 6, 6);
  const questions: Question[] = [
    { text: `Ce zi urmează după ${DAYS[d[0]]}?`, answer: after(DAYS, d[0]) },
    { text: `Ce zi este înainte de ${DAYS[d[1]]}?`, answer: before(DAYS, d[1]) },
    { text: `Azi este ${DAYS[d[2]]}. Mâine va fi`, answer: after(DAYS, d[2]), after: '.' },
    { text: `Azi este ${DAYS[d[3]]}. Ieri a fost`, answer: before(DAYS, d[3]), after: '.' },
    { text: `Ce zi urmează după ${DAYS[d[4]]}?`, answer: after(DAYS, d[4]) },
    { text: `Ce zi este înainte de ${DAYS[d[5]]}?`, answer: before(DAYS, d[5]) },
  ];
  return {
    kind: 'week',
    sections: [
      { heading: 'Completează zilele săptămânii care lipsesc.', rows },
      { heading: 'Răspunde la întrebări.', questions },
      { heading: 'Completează.', questions: [{ text: 'O săptămână are', answer: '7', box: true, after: 'zile.' }] },
    ],
  };
}

/** „Lunile și anotimpurile”: the months in order, the day after / before, the seasons, the season of a month. */
export function monthsSheet(rand: () => number): CalendarSheet {
  const rows = [orderRow(MONTHS, 0, 6, 2, rand), orderRow(MONTHS, 6, 6, 2, rand)];
  const m = pick(rand, 0, 11, 3);
  const s = int(rand, 0, 3);
  const seasonRow = orderRow(SEASONS, s, 4, 2, rand);
  const sa = pick(rand, 0, 3, 1)[0];
  // one month of three different seasons
  const bySeason = shuffle([0, 1, 2, 3], rand).slice(0, 3).map((k) => (k * 3 + 2 + int(rand, 0, 2)) % 12);
  return {
    kind: 'months',
    sections: [
      { heading: 'Completează lunile anului care lipsesc.', rows },
      {
        heading: 'Răspunde la întrebări.',
        questions: [
          { text: `Ce lună urmează după ${MONTHS[m[0]]}?`, answer: after(MONTHS, m[0]) },
          { text: `Ce lună este înainte de ${MONTHS[m[1]]}?`, answer: before(MONTHS, m[1]) },
          { text: `Ce lună urmează după ${MONTHS[m[2]]}?`, answer: after(MONTHS, m[2]) },
          { text: 'Un an are', answer: '12', box: true, after: 'luni.' },
        ],
      },
      { heading: 'Completează anotimpurile, în ordine.', rows: [seasonRow], questions: [{ text: `Ce anotimp urmează după ${SEASONS_AFTER[sa]}?`, answer: SEASONS[(sa + 1) % 4] }] },
      { heading: 'Anotimpurile și lunile lor.', questions: bySeason.map((k) => ({ text: `În ce anotimp este luna ${MONTHS[k]}?`, answer: seasonOf(k) })) },
    ],
  };
}

// ───────────────────────── a month's calendar ─────────────────────────

export interface MonthGrid {
  year: number;
  /** 0 = ianuarie. */
  month: number;
  days: number;
  /** Day of the week of the 1st, 0 = luni. */
  first: number;
}

export function monthGrid(year: number, month: number): MonthGrid {
  return {
    year,
    month,
    days: new Date(Date.UTC(year, month + 1, 0)).getUTCDate(),
    first: (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7,
  };
}

/** How many rows (weeks) the month's calendar has: 4 to 6. */
export const weeksOf = (g: MonthGrid) => Math.ceil((g.first + g.days) / 7);

/** Day of the week (0 = luni) of a date of the grid. */
export const weekdayOf = (g: MonthGrid, day: number) => (g.first + day - 1) % 7;

/** „Câte zile de duminică”: how many times a day of the week comes in the month. */
export const countWeekday = (g: MonthGrid, wd: number) => Array.from({ length: g.days }, (_, i) => weekdayOf(g, i + 1)).filter((x) => x === wd).length;

/**
 * The months the calendar sheet draws: those of the school year 2026–2027, from its first month to its
 * last (septembrie 2026 … iunie 2027), so the sheet never shows a month that was over before the year
 * began. A fixed list, not today's date: the same seed is the same sheet on every day and in every test.
 */
export const SCHOOL_YEAR_MONTHS: { year: number; month: number }[] = Array.from({ length: 10 }, (_, k) => ({ year: k < 4 ? 2026 : 2027, month: (8 + k) % 12 }));

/** A month of the school year and six questions about it, all answered from its calendar. */
export function calmonthSheet(rand: () => number): CalendarSheet {
  const at = SCHOOL_YEAR_MONTHS[int(rand, 0, SCHOOL_YEAR_MONTHS.length - 1)];
  const g = monthGrid(at.year, at.month);
  const name = MONTHS[g.month];
  const [d1, d2, d3] = pick(rand, 3, g.days - 2, 3);
  const wd = pick(rand, 0, 6, 2);
  const firstOf = (w: number) => ((w - g.first + 7) % 7) + 1;
  const questions: Question[] = [
    { text: `Câte zile are luna ${name}?`, answer: String(g.days), box: true },
    { text: `În ce zi a săptămânii este ${d1} ${name}?`, answer: DAYS[weekdayOf(g, d1)] },
    { text: `Câte zile de ${DAYS[wd[0]]} sunt în luna ${name}?`, answer: String(countWeekday(g, wd[0])), box: true },
    { text: `Prima zi de ${DAYS[wd[1]]} din lună este pe data de`, answer: String(firstOf(wd[1])), box: true, after: name + '.' },
    { text: `Azi este ${d2} ${name}. Poimâine va fi pe data de`, answer: String(d2 + 2), box: true, after: name + '.' },
    { text: `Azi este ${d3} ${name}. Alaltăieri a fost pe data de`, answer: String(d3 - 2), box: true, after: name + '.' },
  ];
  return { kind: 'calmonth', sections: [{ heading: `Privește calendarul lunii ${name} ${g.year}.`, month: g }, { heading: 'Răspunde la întrebări.', questions }] };
}

/** The answers of a calendar sheet, by section and item: „1. a) marți, joi, sâmbătă”. */
export function calendarAnswers(sheet: CalendarSheet): string[] {
  const out: string[] = [];
  sheet.sections.forEach((s, si) => {
    let k = 0;
    for (const r of s.rows ?? []) out.push(`${si + 1}. ${letter(k++)} ${r.answers.join(', ')}`);
    for (const q of s.questions ?? []) out.push(`${si + 1}. ${letter(k++)} ${q.answer}`);
  });
  return out;
}

export const CALENDAR_TITLES = { week: 'Zilele săptămânii', months: 'Lunile anului și anotimpurile', calmonth: 'Calendarul lunii' } as const;

const letter = (i: number) => `${String.fromCharCode(97 + i)})`;

function fit(text: string, size: number, room: number): number {
  return Math.min(size, (size * room) / Math.max(1, textWidthMm(text, size) * 1.06));
}

// ───────────────────────── drawing ─────────────────────────

const ROW_H = 13;
const Q_H = 12.5;
const HEAD_H = 9;
const SEC_GAP = 7;
const GRID_HEAD = 8;
const GRID_ROW = 11;

function sectionHeight(s: CalendarSection): number {
  let h = HEAD_H;
  if (s.month) h += GRID_HEAD + weeksOf(s.month) * GRID_ROW + 4;
  if (s.rows) h += s.rows.length * (ROW_H + 4);
  if (s.questions) h += s.questions.length * Q_H;
  return h;
}

export function calendarHeight(sheet: CalendarSheet): number {
  return sheet.sections.reduce((h, s) => h + sectionHeight(s), 0) + SEC_GAP * (sheet.sections.length - 1);
}

function orderRowOps(ops: DrawOp[], r: OrderRow, x0: number, x1: number, y: number): void {
  const n = r.cells.length;
  const gap = 2.4;
  const w = (x1 - x0 - (n - 1) * gap) / n;
  r.cells.forEach((c, i) => {
    const x = x0 + i * (w + gap);
    if (c === null) {
      ops.push({ t: 'rect', x, y, w, h: ROW_H, rx: 2, fill: '#FFFFFF', stroke: INK, strokeWidth: 0.5 });
      ops.push({ t: 'line', x1: x + 2.5, y1: y + ROW_H - 3.2, x2: x + w - 2.5, y2: y + ROW_H - 3.2, stroke: '#CBD5E1', strokeWidth: 0.35 });
    } else {
      ops.push({ t: 'rect', x, y, w, h: ROW_H, rx: 2, fill: '#FFF7ED', stroke: ACCENT, strokeWidth: 0.5 });
      ops.push({ t: 'text', x: x + w / 2, y: y + ROW_H / 2 + 1.5, text: c, size: fit(c, 4.2, w - 3), fill: INK, weight: 'bold', align: 'center' });
    }
  });
}

/** Where the answers of a section start: one column after the longest question, as far as the page allows. */
function answerColumn(qs: Question[], tx: number, x1: number): { ax: number; size: number } {
  const room = (q: Question) => (q.box ? 13 : 46) + (q.after ? textWidthMm(q.after, 4.2) + 3 : 0) + 4;
  const longest = Math.max(...qs.map((q) => textWidthMm(q.text, 4.2)));
  const space = Math.min(...qs.map((q) => x1 - tx - room(q)));
  const size = longest > space ? (4.2 * space) / longest : 4.2;
  return { ax: tx + Math.min(longest, space) + 4, size };
}

function questionOps(ops: DrawOp[], q: Question, label: string, x0: number, y: number, ax: number, size: number): void {
  const cy = y + Q_H / 2;
  ops.push({ t: 'text', x: x0, y: cy + 1.4, text: label, size: 3.6, fill: MUTED, weight: 'bold' });
  ops.push({ t: 'text', x: x0 + 8, y: cy + 1.5, text: q.text, size, fill: INK, weight: 'bold' });
  const answerW = q.box ? 13 : 46;
  if (q.box) ops.push({ t: 'rect', x: ax, y: cy - 4.6, w: answerW, h: 9.2, rx: 1.6, fill: '#FFFFFF', stroke: INK, strokeWidth: 0.5 });
  else ops.push({ t: 'line', x1: ax, y1: cy + 2.4, x2: ax + answerW, y2: cy + 2.4, stroke: INK, strokeWidth: 0.4 });
  if (q.after) ops.push({ t: 'text', x: ax + answerW + 2, y: cy + 1.5, text: q.after, size, fill: INK, weight: 'bold' });
}

function monthOps(ops: DrawOp[], g: MonthGrid, x0: number, x1: number, y: number): void {
  const cw = (x1 - x0) / 7;
  ops.push({ t: 'rect', x: x0, y, w: x1 - x0, h: GRID_HEAD, rx: 1.5, fill: '#FFF7ED', stroke: ACCENT, strokeWidth: 0.5 });
  DAYS.forEach((d, i) => ops.push({ t: 'text', x: x0 + (i + 0.5) * cw, y: y + GRID_HEAD / 2 + 1.2, text: d, size: fit(d, 3.4, cw - 2), fill: INK, weight: 'bold', align: 'center' }));
  const gy = y + GRID_HEAD;
  const weeks = weeksOf(g);
  for (let r = 0; r < weeks; r++)
    for (let c = 0; c < 7; c++) {
      const day = r * 7 + c - g.first + 1;
      const x = x0 + c * cw;
      const yy = gy + r * GRID_ROW;
      ops.push({ t: 'rect', x, y: yy, w: cw, h: GRID_ROW, fill: c >= 5 ? '#FEF2F2' : PAPER, stroke: '#94A3B8', strokeWidth: 0.3 });
      if (day >= 1 && day <= g.days) ops.push({ t: 'text', x: x + cw / 2, y: yy + GRID_ROW / 2 + 1.6, text: String(day), size: 4.6, fill: c === 6 ? '#B91C1C' : INK, weight: 'bold', align: 'center' });
    }
}

/** A calendar sheet between `top` and `bottom`: its sections one under the other, the spare room between them. */
export function calendarOps(sheet: CalendarSheet, x0: number, x1: number, top: number, bottom: number): DrawOp[] {
  const ops: DrawOp[] = [];
  const spare = Math.max(0, bottom - top - calendarHeight(sheet));
  const gap = SEC_GAP + Math.min(14, spare / Math.max(1, sheet.sections.length - 1));
  let y = top;
  sheet.sections.forEach((s, si) => {
    ops.push({ t: 'text', x: x0, y: y + 5, text: `${si + 1}. ${s.heading}`, size: fit(`${si + 1}. ${s.heading}`, 4.4, x1 - x0), fill: INK, weight: 'bold' });
    y += HEAD_H;
    if (s.month) {
      monthOps(ops, s.month, x0, x1, y);
      y += GRID_HEAD + weeksOf(s.month) * GRID_ROW + 4;
    }
    let k = 0;
    for (const r of s.rows ?? []) {
      // the label in the margin, the row beside it
      ops.push({ t: 'text', x: x0, y: y + ROW_H / 2 + 1.4, text: letter(k++), size: 3.6, fill: MUTED, weight: 'bold' });
      orderRowOps(ops, r, x0 + 8, x1, y);
      y += ROW_H + 4;
    }
    if (s.questions?.length) {
      const { ax, size } = answerColumn(s.questions, x0 + 8, x1);
      for (const q of s.questions) {
        questionOps(ops, q, letter(k++), x0, y, ax, size);
        y += Q_H;
      }
    }
    y += gap;
  });
  return ops;
}
