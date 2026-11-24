import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import type { DrawOp, PageOps } from '@/lib/glyphs/types';
import { flattenOps } from '@/lib/glyphs/geometry';
import { hasIcon, iconOps } from '@/lib/hints/icons';
import { numberWords } from '@/lib/worksheet/number-words';
import { CLR_KINDS, CLR_SETS, DRAWN_SIGNS, MESSAGE_SETS, NOTE_SETS, SIGN_CONTEXT, SIGN_MATCH_SETS, STORIES, WRITTEN_SETS, isClrItem } from '@/lib/worksheet/clr';
import { clrItems, clrKeySection, clrLabel, signMatchLayout, storyLayout, writtenAnswers } from '@/lib/worksheet/clr-pages';
import {
  AROUND_ROWS, CAUSE_SETS, COORD_PICTURES, MEM_KINDS, MEM_SETS, MINUS, MORE_ROWS, PICT_KINDS, PLACE_SETS, PLAN_SETS, REGULAR_SETS, SOLIDS, SOLID_OBJECTS,
  SORT2_SETS, TIMES, cellName, cmpSign, coordSet, growingCount, isMemItem, memSetLevel, nextPicture, numberRow, opsThatFit, pictCounts, ruleOf, termsSet,
} from '@/lib/worksheet/mem';
import { blocksOps, cellCentre, coordLayout, memItems, memKeySection, memLabel, pictLayout, planLayout, sort2Layout, solidLayout } from '@/lib/worksheet/mem-pages';
import { activityLabel, isActivityItem } from '@/lib/worksheet/activities';
import { buildWorksheetPages, hasContent } from '@/lib/worksheet/layout';
import { gameAnswerPages } from '@/lib/worksheet/game-keys';
import { isItemAllowed } from '@/lib/access';
import { itemFitsCategory, sanitizeConfig } from '@/stores/sanitize-config';
import { findCompetence } from '@/lib/curriculum';
import { sheetCompetenceLabel, sheetCompetences, type SchoolLevel } from '@/lib/curriculum/sheet';
import { CLASS_PAGES, SHEET_PRESETS, classCoverage, headlineItems, presetConfig } from '@/lib/curriculum/presets';
import { opsOutside } from './bounds';
import { textOverlaps } from './drawn';

const games = (items: string[], extra: Partial<WorksheetConfig> = {}): WorksheetConfig => ({ ...DEFAULT_CONFIG, category: 'games', selectedItems: items, ...extra });
const page = (item: string, extra: Partial<WorksheetConfig> = {}) => buildWorksheetPages(games([item], extra), 'full')[0];
const texts = (p: PageOps) => flattenOps(p.ops).flatMap((o) => (o.t === 'text' ? [o.text] : []));
const FRAME = 51;
const CLR = clrItems();
const MEMS = memItems();
const ALL = [...CLR, ...MEMS];
const LEVELS: SchoolLevel[] = ['presc', 'CP', 'I', 'II'];

/** Where a picture is drawn on a page (its top-level icon groups), found by its own shapes. */
function drawnAt(p: PageOps, emoji: string): { cx: number; cy: number }[] {
  const ref = iconOps(emoji, 0, 0, 10)[0];
  if (ref.t !== 'group') return [];
  const sig = JSON.stringify(ref.ops.slice(0, 3));
  return p.ops.flatMap((o) => (o.t === 'group' && JSON.stringify(o.ops.slice(0, 3)) === sig ? [{ cx: o.tx + (36 * o.scale) / 2, cy: o.ty + (36 * o.scale) / 2 }] : []));
}

