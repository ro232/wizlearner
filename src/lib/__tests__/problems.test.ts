import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import { buildWorksheetPages } from '@/lib/worksheet/layout';
import { MATH_TYPES, mathExercises, mathTitle } from '@/lib/worksheet/math';
import { NOUNS, PROBLEM_SCENES, cate, counted, drawsObjects, maiMulte, problemsPageOps, wordProblems, type WordProblem } from '@/lib/worksheet/problems';
import { needsDe } from '@/components/worksheet/plural';
import { hasIcon } from '@/lib/hints/icons';
import { sheetCompetenceLabel, sheetCompetences, type SchoolLevel } from '@/lib/curriculum/sheet';
import { CLASS_PAGES, classCoverage, presetById, presetConfig } from '@/lib/curriculum/presets';
import { itemFitsCategory, sanitizeConfig } from '@/stores/sanitize-config';
import { opsOutside } from './bounds';

const cfg = (over: Partial<WorksheetConfig>): WorksheetConfig => ({ ...DEFAULT_CONFIG, category: 'math', selectedItems: ['problems'], ...over });
const texts = (config: WorksheetConfig, tier: 'free' | 'full' = 'full') =>
  buildWorksheetPages(config, tier).flatMap((p) => p.ops.filter((o) => o.t === 'text').map((o) => (o as { text: string }).text));

function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a * 16807) % 2147483647;
    return a / 2147483647;
  };
}

const RANGES = [5, 10, 20, 31, 100, 1000];
const ALL_NOUNS = Object.values(NOUNS);
const many = (range: number, seeds = 120): [number, WordProblem[]][] =>
  Array.from({ length: seeds }, (_, i) => [i + 1, wordProblems(range, seeded(i + 1))] as [number, WordProblem[]]);

describe('Romanian words of the problems', () => {
  it('nouns agree with the number: 1 măr, 2 mere, 20 de mere, 101 mere', () => {
    const { mar, para, peste } = NOUNS;
    expect([1, 2, 3, 19, 20, 21, 31, 99, 100, 101, 110, 120, 506, 1000].map((n) => counted(n, mar))).toEqual([
      '1 măr', '2 mere', '3 mere', '19 mere', '20 de mere', '21 de mere', '31 de mere', '99 de mere', '100 de mere', '101 mere', '110 mere', '120 de mere', '506 mere', '1000 de mere',
    ]);
    expect([1, 2, 20].map((n) => counted(n, para))).toEqual(['1 pară', '2 pere', '20 de pere']);
    expect([1, 2, 25].map((n) => counted(n, peste))).toEqual(['1 pește', '2 pești', '25 de pești']);
  });

  it('„câți / câte”, „mai mulți / mai multe” follow the gender (neuter plural like feminine)', () => {
    const { mar, para, peste } = NOUNS;
    expect([cate(peste), cate(para), cate(mar)]).toEqual(['Câți', 'Câte', 'Câte']);
    expect([maiMulte(peste, true), maiMulte(peste, false), maiMulte(mar, true), maiMulte(para, false)]).toEqual(['mai mulți', 'mai puțini', 'mai multe', 'mai puține']);
  });

  it('every object has its picture; every text has ș ț with the comma below, never the cedilla', () => {
    for (const n of ALL_NOUNS) expect(hasIcon(n.emoji), n.one).toBe(true);
    const all = RANGES.flatMap((r) => many(r, 40).flatMap(([, ps]) => ps.map((p) => p.text)));
    for (const t of all) expect(t, t).not.toMatch(/[şţŞŢ]/);
    for (const scenes of Object.values(PROBLEM_SCENES)) for (const s of scenes) for (const n of s.nouns) expect(ALL_NOUNS).toContain(n);
  });

  it('every number in a text agrees with its noun, and no sentence starts with a digit', () => {
    for (const range of RANGES)
      for (const [seed, ps] of many(range))
        for (const p of ps) {
          const where = `${range}/${seed}: ${p.text}`;
          const { one, many: pl } = p.noun;
          for (const m of p.text.matchAll(new RegExp(`(\\d+) (de )?(${one}|${pl})(?![\\p{L}])`, 'gu'))) {
            const n = Number(m[1]);
            expect(m[3], where).toBe(n === 1 ? one : pl);
            expect(Boolean(m[2]), where).toBe(needsDe(n));
          }
          expect(p.text, where).not.toMatch(/(^|[.?!] )\d/);
          expect(p.text.endsWith('?'), where).toBe(true);
          // the numbers of the problem are in the text, with their noun
          for (const g of p.given) expect(p.text, where).toContain(p.kind === 'more' || p.kind === 'less' ? String(g.n) : counted(g.n, p.noun));
        }
  });
});

