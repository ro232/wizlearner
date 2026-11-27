import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import { buildWorksheetPages } from '@/lib/worksheet/layout';
import { buildEvaluationPages, calificativBands, evaluationPageSplit, evaluationPlan, evaluationPrintHint, evaluationTitle, isEvaluationItem, solved, varied } from '@/lib/worksheet/evaluation';
import { readingItems } from '@/lib/worksheet/reading-pages';
import { m34Items } from '@/lib/worksheet/m34-pages';
import { r34Items } from '@/lib/worksheet/r34-pages';
import { evaluationHomeworkConfig } from '@/lib/homework/shared';
import { NUMBER_MATH_TYPES as MATH_TYPES, problemAnswer, rng, seedOf, type MathRange } from '@/lib/worksheet/math';
import { wordProblems } from '@/lib/worksheet/problems';
import { PHONO_WORDS } from '@/lib/worksheet/phonology';
import { phonologyItems } from '@/lib/worksheet/phonology-pages';
import { sortingItems } from '@/lib/worksheet/sorting-pages';
import { SORT_OBJECTS } from '@/lib/worksheet/sorting';
import { isActivityItem } from '@/lib/worksheet/activities';
import { defaultSheetName } from '@/lib/worksheet/saved';
import { findCompetence } from '@/lib/curriculum';
import { sheetCompetenceLabel, sheetCompetences, type SchoolLevel } from '@/lib/curriculum/sheet';
import { CLASS_PAGES, SHEET_PRESETS, classCoverage, classEvaluations, presetById, presetConfig, presetHref } from '@/lib/curriculum/presets';
import { itemFitsCategory, sanitizeConfig } from '@/stores/sanitize-config';
import { useWorksheetStore } from '@/stores/worksheet-store';
import type { PageOps } from '@/lib/glyphs/types';
import { opBox, opsOutside } from './bounds';
import { flattenOps } from '@/lib/glyphs/geometry';
import { drawnExercises, icons, readingOrder, solveDrawn, textOverlaps, texts } from './drawn';

const H = 297;
const inside = (p: PageOps) => opsOutside(p, { minX: 0, minY: 0, maxX: p.width, maxY: p.height });
const isKey = (p: PageOps) => texts(p).some((t) => t.text === 'Răspunsuri' && t.size > 6);
const EVALUATIONS = SHEET_PRESETS.filter((p) => p.evaluation);
const wordOf = new Map([...PHONO_WORDS.map((w) => [w.picture, w.word] as const), ...SORT_OBJECTS.filter((o) => o.picture).map((o) => [o.picture, o.word] as const)]);

/** The items of an evaluation page: heading („2. Calculează.”) and where its block ends. */
function blocksOf(page: PageOps): { n: number; heading: string; top: number; bottom: number; goesOn: boolean }[] {
  const heads = texts(page).filter((t) => /^\d+\. /.test(t.text) && t.weight === 'bold' && t.size > 3.5 && t.size <= 4.3 && t.y > 30 && t.y < 270);
  const self = texts(page).find((t) => t.text === 'Autoevaluare:' || t.text === 'Cum am lucrat?');
  const selfTop = self ? self.y : H - 19 + 8;
  // an item that started on the page before: „continuare” at the right of its heading
  const on = texts(page).filter((t) => t.text.startsWith('continuare'));
  return heads.map((h, i) => ({ n: Number(h.text.split('.')[0]), heading: h.text, top: h.y, bottom: heads[i + 1]?.y ?? selfTop - 8, goesOn: on.some((t) => Math.abs(t.y - h.y) < 0.1) }));
}

