import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type Tier, type WorksheetConfig } from '@/types';
import type { DrawOp, PageOps } from '@/lib/glyphs/types';
import { flattenOps } from '@/lib/glyphs/geometry';
import { buildWorksheetPages } from '@/lib/worksheet/layout';
import { MATH_TYPES, NUMBER_MATH_TYPES, PAID_MATH_TYPES, TOPIC_MATH_TYPES, mathExercises, rng, seedOf, type MathType } from '@/lib/worksheet/math';
import { FREE_MATH_TABLE, MATH_TABLES, MUL_TYPES, groupsItems, groupsLimit, mulExercises, type MulType } from '@/lib/worksheet/multiply';
import { CLOCK_STEPS, HOUR_HAND, MINUTE_HAND, clockTimes, digital, handsWords, hourAngle, minuteAngle, timeWords, type ClockStep } from '@/lib/worksheet/clock';
import { DAYS, MONTHS, calmonthSheet, countWeekday, monthGrid, monthsSheet, seasonOf, weekSheet, weekdayOf } from '@/lib/worksheet/calendar-pages';
import { MASS_PAIRS, UNIT_MM, lengthSheet, longest, massItems, rulerSheet, shortest, unitsSheet } from '@/lib/worksheet/measure';
import { area, fracSheet, partsOf, showsHalf } from '@/lib/worksheet/fractions';
import { FIG_KINDS, countKind, figBox, figuresAnswers, figuresSheet } from '@/lib/worksheet/figures';
import { isEvaluationItem } from '@/lib/worksheet/evaluation';
import { isItemAllowed } from '@/lib/access';
import { iconOps } from '@/lib/hints/icons';
import { sanitizeConfig } from '@/stores/sanitize-config';
import { sheetCompetences } from '@/lib/curriculum/sheet';
import { findCompetence } from '@/lib/curriculum';
import { CLASS_PAGES, headlineItems, presetById, presetConfig } from '@/lib/curriculum/presets';
import { opBox, opsOutside } from './bounds';
import { drawnExercises, readingOrder, textOverlaps, texts } from './drawn';

/**
 * The other math topics: equal groups, multiplication and division, the clock, the calendar, measuring,
 * halves and quarters, shapes in a picture.
 */

const cfg = (over: Partial<WorksheetConfig>): WorksheetConfig => ({ ...DEFAULT_CONFIG, category: 'math', ...over });
const pagesOf = (over: Partial<WorksheetConfig>, tier: Tier = 'full') => buildWorksheetPages(cfg(over), tier);
const allText = (pages: PageOps[]) => pages.flatMap((p) => texts(p).map((t) => t.text));
const flat = (p: PageOps) => flattenOps(p.ops);
const isKeyPage = (p: PageOps) => texts(p).some((t) => t.text === 'Răspunsuri');
/** The answers of a section of the answers page: the texts under its title, up to the next title. */
function keyEntries(pages: PageOps[], title: string): string[] {
  const ts = pages.filter(isKeyPage).flatMap((p) => texts(p));
  const at = ts.findIndex((t) => t.text === title);
  expect(at, title).toBeGreaterThanOrEqual(0);
  const out: string[] = [];
  for (const t of ts.slice(at + 1)) {
    if (t.weight === 'bold') break;
    // not the page number, nor the brand line of the free plan
    if (/^Pagina \d+ din \d+$/.test(t.text) || t.size < 3) continue;
    out.push(t.text);
  }
  return out;
}

describe('the topics are math items', () => {
  it('MATH_TYPES are the number sheets and the topics; the saved ids, the paid ones and the evaluation items agree', () => {
    expect(MATH_TYPES).toEqual([...NUMBER_MATH_TYPES, ...TOPIC_MATH_TYPES]);
    for (const t of MATH_TYPES) expect(sanitizeConfig(cfg({ selectedItems: [t] })).selectedItems, t).toEqual([t]);
    for (const t of MATH_TYPES) expect(isItemAllowed(t, 'math', 'free'), t).toBe(!PAID_MATH_TYPES.includes(t));
    expect(PAID_MATH_TYPES).toEqual(['calmonth', 'units', 'frac']);
    expect(TOPIC_MATH_TYPES.filter((t) => isEvaluationItem(t))).toEqual(['mul', 'div', 'mulmiss', 'clock']);
  });

  it('saved options: a table 0 or 2–10, a clock step; anything else dropped', () => {
    for (const t of MATH_TABLES) expect(sanitizeConfig(cfg({ mathTable: t })).mathTable).toBe(t);
    for (const t of [1, 11, -2, 2.5]) expect(sanitizeConfig(cfg({ mathTable: t })).mathTable).toBeUndefined();
    expect(sanitizeConfig({ ...cfg({}), mathTable: '3' }).mathTable).toBeUndefined();
    for (const c of CLOCK_STEPS) expect(sanitizeConfig(cfg({ mathClock: c })).mathClock).toBe(c);
    expect(sanitizeConfig({ ...cfg({}), mathClock: 'minute' }).mathClock).toBeUndefined();
  });

  it('every topic: the same sheet for the same seed, another one for another seed', () => {
    for (const t of TOPIC_MATH_TYPES) {
      const a = JSON.stringify(pagesOf({ selectedItems: [t], mathSeed: 4, mathRange: 1000, mathClock: 'five' }));
      expect(JSON.stringify(pagesOf({ selectedItems: [t], mathSeed: 4, mathRange: 1000, mathClock: 'five' })), t).toBe(a);
      const others = [5, 6, 7].map((seed) => JSON.stringify(pagesOf({ selectedItems: [t], mathSeed: seed, mathRange: 1000, mathClock: 'five' })));
      expect(others.some((o) => o !== a), t).toBe(true);
    }
  });

  it('every page inside the A4 margins, no text over another (all topics, options, seeds)', () => {
    const area = { minX: 11.7, minY: 11.7, maxX: 198.3, maxY: 290 };
    for (const range of [10, 31, 1000])
      for (const clock of CLOCK_STEPS)
        for (const seed of [1, 2, 3, 8]) {
          const pages = pagesOf({ selectedItems: [...TOPIC_MATH_TYPES], mathRange: range, mathClock: clock, mathTable: seed % 2 ? 0 : 7, mathSeed: seed, mathAnswers: true, curriculumLevel: 'II' });
          expect(pages.length).toBeGreaterThan(TOPIC_MATH_TYPES.length);
          pages.forEach((p, i) => {
            const where = `${range} ${clock} ${seed} page ${i + 1}`;
            expect(opsOutside(p, area), where).toEqual([]);
            expect(textOverlaps(p), where).toEqual([]);
          });
        }
  });

  it('Romanian letters: ș and ț with the comma below, never the cedilla', () => {
    const t = allText(pagesOf({ selectedItems: [...TOPIC_MATH_TYPES], mathRange: 1000, mathClock: 'five', mathAnswers: true })).join(' ');
    expect(t).not.toMatch(/[şţŞŢ]/);
    expect(t).toContain('ș');
    expect(t).toContain('ț');
  });
});