describe('the problems', () => {
  it('are correct, inside the range, never negative; up to 0–31 the second number is 1–5', () => {
    for (const range of RANGES)
      for (const [seed, ps] of many(range)) {
        expect(ps).toHaveLength(range <= 5 ? 4 : 5);
        for (const p of ps) {
          const where = `${range}/${seed}: ${p.text}`;
          let value = p.steps[0].a;
          expect(value, where).toBe(p.given[0].n);
          p.steps.forEach((s, i) => {
            expect(s.a, where).toBe(value);
            expect(s.b, where).toBe(p.given[i + 1].n);
            expect(s.r, where).toBe(s.op === '+' ? s.a + s.b : s.a - s.b);
            expect(p.given[i + 1].taken ?? false, where).toBe(p.kind === 'sub' || (p.kind === 'two' && s.op === '−'));
            for (const n of [s.a, s.b, s.r]) {
              expect(n, where).toBeGreaterThanOrEqual(1);
              expect(n, where).toBeLessThanOrEqual(range);
            }
            value = s.r;
          });
          expect(p.result, where).toBe(value);
          expect(p.answer, where).toBe(`${p.steps.map((s) => `${s.a} ${s.op} ${s.b} = ${s.r}`).join('; ')} (${counted(p.result, p.noun)})`);
          if (range <= 31) expect(p.steps[0].b >= 1 && p.steps[0].b <= 5, where).toBe(true);
          if (p.kind === 'more' || p.kind === 'less') expect(p.steps[0].b, where).toBeGreaterThanOrEqual(2);
          if (p.kind === 'two') expect(p.steps[1].b, where).not.toBe(p.steps[0].b);
        }
      }
  });

  it('kinds per range: no comparison up to 5, one at 10, two from 20; two operations only from 100, last', () => {
    for (const range of RANGES)
      for (const [, ps] of many(range, 30)) {
        const kinds = ps.map((p) => p.kind);
        const cmp = kinds.filter((k) => k === 'more' || k === 'less').length;
        expect(cmp).toBe(range <= 5 ? 0 : range <= 10 ? 1 : 2);
        expect(kinds.includes('two')).toBe(range >= 100);
        if (range >= 100) expect(kinds[4]).toBe('two');
        expect(new Set(ps.map((p) => p.text)).size).toBe(ps.length);
      }
  });

  it('draws the objects only when at most 10 are in a row', () => {
    for (const range of RANGES)
      for (const [, ps] of many(range, 30))
        for (const p of ps) {
          const row = p.kind === 'add' || p.kind === 'more' ? p.given[0].n + p.given[1].n : p.given[0].n;
          expect(drawsObjects(p)).toBe(p.kind !== 'two' && row <= 10);
          if (range <= 10) expect(drawsObjects(p), p.text).toBe(true);
        }
  });

  it('is the same for the same seed, and new with „Alte exerciții”', () => {
    expect(wordProblems(31, seeded(7))).toEqual(wordProblems(31, seeded(7)));
    expect(wordProblems(31, seeded(8))).not.toEqual(wordProblems(31, seeded(7)));
    const c = cfg({ mathRange: 100, mathSeed: 3 });
    expect(JSON.stringify(buildWorksheetPages(c, 'full'))).toBe(JSON.stringify(buildWorksheetPages(c, 'full')));
    expect(JSON.stringify(buildWorksheetPages({ ...c, mathSeed: 4 }, 'full'))).not.toBe(JSON.stringify(buildWorksheetPages(c, 'full')));
    // the other exercises are untouched by it
    expect(mathExercises('problems', 10, 1, 20)).toEqual([]);
  });
});