/** The score the answers page counts: the sum of „(n răspunsuri)” of its sections. */
function keySectionsScore(keys: PageOps[]): number {
  return keySections(keys).reduce((s, k) => s + Number(k.title.match(/\((\d+) răspuns/)?.[1] ?? 0), 0);
}

/** The answers page as sections: title → its answers. */
function keySections(pages: PageOps[]): { title: string; entries: string[] }[] {
  const out: { title: string; entries: string[] }[] = [];
  for (const page of pages)
    for (const t of texts(page)) {
      if (t.size === 4 && t.weight === 'bold' && /^\d+\. /.test(t.text)) out.push({ title: t.text, entries: [] });
      else if (t.fill === '#334155' && t.size <= 3.4 && out.length && !t.text.startsWith('Nume:') && !/răspunsuri corecte$|răspuns corect$/.test(t.text)) out[out.length - 1].entries.push(t.text);
    }
  return out;
}

describe('the evaluation presets', () => {
  it('one per subject and class: math for CP, I, II, sounds and syllables for CP and I, one for grădiniță, reading and writing for I and II', () => {
    expect(EVALUATIONS.map((p) => p.id)).toEqual(['evaluare-mate', 'evaluare-clr', 'evaluare-gradinita', 'evaluare-citire', 'evaluare-mate-34', 'evaluare-romana-34']);
    const at = (slug: string) => classEvaluations(CLASS_PAGES.find((c) => c.slug === slug)!).map((e) => e.preset.id);
    expect(at('gradinita')).toEqual(['evaluare-gradinita']);
    expect(at('clasa-pregatitoare')).toEqual(['evaluare-mate', 'evaluare-clr']);
    expect(at('clasa-1')).toEqual(['evaluare-mate', 'evaluare-clr', 'evaluare-citire']);
    expect(at('clasa-2')).toEqual(['evaluare-mate', 'evaluare-citire']);
    // clasa a III-a și a IV-a: Matematică and Limba și literatura română (OMEN 5003/2014)
    expect(at('clasa-3')).toEqual(['evaluare-mate-34', 'evaluare-romana-34']);
    expect(at('clasa-4')).toEqual(['evaluare-mate-34', 'evaluare-romana-34']);
    // listed apart, never under a competence
    for (const c of CLASS_PAGES) for (const g of classCoverage(c)) for (const it of g.items) expect(it.presets.some((p) => p.evaluation)).toBe(false);
    expect(presetHref(presetById('evaluare-mate')!, 'I')).toBe('/generator?fisa=evaluare-mate&clasa=I');
  });

  it('match the programme of the class: money for CP and I only, numbers in the class range', () => {
    const mate = presetById('evaluare-mate')!;
    expect(presetConfig(mate, 'CP')).toMatchObject({ category: 'math', evaluation: true, mathRange: 10, selectedItems: ['cmp', 'mix', 'problems', 'money'], curriculumLevel: 'CP' });
    expect(presetConfig(mate, 'I')).toMatchObject({ mathRange: 100, selectedItems: ['cmp', 'mix', 'problems', 'money'] });
    expect(presetConfig(mate, 'II').selectedItems).not.toContain('money');
    // clasa a II-a: 0–1000, „fără trecere peste ordin” as the programme's contents say
    // … and the tables and the clock (II 1.5, II 6.2: quarters and minutes)
    expect(presetConfig(mate, 'II')).toMatchObject({ mathRange: 1000, mathCarry: 'without', mathClock: 'five', selectedItems: ['cmp', 'mix', 'missing', 'mul', 'clock', 'problems'] });
    expect(presetConfig(presetById('evaluare-clr')!, 'CP').selectedItems.every((i) => /^(sound|first|syl|split):/.test(i))).toBe(true);
  });

  it('the codes they show exist in the programme and are printed on their pages', () => {
    for (const c of CLASS_PAGES)
      for (const { preset, codes } of classEvaluations(c)) {
        const config = presetConfig(preset, c.level);
        expect(codes.length, `${preset.id} ${c.level}`).toBeGreaterThan(0);
        for (const r of sheetCompetences(config, c.level)) expect(findCompetence(r)).toBeTruthy();
        const printed = buildWorksheetPages(config, 'full').flatMap((p) => texts(p).map((t) => t.text)).filter((t) => /^(Competen|Comportament)/.test(t)).join(' ');
        for (const code of codes) expect(printed, `${preset.id} ${c.level} ${code}`).toContain(code);
      }
  });

  it('survive the saved settings and open in the generator as they are', () => {
    for (const p of EVALUATIONS) for (const level of p.levels!) {
      const config = presetConfig(p, level);
      expect(JSON.parse(JSON.stringify(sanitizeConfig(config)))).toEqual(JSON.parse(JSON.stringify(config)));
      for (const item of config.selectedItems) expect(isEvaluationItem(item) && itemFitsCategory(item, config.category), item).toBe(true);
    }
  });
});

const FOOTER = H - 12 - 7;
const TOP = 12 + 23;
const footerText = (o: ReturnType<typeof flattenOps>[number]) => o.t === 'text' && o.y >= H - 12 - 0.5;
const chunks = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));
const evalOf = (patch: Partial<WorksheetConfig>): WorksheetConfig => ({ ...DEFAULT_CONFIG, category: 'games', evaluation: true, ...patch });

/** Evaluations longer than any preset: every kind of item, many of them, so that items go on from one page to the next. */
const STRESS: Record<string, WorksheetConfig> = {
  'games CP': evalOf({ selectedItems: ['sound:A', 'first:1', 'syl:1', 'split:1', 'sort:1', 'count:5', 'odd:1', 'count:10', 'odd:2', 'syl:2', 'split:2', 'sort:4', 'first:2'], curriculumLevel: 'CP' }),
  'games presc': evalOf({ selectedItems: ['count:5', 'odd:1', 'odd:2', 'count:5', 'sort:2', 'split:3', 'syl:3', 'odd:3', 'count:10'], curriculumLevel: 'presc' }),
  'games, no class': evalOf({ selectedItems: ['split:1', 'split:2', 'syl:1', 'odd:1', 'count:5', 'odd:4', 'split:4', 'syl:4'] }),
  ...Object.fromEntries(([10, 100, 1000, 10000, 1000000] as MathRange[]).map((r) => [`math ${r}`, evalOf({ category: 'math', selectedItems: [...MATH_TYPES], mathRange: r, curriculumLevel: r > 1000 ? 'IV' : 'II' })])),
  ...Object.fromEntries(chunks(readingItems().filter(isEvaluationItem), 7).map((items, i) => [`reading ${i + 1}`, evalOf({ selectedItems: items, curriculumLevel: 'I' })])),
  ...Object.fromEntries(chunks(m34Items().filter(isEvaluationItem), 9).map((items, i) => [`m34 ${i + 1}`, evalOf({ selectedItems: items, curriculumLevel: 'IV' })])),
  ...Object.fromEntries(chunks(r34Items().filter(isEvaluationItem), 5).map((items, i) => [`r34 ${i + 1}`, evalOf({ selectedItems: items, curriculumLevel: 'III' })])),
};

/** How full a pupil page is as drawn: from the first item down to the last ink, with the total line and the self-check row. */
function inkFill(page: PageOps): number {
  const flat = flattenOps(page.ops);
  const tails = flat.filter((o) => (o.t === 'rect' && o.fill === '#FFFBEB') || (o.t === 'text' && /^(Total|Calificativ): _/.test(o.text))).map((o) => opBox(o)!.minY - (o.t === 'rect' ? 3 : 2));
  const tailTop = tails.length ? Math.min(...tails) : FOOTER;
  let bottom = TOP;
  for (const o of flat) {
    const b = opBox(o);
    if (b && b.minY >= TOP - 1 && b.minY < tailTop - 0.01 && !footerText(o)) bottom = Math.max(bottom, b.maxY);
  }
  return (bottom - TOP + FOOTER - tailTop) / (FOOTER - TOP);
}