describe('the items', () => {
  it('are activities with a label, the store keeps exactly these', () => {
    expect(CLR).toHaveLength(Object.values(CLR_SETS).reduce((a, b) => a + b, 0));
    expect(MEMS).toHaveLength(Object.values(MEM_SETS).reduce((a, b) => a + b, 0));
    expect(ALL).toHaveLength(43);
    for (const i of ALL) {
      expect(isActivityItem(i), i).toBe(true);
      expect(itemFitsCategory(i, 'games'), i).toBe(true);
      expect(activityLabel(i)).toBe(isClrItem(i) ? clrLabel(i) : memLabel(i));
    }
    // the store's own copy of the ids (sanitize-config.ts) matches the builders exactly
    const tries = [...CLR_KINDS, ...MEM_KINDS].flatMap((k) => Array.from({ length: 9 }, (_, n) => `${k}:${n}`).concat([`${k}:`, k, `${k}:1x`, `${k}:10`]));
    for (const t of tries) expect(itemFitsCategory(t, 'games'), t).toBe(isActivityItem(t));
    for (const no of ['story:5', 'sign:4', 'note:0', 'written:3', 'terms:7', 'sides:2', 'regular:5', 'sort2:3', 'more:2', 'pict:3']) {
      expect(isClrItem(no) || isMemItem(no), no).toBe(false);
      expect(itemFitsCategory(no, 'games'), no).toBe(false);
    }
    expect(sanitizeConfig(games(['story:1', 'story:9', 'terms:6', 'terms:7'])).selectedItems).toEqual(['story:1', 'terms:6']);
  });

  it('every picture is in the icon set; the drawn signs are the only ones that are not pictures', () => {
    const emojis = [
      ...STORIES.flatMap((s) => s.panels.flatMap((p) => p.pics.map((x) => x.e))),
      ...SIGN_MATCH_SETS.flat().map(([s]) => s), ...SIGN_CONTEXT.map((q) => q.sign),
      ...NOTE_SETS.flatMap((n) => [...n.pictures, ...n.bank.map((b) => b[1])]), ...MESSAGE_SETS.map((m) => m.picture),
      ...WRITTEN_SETS.flat().flatMap((c) => (c.picture ? [c.picture] : [])),
      ...COORD_PICTURES.map((c) => c[0]), ...SOLIDS.map((s) => SOLID_OBJECTS[s][0]),
      ...REGULAR_SETS.flatMap((r) => [...r.pictures.flatMap((p) => [...p.unit, ...p.options]), ...('unit' in r.problem ? [...r.problem.unit, ...r.problem.options] : [])]),
      ...SORT2_SETS.flatMap((s) => s.items.flatMap((i) => (i.picture ? [i.picture] : []))), ...PLAN_SETS.flatMap((p) => p.steps.map((s) => s[0])),
      ...CAUSE_SETS.flatMap((c) => c.pairs.map((p) => p[0])), ...AROUND_ROWS.map((r) => r[0]), ...PICT_KINDS.flat().map((k) => k[0]),
      ...MORE_ROWS.flatMap((r) => [r[1][0], r[2][0]]),
    ].filter((e) => !(DRAWN_SIGNS as readonly string[]).includes(e));
    for (const e of emojis) expect(hasIcon(e), e).toBe(true);
  });

  it('one page per item, everything on the A4 paper (with the competence line), no texts on each other', () => {
    for (const level of LEVELS) {
      const pages = buildWorksheetPages(games(ALL, { curriculumLevel: level, childName: 'Ana-Maria Ștefănescu' }), 'full');
      expect(pages).toHaveLength(ALL.length);
      pages.forEach((p, i) => {
        expect(opsOutside(p, { minX: 5, minY: 5, maxX: p.width - 5, maxY: p.height - 5 }), `${level} ${ALL[i]}`).toEqual([]);
        expect(textOverlaps(p), `${level} ${ALL[i]}`).toEqual([]);
      });
    }
  });

  it('the activity stays inside the page margins (12 mm) and above the note line', () => {
    for (const item of ALL) {
      const p = page(item);
      expect(opsOutside(p, { minX: 11.5, minY: 11.5, maxX: 210 - 11.5, maxY: 297 - 12 }), item).toEqual([]);
    }
  });

  it('are the same every time (preview = PDF)', () => {
    const a = JSON.stringify(buildWorksheetPages(games(ALL, { mathAnswers: true }), 'full'));
    expect(JSON.stringify(buildWorksheetPages(games(ALL, { mathAnswers: true }), 'full'))).toBe(a);
  });

  it('every word is written with ș ț (comma below)', () => {
    const all = [...buildWorksheetPages(games(ALL, { mathAnswers: true }), 'full').flatMap(texts), ...ALL.map(activityLabel)];
    expect(all.length).toBeGreaterThan(1000);
    for (const t of all) expect(t, t).not.toMatch(/[şţŞŢ]/);
    for (const n of [0, 6, 7, 16, 60, 600, 677]) expect(numberWords(n)).not.toMatch(/[şţ]/);
  });

  it('free plan: set 1 of each kind and the first set of each class; the rest is the full plan', () => {
    expect(ALL.filter((i) => isItemAllowed(i, 'games', 'free'))).toEqual([
      'story:1', 'sign:1', 'sign:2', 'sign:3', 'note:1', 'msg:1', 'written:1',
      'terms:1', 'terms:3', 'terms:5', 'place:1', 'coord:1', 'sides:1', 'solid:1', 'regular:1', 'regular:3', 'sort2:1', 'plan:1', 'cause:1', 'around:1', 'pict:1', 'more:1',
    ]);
    expect(hasContent(games(['story:2', 'terms:2', 'place:3']), 'free')).toBe(false);
    expect(memSetLevel('terms:4')).toBe('I');
    expect(memSetLevel('regular:3')).toBe('II');
  });

  it('the answers page has a section for every item but the messages the child writes', () => {
    const answers = gameAnswerPages(games(ALL, { mathAnswers: true }), 'full');
    const t = answers.flatMap((ops) => texts({ width: 210, height: 297, ops }));
    for (const i of ALL) {
      if (i.startsWith('note:')) expect(clrKeySection(i), i).toBeNull();
      else expect(t, i).toContain(activityLabel(i));
    }
  });
});