describe('the page', () => {
  it('stays inside the paper, clear of the reward box, for every range and many sets (0–1000 drawn on its own)', () => {
    for (const range of [5, 10, 20, 31, 100])
      for (let seed = 1; seed <= 25; seed++) {
        const pages = buildWorksheetPages(cfg({ mathRange: range, mathSeed: seed, mathAnswers: true, curriculumLevel: 'CP' }), 'full');
        expect(pages).toHaveLength(2);
        pages.forEach((p, i) => expect(opsOutside(p, { minX: 0, minY: 0, maxX: p.width, maxY: p.height }), `${range}/${seed} page ${i + 1}`).toEqual([]));
        const blocks = pages[0].ops.filter((o) => o.t === 'rect' && o.fill === '#FBF7EE') as { y: number; h: number }[];
        expect(blocks).toHaveLength(range <= 5 ? 4 : 5);
        for (const b of blocks) expect(b.y + b.h, `${range}/${seed}`).toBeLessThanOrEqual(297 - 12 - 24);
      }
    for (let seed = 1; seed <= 25; seed++) {
      const ops = problemsPageOps(wordProblems(1000, seeded(seed)), 1000, 12, 198, 46, 261);
      expect(opsOutside({ width: 210, height: 297, ops }, { minX: 12, minY: 46, maxX: 198, maxY: 261 }), String(seed)).toEqual([]);
    }
  });

  it('has its title, the answer area and an answers page', () => {
    expect(mathTitle('problems', 31)).toBe('Probleme cu imagini (0–31)');
    const t = texts(cfg({ mathRange: 20, mathAnswers: true }));
    expect(t.filter((x) => x === 'Probleme cu imagini (0–20)')).toHaveLength(2);
    expect(t.filter((x) => x === 'Răspuns:')).toHaveLength(5);
    expect(t.filter((x) => x === 'Rezolvare:')).toHaveLength(5);
    // grădiniță (0–5): the sign is printed, nothing to write in words
    const presc = texts(cfg({ mathRange: 5 }));
    expect(presc).not.toContain('Răspuns:');
    expect(presc.some((x) => x === '+' || x === '−')).toBe(true);
  });

  it('free plan: the 0–10 problems; above that in the full plan', () => {
    expect(texts(cfg({ mathRange: 100 }), 'free')).toContain('Probleme cu imagini (0–10)');
    expect(texts(cfg({ mathRange: 100 }), 'full')).toContain('Probleme cu imagini (0–100)');
  });

  it('is a math item the saved settings keep', () => {
    expect(MATH_TYPES).toContain('problems');
    expect(itemFitsCategory('problems', 'math')).toBe(true);
    expect(itemFitsCategory('problems', 'games')).toBe(false);
    expect(sanitizeConfig(cfg({ selectedItems: ['problems', 'add'], mathRange: 31 })).selectedItems).toEqual(['problems', 'add']);
  });
});

describe('programme code of the problems', () => {
  const at = (range: number, level: SchoolLevel) => sheetCompetences(cfg({ mathRange: range }), level).map((r) => `${r.level} ${r.code}`);

  it('CP 5.2 up to 0–31 (1–5 units), I 5.2, II 5.2; none in preschool', () => {
    expect(at(5, 'CP')).toEqual(['CP 5.2']);
    expect(at(10, 'CP')).toEqual(['CP 5.2']);
    expect(at(31, 'CP')).toEqual(['CP 5.2']);
    // 0–20 and 0–100 add more than 1–5: not CP 5.2
    expect(at(20, 'CP')).toEqual([]);
    expect(at(100, 'CP')).toEqual([]);
    for (const r of [10, 20, 31, 100]) expect(at(r, 'I')).toEqual(['I 5.2']);
    for (const r of [10, 100]) expect(at(r, 'II')).toEqual(['II 5.2']);
    for (const r of [5, 10]) expect(at(r, 'presc')).toEqual([]);
    expect(sheetCompetenceLabel(cfg({ mathRange: 100 }), 'II')).toBe('Competența specifică 5.2 · Matematică și explorarea mediului, clasa a II-a');
    expect(sheetCompetenceLabel(cfg({ selectedItems: ['add', 'problems'], mathRange: 31 }), 'CP')).toBe('Competențele specifice 1.4, 5.2 · Matematică și explorarea mediului, clasa pregătitoare');
  });

  it('the „Probleme cu imagini” sheet is listed under 5.2 for CP, I, II', () => {
    const p = presetById('mate-probleme')!;
    expect(p.title).toBe('Probleme cu imagini');
    for (const slug of ['clasa-pregatitoare', 'clasa-1', 'clasa-2']) {
      const page = CLASS_PAGES.find((c) => c.slug === slug)!;
      const item = classCoverage(page).find((g) => g.title === 'Matematică și explorarea mediului')!.items.find((i) => i.code === '5.2')!;
      expect(item.presets.map((x) => x.id), slug).toContain('mate-probleme');
    }
    const presc = classCoverage(CLASS_PAGES[0]).flatMap((g) => g.items.flatMap((i) => i.presets.map((x) => x.id)));
    expect(presc).not.toContain('mate-probleme');
    expect(presetConfig(p, 'CP').mathRange).toBe(10);
  });
});