// ───────────────────────── multiplication and division ─────────────────────────

/** What the box of a drawn „a · b = □” (any box) holds, from the numbers and signs alone. */
function solveMul(cells: (string | null)[]): string {
  const [a, op, b, , r] = cells;
  const n = (c: string | null) => Number(c);
  const mul = op === '·';
  if (r === null) return String(mul ? n(a) * n(b) : n(a) / n(b));
  if (b === null) return String(mul ? n(r) / n(a) : n(a) / n(r));
  return String(mul ? n(r) / n(b) : n(r) * n(b));
}

describe('multiplication and division', () => {
  it('every exercise is right, every number at most 100, every division exact, never one twice', () => {
    for (const type of MUL_TYPES)
      for (const table of MATH_TABLES)
        for (let seed = 1; seed <= 30; seed++) {
          const set = mathExercises(type, 1000, seed, 20, undefined, table);
          expect(set).toHaveLength(20);
          expect(new Set(set.map((e) => e.cells.join(' '))).size).toBe(20);
          for (const e of set) {
            const where = `${type} ${table} ${seed}: ${e.cells.join(' ')} → ${e.answer}`;
            expect(e.cells.filter((c) => c === null), where).toHaveLength(1);
            expect(solveMul(e.cells), where).toBe(e.answer);
            const nums = [...e.cells.filter((c): c is string => !!c && /^\d+$/.test(c)), e.answer].map(Number);
            for (const n of nums) {
              expect(Number.isInteger(n) && n >= 0 && n <= 100, where).toBe(true);
            }
            const [a, op, b] = e.cells.map((c) => (c === null ? e.answer : c));
            if (op === ':') expect(Number(b), where).toBeGreaterThan(0);
            // with a table, every fact is of that table
            if (table) expect(op === '·' ? [a, b].includes(String(table)) || e.cells.includes('0') : [b, e.cells[4] ?? '', e.answer].includes(String(table)) || a === '0', where).toBe(true);
          }
        }
  });

  it('one table: first the table in order (3 · 1 … 3 · 10), then the same facts mixed up', () => {
    for (const k of [2, 3, 7, 10]) {
      const mul = mulExercises('mul', k, rng(1));
      expect(mul.slice(0, 10).map((e) => e.cells.join(' '))).toEqual(Array.from({ length: 10 }, (_, i) => `${k} · ${i + 1} = `));
      const div = mulExercises('div', k, rng(1));
      expect(div.slice(0, 10).map((e) => `${e.cells[0]}:${e.cells[2]}=${e.answer}`)).toEqual(Array.from({ length: 10 }, (_, i) => `${k * (i + 1)}:${k}=${i + 1}`));
    }
  });

  it('the page shows the exercises of its answers page; the title names the table', () => {
    for (const type of MUL_TYPES as readonly MulType[])
      for (const table of [0, 6]) {
        const pages = pagesOf({ selectedItems: [type], mathTable: table, mathAnswers: true, mathSeed: 3 });
        const drawn = drawnExercises(pages[0], /^\d+\.$/);
        expect(drawn).toHaveLength(20);
        const title = texts(pages[0])[0].text;
        if (table) expect(title).toContain(`${table}`);
        const key = keyEntries(pages, title).map((t) => t.replace(/^\d+\. /, ''));
        expect(drawn.map((d) => solveMul(d.cells))).toEqual(key);
      }
    expect(texts(pagesOf({ selectedItems: ['mul'], mathTable: 3 })[0])[0].text).toBe('Înmulțiri: tabla înmulțirii cu 3');
    expect(texts(pagesOf({ selectedItems: ['div'], mathTable: 4 })[0])[0].text).toBe('Împărțiri: tabla împărțirii la 4');
  });

  it('the free plan: the table of 2, whatever was chosen', () => {
    for (const table of [0, 5, 9]) {
      const page = pagesOf({ selectedItems: ['mul'], mathTable: table }, 'free')[0];
      expect(texts(page)[0].text).toBe(`Înmulțiri: tabla înmulțirii cu ${FREE_MATH_TABLE}`);
    }
  });
});