describe('an evaluation saves paper', () => {
  it('the presets: one or two pupil pages, and a page that is not the last is at least three quarters full', () => {
    const one = new Set(['evaluare-clr', 'evaluare-gradinita', 'evaluare-mate-34']);
    for (const preset of EVALUATIONS)
      for (const level of preset.levels!)
        for (const seed of [1, 2, 3, 7, 42])
          for (const tier of ['full', 'free'] as const) {
            const config = { ...presetConfig(preset, level), mathSeed: seed };
            const what = `${preset.id} ${level} seed ${seed} ${tier}`;
            const sheets = buildWorksheetPages(config, tier).filter((p) => !isKey(p));
            const plan = evaluationPlan(config, tier);
            expect(plan.length, what).toBe(sheets.length);
            expect(sheets.length, what).toBeLessThanOrEqual(one.has(preset.id) ? 1 : 2);
            sheets.slice(0, -1).forEach((p, i) => {
              expect(plan[i].fill, `${what} page ${i + 1}`).toBeGreaterThanOrEqual(0.75);
              expect(inkFill(p), `${what} page ${i + 1} as drawn`).toBeGreaterThanOrEqual(0.75);
            });
            for (const p of plan) expect(p.fill, what).toBeLessThanOrEqual(1);
          }
  });

  it('long evaluations: every page before the last is well filled too', () => {
    for (const [name, config] of Object.entries(STRESS)) {
      const plan = evaluationPlan(config, 'full');
      const sheets = buildWorksheetPages(config, 'full').filter((p) => !isKey(p));
      expect(plan.length, name).toBe(sheets.length);
      // (a page ends early only before an item whose first row is taller than what is left)
      plan.slice(0, -1).forEach((p, i) => expect(p.fill, `${name} page ${i + 1}`).toBeGreaterThanOrEqual(0.7));
    }
  });

  it('the items are numbered 1…n in reading order; an item goes on only between two rows, its heading never without a row', () => {
    let split = 0;
    for (const [name, config] of [...Object.entries(STRESS), ...EVALUATIONS.flatMap((p) => p.levels!.map((l) => [`${p.id} ${l}`, presetConfig(p, l)] as [string, WorksheetConfig]))]) {
      const plan = evaluationPlan(config, 'full');
      const all = plan.flatMap((p, page) => p.items.map((it) => ({ ...it, page })));
      // numbers never go back, and every item is there
      for (let i = 1; i < all.length; i++) expect(all[i].number, name).toBeGreaterThanOrEqual(all[i - 1].number);
      const numbers = [...new Set(all.map((x) => x.number))];
      expect(numbers, name).toEqual(numbers.map((_, i) => i + 1));
      expect(numbers.length, name).toBe(config.selectedItems.filter(isEvaluationItem).length);
      for (const n of numbers) {
        const mine = all.filter((x) => x.number === n);
        // its rows in order, each on one page only, none left out, every part with at least one row
        expect(mine[0].from, `${name} ${n}`).toBe(0);
        expect(mine[mine.length - 1].to, `${name} ${n}`).toBe(mine[0].rows);
        mine.forEach((m, k) => {
          expect(m.to, `${name} ${n}`).toBeGreaterThan(m.from);
          if (k) {
            expect(m.from, `${name} ${n}`).toBe(mine[k - 1].to);
            expect(m.page, `${name} ${n}`).toBe(mine[k - 1].page + 1);
            split++;
          }
        });
      }
      // as drawn: the headings in the same order, top to bottom and left to right; the item that goes on says so
      const sheets = buildWorksheetPages(config, 'full').filter((p) => !isKey(p));
      expect(sheets.length, name).toBe(plan.length);
      sheets.forEach((p, i) => {
        const heads = blocksOf(p);
        const read = [...heads].sort((a, b) => (Math.abs(a.top - b.top) < 0.1 ? 0 : a.top - b.top));
        expect(read.map((h) => h.n), `${name} page ${i + 1}`).toEqual(plan[i].items.map((x) => x.number));
        expect(heads.map((h) => h.goesOn), `${name} page ${i + 1}`).toEqual(plan[i].items.map((x) => x.from > 0));
        // under every heading there is something of its item before the next heading or the end of the page
        for (const h of heads) {
          const column = heads.filter((x) => Math.abs(x.top - h.top) < 0.1);
          const under = flattenOps(p.ops).filter((o) => !footerText(o)).map((o) => opBox(o)).filter((b) => b && b.minY > h.top + 1.5 && b.maxY < Math.max(h.bottom, h.top + 8) + 12);
          expect(under.length, `${name} page ${i + 1} item ${h.n}`).toBeGreaterThan(column.length > 1 ? 3 : 1);
        }
      });
    }
    expect(split).toBeGreaterThan(4);
  });

  it('a row is never cut: the rows of an item that goes on are lettered once each, in order', () => {
    // three words to split into syllables, four times: the items go on over the pages
    const config = evalOf({ selectedItems: ['first:1', 'split:1', 'split:2', 'split:3', 'split:4', 'split:5', 'split:6', 'odd:1', 'odd:2'], curriculumLevel: 'CP', showRewardSection: false });
    const sheets = buildWorksheetPages(config, 'full').filter((p) => !isKey(p));
    const plan = evaluationPlan(config, 'full');
    expect(plan.flatMap((p) => p.items).some((x) => x.from > 0)).toBe(true);
    const letters = new Map<number, string[]>();
    sheets.forEach((p) => {
      for (const b of blocksOf(p)) {
        const mine = texts(p).filter((t) => /^[a-c]\)?$/.test(t.text) && t.y > b.top && t.y < b.bottom && (t.fill === '#64748B' || t.fill === '#1e3a5f') && t.size <= 4).sort((x, y) => x.y - y.y).map((t) => t.text[0]);
        letters.set(b.n, [...(letters.get(b.n) ?? []), ...mine]);
        // every row of this part is whole on this page
        expect(mine.length, `item ${b.n}`).toBeGreaterThan(0);
      }
    });
    for (const [n, got] of letters) expect(got, `item ${n}`).toEqual(n === 1 ? ['a', 'b', 'c', 'd', 'e', 'f'].slice(0, got.length) : ['a', 'b', 'c']);
  });

  it('two items of small picture rows stand side by side only when that saves a page', () => {
    // grădiniță: counting and the odd one out share a row of the page, and the evaluation is one page
    const g = presetConfig(presetById('evaluare-gradinita')!, 'presc');
    const [page] = buildWorksheetPages(g, 'full');
    const heads = blocksOf(page);
    expect(heads.map((h) => h.n)).toEqual([1, 2, 3, 4]);
    expect(heads[1].top).toBeCloseTo(heads[2].top, 5);
    expect(heads[2].top).toBeLessThan(heads[3].top);
    const x = (n: number) => texts(page).find((t) => t.text.startsWith(`${n}. `))!.x;
    expect(x(2)).toBeLessThan(x(3));
    // the pictures of the two are still easy to see: 10 mm to count, 14 mm to choose from
    const small = icons(page).filter((i) => i.cy > heads[1].top && i.cy < heads[3].top).map((i) => i.size);
    expect(Math.min(...small)).toBeGreaterThanOrEqual(9.9);
    // the same two alone fit one under the other: no need to stand side by side
    const two = blocksOf(buildWorksheetPages(evalOf({ selectedItems: ['count:5', 'odd:1'], curriculumLevel: 'presc' }), 'full')[0]);
    expect(two[0].top).toBeLessThan(two[1].top - 20);
    // ten pictures in a row need the whole width
    const ten = evaluationPlan(evalOf({ selectedItems: ['sort:1', 'count:10', 'odd:1', 'sound:A', 'sort:2'], curriculumLevel: 'presc' }), 'full');
    expect(ten.length).toBe(2);
  });

  it('clasa a III-a și a IV-a: every question of the text is there; the ones that go on say where the text is', () => {
    for (const level of ['III', 'IV'] as const) {
      const config = presetConfig(presetById('evaluare-romana-34')!, level);
      const pages = buildWorksheetPages(config, 'full');
      // three questions and three true / false sentences, whatever the length of the text
      expect(keySections(pages.filter(isKey))[0].title, level).toMatch(/\(6 răspunsuri\)$/);
    }
    const pages = buildWorksheetPages(presetConfig(presetById('evaluare-romana-34')!, 'IV'), 'full');
    const second = texts(pages[1]).map((t) => t.text);
    expect(second).toContain('continuare · Textul este pe pagina 1');
    expect(second).toContain('1. Citește textul, apoi răspunde la întrebări.');
    expect(texts(pages[0]).map((t) => t.text).some((t) => t.startsWith('continuare'))).toBe(false);
    // every reading item of the two classes, alone: one page, all its answers
    for (const item of r34Items().filter((i) => i.startsWith('lect:'))) {
      const alone = buildWorksheetPages(evalOf({ selectedItems: [item], curriculumLevel: 'IV' }), 'full');
      expect(keySections(alone.filter(isKey))[0].entries.length, item).toBe(6);
    }
  });

  it('without the answers page: only that page goes, the pupil pages stay as they are', () => {
    for (const preset of EVALUATIONS)
      for (const level of preset.levels!) {
        const config = presetConfig(preset, level);
        const withKey = buildWorksheetPages(config, 'full');
        const without = buildWorksheetPages({ ...config, evaluationAnswers: false }, 'full');
        const pupil = withKey.filter((p) => !isKey(p));
        expect(without.some(isKey), `${preset.id} ${level}`).toBe(false);
        expect(without.length, `${preset.id} ${level}`).toBe(pupil.length);
        // the same drawing, but for the footer line („Pagina 1 din 2”, and the curriculum line that makes room for it)
        const body = (p: PageOps) => JSON.stringify(p.ops.filter((o) => !(o.t === 'text' && o.y >= H - 12 - 0.5)));
        expect(without.flatMap((p) => texts(p)).filter((t) => /^(Competen|Comportament)/.test(t.text)).length, `${preset.id} ${level}`).toBe(pupil.length);
        without.forEach((p, i) => expect(body(p), `${preset.id} ${level} page ${i + 1}`).toBe(body(pupil[i])));
        expect(evaluationPageSplit(config, 'full')).toEqual({ pupil: pupil.length, key: withKey.length - pupil.length });
        expect(evaluationPageSplit({ ...config, evaluationAnswers: false }, 'full')).toEqual({ pupil: pupil.length, key: 0 });
      }
    // true or unset: the answers page is printed
    const g = presetConfig(presetById('evaluare-gradinita')!, 'presc');
    expect(buildWorksheetPages({ ...g, evaluationAnswers: true }, 'full').some(isKey)).toBe(true);
  });

  it('the print hint says which pages are for the pupils and which for the teacher', () => {
    expect(evaluationPrintHint({ pupil: 2, key: 1 })).toBe('Paginile 1–2 sunt pentru elevi; pagina 3 este pentru tine.');
    expect(evaluationPrintHint({ pupil: 1, key: 1 })).toBe('Pagina 1 este pentru elevi; pagina 2 este pentru tine.');
    expect(evaluationPrintHint({ pupil: 3, key: 2 })).toBe('Paginile 1–3 sunt pentru elevi; paginile 4–5 sunt pentru tine.');
    expect(evaluationPrintHint({ pupil: 2, key: 0 })).toBe('Paginile 1–2 sunt pentru elevi; pagina de răspunsuri nu este inclusă.');
    expect(evaluationPrintHint({ pupil: 1, key: 0 })).toBe('Pagina 1 este pentru elevi; pagina de răspunsuri nu este inclusă.');
    // not an evaluation, or nothing to evaluate: no hint
    expect(evaluationPageSplit({ ...DEFAULT_CONFIG, category: 'math', selectedItems: ['add'] }, 'full')).toBeNull();
    expect(evaluationPageSplit(evalOf({ selectedItems: ['dots:star'] }), 'full')).toBeNull();
    expect(evaluationPageSplit({ ...DEFAULT_CONFIG, selectedItems: ['A'], evaluation: true }, 'full')).toBeNull();
  });

  it('the setting: kept only as „without”, only on an evaluation; a homework link goes without the answers unless asked', () => {
    expect(sanitizeConfig({ category: 'games', selectedItems: ['odd:1'], evaluation: true, evaluationAnswers: false }).evaluationAnswers).toBe(false);
    expect('evaluationAnswers' in sanitizeConfig({ category: 'games', selectedItems: ['odd:1'], evaluation: true, evaluationAnswers: true })).toBe(false);
    expect('evaluationAnswers' in sanitizeConfig({ category: 'games', selectedItems: ['odd:1'], evaluation: true, evaluationAnswers: 'nu' })).toBe(false);
    expect('evaluationAnswers' in sanitizeConfig({ category: 'games', selectedItems: ['odd:1'], evaluationAnswers: false })).toBe(false);
    expect('evaluationAnswers' in sanitizeConfig({ category: 'letters', selectedItems: ['A'], evaluation: true, evaluationAnswers: false })).toBe(false);
    // the generator: on by default, off and on again, gone with another category
    useWorksheetStore.setState({ config: { ...presetConfig(presetById('evaluare-mate')!, 'I') } });
    expect(useWorksheetStore.getState().config.evaluationAnswers).toBeUndefined();
    useWorksheetStore.getState().toggleEvaluationAnswers();
    expect(useWorksheetStore.getState().config.evaluationAnswers).toBe(false);
    useWorksheetStore.getState().toggleEvaluationAnswers();
    expect('evaluationAnswers' in useWorksheetStore.getState().config).toBe(false);
    useWorksheetStore.getState().toggleEvaluationAnswers();
    useWorksheetStore.getState().setCategory('games');
    expect('evaluationAnswers' in useWorksheetStore.getState().config).toBe(false);
    // „Trimite ca temă”
    const sent = presetConfig(presetById('evaluare-clr')!, 'CP');
    expect(evaluationHomeworkConfig(sent, false)).toMatchObject({ evaluation: true, evaluationAnswers: false });
    expect('evaluationAnswers' in (evaluationHomeworkConfig({ ...sent, evaluationAnswers: false }, true) as object)).toBe(false);
    expect(evaluationHomeworkConfig(null, false)).toBeNull();
  });
});