describe('Romanian number words, 0–1000', () => {
  it('a spot list', () => {
    const spots: [number, string][] = [
      [0, 'zero'], [1, 'unu'], [2, 'doi'], [9, 'nouă'], [10, 'zece'], [11, 'unsprezece'], [12, 'doisprezece'], [14, 'paisprezece'], [16, 'șaisprezece'],
      [19, 'nouăsprezece'], [20, 'douăzeci'], [21, 'douăzeci și unu'], [22, 'douăzeci și doi'], [40, 'patruzeci'], [60, 'șaizeci'], [68, 'șaizeci și opt'],
      [99, 'nouăzeci și nouă'], [100, 'o sută'], [101, 'o sută unu'], [102, 'o sută doi'], [110, 'o sută zece'], [112, 'o sută doisprezece'], [118, 'o sută optsprezece'],
      [119, 'o sută nouăsprezece'], [152, 'o sută cincizeci și doi'], [200, 'două sute'], [207, 'două sute șapte'], [213, 'două sute treisprezece'],
      [270, 'două sute șaptezeci'], [324, 'trei sute douăzeci și patru'], [452, 'patru sute cincizeci și doi'], [600, 'șase sute'], [615, 'șase sute cincisprezece'],
      [714, 'șapte sute paisprezece'], [862, 'opt sute șaizeci și doi'], [903, 'nouă sute trei'], [999, 'nouă sute nouăzeci și nouă'], [1000, 'o mie'],
    ];
    for (const [n, w] of spots) expect(numberWords(n), String(n)).toBe(w);
  });

  it('the rules hold for every number', () => {
    const seen = new Set<string>();
    for (let n = 0; n <= 1000; n++) {
      const w = numberWords(n);
      expect(seen.has(w), w).toBe(false);
      seen.add(w);
      expect(w).toMatch(/^[a-zăâîșț ]+$/);
      expect(w).not.toMatch(/doi sute|unu sute|un sută|o sute|  |^ | $/);
      const h = Math.floor(n / 100) % 10;
      const rest = n % 100;
      // the hundreds are feminine: „o sută”, „două sute”, then the rest after a space, never with „și”
      if (n >= 100 && n < 1000) expect(w.startsWith(h === 1 ? 'o sută' : h === 2 ? 'două sute' : `${numberWords(h)} sute`), String(n)).toBe(true);
      // „și” only between the tens and the units, once
      const si = (w.match(/ și /g) ?? []).length;
      expect(si, String(n)).toBe(rest >= 21 && rest % 10 !== 0 ? 1 : 0);
      if (n > 100 && n < 1000 && rest) expect(w.endsWith(numberWords(rest)), String(n)).toBe(true);
    }
    expect(() => numberWords(1001)).toThrow();
    expect(() => numberWords(-1)).toThrow();
  });

  it('„Formează numărul” prints the words of its numbers and the answers give them back', () => {
    for (let n = 1; n <= 3; n++) {
      const set = PLACE_SETS[n - 1];
      const t = texts(page(`place:${n}`));
      for (const v of set.toDigits) expect(t, String(v)).toContain(numberWords(v));
      const key = memKeySection(`place:${n}`)!.entries;
      for (const v of set.toWords) expect(key, String(v)).toContain(`${v} = ${numberWords(v)}`);
      for (const v of set.blocks) {
        expect(Math.floor(v / 100) <= 4 && Math.floor((v % 100) / 10) <= 5 && v % 10 <= 6, String(v)).toBe(true);
        expect(key).toContain(`${Math.floor(v / 100)} sute, ${Math.floor((v % 100) / 10)} zeci, ${v % 10} unități = ${v}`);
      }
    }
    // the words cover o sută, două sute, the teens, a zero ten, the round tens, o mie
    const words = PLACE_SETS.flatMap((s) => [...s.toDigits, ...s.toWords]).map(numberWords).join(' | ');
    for (const part of ['o sută', 'două sute', 'sprezece', 'nouă sute trei', 'cincizeci', 'o mie']) expect(words).toContain(part);
  });

  it('the blocks drawn are the hundreds, tens and units of the number', () => {
    for (const v of PLACE_SETS.flatMap((s) => s.blocks)) {
      const b = blocksOps(v, 0, 0);
      const rects = b.ops.filter((o): o is Extract<DrawOp, { t: 'rect' }> => o.t === 'rect' && !!o.stroke);
      const big = rects.filter((r) => r.w > 10 && r.h > 10).length;
      const bars = rects.filter((r) => r.w < 3 && r.h > 10).length;
      const units = rects.filter((r) => r.w < 3 && r.h < 3).length;
      expect([big, bars, units], String(v)).toEqual([Math.floor(v / 100), Math.floor((v % 100) / 10), v % 10]);
    }
  });
});

