import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import { buildWorksheetPages } from '@/lib/worksheet/layout';
import { MATH_TYPES, defaultCarry, hasCarryChoice, mathTitle, problemAnswer, rng, seedOf, type MathRange, type MathType } from '@/lib/worksheet/math';
import { moneyExercises } from '@/lib/worksheet/money';
import { wordProblems } from '@/lib/worksheet/problems';
import { countSet, findGrid } from '@/lib/worksheet/activities';
import { PHONO_WORDS } from '@/lib/worksheet/phonology';
import { firstSet, phonologyItems, soundSet, splitSet, sylSet } from '@/lib/worksheet/phonology-pages';
import { SORT_SETS, gridLayout, groupSet, oddRows, sceneLayout, sortPictures, sortingItems } from '@/lib/worksheet/sorting-pages';
import { CATEGORY_NAMES, SORT_OBJECTS } from '@/lib/worksheet/sorting';
import { gameKeySection } from '@/lib/worksheet/game-keys';
import { sheetCompetenceLabel } from '@/lib/curriculum/sheet';
import type { PageOps } from '@/lib/glyphs/types';
import { opsOutside } from './bounds';
import { drawnExercises, icons, readingOrder, solveDrawn, textOverlaps, texts, type TextOp } from './drawn';

const W = 210;
const H = 297;
const inside = (p: PageOps) => opsOutside(p, { minX: 0, minY: 0, maxX: p.width, maxY: p.height });
const math = (patch: Partial<WorksheetConfig>): WorksheetConfig => ({ ...DEFAULT_CONFIG, category: 'math', mathAnswers: true, ...patch });
const games = (items: string[], patch: Partial<WorksheetConfig> = {}): WorksheetConfig => ({ ...DEFAULT_CONFIG, category: 'games', selectedItems: items, mathAnswers: true, ...patch });