describe('an evaluation sheet', () => {
  for (const preset of EVALUATIONS)
    for (const level of preset.levels!) {
      it(`${preset.id}, ${level}: 1–2 pupil pages, its header, the total, self-check, the answers with calificative or observation`, () => {
        const config = presetConfig(preset, level);
        const pages = buildWorksheetPages(config, 'full');
        const sheets = pages.filter((p) => !isKey(p));
        const keys = pages.filter(isKey);
        expect(sheets.length, `${preset.id} ${level}`).toBeGreaterThanOrEqual(1);
        expect(sheets.length, `${preset.id} ${level}`).toBeLessThanOrEqual(2);
        expect(keys.length).toBeGreaterThanOrEqual(1);
        expect(pages.indexOf(keys[0])).toBe(sheets.length);
        const title = evaluationTitle(config);
        const subject = level === 'III' || level === 'IV' ? (preset.id === 'evaluare-mate-34' ? 'Matematică' : 'Limba și literatura română') : config.category === 'math' ? 'Matematică și explorarea mediului' : 'Comunicare în limba română';
        expect(title).toBe(level === 'presc' ? 'Evaluare — nivel preșcolar' : `Evaluare — ${subject}, ${{ CP: 'clasa pregătitoare', I: 'clasa I', II: 'clasa a II-a', III: 'clasa a III-a', IV: 'clasa a IV-a' }[level as 'CP']}`);
        for (const [i, p] of sheets.entries()) {
          const t = texts(p).map((x) => x.text);
          expect(t).toContain(title);
          expect(t.some((x) => x.startsWith('Nume:') && x.includes('Data:'))).toBe(true);
          // the self-check row closes the last page only
          expect(t.includes(level === 'presc' ? 'Am reușit singur' : 'Mi-a fost ușor'), `page ${i + 1}`).toBe(i === sheets.length - 1);
          // the total and the calificativ to fill in: on the last pupil page, from clasa pregătitoare up (none at grădiniță)
          const total = keySectionsScore(pages.filter(isKey));
          expect(t.includes(`Total: ____ / ${total}`), `page ${i + 1}`).toBe(level !== 'presc' && i === sheets.length - 1);
          expect(t.some((x) => x.startsWith('Calificativ: _')), `page ${i + 1}`).toBe(level !== 'presc' && i === sheets.length - 1);
          // every item of a class has its own „____ / n”, once, where it starts
          expect(t.filter((x) => /^____ \/ \d+$/.test(x)).length).toBe(level === 'presc' ? 0 : blocksOf(p).filter((b) => !b.goesOn).length);
          // the curriculum line names the items of this page
          const items = blocksOf(p).map((b) => config.selectedItems[b.n - 1]);
          expect(items.length).toBeGreaterThan(0);
          const label = sheetCompetenceLabel({ ...config, selectedItems: items }, level);
          expect(label).toBeTruthy();
          // on one line, or the codes over the programme when it is too long next to the page number
          expect(t.includes(label!) || label!.split(' · ').every((part) => t.includes(part)), `${label}`).toBe(true);
          expect(t).toContain(`Pagina ${i + 1} din ${pages.length}`);
        }
        const keyTexts = keys.flatMap((p) => texts(p).map((x) => x.text));
        expect(keyTexts.some((x) => /^(Competen|Comportament)/.test(x))).toBe(false);
        if (level === 'presc') {
          expect(keyTexts).not.toContain('Foarte bine (FB)');
          expect(keyTexts.some((x) => x.startsWith('Observare (opțional)'))).toBe(true);
        } else for (const c of ['Foarte bine (FB)', 'Bine (B)', 'Suficient (S)', 'Insuficient (I)']) expect(keyTexts).toContain(c);
        for (const p of pages) {
          expect(inside(p)).toEqual([]);
          expect(textOverlaps(p), `${preset.id} ${level}`).toEqual([]);
        }
      });
    }

  it('nothing enters the footer band: every item ends above it, on every page, whatever the seed', () => {
    // the items end at H − 12 − 7 mm; under that only the page number, the curriculum line and the brand line
    const check = (pages: PageOps[], what: string) =>
      pages.forEach((p, i) => {
        const inBand = flattenOps(p.ops).filter((o) => !footerText(o)).map((o) => ({ o, b: opBox(o) })).filter(({ b }) => b && b.maxY > FOOTER + 0.3);
        expect(inBand.map(({ o, b }) => `${o.t}${o.t === 'text' ? ` "${o.text}"` : ''} ${b!.maxY.toFixed(1)}`), `${what} page ${i + 1}`).toEqual([]);
        for (const o of flattenOps(p.ops).filter(footerText)) expect(opBox(o)!.minY, `${what} page ${i + 1}`).toBeGreaterThan(FOOTER + 2);
        // and nothing leaves the page or runs into the header
        expect(inside(p), `${what} page ${i + 1}`).toEqual([]);
      });
    for (const preset of EVALUATIONS)
      for (const level of preset.levels!)
        for (const seed of [1, 2, 3, 7, 42])
          for (const tier of ['full', 'free'] as const)
            for (const patch of [{}, { showRewardSection: false }, { evaluationAnswers: false }])
              check(buildWorksheetPages({ ...presetConfig(preset, level), mathSeed: seed, ...patch }, tier), `${preset.id} ${level} seed ${seed} ${tier} ${JSON.stringify(patch)}`);
    // long evaluations, whose items go on from page to page: every kind of item there is
    for (const [name, config] of Object.entries(STRESS)) for (const seed of [1, 5]) check(buildWorksheetPages({ ...config, mathSeed: seed }, 'full'), `${name} seed ${seed}`);
  });

  it('no picture twice in one evaluation', () => {
    for (const preset of EVALUATIONS.filter((p) => p.config.category === 'games'))
      for (const level of preset.levels!) {
        const all = buildWorksheetPages(presetConfig(preset, level), 'full').filter((p) => !isKey(p)).flatMap((p) => icons(p).map((i) => i.emoji));
        // sorting and counting pictures may repeat a kind on purpose (count: several of one); the words of the items do not
        const named = all.filter((e) => wordOf.has(e));
        const counted = new Map<string, number>();
        for (const e of named) counted.set(e, (counted.get(e) ?? 0) + 1);
        const twice = [...counted].filter(([, n]) => n > 1).map(([e]) => wordOf.get(e));
        expect(twice.filter((w) => !['morcov', 'câine', 'pisică', 'măr', 'floare', 'pară', 'balon', 'urs'].includes(w!)), `${preset.id} ${level}`).toEqual([]);
      }
  });
});