describe('„Comunicare”', () => {
  it('the story: four panels in another order, the example on panel 1, the right title among three', () => {
    for (let n = 1; n <= 4; n++) {
      const lay = storyLayout(n, FRAME);
      expect([...lay.order].sort()).toEqual([0, 1, 2, 3]);
      lay.order.forEach((k, i) => expect(k, `story ${n}`).not.toBe(i));
      expect([...lay.titles].sort()).toEqual([0, 1, 2]);
      const story = STORIES[n - 1];
      expect(new Set(story.titles).size).toBe(3);
      const t = texts(page(`story:${n}`));
      for (const title of story.titles) expect(t).toContain(title);
      const key = clrKeySection(`story:${n}`)!.entries;
      lay.order.forEach((k, i) => expect(key[i]).toContain(`: ${k + 1} – ${story.panels[k].caption}`));
      expect(key[4]).toBe(`Titlul: „${story.titles[0]}”`);
      // the orange 1 sits in the box of the first panel of the story
      const one = flattenOps(page(`story:${n}`).ops).find((o) => o.t === 'text' && o.text === '1' && o.fill === '#E8913A');
      const b = lay.panels[lay.order.indexOf(0)].box;
      expect(one?.t === 'text' && one.x > b.x && one.x < b.x + b.s && one.y > b.y && one.y < b.y + b.s + 1).toBe(true);
    }
  });

  it('the signs: each meaning once, never on the row of its sign; the context questions have one answer each', () => {
    for (const n of [1, 2]) {
      const set = SIGN_MATCH_SETS[n - 1];
      const lay = signMatchLayout(n, FRAME);
      lay.order.forEach((k, i) => expect(k).not.toBe(i));
      expect(new Set(set.map((s) => s[1])).size).toBe(set.length);
      expect(new Set(set.map((s) => s[0])).size).toBe(set.length);
      const t = texts(page(`sign:${n}`));
      for (const [, w] of set) expect(t.filter((x) => x === w), w).toHaveLength(1);
    }
    // the meaning is never written on the sign itself (STOP is joined with „OPREȘTE!”)
    expect(SIGN_MATCH_SETS[0].find(([s]) => s === 'stop')?.[1]).toBe('OPREȘTE!');
    for (const q of SIGN_CONTEXT) {
      expect(q.answer >= 0 && q.answer < 3).toBe(true);
      expect(new Set(q.options).size).toBe(3);
    }
    expect(new Set(SIGN_CONTEXT.map((q) => q.answer)).size).toBe(3);
    expect(clrKeySection('sign:3')!.entries[0]).toBe('a) Închid telefonul.');
  });

  it('the messages: questions with one answer among three, all on the page; the answers name them', () => {
    for (let n = 1; n <= 3; n++) {
      const set = MESSAGE_SETS[n - 1];
      const t = texts(page(`msg:${n}`));
      for (const q of set.questions) {
        expect(new Set(q.options).size).toBe(3);
        for (const o of q.options) expect(t, o).toContain(o);
      }
      expect(clrKeySection(`msg:${n}`)!.entries).toEqual(set.questions.map((q) => `${'abc'[q.answer]}) ${q.options[q.answer]}`));
    }
    // the facts asked are in the message
    const inv = MESSAGE_SETS[0].lines.join(' ');
    expect(inv).toContain('sâmbătă');
    expect(inv).toContain('ora 16');
    expect(MESSAGE_SETS[1].lines).toContain('Intrarea este liberă!');
  });

  it('the cards to complete print their words and blanks; the written cards are counted from the data', () => {
    for (let n = 1; n <= 3; n++) {
      const t = texts(page(`note:${n}`));
      for (const line of NOTE_SETS[n - 1].lines) for (const p of line) if (typeof p === 'string') expect(t).toContain(p);
      for (const [w] of NOTE_SETS[n - 1].bank) expect(t).toContain(w);
    }
    for (const n of [1, 2]) {
      const yes = writtenAnswers(n);
      expect(yes.length).toBeGreaterThanOrEqual(5);
      expect(yes[0]).toBe(1);
      expect(WRITTEN_SETS[n - 1].filter((c) => !c.word).every((c) => c.picture)).toBe(true);
      expect(clrKeySection(`written:${n}`)!.entries[0]).toContain(yes.join(', '));
    }
  });
});