describe('equal groups', () => {
  it('2–5 groups of 2–6, the total within the range (10, 20, 30), five different rows', () => {
    for (const range of [5, 10, 20, 31, 100, 1000])
      for (let seed = 1; seed <= 30; seed++) {
        const items = groupsItems(range, rng(seed));
        expect(items).toHaveLength(5);
        expect(new Set(items.map((i) => `${i.groups}x${i.each}`)).size).toBe(5);
        for (const it of items) {
          expect(it.groups).toBeGreaterThanOrEqual(2);
          expect(it.groups).toBeLessThanOrEqual(5);
          expect(it.each).toBeGreaterThanOrEqual(2);
          expect(it.groups * it.each).toBeLessThanOrEqual(groupsLimit(range));
        }
      }
  });

  it('the pictures drawn in each frame are the numbers of the answers; the product only in 0–1000', () => {
    for (const range of [10, 31, 1000])
      for (const seed of [1, 2, 5]) {
        const pages = pagesOf({ selectedItems: ['groups'], mathRange: range, mathSeed: seed, mathAnswers: true });
        const page = pages[0];
        const ops = flat(page);
        const frames = page.ops.filter((o): o is Extract<DrawOp, { t: 'rect' }> => o.t === 'rect' && o.stroke === '#E8913A' && o.fill === '#ffffff');
        const groups = page.ops.filter((o): o is Extract<DrawOp, { t: 'group' }> => o.t === 'group');
        const inFrame = frames.map((f) => groups.filter((g) => g.tx >= f.x && g.tx <= f.x + f.w && g.ty >= f.y && g.ty <= f.y + f.h).length);
        const key = keyEntries(pages, texts(page)[0].text);
        // „1. 3 grupe a câte 4: 4 + 4 + 4 = 12; 3 · 4 = 12”
        const expected = key.flatMap((k) => {
          const m = k.match(/^\d+\. (\d) grupe a câte (\d): ([\d +]+) = (\d+)(; (\d) · (\d) = (\d+))?$/)!;
          expect(m, k).toBeTruthy();
          const [g, e] = [Number(m[1]), Number(m[2])];
          expect(m[3].split(' + ').map(Number)).toEqual(Array(g).fill(e));
          expect(Number(m[4])).toBe(g * e);
          expect(Boolean(m[5]), k).toBe(range === 1000);
          return Array(g).fill(e);
        });
        expect(inFrame).toEqual(expected);
        expect(ops.some((o) => o.t === 'text' && o.text === '·')).toBe(range === 1000);
      }
  });
});

// ───────────────────────── the clock ─────────────────────────

describe('the clock', () => {
  it('says the time the Romanian way', () => {
    const cases: [number, number, string, string][] = [
      [3, 0, 'ora 3', '3:00'], [3, 30, '3 și jumătate', '3:30'], [3, 15, '3 și un sfert', '3:15'], [3, 45, '4 fără un sfert', '3:45'],
      [12, 45, '1 fără un sfert', '12:45'], [3, 5, '3 și 5 minute', '3:05'], [3, 10, '3 și 10 minute', '3:10'], [3, 20, '3 și 20 de minute', '3:20'],
      [3, 25, '3 și 25 de minute', '3:25'], [3, 35, '4 fără 25 de minute', '3:35'], [3, 40, '4 fără 20 de minute', '3:40'], [3, 50, '4 fără 10 minute', '3:50'],
      [11, 55, '12 fără 5 minute', '11:55'], [12, 0, 'ora 12', '12:00'],
    ];
    for (const [h, m, words, dig] of cases) {
      expect(timeWords({ h, m })).toBe(words);
      expect(digital({ h, m })).toBe(dig);
    }
    expect(handsWords({ h: 3, m: 30 })).toBe('acul mic între 3 și 4, acul mare la 6');
    expect(handsWords({ h: 7, m: 0 })).toBe('acul mic la 7, acul mare la 12');
  });

  it('each step has its minutes, every kind of the step on a page, six different hours', () => {
    const allowed: Record<ClockStep, number[]> = { hour: [0], half: [0, 30], quarter: [0, 15, 30, 45], five: Array.from({ length: 12 }, (_, i) => i * 5) };
    for (const step of CLOCK_STEPS)
      for (let seed = 1; seed <= 40; seed++) {
        const times = clockTimes(step, rng(seed));
        expect(times).toHaveLength(6);
        expect(new Set(times.map((t) => t.h)).size).toBe(6);
        for (const t of times) expect(allowed[step], `${step} ${digital(t)}`).toContain(t.m);
        const ms = new Set(times.map((t) => t.m));
        if (step === 'half') expect([...ms].sort()).toEqual([0, 30]);
        if (step === 'quarter') expect(ms).toEqual(new Set([0, 15, 30, 45]));
        if (step === 'five') expect(times.filter((t) => t.m % 15 !== 0).length).toBeGreaterThanOrEqual(3);
      }
  });

  it('the hands drawn are the time of the answers page: a short thick hour hand between the numbers, a long thin minute hand', () => {
    for (const step of CLOCK_STEPS)
      for (const seed of [1, 2, 3, 4]) {
        const pages = pagesOf({ selectedItems: ['clock'], mathClock: step, mathSeed: seed, mathAnswers: true });
        const ops = flat(pages[0]);
        const faces = readingOrder(ops.filter((o): o is Extract<DrawOp, { t: 'circle' }> => o.t === 'circle' && o.r > 8 && o.fill === '#ffffff'), 5);
        expect(faces).toHaveLength(6);
        const key = keyEntries(pages, texts(pages[0])[0].text);
        expect(key).toHaveLength(6);
        faces.forEach((f, i) => {
          const m = key[i].match(/^[a-f]\) (\d+):(\d\d) – (.+)$/)!;
          const t = { h: Number(m[1]), m: Number(m[2]) };
          expect(m[3]).toBe(timeWords(t));
          const hands = ops.filter((o): o is Extract<DrawOp, { t: 'path' }> => o.t === 'path' && Math.hypot(o.subpaths[0].start.x - f.cx, o.subpaths[0].start.y - f.cy) < 0.01);
          expect(hands).toHaveLength(2);
          const [hour, minute] = [...hands].sort((a, b) => b.strokeWidth! - a.strokeWidth!);
          const len = (p: typeof hour) => {
            const tip = (p.subpaths[0].segs[0] as { p: { x: number; y: number } }).p;
            return { l: Math.hypot(tip.x - f.cx, tip.y - f.cy), a: ((Math.atan2(tip.x - f.cx, f.cy - tip.y) * 180) / Math.PI + 360) % 360 };
          };
          const H = len(hour), Mn = len(minute);
          expect(H.l).toBeCloseTo(f.r * HOUR_HAND.length, 5);
          expect(Mn.l).toBeCloseTo(f.r * MINUTE_HAND.length, 5);
          expect(hour.strokeWidth! / minute.strokeWidth!).toBeGreaterThan(2);
          expect(Mn.l / H.l).toBeGreaterThan(1.5);
          const angle = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
          expect(angle(H.a, hourAngle(t)), key[i]).toBeLessThan(0.01);
          expect(angle(Mn.a, minuteAngle(t)), key[i]).toBeLessThan(0.01);
          // not on a number when the minutes are not 0: 3:30, 3:15 and 3:45 have it between 3 and 4
          if (t.m) {
            expect(H.a % 30, key[i]).toBeGreaterThan(1);
            expect(Math.floor(H.a / 30) % 12, key[i]).toBe(t.h % 12);
          }
        });
      }
  });

  it('the clocks to draw on have no hands; the time is written under each, as on the answers page', () => {
    const pages = pagesOf({ selectedItems: ['clockdraw'], mathClock: 'quarter', mathAnswers: true });
    expect(flat(pages[0]).some((o) => o.t === 'path')).toBe(false);
    const key = keyEntries(pages, texts(pages[0])[0].text);
    const shown = texts(pages[0]).map((t) => t.text);
    for (const k of key) {
      const m = k.match(/^[a-f]\) (.+) \((\d+:\d\d)\): (acul mic .+)$/)!;
      expect(shown).toContain(m[1]);
      expect(shown).toContain(`(${m[2]})`);
    }
  });

  it('the free plan: ore fixe and half hours only', () => {
    for (const mathClock of CLOCK_STEPS) {
      const pages = pagesOf({ selectedItems: ['clock'], mathClock, mathAnswers: true }, 'free');
      for (const k of keyEntries(pages, texts(pages[0])[0].text)) expect(k, mathClock).toMatch(/:(00|30) /);
    }
  });
});