/** The answers page as sections: title → the answer texts under it. */
function keySections(pages: PageOps[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  let current: string[] | null = null;
  for (const page of pages)
    for (const t of texts(page)) {
      if (t.size === 4 && t.weight === 'bold') out.set(t.text, (current = []));
      else if (t.fill === '#334155' && t.size <= 3.4 && current && !t.text.startsWith('Nume:')) current.push(t.text);
    }
  return out;
}
const isKey = (p: PageOps) => texts(p).some((t) => t.text === 'Răspunsuri' && t.size > 6);
const wordOf = new Map([...PHONO_WORDS.map((w) => [w.picture, w.word] as const), ...SORT_OBJECTS.filter((o) => o.picture).map((o) => [o.picture, o.word] as const)]);

describe('answers page: math, every type, many sets', () => {
  const GRID: MathType[] = ['cmp', 'add', 'sub', 'mix', 'missing', 'seq', 'nbr'];
  it('each answer is the one the drawn exercise asks for', () => {
    let checked = 0;
    for (const type of GRID)
      for (const range of [5, 10, 20, 31, 100, 1000] as MathRange[])
        for (const carry of hasCarryChoice(range) ? (['without', 'with', 'mixed'] as const) : ([undefined] as const))
          for (let seed = 1; seed <= 12; seed++) {
            const pages = buildWorksheetPages(math({ selectedItems: [type], mathRange: range, mathCarry: carry, mathSeed: seed }), 'full');
            expect(pages).toHaveLength(2);
            const drawn = drawnExercises(pages[0], /^\d+\.$/, { top: 40, bottom: H - 30 }, type === 'seq' ? 186 : 93);
            const key = keySections([pages[1]]).get(mathTitle(type, range, carry ?? defaultCarry(range)))!;
            expect(key, `${type} ${range} ${carry}`).toBeDefined();
            expect(drawn.length, `${type} ${range} ${carry} ${seed}`).toBe(key.length);
            drawn.forEach((d, i) => {
              expect(key[i], `${type} ${range} ${carry} ${seed} ${d.cells.join(' ')}`).toBe(`${d.label} ${solveDrawn(d.cells)}`);
              checked++;
            });
          }
    expect(checked).toBeGreaterThan(10_000);
  });

  it('picture sums: the answer is the number of pictures on the row', () => {
    for (const range of [5, 10, 20] as MathRange[])
      for (let seed = 1; seed <= 15; seed++) {
        const [page, key] = buildWorksheetPages(math({ selectedItems: ['addpic'], mathRange: range, mathSeed: seed }), 'full');
        const rows = page.ops.filter((o) => o.t === 'rect' && o.fill === '#FBF7EE') as { y: number; h: number }[];
        const answers = keySections([key]).get(mathTitle('addpic', range))!;
        expect(rows).toHaveLength(answers.length);
        rows.forEach((r, i) => {
          const n = icons(page).filter((ic) => ic.cy > r.y && ic.cy < r.y + r.h).length;
          expect(answers[i], `${range}/${seed} row ${i + 1}`).toBe(`${i + 1}. ${n}`);
        });
      }
  });

  it('problems and money: the answers of the very set on the page', () => {
    for (const range of [5, 10, 20, 31, 100, 1000] as MathRange[])
      for (let seed = 1; seed <= 20; seed++) {
        const pages = buildWorksheetPages(math({ selectedItems: ['problems', 'money'], mathRange: range, mathSeed: seed }), 'full');
        const problems = wordProblems(range, rng(seedOf(`problems:${range}:${seed}`)));
        const money = moneyExercises(range, rng(seedOf(`money:${range}:${seed}`)));
        const key = keySections(pages.filter(isKey));
        expect(key.get(mathTitle('problems', range))).toEqual(problems.map((p, i) => `${i + 1}. ${problemAnswer(p, range)}`));
        expect(key.get(mathTitle('money', range))).toEqual(money.map((m, i) => `${i + 1}. ${m.answer}`));
        // the page tells those very problems: their first numbers are in the text the child reads
        const sheet = texts(pages[0]).map((t) => t.text).join(' ');
        for (const p of problems) expect(sheet, p.text).toContain(String(p.given[0].n));
        for (const p of problems) {
          const last = p.steps[p.steps.length - 1];
          expect(p.result).toBe(last.r);
          for (const s of p.steps) expect(s.op === '+' ? s.a + s.b : s.a - s.b).toBe(s.r);
        }
      }
  });

  it('a problem answer reads like the teacher writes it', () => {
    const p = wordProblems(10, rng(seedOf('problems:10:1')))[0];
    expect(problemAnswer(p, 10)).toMatch(/^\d+ [+−] \d+ = \d+ — Răspuns: \d+ \p{L}/u);
    expect(problemAnswer(wordProblems(5, rng(seedOf('problems:5:1')))[0], 5)).toMatch(/^\d+ [+−] \d+ = \d+ \(\d+ \p{L}/u);
  });

  it('the answers page prints no curriculum line, the sheets keep theirs; everything on the paper', () => {
    for (const level of ['CP', 'I', 'II'] as const) {
      const config = math({ selectedItems: [...MATH_TYPES], mathRange: 10, curriculumLevel: level });
      const pages = buildWorksheetPages(config, 'full');
      const label = sheetCompetenceLabel(config, level)!;
      expect(label).toBeTruthy();
      const keys = pages.filter(isKey);
      expect(keys.length).toBeGreaterThan(0);
      for (const p of pages) {
        // the line, or its two halves when it is too long beside the page number
        const printed = texts(p).some((t) => t.text === label) || label.split(' · ').every((part) => texts(p).some((t) => t.text === part));
        expect(printed, `${level}`).toBe(!isKey(p));
        expect(texts(p).some((t) => t.text.startsWith('Competen'))).toBe(!isKey(p));
        expect(textOverlaps(p), `${level}`).toEqual([]);
        expect(inside(p)).toEqual([]);
      }
      for (const p of keys) expect(textOverlaps(p)).toEqual([]);
    }
  });
});

describe('answers page: games', () => {
  const ALL = [...phonologyItems(), ...sortingItems(), 'count:5', 'count:10', 'find:A', 'find:Ș', 'find:M', 'dots:star'];

  it('every game with an answer gets its section; drawings and dots get none', () => {
    for (const item of ALL) {
      const pages = buildWorksheetPages(games([item]), 'full');
      const none = item.startsWith('dots:') || item === 'pos:5' || item === 'pos:6';
      expect(pages.length, item).toBe(none ? 1 : 2);
      expect(gameKeySection(DEFAULT_CONFIG, item) === null, item).toBe(none);
      for (const p of pages) expect(inside(p), item).toEqual([]);
    }
    // nothing asked for: no answers page
    expect(buildWorksheetPages(games(['sound:A'], { mathAnswers: false }), 'full')).toHaveLength(1);
  });

  it('the answers match the pictures drawn on the page', () => {
    for (const item of ALL) {
      const section = gameKeySection(DEFAULT_CONFIG, item);
      if (!section) continue;
      const [page, key] = buildWorksheetPages(games([item]), 'full');
      const entries = keySections([key]).get(section.title)!;
      expect(entries, item).toBeDefined();
      const [kind, arg] = item.split(':');
      const n = Number(arg);
      const drawn = readingOrder(icons(page));
      const words = drawn.map((d) => wordOf.get(d.emoji));
      if (kind === 'count') {
        // the pictures of each row, counted on the page
        const rows = page.ops.filter((o) => o.t === 'rect' && o.fill === '#FBF7EE') as { y: number; h: number }[];
        const counts = rows.map((r) => drawn.filter((d) => d.cy > r.y && d.cy < r.y + r.h).length);
        expect(entries, item).toEqual([`De sus în jos: ${counts.join(', ')}.`]);
        expect(counts).toEqual(countSet(n).numbers);
      } else if (kind === 'sound') {
        const yes = words.filter((w) => PHONO_WORDS.find((p) => p.word === w)!.initial === arg);
        const no = words.filter((w) => !yes.includes(w));
        expect(entries, item).toEqual([`Se încercuiesc (${yes.length}): ${yes.join(', ')}.`, `Nu se încercuiesc: ${no.join(', ')}.`]);
        expect(yes.length).toBe(soundSet(arg).targets);
      } else if (kind === 'first') {
        expect(entries.map((e) => e.replace(/^\d+\. /, '')), item).toEqual(words.map((w) => `${w!.toLocaleUpperCase('ro')} – ${PHONO_WORDS.find((p) => p.word === w)!.initial}`));
      } else if (kind === 'syl') {
        expect(entries.map((e) => e.replace(/^\d+\. /, '')), item).toEqual(words.map((w) => {
          const p = PHONO_WORDS.find((x) => x.word === w)!;
          return `${p.syllables.join('-').toLocaleUpperCase('ro')} (${p.syllables.length})`;
        }));
      } else if (kind === 'split') {
        expect(entries.map((e) => e.replace(/^\d+\. /, '')), item).toEqual(words.map((w) => PHONO_WORDS.find((x) => x.word === w)!.syllables.join('-').toLocaleUpperCase('ro')));
      } else if (kind === 'sort') {
        const def = SORT_SETS[n - 1];
        const pics = sortPictures(n);
        if (def.by !== 'shape') {
          // the column of pictures, top to bottom (the group boxes have their own symbols elsewhere)
          const xs = drawn.map((d) => Math.round(d.cx * 10));
          const colX = xs.sort((a, b) => xs.filter((x) => x === b).length - xs.filter((x) => x === a).length)[0] / 10;
          const col = drawn.filter((d) => Math.abs(d.cx - colX) < 0.2).sort((a, b) => a.cy - b.cy);
          expect(col.map((d) => wordOf.get(d.emoji)), item).toEqual(pics.map((p) => p.word));
          if (def.by === 'size') col.forEach((d, i) => expect(d.size < 15, `${item} ${i}`).toBe(pics[i].group === 1));
        }
        expect(entries.slice(1), item).toEqual(def.groups.map((g, gi) => `${g.label.join(' ')}: ${pics.map((p, i) => ({ p, i })).filter(({ p }) => p.group === gi).map(({ p, i }) => (def.by === 'shape' ? `${i + 1}` : `${i + 1}. ${p.word}`)).join(', ')}`));
        if (def.by === 'category') for (const [gi, g] of def.groups.entries()) for (const p of pics.filter((x) => x.group === gi)) expect(SORT_OBJECTS.find((o) => o.word === p.word)!.cat, `${item} ${p.word}`).toBe(g.cat);
      } else if (kind === 'odd') {
        const rows = oddRows(n);
        const perRow = rows.map((_, r) => words.slice(r * 4, r * 4 + 4));
        rows.forEach((row, r) => {
          expect(perRow[r], `${item} row ${r + 1}`).toEqual(row.objects.map((o) => o.word));
          const odd = row.objects[row.intruder];
          expect(entries[r]).toBe(`${r + 1}. ${odd.word} (celelalte: ${CATEGORY_NAMES[row.cat]})`);
          expect(row.objects.filter((o) => o.cat === row.cat)).toHaveLength(3);
          expect(odd.cat).not.toBe(row.cat);
        });
      } else if (kind === 'group') {
        // every picture once in the table header: the rest are the ones to count
        const set = groupSet(n, 0);
        expect(entries).toEqual([set.kinds.map((k) => `${k.object.word}: ${k.count}`).join(', ')]);
        for (const k of set.kinds) expect(drawn.filter((d) => d.emoji === k.object.picture).length - 1, `${item} ${k.object.word}`).toBe(k.count);
      } else if (kind === 'pos') {
        const questions = n <= 2 ? sceneLayout(n, 0).questions : gridLayout(n, 0).questions;
        // the options of each question row are the three pictures right of the question
        const qTexts = texts(page).filter((t: TextOp) => /^\d\. Ce se află/.test(t.text));
        expect(qTexts).toHaveLength(questions.length);
        qTexts.forEach((q, i) => {
          const options = drawn.filter((d) => d.cx > W - 12 - 75 && Math.abs(d.cy - (q.y - 1.5)) < 5).map((d) => wordOf.get(d.emoji));
          expect(options, `${item} q${i + 1}`).toContain(questions[i].answer.word);
          expect(entries[i]).toBe(`${i + 1}. ${questions[i].answer.word}`);
        });
      } else if (kind === 'find') {
        const t = arg;
        expect(entries).toEqual([`Litera ${t} apare de ${findGrid(t, false).filter((l) => l === t).length} ori.`]);
      }
    }
  });

  it('small letters: the answers are written as the sheet writes them', () => {
    const s = gameKeySection({ ...DEFAULT_CONFIG, letterMode: 'lowercase' }, 'first:1')!;
    expect(s.entries[0]).toBe(`${firstSet(1)[0].word} – ${firstSet(1)[0].initial.toLocaleLowerCase('ro')}`);
    expect(gameKeySection({ ...DEFAULT_CONFIG, letterMode: 'lowercase' }, 'syl:2')!.entries[0]).toBe(`${sylSet(2)[0].syllables.join('-')} (${sylSet(2)[0].syllables.length})`);
    expect(gameKeySection({ ...DEFAULT_CONFIG, letterMode: 'lowercase' }, 'split:3')!.entries[0]).toBe(splitSet(3)[0].syllables.join('-'));
    expect(gameKeySection({ ...DEFAULT_CONFIG, letterMode: 'lowercase' }, 'find:B')!.entries[0]).toBe(`Litera b apare de ${findGrid('B', true).filter((l) => l === 'b').length} ori.`);
  });

  it('many games: the answers go on as many pages as they need, nothing overlaps, no curriculum line on them', () => {
    const config = games(ALL, { curriculumLevel: 'CP' });
    const pages = buildWorksheetPages(config, 'full');
    const keys = pages.filter(isKey);
    expect(keys.length).toBeGreaterThan(1);
    const label = sheetCompetenceLabel(config, 'CP')!;
    for (const p of keys) {
      expect(inside(p)).toEqual([]);
      expect(textOverlaps(p)).toEqual([]);
      expect(texts(p).some((t) => t.text === label)).toBe(false);
      const last = Math.max(...texts(p).map((t) => t.y));
      expect(last).toBeLessThanOrEqual(H - 12 - 8 + 0.5);
    }
    // every section once, in page order
    const titles = [...keySections(keys).keys()];
    expect(titles).toEqual(ALL.map((i) => gameKeySection(config, i)?.title).filter(Boolean));
  });

  it('free plan: the answers of the free games only', () => {
    const pages = buildWorksheetPages(games(['sound:A', 'sound:M', 'sort:1', 'sort:2']), 'free');
    const titles = [...keySections(pages.filter(isKey)).keys()];
    expect(titles).toEqual(['Sunetul de la început: A', 'Sortează: fructe, legume']);
  });
});