describe('„Matematică și explorarea mediului”', () => {
  it('the terms: every missing sign has one answer, every sentence is right, CP stays in 0–10 with a term of 1–5', () => {
    for (let n = 1; n <= 6; n++) {
      const set = termsSet(n);
      expect(set.level).toBe(memSetLevel(`terms:${n}`));
      const ops = set.level === 'CP' ? ['+', MINUS] : set.level === 'I' ? ['+', MINUS] : ['+', MINUS, TIMES, ':'];
      for (const s of set.signs) {
        const t = s.tokens;
        if (t.length === 3) expect(cmpSign(Number(t[0]), Number(t[2]))).toBe(s.answer);
        else if (t[1] === '?') expect(opsThatFit(Number(t[0]), Number(t[2]), Number(t[4]), ops), t.join(' ')).toEqual([s.answer]);
        else {
          const left = t[1] === '+' ? Number(t[0]) + Number(t[2]) : Number(t[0]) - Number(t[2]);
          expect(cmpSign(left, Number(t[4])), t.join(' ')).toBe(s.answer);
        }
      }
      for (const s of set.sentences) {
        const nums = (s.text.match(/\d+/g) ?? []).map(Number);
        const a = Number(s.answer);
        const ok = [nums[0] + nums[1], nums[0] - nums[1], nums[0] * nums[1], nums[1] - nums[0], nums[1] ? nums[0] / nums[1] : NaN].includes(a);
        expect(ok, s.text).toBe(true);
        if (/^Suma|termen este .* suma|În total|în total/.test(s.text)) expect(nums.length === 2 && (a === nums[0] + nums[1] || a === nums[1] - nums[0]), s.text).toBe(true);
        if (/^Diferența|Descăzutul/.test(s.text)) expect(a, s.text).toBe(nums[0] - nums[1]);
        if (/^Produsul|factor/.test(s.text)) expect(a, s.text).toBe(nums[0] * nums[1]);
        if (/^Câtul/.test(s.text)) expect(a, s.text).toBe(nums[0] / nums[1]);
        expect(a).toBeGreaterThanOrEqual(0);
        expect(a).toBeLessThanOrEqual({ CP: 10, I: 100, II: 1000 }[set.level]);
      }
      for (const l of set.labels) {
        const [x, op, y, , z] = l.tokens;
        expect(opsThatFit(Number(x), Number(y), Number(z), [op]), l.tokens.join(' ')).toEqual([op]);
      }
      if (set.level === 'CP') {
        expect(set.pictures).toHaveLength(2);
        for (const p of set.pictures) expect(p.b >= 1 && p.b <= 5 && (p.op === '+' ? p.a + p.b <= 10 : p.a - p.b >= 0)).toBe(true);
      }
      // the words of the class only
      const words = [...set.bank, ...set.sentences.map((s) => s.text)].join(' ');
      if (set.level !== 'II') expect(words).not.toMatch(/descăzut|scăzător|produs|factor|câtul/i);
      if (set.level === 'CP') expect(words).not.toMatch(/termen/);
    }
    // II: 0–1000 without carrying, as the contents of clasa a II-a say
    for (const n of [5, 6]) for (const s of termsSet(n).sentences.filter((x) => /^Suma/.test(x.text))) {
      const [a, b] = (s.text.match(/\d+/g) ?? []).map(Number);
      for (let d = 1; d <= 100; d *= 10) expect(Math.floor(a / d) % 10 + (Math.floor(b / d) % 10), s.text).toBeLessThan(10);
    }
  });

  it('the coordinates: every picture is drawn in the cell the questions and the answers name', () => {
    for (let n = 1; n <= 3; n++) {
      const set = coordSet(n);
      const p = page(`coord:${n}`);
      const lay = coordLayout(FRAME);
      expect(new Set(set.placed.map((x) => cellName(x.col, x.row))).size).toBe(set.placed.length);
      expect(new Set(set.placed.map((x) => x.picture)).size).toBe(set.placed.length);
      for (const x of set.placed) {
        const at = drawnAt(p, x.picture);
        expect(at, x.name).toHaveLength(set.whereIs.includes(set.placed.indexOf(x)) ? 2 : 1);
        const c = cellCentre(lay, x.col, x.row);
        expect(at.some((a) => Math.abs(a.cx - c.x) < 0.01 && Math.abs(a.cy - c.y) < 0.01), x.name).toBe(true);
      }
      // the drawing tasks go to empty cells
      for (const d of set.draw) expect(set.placed.some((x) => x.col === d.col && x.row === d.row)).toBe(false);
      const t = texts(p);
      for (const k of set.whatIn) expect(t).toContain(`${cellName(set.placed[k].col, set.placed[k].row)}:`);
      const key = memKeySection(`coord:${n}`)!.entries;
      for (const k of set.whatIn) expect(key).toContain(`${cellName(set.placed[k].col, set.placed[k].row)}: ${set.placed[k].name}`);
      for (const k of set.whereIs) expect(key).toContain(`${set.placed[k].name}: ${cellName(set.placed[k].col, set.placed[k].row)}`);
      // row 1 is the bottom row, as the labels show
      const ones = flattenOps(p.ops).filter((o): o is Extract<DrawOp, { t: 'text' }> => o.t === 'text' && o.text === '1' && o.fill === '#B45309');
      expect(ones).toHaveLength(1);
      expect(Math.abs(ones[0].y - 1.8 - cellCentre(lay, 0, 1).y)).toBeLessThan(0.01);
    }
  });

  it('the patterns: the next picture is one of the choices, once; the numbers follow their rule; the figures grow by their rule', () => {
    for (const set of REGULAR_SETS) {
      for (const p of set.pictures) {
        expect(p.options.filter((o) => o === nextPicture(p)), p.unit.join('')).toHaveLength(1);
        expect(new Set(p.options).size).toBe(3);
        // the row shows the unit at least twice, so the rule can be seen
        expect(p.shown).toBeGreaterThanOrEqual(2 * p.unit.length);
      }
      for (const p of set.numbers) {
        const row = numberRow(p, 7);
        for (let i = 1; i < 7; i++) expect(p.times ? row[i] / row[i - 1] : row[i] - row[i - 1]).toBe(p.step);
        for (const v of row) expect(v >= 0 && v <= (set.level === 'I' ? 100 : 1000), `${v}`).toBe(true);
      }
      const pr = set.problem;
      if ('unit' in pr) expect(pr.options.filter((o) => o === pr.unit[(pr.ask - 1) % pr.unit.length])).toHaveLength(1);
    }
    expect(ruleOf({ start: 900, step: -100 })).toBe(`${MINUS} 100`);
    expect(ruleOf({ start: 3, step: 2, times: true })).toBe(`${TIMES} 2`);
    expect([1, 2, 3, 4, 6].map((k) => growingCount({ kind: 'stairs', ask: [4, 6] }, k))).toEqual([1, 3, 5, 7, 11]);
    expect([1, 2, 3, 4, 6].map((k) => growingCount({ kind: 'sticks', ask: [4, 6] }, k))).toEqual([4, 7, 10, 13, 19]);
    // the figures drawn have that many squares / sticks
    const sq = flattenOps(page('regular:3').ops).filter((o) => o.t === 'rect' && o.fill === '#FDE3C4').length;
    expect(sq).toBe(1 + 3 + 5);
    const sticks = flattenOps(page('regular:4').ops).filter((o) => o.t === 'line' && o.stroke === '#8D6E63').length;
    expect(sticks).toBe(4 + 7 + 10);
    // the problems' answers
    expect(memKeySection('regular:3')!.entries.at(-1)).toBe('problema: 17');
    expect(memKeySection('regular:4')!.entries.at(-1)).toBe('problema: 8');
    expect(memKeySection('regular:1')!.entries.at(-1)).toBe('problema: 🔵');
  });

  it('two criteria: every cell of the table has a picture, the answers place each number in its cell', () => {
    for (let n = 1; n <= 2; n++) {
      const set = SORT2_SETS[n - 1];
      for (let r = 0; r < set.rows.length; r++) for (let c = 0; c < set.cols.length; c++) expect(set.items.some((i) => i.row === r && i.col === c), `${n} ${r} ${c}`).toBe(true);
      const lay = sort2Layout(n, FRAME);
      const key = memKeySection(`sort2:${n}`)!.entries;
      expect(key).toHaveLength(set.rows.length * set.cols.length);
      lay.order.forEach((k, i) => {
        const it = set.items[k];
        expect(key[it.row * set.cols.length + it.col]).toContain(`${i + 1} (${it.name})`);
      });
    }
  });

  it('the plan, the consequences, the solids, the pictogram, the shapes and the comparisons have one answer each', () => {
    for (let n = 1; n <= 2; n++) {
      const lay = planLayout(n, FRAME);
      lay.order.forEach((k, i) => expect(k).not.toBe(i));
      expect(memKeySection(`plan:${n}`)!.entries[0]).toBe(`De sus în jos: ${lay.order.map((k) => k + 1).join(', ')}`);
      const st = PLAN_SETS[n - 1].statements;
      expect(st.some(([, v]) => v) && st.some(([, v]) => !v)).toBe(true);
      expect(st.map(([s]) => s).join(' ')).toMatch(/ și /);
      expect(st.map(([s]) => s).join(' ')).toMatch(/ sau /);
      expect(st.map(([s]) => s).join(' ')).toMatch(/\bnu\b/);
    }
    for (const set of CAUSE_SETS) {
      for (const s of set.complete) expect(set.bank.filter((b) => b === s.answer)).toHaveLength(1);
      expect(set.bank.length).toBeGreaterThan(set.complete.length);
      for (const [, a, b] of set.pairs) expect(a.startsWith('Dacă') && !b.startsWith('atunci')).toBe(true);
    }
    const sl = solidLayout(FRAME);
    expect([...sl.order].sort()).toEqual([...SOLIDS].sort());
    sl.objects.forEach((s, i) => expect(s).not.toBe(sl.order[i]));
    expect(memKeySection('solid:1')!.entries).toContain(`zarul – ${'ABCDE'[sl.order.indexOf('cub')]} (cub)`);
    for (let n = 1; n <= 2; n++) {
      const counts = pictCounts(n);
      expect(new Set(counts).size).toBe(3);
      const lay = pictLayout(n, FRAME);
      counts.forEach((c, k) => expect(lay.pictures.filter((p) => p.kind === k)).toHaveLength(c));
      // the pictures do not touch each other
      lay.pictures.forEach((a, i) => lay.pictures.slice(i + 1).forEach((b) => expect(Math.abs(a.cx - b.cx) >= a.s || Math.abs(a.cy - b.cy) >= a.s).toBe(true)));
      const p = page(`pict:${n}`);
      PICT_KINDS[n - 1].forEach(([e], k) => expect(drawnAt(p, e).length, e).toBe(counts[k] + 1 + 2));
    }
    expect(AROUND_ROWS.map((r) => r[2]).sort()).toEqual([0, 0, 1, 2, 2, 2, 3, 3]);
    expect(new Set(MORE_ROWS.map((r) => r[3])).size).toBe(2);
  });
});