// ───────────────────────── the calendar ─────────────────────────

describe('the calendar', () => {
  it('names in small letters, the season of every month', () => {
    expect(DAYS.join(' ')).toBe('luni marți miercuri joi vineri sâmbătă duminică');
    expect(MONTHS.join(' ')).toBe('ianuarie februarie martie aprilie mai iunie iulie august septembrie octombrie noiembrie decembrie');
    expect(MONTHS.map((_, m) => seasonOf(m))).toEqual(['iarna', 'iarna', 'primăvara', 'primăvara', 'primăvara', 'vara', 'vara', 'vara', 'toamna', 'toamna', 'toamna', 'iarna']);
  });

  it('a month: its length and weekdays are those of the real calendar', () => {
    const feb = monthGrid(2026, 1);
    expect(feb).toEqual({ year: 2026, month: 1, days: 28, first: 6 }); // 1 februarie 2026: duminică
    expect(monthGrid(2028, 1).days).toBe(29);
    const nov = monthGrid(2026, 10);
    expect(DAYS[weekdayOf(nov, 24)]).toBe('marți'); // 24 noiembrie 2026
    for (let y = 2026; y <= 2027; y++)
      for (let m = 0; m < 12; m++) {
        const g = monthGrid(y, m);
        for (let d = 1; d <= g.days; d++) expect(weekdayOf(g, d)).toBe((new Date(Date.UTC(y, m, d)).getUTCDay() + 6) % 7);
        expect(DAYS.map((_, w) => countWeekday(g, w)).reduce((a, b) => a + b, 0)).toBe(g.days);
      }
  });

  it('the answers follow from the names and the calendar', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const week = weekSheet(rng(seed));
      for (const r of week.sections[0].rows!) {
        const k = DAYS.indexOf(r.cells[0] as (typeof DAYS)[number]);
        const full = r.cells.map((_, i) => DAYS[(k + i) % 7]);
        expect(r.answers).toEqual(full.filter((_, i) => r.cells[i] === null));
        r.cells.forEach((c, i) => c !== null && expect(c).toBe(full[i]));
        // never two holes side by side
        r.cells.forEach((c, i) => c === null && expect(r.cells[i + 1]).not.toBeNull());
      }
      for (const q of week.sections[1].questions!) {
        const d = DAYS.findIndex((x) => q.text.includes(` ${x}`));
        const next = /urmează după|Mâine/.test(q.text);
        expect(q.answer, q.text).toBe(DAYS[(d + (next ? 1 : 6)) % 7]);
      }
      const months = monthsSheet(rng(seed));
      for (const q of months.sections[3].questions!) expect(q.answer).toBe(seasonOf(MONTHS.findIndex((m) => q.text.endsWith(`${m}?`))));
      const cal = calmonthSheet(rng(seed));
      const g = cal.sections[0].month!;
      const name = MONTHS[g.month];
      const [days, wd, count, first, poi, alalt] = cal.sections[1].questions!;
      expect(Number(days.answer)).toBe(g.days);
      const d1 = Number(wd.text.match(/este (\d+) /)![1]);
      expect(wd.answer).toBe(DAYS[(new Date(Date.UTC(g.year, g.month, d1)).getUTCDay() + 6) % 7]);
      expect(Number(count.answer)).toBe(countWeekday(g, DAYS.findIndex((x) => count.text.includes(`de ${x} `))));
      const f = DAYS.findIndex((x) => first.text.includes(`de ${x} `));
      expect(weekdayOf(g, Number(first.answer))).toBe(f);
      expect(Number(first.answer)).toBeLessThanOrEqual(7);
      expect(Number(poi.answer)).toBe(Number(poi.text.match(/este (\d+) /)![1]) + 2);
      expect(Number(alalt.answer)).toBe(Number(alalt.text.match(/este (\d+) /)![1]) - 2);
      for (const q of [poi, alalt]) expect(Number(q.answer) >= 1 && Number(q.answer) <= g.days && q.after === `${name}.`).toBe(true);
    }
  });

  it('the month drawn: its numbers under their weekday', () => {
    const pages = pagesOf({ selectedItems: ['calmonth'], mathSeed: 2 });
    const t = texts(pages[0]);
    const head = t.filter((x) => (DAYS as readonly string[]).includes(x.text) && x.y < 80);
    expect(head.map((x) => x.text)).toEqual([...DAYS]);
    const title = t.find((x) => /^1\. Privește calendarul lunii /.test(x.text))!.text;
    const [, mname, year] = title.match(/lunii (\S+) (\d+)\.$/)!;
    const g = monthGrid(Number(year), MONTHS.indexOf(mname as (typeof MONTHS)[number]));
    const nums = t.filter((x) => /^\d+$/.test(x.text) && x.size === 4.6);
    expect(nums.map((x) => Number(x.text))).toEqual(Array.from({ length: g.days }, (_, i) => i + 1));
    for (const n of nums) {
      const col = head.reduce((b, h, i) => (Math.abs(h.x - n.x) < Math.abs(head[b].x - n.x) ? i : b), 0);
      expect(col, n.text).toBe(weekdayOf(g, Number(n.text)));
    }
  });
});