describe('the answers of an evaluation are those of the exercises drawn', () => {
  it('math: every item, every class range, many sets', () => {
    let checked = 0;
    const types = MATH_TYPES.filter((t) => t !== 'problems' && t !== 'money' && t !== 'addpic');
    for (const range of [5, 10, 20, 31, 100, 1000] as MathRange[])
      for (let seed = 1; seed <= 25; seed++) {
        const config: WorksheetConfig = { ...DEFAULT_CONFIG, category: 'math', evaluation: true, selectedItems: [...MATH_TYPES], mathRange: range, mathSeed: seed, curriculumLevel: 'I' };
        const pages = buildWorksheetPages(config, 'full');
        const key = keySections(pages.filter(isKey));
        expect(key.map((s) => s.title.replace(/ \(.*$/, '')), `${range}/${seed}`).toHaveLength(MATH_TYPES.length);
        // an item with one exercise a line may go on on the next page: its parts are read together
        const parts = pages.filter((p) => !isKey(p)).flatMap((page) => blocksOf(page).map((b) => ({ page, b })));
        const numbers = [...new Set(parts.map((x) => x.b.n))];
        expect(numbers, `${range}/${seed}`).toEqual(MATH_TYPES.map((_, i) => i + 1));
        for (const n of numbers)
          {
            const mine = parts.filter((x) => x.b.n === n);
            const type = config.selectedItems[n - 1];
            const section = key[n - 1];
            if (type === 'problems') {
              // two problems of the page's set, the ones told in the block, with their answers
              const set = wordProblems(range, rng(seedOf(`problems:${range}:${seed}`)));
              const told = mine.flatMap(({ page, b }) => texts(page).filter((t) => t.y > b.top && t.y < b.bottom).map((t) => t.text)).join(' ');
              expect(section.entries, `${range}/${seed}`).toHaveLength(2);
              for (const e of section.entries) {
                const p = set.find((x) => e === `${e.slice(0, 2)} ${problemAnswer(x, range)}`);
                expect(p, `${range}/${seed} ${e}`).toBeDefined();
                expect(told).toContain(p!.text.split(' ').slice(0, 3).join(' '));
              }
              continue;
            }
            if (!types.includes(type as never) && type !== 'addpic') continue;
            const drawn = mine.flatMap(({ page, b }) => drawnExercises(page, /^[a-z]\)$/, b, type === 'seq' || type === 'addpic' ? 186 : 93));
            expect(drawn.length, `${type} ${range}/${seed}`).toBe(section.entries.length);
            drawn.forEach((d, i) => {
              expect(section.entries[i], `${type} ${range}/${seed} ${d.cells.join(' ')}`).toMatch(new RegExp(`^${d.label.replace(')', '\\)')} `));
              // the written-out exercise is the drawn one with the right answer in its box
              const solution = solveDrawn(d.cells);
              const filled = solved({ cells: d.cells[0] === '+' ? d.cells.slice(1) : d.cells, answer: solution });
              expect(section.entries[i]).toBe(`${d.label} ${filled}`);
              checked++;
            });
            // a comparison shows more than one sign when the page's set has them
            if (type === 'cmp') expect(new Set(section.entries.map((e) => e.match(/[<>=]/)![0])).size, `${range}/${seed}`).toBeGreaterThan(1);
          }
      }
    expect(checked).toBeGreaterThan(3000);
  });

  it('games: the pictures drawn and the answers agree', () => {
    const ITEMS = ['count:5', 'count:10', ...phonologyItems().filter((i) => !i.startsWith('sound:') || ['sound:A', 'sound:M', 'sound:T'].includes(i)), ...sortingItems().filter((i) => /^(sort|odd):/.test(i))];
    for (const item of ITEMS) {
      const config: WorksheetConfig = { ...DEFAULT_CONFIG, category: 'games', evaluation: true, selectedItems: [item], curriculumLevel: 'CP' };
      const pages = buildWorksheetPages(config, 'full');
      const [page] = pages;
      const [section] = keySections(pages.filter(isKey));
      expect(section, item).toBeDefined();
      const b = blocksOf(page)[0];
      const drawn = readingOrder(icons(page).filter((i) => i.cy > b.top && i.cy < b.bottom));
      const words = drawn.map((d) => wordOf.get(d.emoji)!);
      const [kind, arg] = item.split(':');
      const phono = (w: string) => PHONO_WORDS.find((p) => p.word === w)!;
      if (kind === 'count') {
        const rows = page.ops.filter((o) => o.t === 'rect' && o.fill === '#FBF7EE') as { y: number; h: number }[];
        expect(section.entries.join(' '), item).toBe(rows.map((r, i) => `${String.fromCharCode(97 + i)}) ${drawn.filter((d) => d.cy > r.y && d.cy < r.y + r.h).length}`).join(' '));
      } else if (kind === 'sound') {
        expect(words).toHaveLength(6);
        const yes = words.filter((w) => phono(w).initial === arg);
        expect(yes.length, item).toBeGreaterThanOrEqual(2);
        expect(section.entries, item).toEqual([`Se încercuiesc: ${yes.join(', ')}. Nu se încercuiesc: ${words.filter((w) => !yes.includes(w)).join(', ')}.`]);
      } else if (kind === 'first') {
        expect(section.entries.join(' '), item).toBe(words.map((w, i) => `${String.fromCharCode(97 + i)}) ${w.toLocaleUpperCase('ro')} – ${phono(w).initial}`).join(' '));
      } else if (kind === 'syl') {
        expect(words.map((w) => phono(w).syllables.length).sort()).toEqual([1, 2, 3, 4]);
        expect(section.entries.join(' '), item).toBe(words.map((w, i) => `${String.fromCharCode(97 + i)}) ${phono(w).syllables.join('-').toLocaleUpperCase('ro')} (${phono(w).syllables.length})`).join(' '));
      } else if (kind === 'split') {
        expect(section.entries.join(' '), item).toBe(words.map((w, i) => `${String.fromCharCode(97 + i)}) ${phono(w).syllables.join('-').toLocaleUpperCase('ro')}`).join(' '));
        // one box per syllable
        const boxes = page.ops.filter((o) => o.t === 'rect' && o.fill === '#ffffff' && o.stroke === '#1e3a5f' && o.y > b.top && o.y < b.bottom).length;
        expect(boxes, item).toBe(words.reduce((n, w) => n + phono(w).syllables.length, 0));
      } else if (kind === 'sort') {
        const row = drawn.filter((d) => Math.abs(d.cy - drawn[0].cy) < 6);
        const lines = section.entries;
        for (const line of lines) {
          const [label, list] = line.split(': ');
          for (const part of list.split(', ')) {
            const at = part.charCodeAt(0) - 97;
            if (part.length > 2) expect(wordOf.get(row[at].emoji), `${item} ${part}`).toBe(part.slice(3));
            const obj = SORT_OBJECTS.find((o) => o.word === part.slice(3));
            if (obj && /FRUCTE|LEGUME|DOMESTICE|SĂLBATICE|AER|USCAT|APĂ|HAINE|JUCĂRII/.test(label)) expect(label, `${item} ${part}`).toContain({ fructe: 'FRUCTE', legume: 'LEGUME', domestice: 'DOMESTICE', salbatice: 'SĂLBATICE', aer: 'AER', uscat: 'USCAT', apa: 'APĂ', haine: 'HAINE', jucarii: 'JUCĂRII' }[obj.cat as 'fructe']);
          }
        }
        expect(lines.join(' ').match(/[a-f]\)/g)!.length, item).toBe(6);
      } else if (kind === 'odd') {
        expect(words).toHaveLength(12);
        section.entries.forEach((e, r) => {
          const odd = e.slice(3).split(' (')[0];
          const row = words.slice(r * 4, r * 4 + 4);
          expect(row, `${item} ${e}`).toContain(odd);
          const cats = row.map((w) => SORT_OBJECTS.find((o) => o.word === w)!.cat);
          const oddCat = SORT_OBJECTS.find((o) => o.word === odd)!.cat;
          expect(cats.filter((c) => c === oddCat)).toHaveLength(1);
        });
      }
    }
  });
});