describe('the competences', () => {
  const codes = (item: string, level: SchoolLevel) => sheetCompetences(games([item]), level).map((r) => (r.domain ? `${r.domain}.${r.code}` : r.code));

  it('each sheet prints the codes of its class only', () => {
    const table: Record<string, Partial<Record<SchoolLevel, string[]>>> = {
      'story:1': { CP: ['3.2'] }, 'story:4': { CP: ['3.2'] },
      'sign:1': { CP: ['3.3'], I: ['3.3'] }, 'sign:2': { I: ['3.3'] }, 'sign:3': { II: ['3.3'] },
      'note:2': { CP: ['4.2'] }, 'msg:3': { II: ['3.1'] }, 'written:2': { presc: ['D.3.3'] },
      'terms:1': { CP: ['1.6'] }, 'terms:2': { CP: ['1.6'] }, 'terms:3': { I: ['1.6'] }, 'terms:4': { I: ['1.6'] }, 'terms:5': { II: ['1.6'] }, 'terms:6': { II: ['1.6'] },
      'place:2': { II: ['1.1'] }, 'coord:3': { II: ['2.1'] }, 'sides:1': { II: ['2.2'] }, 'solid:1': { II: ['2.2'] },
      'regular:1': { I: ['3.1'] }, 'regular:2': { I: ['3.1'] }, 'regular:3': { II: ['3.1'] }, 'regular:4': { II: ['3.1'] },
      'sort2:2': { I: ['5.1'], II: ['5.1'] }, 'plan:2': { II: ['4.1'] }, 'cause:2': { II: ['4.2'] },
      'around:1': { presc: ['E.2.3'], CP: ['2.2'], I: ['2.2'] }, 'pict:2': { presc: ['E.2.5'] }, 'more:1': { presc: ['E.1.2'] },
    };
    for (const item of ALL) expect(Object.keys(table).some((k) => k.split(':')[0] === item.split(':')[0]), item).toBe(true);
    for (const [item, byLevel] of Object.entries(table)) for (const level of LEVELS) expect(codes(item, level), `${item} ${level}`).toEqual(byLevel[level] ?? []);
    expect(sheetCompetenceLabel(games(['msg:1']), 'II')).toBe('Competența specifică 3.1 · Comunicare în limba română, clasa a II-a');
    expect(sheetCompetenceLabel(games(['pict:1']), 'presc')).toBe('Comportament vizat E.2.5 · Curriculum pentru educație timpurie, nivel preșcolar');
    // the sign sets 2 and 3 and the terms sets keep their own class
    expect(codes('sign:2', 'CP')).toEqual([]);
    expect(codes('terms:5', 'I')).toEqual([]);
  });

  it('the codes exist with their official texts', () => {
    for (const item of ALL) for (const level of LEVELS) for (const r of sheetCompetences(games([item]), level)) expect(findCompetence(r), `${item} ${level}`).toBeTruthy();
    const text = (programme: 'clr-p-ii' | 'mem-p-ii', level: 'CP' | 'I' | 'II', code: string) => findCompetence({ programme, level, code })?.text;
    expect(text('clr-p-ii', 'CP', '3.2')).toBe('Identificarea semnificației unei/ unor imagini care prezintă întâmplări, fenomene, evenimente familiare');
    expect(text('clr-p-ii', 'CP', '3.3')).toBe('Identificarea semnificației unor simboluri care transmit mesaje de necesitate imediată, din universul familiar');
    expect(text('clr-p-ii', 'II', '3.1')).toBe('Citirea unor mesaje scrise, întâlnite în mediul cunoscut');
    expect(text('mem-p-ii', 'II', '2.1')).toBe('Localizarea unor obiecte prin stabilirea unor coordonate în raport cu un sistem de referință dat, folosind sintagmele învățate');
    expect(text('mem-p-ii', 'I', '5.1')).toBe('Sortarea și clasificarea unor date din mediul apropiat pe baza a două criterii');
    expect(findCompetence({ programme: 'et-presc', level: '3-6', domain: 'D', code: '3.3' })?.text).toBe('Identifică prezența mesajului scris, apreciază și valorifică mesajul scris în activitățile curente');
  });

  it('the class pages list the presets, which open free sheets that print the code', () => {
    const presets = SHEET_PRESETS.filter((p) => p.config.selectedItems?.some((i) => isClrItem(i) || isMemItem(i)));
    expect(presets).toHaveLength(17);
    for (const preset of presets) {
      for (const level of preset.levels!) {
        const cfg = presetConfig(preset, level);
        for (const item of cfg.selectedItems) expect(isItemAllowed(item, 'games', 'free'), `${preset.id} ${level}`).toBe(true);
        expect(sheetCompetences(cfg, level).length, `${preset.id} ${level}`).toBeGreaterThan(0);
      }
    }
    const listed = (slug: string, code: string, programme?: string) =>
      classCoverage(CLASS_PAGES.find((c) => c.slug === slug)!).flatMap((g) => g.items).filter((i) => i.code === code && (!programme || i.programme === programme)).flatMap((i) => i.presets.map((p) => p.id));
    expect(listed('gradinita', 'D.3.3')).toEqual(['unde-este-scris']);
    expect(listed('gradinita', 'E.1.2')).toEqual(['mai-repede-mai-cald']);
    expect(listed('gradinita', 'E.2.3')).toEqual(['forme-in-jurul-nostru']);
    expect(listed('gradinita', 'E.2.5')).toEqual(['pictograma']);
    expect(listed('gradinita', 'E.3.1')).toEqual([]);
    expect(listed('clasa-pregatitoare', '3.2', 'clr-p-ii')).toEqual(['povestea-in-imagini']);
    expect(listed('clasa-pregatitoare', '3.3', 'clr-p-ii')).toEqual(['semne-simboluri']);
    expect(listed('clasa-pregatitoare', '4.2', 'clr-p-ii')).toEqual(['scriu-un-mesaj']);
    expect(listed('clasa-pregatitoare', '1.6', 'mem-p-ii')).toEqual(['termenii-operatiilor']);
    expect(listed('clasa-1', '3.3', 'clr-p-ii')).toEqual(['semne-simboluri']);
    expect(listed('clasa-1', '1.6', 'mem-p-ii')).toEqual(['termenii-operatiilor']);
    expect(listed('clasa-1', '3.1', 'mem-p-ii')).toEqual(['modele-regularitati']);
    expect(listed('clasa-1', '5.1', 'mem-p-ii')).toEqual(['sortare-doua-criterii']);
    expect(listed('clasa-2', '3.1', 'clr-p-ii')).toEqual(['citeste-mesajul']);
    expect(listed('clasa-2', '3.3', 'clr-p-ii')).toEqual(['semne-simboluri']);
    expect(listed('clasa-2', '1.1', 'mem-p-ii')).toEqual(['formeaza-numarul']);
    expect(listed('clasa-2', '2.2', 'mem-p-ii')).toEqual(['laturi-varfuri', 'corpuri-geometrice']);
    expect(listed('clasa-2', '4.1', 'mem-p-ii')).toEqual(['plan-de-lucru']);
    expect(listed('clasa-2', '4.2', 'mem-p-ii')).toEqual(['ce-se-intampla-daca']);
    // the oral and attitude competences stay without a sheet: listening, speaking, interest, care for the environment
    for (const [slug, code, programme] of [['clasa-pregatitoare', '1.4', 'clr-p-ii'], ['clasa-1', '1.4', 'clr-p-ii'], ['clasa-2', '1.4', 'clr-p-ii'], ['clasa-1', '3.2', 'mem-p-ii'], ['clasa-2', '3.2', 'mem-p-ii']] as const) {
      expect(listed(slug, code, programme), `${slug} ${code}`).toEqual([]);
    }
  });

  it('„Avem fișe pentru X din Y”: grădiniță 13 din 23, CP 22 din 32, I 23 din 33, II 23 din 33', () => {
    const at = (slug: string) => {
      const items = headlineItems(CLASS_PAGES.find((c) => c.slug === slug)!);
      return [items.filter((i) => i.presets.length).length, items.length];
    };
    expect(['gradinita', 'clasa-pregatitoare', 'clasa-1', 'clasa-2'].map(at)).toEqual([[13, 23], [22, 32], [23, 33], [23, 33]]);
  });
});