// ───────────────────────── measuring ─────────────────────────

describe('measuring', () => {
  it('lengths: five objects of different lengths; each drawn as long as its units, which are its answer', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const s = lengthSheet(rng(seedOf(`length:${seed}`)));
      expect(new Set(s.items.map((i) => i.units)).size).toBe(5);
      expect(s.items[longest(s)].units).toBe(Math.max(...s.items.map((i) => i.units)));
      expect(s.items[shortest(s)].units).toBe(Math.min(...s.items.map((i) => i.units)));
      const pages = pagesOf({ selectedItems: ['length'], mathSeed: seed, mathAnswers: true });
      const page = pages[0];
      const ops = flat(page);
      const cards = ops.filter((o): o is Extract<DrawOp, { t: 'rect' }> => o.t === 'rect' && o.fill === '#FBF7EE');
      expect(cards).toHaveLength(5);
      const key = keyEntries(pages, texts(page)[0].text);
      cards.forEach((c, i) => {
        const inside = ops.filter((o) => {
          const b = opBox(o);
          return b && o !== c && b.minY >= c.y && b.maxY <= c.y + c.h && b.maxX < 160;
        });
        const units = inside.filter((o) => o.t === 'rect' && (o.fill === '#FDE68A' || (o.stroke === '#475569' && o.strokeWidth === 0.55)));
        const objects = inside.filter((o) => !units.includes(o) && o.t !== 'text' && !(o.t === 'rect' && o.stroke === '#475569'));
        // the object starts where the first unit starts (a clip is drawn 0.3 mm inside its place) and ends on the last unit's edge
        const unitStart = Math.min(...units.map((u) => opBox(u)!.minX));
        const start = Math.min(...objects.map((o) => opBox(o)!.minX));
        const end = Math.max(...objects.map((o) => opBox(o)!.maxX));
        expect(units.length, key[i]).toBe(Number(key[i].match(/^[a-e]\) (\d+) /)![1]));
        expect(Math.abs(unitStart - start), key[i]).toBeLessThanOrEqual(0.3 + 1e-9);
        expect(Math.abs(end - (start + units.length * UNIT_MM)), key[i]).toBeLessThan(0.01);
      });
      const n = (x: string) => Number(key.find((k) => k.startsWith(x))!.match(/\((\d+) /)![1]);
      expect(n('Cel mai lung')).toBe(Math.max(...key.slice(0, 5).map((k) => Number(k.match(/\) (\d+) /)![1]))));
      expect(n('Cel mai scurt')).toBe(Math.min(...key.slice(0, 5).map((k) => Number(k.match(/\) (\d+) /)![1]))));
    }
  });

  it('balances: the heavier thing is on the pan that goes down; the answers name the right one', () => {
    const sig = (g: Extract<DrawOp, { t: 'group' }>) => JSON.stringify(g.ops[0]);
    const known = new Map<string, string>();
    for (const pair of MASS_PAIRS) for (const x of pair) {
      const g = iconOps(x.picture, 0, 0, 10)[0] as Extract<DrawOp, { t: 'group' }>;
      known.set(sig(g), x.name);
    }
    for (let seed = 1; seed <= 12; seed++) {
      const items = massItems(rng(seedOf(`mass:${seed}`)));
      expect(new Set(items.map((i) => i.pair)).size).toBe(items.length);
      expect(new Set(items.map((i) => i.ask))).toEqual(new Set(['heavy', 'light']));
      const pages = pagesOf({ selectedItems: ['mass'], mathSeed: seed, mathAnswers: true });
      const page = pages[0];
      const beams = page.ops.filter((o): o is Extract<DrawOp, { t: 'line' }> => o.t === 'line' && o.strokeWidth === 1.5);
      const pics = page.ops.filter((o): o is Extract<DrawOp, { t: 'group' }> => o.t === 'group');
      const key = keyEntries(pages, texts(page)[0].text);
      const prompts = texts(page).filter((t) => t.text.startsWith('Încercuiește'));
      expect(beams).toHaveLength(6);
      beams.forEach((b, i) => {
        const near = pics.filter((g) => g.tx > Math.min(b.x1, b.x2) - 20 && g.tx < Math.max(b.x1, b.x2) + 5 && Math.abs(g.ty - (b.y1 + b.y2) / 2) < 30);
        expect(near).toHaveLength(2);
        const [left, right] = [...near].sort((a, c) => a.tx - c.tx).map((g) => known.get(sig(g))!);
        const heavyName = MASS_PAIRS.find((p) => [p[0].name, p[1].name].includes(left))![0].name;
        const lowerLeft = b.y1 > b.y2;
        expect(lowerLeft ? left : right, `${left} / ${right}`).toBe(heavyName);
        const lightName = left === heavyName ? right : left;
        const asked = prompts[i].text.includes('mai greu') ? 'heavy' : 'light';
        expect(key[i]).toBe(`${String.fromCharCode(97 + i)}) ${asked === 'heavy' ? `mai greu: ${heavyName}` : `mai ușor: ${lightName}`}`);
      });
    }
  });

  it('the ruler: each object as many centimetres long as its answer, from the 0 of its ruler', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const s = rulerSheet(rng(seedOf(`ruler:${seed}`)));
      expect(new Set(s.measure.map((m) => m.units)).size).toBe(4);
      const pages = pagesOf({ selectedItems: ['ruler'], mathSeed: seed, mathAnswers: true });
      const ops = flat(pages[0]);
      const zero = texts(pages[0]).filter((t) => t.text === '0' && t.size === 2.9);
      expect(zero).toHaveLength(4);
      const key = keyEntries(pages, texts(pages[0])[0].text);
      zero.forEach((z, i) => {
        const objs = ops.filter((o) => (o.t === 'polygon' || (o.t === 'rect' && o.fill !== '#FEF9C3' && o.fill !== '#FBF7EE' && o.fill !== '#FFFFFF')) && Math.abs(opBox(o)!.minY - (z.y - 13)) < 6);
        const end = Math.max(...objs.map((o) => opBox(o)!.maxX));
        const start = Math.min(...objs.map((o) => opBox(o)!.minX));
        expect(Math.abs(start - z.x)).toBeLessThan(0.01);
        expect(Math.round((end - z.x) / 10), key[i]).toBe(Number(key[i].match(/\) (\d+) cm$/)![1]));
        expect(Math.abs(end - z.x - 10 * Math.round((end - z.x) / 10))).toBeLessThan(0.3);
      });
    }
  });

  it('units: exactly one option measures what the question asks; the conversions are right', () => {
    const qty = (u: string) => (['m', 'cm', 'mm'].includes(u) ? 'L' : ['l', 'ml'].includes(u) ? 'C' : 'M');
    for (let seed = 1; seed <= 30; seed++) {
      const s = unitsSheet(rng(seed));
      for (const u of s.units) {
        expect(u.options).toContain(u.answer);
        expect(u.options.filter((o) => qty(o) === qty(u.answer)), u.text).toEqual([u.answer]);
      }
      for (const t of s.tools) {
        expect(t.options).toContain(t.answer);
        expect(new Set(t.options).size).toBe(3);
      }
      const factor: Record<string, number> = { 'm>cm': 100, 'm>mm': 1000, 'kg>g': 1000, 'l>ml': 1000 };
      for (const c of s.conversions) {
        const [n, from] = c.left.split(' ');
        expect(Number(c.answer)).toBe(Number(n) * factor[`${from}>${c.unit}`]);
        expect(Number(c.answer)).toBeLessThanOrEqual(1000);
      }
    }
  });
});