describe('evaluation rules', () => {
  it('calificative: four bands that cover every score once, best first', () => {
    for (let total = 4; total <= 60; total++) {
      const bands = calificativBands(total);
      expect(bands.map((b) => b.code)).toEqual(['FB', 'B', 'S', 'I']);
      expect(bands[0].max).toBe(total);
      expect(bands[3].min).toBe(0);
      for (let i = 1; i < 4; i++) expect(bands[i].max, `${total}`).toBe(bands[i - 1].min - 1);
      for (const b of bands) expect(b.min, `${total} ${b.code}`).toBeLessThanOrEqual(b.max);
      expect(bands[0].min).toBeGreaterThanOrEqual(Math.ceil(total * 0.8));
    }
    expect(calificativBands(18).map((b) => [b.min, b.max])).toEqual([[16, 18], [12, 15], [9, 11], [0, 8]]);
  });

  it('varied: the first ones, with every kind there is', () => {
    const xs = ['<', '<', '<', '<', '>', '='].map((k, i) => ({ k, i }));
    expect(varied(xs, 3, (x) => x.k).map((x) => x.i)).toEqual([0, 4, 5]);
    expect(varied(xs, 5, (x) => x.k).map((x) => x.i)).toEqual([0, 1, 2, 4, 5]);
    expect(varied([1, 2, 3, 4], 2, () => 'a')).toEqual([1, 2]);
  });

  it('items without a short form are left out; nothing to evaluate prints the ordinary sheet', () => {
    expect(isEvaluationItem('dots:star')).toBe(false);
    expect(isEvaluationItem('pos:1')).toBe(false);
    expect(isEvaluationItem('group:1')).toBe(false);
    expect(isEvaluationItem('find:A')).toBe(false);
    for (const t of MATH_TYPES) expect(isEvaluationItem(t)).toBe(true);
    for (const i of [...phonologyItems(), ...sortingItems(), 'count:5', 'count:10']) if (isEvaluationItem(i)) expect(isActivityItem(i), i).toBe(true);
    const dots: WorksheetConfig = { ...DEFAULT_CONFIG, category: 'games', evaluation: true, selectedItems: ['dots:star'] };
    expect(buildEvaluationPages(dots, 'full')).toEqual([]);
    expect(buildWorksheetPages(dots, 'full')).toHaveLength(1);
    const mixed = buildWorksheetPages({ ...dots, selectedItems: ['dots:star', 'odd:1'] }, 'full');
    expect(mixed.filter((p) => !isKey(p))).toHaveLength(1);
  });

  it('free plan: numbers up to 10 and the free games only', () => {
    const pages = buildWorksheetPages({ ...presetConfig(presetById('evaluare-mate')!, 'I') }, 'free');
    const numbers = pages.filter((p) => !isKey(p)).flatMap((p) => texts(p)).filter((t) => /^\d+$/.test(t.text) && t.size > 7).map((t) => Number(t.text));
    expect(numbers.length).toBeGreaterThan(10);
    expect(Math.max(...numbers)).toBeLessThanOrEqual(10);
    const g = buildWorksheetPages({ ...DEFAULT_CONFIG, category: 'games', evaluation: true, selectedItems: ['odd:1', 'odd:2', 'sound:M'] }, 'free');
    expect(keySections(g.filter(isKey)).map((s) => s.title)).toEqual(['1. Ce nu se potrivește? (3 răspunsuri)']);
  });

  it('the self-check row is optional; „Pagină cu răspunsuri” of the ordinary sheets does not turn the answers of an evaluation off', () => {
    const config = presetConfig(presetById('evaluare-gradinita')!, 'presc');
    const without = buildWorksheetPages({ ...config, showRewardSection: false, mathAnswers: false }, 'full');
    expect(without.flatMap((p) => texts(p).map((t) => t.text))).not.toContain('Am reușit singur');
    expect(without.some(isKey)).toBe(true);
  });

  it('no class chosen: the subject in the header, no calificative', () => {
    const config: WorksheetConfig = { ...DEFAULT_CONFIG, category: 'math', evaluation: true, selectedItems: ['add', 'sub'] };
    expect(evaluationTitle(config)).toBe('Evaluare — Matematică și explorarea mediului');
    const keyTexts = buildWorksheetPages(config, 'full').filter(isKey).flatMap((p) => texts(p).map((t) => t.text));
    expect(keyTexts).not.toContain('Foarte bine (FB)');
  });

  it('a saved evaluation is named so, and the setting is kept only where it means something', () => {
    expect(defaultSheetName(presetConfig(presetById('evaluare-mate')!, 'CP'))).toBe('Evaluare: Compară numerele, Adunări și scăderi, Probleme cu imagini, Bani');
    expect(sanitizeConfig({ category: 'games', selectedItems: ['odd:1'], evaluation: true }).evaluation).toBe(true);
    expect(sanitizeConfig({ category: 'letters', selectedItems: ['A'], evaluation: true }).evaluation).toBeUndefined();
    expect(sanitizeConfig({ category: 'math', evaluation: 'da' }).evaluation).toBeUndefined();
    // an old saved math sheet with its answers keeps them
    expect(sanitizeConfig({ category: 'math', selectedItems: ['add'], mathAnswers: true }).mathAnswers).toBe(true);
    for (const level of ['presc', 'CP', 'I', 'II'] as SchoolLevel[]) for (const tier of ['free', 'full'] as const) {
      const raw = { category: 'games', selectedItems: ['find:A', 'dots:star', 'pos:5'], evaluation: true, mathAnswers: true, curriculumLevel: level };
      expect(buildWorksheetPages(sanitizeConfig(raw), tier).length).toBeGreaterThan(0);
    }
  });

  it('the generator: another category starts as an ordinary sheet; the setting can be turned on and off', () => {
    useWorksheetStore.setState({ config: { ...presetConfig(presetById('evaluare-mate')!, 'I') } });
    expect(useWorksheetStore.getState().config.evaluation).toBe(true);
    useWorksheetStore.getState().toggleEvaluation();
    expect(useWorksheetStore.getState().config.evaluation).toBe(false);
    useWorksheetStore.getState().toggleEvaluation();
    useWorksheetStore.getState().setCategory('games');
    expect(useWorksheetStore.getState().config.evaluation).toBeUndefined();
  });
});