// ───────────────────────── halves and quarters, shapes ─────────────────────────

describe('halves and quarters', () => {
  it('every shape is cut into equal parts that make the whole shape', () => {
    for (const shape of ['circle', 'square', 'rect'] as const)
      for (const parts of [2, 4] as const)
        for (let cut = 0; cut < 3; cut++) {
          const ps = partsOf({ shape, parts, cut }, 50, 50, 30);
          if (ps.length !== parts) continue;
          const areas = ps.map(area);
          const whole = shape === 'circle' ? Math.PI * 15 * 15 : shape === 'rect' ? 48 * 30 : 900;
          for (const a of areas) expect(Math.abs(a - areas[0]) / areas[0], `${shape} ${parts} ${cut}`).toBeLessThan(0.001);
          expect(Math.abs(areas.reduce((x, y) => x + y, 0) - whole) / whole).toBeLessThan(0.01);
        }
  });

  it('section 3 has three halves and three that are not; the answers say which', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const s = fracSheet(rng(seed));
      expect(s.which.filter(showsHalf)).toHaveLength(3);
      for (const it of [...s.half, ...s.quarter]) expect(it.coloured).toEqual([]);
      for (const it of s.name) expect(it.coloured).toHaveLength(1);
    }
    const pages = pagesOf({ selectedItems: ['frac'], mathAnswers: true, mathSeed: 3 });
    const s = fracSheet(rng(seedOf('frac:3')));
    const key = keyEntries(pages, 'Jumătate și sfert');
    const yes = s.which.map((it, i) => (showsHalf(it) ? `${String.fromCharCode(97 + i)})` : '')).filter(Boolean).join(', ');
    expect(key[2]).toContain(`Se încercuiesc: ${yes} `);
    // the coloured parts drawn: as many as the data says
    const filled = flat(pages[0]).filter((o) => o.t === 'polygon' && o.fill === '#93C5FD');
    expect(filled).toHaveLength([...s.which, ...s.name].reduce((n, it) => n + it.coloured.length, 0));
  });
});

describe('shapes in a picture', () => {
  it('squares are square, rectangles plainly longer, nothing overlaps (only touching, or one inside another)', () => {
    for (let seed = 1; seed <= 60; seed++)
      for (const p of figuresSheet(rng(seed))) {
        for (const f of p.figs) {
          if (f.kind === 'square') expect(f.w).toBe(f.h);
          if (f.kind === 'rect') expect(Math.max(f.w, f.h) / Math.min(f.w, f.h), p.name).toBeGreaterThanOrEqual(1.4);
          const b = figBox(f);
          expect(b.minX >= 0 && b.minY >= 0 && b.maxX <= 100 && b.maxY <= 100, p.name).toBe(true);
        }
        for (let i = 0; i < p.figs.length; i++)
          for (let j = i + 1; j < p.figs.length; j++) {
            const a = figBox(p.figs[i]), b = figBox(p.figs[j]);
            const apart = a.maxX <= b.minX || b.maxX <= a.minX || a.maxY <= b.minY || b.maxY <= a.minY;
            const inside = (x: typeof a, y: typeof a) => x.minX > y.minX && x.maxX < y.maxX && x.minY > y.minY && x.maxY < y.maxY;
            expect(apart || inside(a, b) || inside(b, a), `${p.name} ${i} ${j}`).toBe(true);
          }
      }
  });

  it('the answers count the shapes drawn', () => {
    for (let seed = 1; seed <= 10; seed++) {
      const pages = pagesOf({ selectedItems: ['figures'], mathSeed: seed, mathAnswers: true });
      const pics = figuresSheet(rng(seedOf(`figures:${seed}`)));
      expect(keyEntries(pages, 'Figuri geometrice')).toEqual(figuresAnswers(pics));
      // the shapes on the page: those of the two pictures (the table's outlines aside)
      const ops = flat(pages[0]).filter((o) => (o.t === 'rect' || o.t === 'circle' || o.t === 'polygon') && o.stroke === '#1e3a5f' && o.strokeWidth === 0.6);
      expect(ops).toHaveLength(pics.reduce((n, p) => n + p.figs.length, 0));
      for (const p of pics) expect(FIG_KINDS.reduce((n, k) => n + countKind(p, k), 0)).toBe(p.figs.length);
    }
  });
});

// ───────────────────────── curriculum, free plan, evaluation ─────────────────────────

describe('curriculum codes of the topics', () => {
  const codes = (over: Partial<WorksheetConfig>, level: 'presc' | 'CP' | 'I' | 'II') => sheetCompetences(cfg(over), level).map((r) => (r.domain ? `${r.domain}.${r.code}` : r.code));
  const RANGE = { presc: 10, CP: 10, I: 100, II: 1000 } as const;
  const EXPECTED: Record<string, Partial<Record<'presc' | 'CP' | 'I' | 'II', string[]>>> = {
    groups: { CP: ['1.5'], I: ['1.5'], II: ['1.5'] },
    mul: { II: ['1.5'] }, div: { II: ['1.5'] }, mulmiss: { II: ['1.5'] },
    clock: { I: ['6.2'], II: ['6.2'] }, clockdraw: { I: ['6.2'], II: ['6.2'] },
    week: { CP: ['6.2'], I: ['6.2'], II: ['6.2'] }, months: { I: ['6.2'], II: ['6.2'] }, calmonth: { II: ['6.2'] },
    length: { presc: ['E.2.2', 'E.2.4'], CP: ['6.1'], I: ['6.1'], II: ['6.1'] }, mass: { presc: ['E.2.2'], II: ['6.1'] },
    ruler: { I: ['6.4'], II: ['6.4'] }, units: { II: ['6.4'] }, frac: {}, figures: { presc: ['E.2.2'], CP: ['2.2'], I: ['2.2'] },
  };

  it('each topic prints the codes of its class only, all of them in the programme', () => {
    for (const t of TOPIC_MATH_TYPES)
      for (const level of ['presc', 'CP', 'I', 'II'] as const) {
        const over = { selectedItems: [t], mathRange: RANGE[level], mathClock: level === 'I' ? ('half' as const) : ('five' as const) };
        expect(codes(over, level), `${t} ${level}`).toEqual(EXPECTED[t][level] ?? []);
        for (const r of sheetCompetences(cfg(over), level)) expect(findCompetence(r), `${t} ${level}`).toBeTruthy();
      }
  });

  it('the texts behind the codes', () => {
    const text = (t: MathType, level: 'presc' | 'CP' | 'I' | 'II', over: Partial<WorksheetConfig> = {}) => sheetCompetences(cfg({ selectedItems: [t], mathRange: RANGE[level], ...over }), level).map((r) => findCompetence(r)!.text);
    expect(text('groups', 'CP')).toEqual(['Efectuarea de adunări repetate/ scăderi repetate prin numărare și reprezentări obiectuale în concentrul 0-31']);
    expect(text('mul', 'II')).toEqual(['Efectuarea de înmulțiri și împărțiri în concentrul 0-1000 prin adunări/scăderi repetate']);
    expect(text('clock', 'I', { mathClock: 'half' })).toEqual(['Utilizarea unor unități de măsură pentru determinarea și compararea duratelor unor activități cotidiene']);
    expect(text('week', 'CP')).toEqual(['Utilizarea unor unități de măsură pentru determinarea/ estimarea duratelor unor evenimente familiare']);
    expect(text('length', 'CP')).toEqual(['Utilizarea unor măsuri neconvenționale pentru determinarea și compararea lungimilor']);
    expect(text('mass', 'II')).toEqual(['Utilizarea unor măsuri neconvenționale pentru determinarea și compararea maselor, lungimilor și capacităților']);
    expect(text('ruler', 'I')[0]).toMatch(/^Identificarea unităților de măsură uzuale pentru lungime, capacitate \(centimetrul, litrul\)/);
    expect(text('figures', 'I')[0]).toMatch(/^Recunoașterea unor figuri și corpuri geometrice în mediul apropiat și în reprezentări plane accesibile/);
  });

  it('conservative where the programme is: quarters are clasa a II-a, the product only in 0–1000, the range does not matter for clocks', () => {
    expect(codes({ selectedItems: ['clock'], mathRange: 100, mathClock: 'quarter' }, 'I')).toEqual([]);
    expect(codes({ selectedItems: ['clock'], mathRange: 100, mathClock: 'five' }, 'I')).toEqual([]);
    expect(codes({ selectedItems: ['clock'], mathRange: 100 }, 'I')).toEqual(['6.2']); // unset: ore fixe and half hours
    expect(codes({ selectedItems: ['groups'], mathRange: 100 }, 'II')).toEqual([]);
    expect(codes({ selectedItems: ['groups'], mathRange: 100 }, 'CP')).toEqual([]);
    expect(codes({ selectedItems: ['groups'], mathRange: 31 }, 'CP')).toEqual(['1.5']);
    // a clock or a week does not use the numbers: 0–1000 at clasa I still prints its code, the additions do not
    expect(codes({ selectedItems: ['add', 'clock'], mathRange: 1000 }, 'I')).toEqual(['6.2']);
    expect(codes({ selectedItems: ['add', 'week'], mathRange: 1000 }, 'CP')).toEqual(['6.2']);
    expect(codes({ selectedItems: ['add'], mathRange: 1000 }, 'I')).toEqual([]);
  });

  it('the class pages list the new sheets', () => {
    const at = (slug: string) => {
      // the headline of the class page: CLR and MEM (the other subjects are counted apart, presets.ts HEADLINE_PROGRAMMES)
      const items = headlineItems(CLASS_PAGES.find((c) => c.slug === slug)!);
      return { n: items.filter((i) => i.presets.length).length, of: items.length, codes: (code: string) => items.filter((i) => i.code === code && i.programme === 'mem-p-ii').flatMap((i) => i.presets.map((p) => p.id)) };
    };
    const cp = at('clasa-pregatitoare'), i = at('clasa-1'), ii = at('clasa-2');
    // with the „Explorarea mediului” sheets (explore.test.ts): CP 3.1, 4.1, 4.2; I 4.1, 4.2; II 5.1
    // and the sheets that fill the gaps (goluri.test.ts): CP CLR 3.2, 3.3, 4.2, MEM 1.6; I CLR 3.3, MEM 1.6, 3.1, 5.1;
    // II CLR 3.1, 3.3, MEM 1.1, 1.6, 2.1, 2.2, 3.1, 4.1, 4.2
    expect([cp.n, cp.of, i.n, i.of, ii.n, ii.of]).toEqual([22, 32, 23, 33, 23, 33]);
    expect(cp.codes('1.5')).toEqual(['mate-grupe']);
    expect(cp.codes('6.1')).toEqual(['mate-lungimi']);
    expect(cp.codes('6.2')).toEqual(['mate-saptamana']);
    expect(i.codes('6.2')).toEqual(['mate-ceas', 'mate-ceas-acele', 'mate-saptamana', 'mate-luni']);
    expect(i.codes('6.4')).toEqual(['mate-rigla']);
    expect(ii.codes('1.5')).toEqual(['mate-grupe', 'mate-inmultiri', 'mate-impartiri', 'mate-factor-lipsa']);
    expect(ii.codes('6.4')).toEqual(['mate-rigla', 'mate-unitati']);
    expect(presetConfig(presetById('mate-ceas')!, 'I').mathClock).toBe('half');
    expect(presetConfig(presetById('mate-ceas')!, 'II').mathClock).toBe('five');
  });
});

describe('the free plan', () => {
  it('the clasa a II-a topics (calendar, units, fractions) are full plan only; the others are free in their easy form', () => {
    const pages = pagesOf({ selectedItems: [...TOPIC_MATH_TYPES] }, 'free');
    const titles = pages.map((p) => texts(p)[0].text);
    expect(titles.some((t) => /Calendarul lunii|Unități de măsură|Jumătate și sfert/.test(t))).toBe(false);
    expect(pages).toHaveLength(TOPIC_MATH_TYPES.length - PAID_MATH_TYPES.length);
    expect(pagesOf({ selectedItems: [...PAID_MATH_TYPES] }, 'full')).toHaveLength(3);
  });

  it('an evaluation on the free plan: the table of 2, the easy clocks', () => {
    const pages = pagesOf({ selectedItems: ['mul', 'clock', 'units'], evaluation: true, mathClock: 'five', mathTable: 7, curriculumLevel: 'II' }, 'free');
    const t = allText(pages).join('\n');
    expect(t).not.toContain('Unități');
    for (const k of t.split('\n').filter((x) => /^[a-d]\) \d+:\d\d – /.test(x))) expect(k).toMatch(/:(00|30) /);
    for (const k of t.split('\n').filter((x) => /^[a-f]\) \d+ · \d+ = \d+$/.test(x))) expect(k.split(' ').slice(1, 4)).toContain('2');
  });
});

describe('the class II evaluation', () => {
  it('has a multiplication block and a clock block, answered from what is drawn', () => {
    const pages = buildWorksheetPages(presetConfig(presetById('evaluare-mate')!, 'II'), 'full');
    const t = allText(pages);
    expect(t).toContain('4. Calculează.');
    expect(t).toContain('5. Cât este ceasul? Scrie ora în căsuțe.');
    const key = pages.filter(isKeyPage);
    const mul = keyEntries(key, '4. Înmulțiri (6 răspunsuri)');
    for (const m of mul) {
      const [, a, b, r] = m.match(/^[a-f]\) (\d+) · (\d+) = (\d+)$/)!;
      expect(Number(a) * Number(b)).toBe(Number(r));
    }
    const clocks = keyEntries(key, '5. Cât este ceasul? (4 răspunsuri)');
    expect(clocks).toHaveLength(4);
    const page = pages.find((p) => texts(p).some((x) => x.text.startsWith('5. Cât este ceasul?')))!;
    const ops = flat(page);
    const faces = readingOrder(ops.filter((o): o is Extract<DrawOp, { t: 'circle' }> => o.t === 'circle' && o.r > 8 && o.fill === '#ffffff'), 5);
    expect(faces).toHaveLength(4);
    faces.forEach((f, i) => {
      const [, h, m] = clocks[i].match(/^[a-d]\) (\d+):(\d\d) – /)!.map(Number);
      const hands = ops.filter((o): o is Extract<DrawOp, { t: 'path' }> => o.t === 'path' && Math.hypot(o.subpaths[0].start.x - f.cx, o.subpaths[0].start.y - f.cy) < 0.01);
      const minute = hands.sort((a, b) => a.strokeWidth! - b.strokeWidth!)[0];
      const tip = (minute.subpaths[0].segs[0] as { p: { x: number; y: number } }).p;
      const a = ((Math.atan2(tip.x - f.cx, f.cy - tip.y) * 180) / Math.PI + 360) % 360;
      expect(Math.abs(a - minuteAngle({ h, m })) % 360, clocks[i]).toBeLessThan(0.01);
    });
  });
});
