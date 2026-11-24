import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import { buildWorksheetPages } from '@/lib/worksheet/layout';
import { CARRY_TYPES, MATH_RANGES, NUMBER_MATH_TYPES as MATH_TYPES, borrowsAny, carriesAny, defaultCarry, mathCarryOf, mathExercises, mathTitle, rng, type MathCarry } from '@/lib/worksheet/math';
import { lei, moneyExercises, notesFor, type Note } from '@/lib/worksheet/money';
import { sanitizeConfig } from '@/stores/sanitize-config';
import { sheetCompetences } from '@/lib/curriculum/sheet';
import { CLASS_PAGES, classEvaluations, headlineItems, presetById, presetConfig } from '@/lib/curriculum/presets';
import { findCompetence } from '@/lib/curriculum';
import type { PageOps } from '@/lib/glyphs/types';
import { flattenOps } from '@/lib/glyphs/geometry';
import { opBox, opsOutside } from './bounds';
import { textOverlaps } from './drawn';

/**
 * 0–1000, the range of clasa a II-a („Numerele naturale 0-1000”; „Adunarea și scăderea în
 * concentrul 0 – 1000, fără trecere peste ordin”).
 */

const cfg = (over: Partial<WorksheetConfig>): WorksheetConfig => ({ ...DEFAULT_CONFIG, category: 'math', ...over });
const textsOf = (pages: PageOps[]) => pages.flatMap((p) => flattenOps(p.ops).filter((o) => o.t === 'text').map((o) => (o as { text: string }).text));

/** a op b = r, whichever cell was the box. */
function operation(cells: (string | null)[], answer: string): { a: number; op: string; b: number; r: number } {
  const [a, op, b, , r] = cells.map((c) => (c === null ? answer : c));
  return { a: Number(a), op: op!, b: Number(b), r: Number(r) };
}

describe('carrying with three digits', () => {
  it('looks at every column: units, tens, hundreds', () => {
    expect(carriesAny(324, 152)).toBe(false);
    expect(carriesAny(275, 148)).toBe(true); // units
    expect(carriesAny(361, 452)).toBe(true); // tens
    expect(carriesAny(600, 400)).toBe(true); // hundreds, to 1000
    expect(carriesAny(40, 517)).toBe(false);
    expect(borrowsAny(768, 435)).toBe(false);
    expect(borrowsAny(503, 127)).toBe(true); // units (and tens)
    expect(borrowsAny(615, 132)).toBe(true); // tens only
    expect(borrowsAny(1000, 1)).toBe(true);
    expect(borrowsAny(999, 999)).toBe(false);
  });

  it('"without" never carries or borrows in any column, "with" always does somewhere (many seeds)', () => {
    for (const carry of ['without', 'with'] as MathCarry[])
      for (const type of CARRY_TYPES)
        for (let seed = 1; seed <= 120; seed++)
          for (const e of mathExercises(type, 1000, seed, 20, carry)) {
            const { a, op, b, r } = operation(e.cells, e.answer);
            const where = `${type} ${carry} seed ${seed}: ${e.cells.join(' ')} → ${e.answer}`;
            expect(op === '+' ? a + b : a - b, where).toBe(r);
            expect(r >= 0 && a <= 1000 && b <= 1000 && r <= 1000, where).toBe(true);
            expect(op === '+' ? carriesAny(a, b) : borrowsAny(a, b), where).toBe(carry === 'with');
            // three-digit work, not 0–100 again: the sum, or the number taken from, has hundreds
            expect(op === '+' ? r : a, where).toBeGreaterThan(100);
            // no 0 + 5 or 7 − 0: the second number is at least 10
            expect(b, where).toBeGreaterThanOrEqual(10);
          }
  });

  it('"mixed" has both, unset is "without"', () => {
    const all = Array.from({ length: 10 }, (_, s) => mathExercises('add', 1000, s + 1, 20, 'mixed')).flat();
    const n = all.filter((e) => {
      const { a, b } = operation(e.cells, e.answer);
      return carriesAny(a, b);
    }).length;
    expect(n).toBeGreaterThan(all.length * 0.15);
    expect(n).toBeLessThan(all.length * 0.85);
    expect(defaultCarry(1000)).toBe('without');
    expect(mathCarryOf({ mathRange: 1000 })).toBe('without');
    expect(mathCarryOf({ mathRange: 1000, mathCarry: 'with' })).toBe('with');
    for (const type of MATH_TYPES) expect(mathExercises(type, 1000, 4, 20, 'without')).toEqual(mathExercises(type, 1000, 4, 20));
  });

  it('titles say the range and the carrying', () => {
    expect(mathTitle('add', 1000, 'without')).toBe('Adunări (0–1000), fără trecere peste ordin');
    expect(mathTitle('missing', 1000, 'with')).toBe('Numărul lipsă (0–1000), cu trecere peste ordin');
    expect(mathTitle('seq', 1000)).toBe('Completează șirul (0–1000)');
    // picture sums stay at 10, whatever the range
    expect(mathTitle('addpic', 1000)).toBe('Adunări cu imagini (0–10)');
    expect(mathTitle('money', 1000)).toBe('Bani (până la 1000 de lei)');
  });
});

describe('comparisons, sequences and neighbours in 0–1000', () => {
  it('compare: all three signs, numbers up to 1000', () => {
    const all = Array.from({ length: 10 }, (_, s) => mathExercises('cmp', 1000, s + 1, 16)).flat();
    expect(new Set(all.map((e) => e.answer))).toEqual(new Set(['<', '>', '=']));
    // often the same hundreds: the tens and units decide
    const same = all.filter((e) => Math.floor(Number(e.cells[0]) / 100) === Math.floor(Number(e.cells[2]) / 100) && e.answer !== '=');
    expect(same.length).toBeGreaterThan(all.length * 0.2);
  });

  it('sequences go by 1, 10 or 100, from 100 up, the same for the same seed', () => {
    const steps = new Set<number>();
    for (let seed = 1; seed <= 40; seed++) {
      const set = mathExercises('seq', 1000, seed, 10);
      expect(mathExercises('seq', 1000, seed, 10)).toEqual(set);
      for (const e of set) {
        const answers = e.answer.split(', ');
        let k = 0;
        const values = e.cells.map((c) => Number(c ?? answers[k++]));
        const step = values[1] - values[0];
        expect([1, 10, 100], e.cells.join(' ')).toContain(Math.abs(step));
        steps.add(Math.abs(step));
        values.forEach((v, i) => expect(v, e.cells.join(' ')).toBe(values[0] + i * step));
        expect(Math.min(...values)).toBeGreaterThanOrEqual(100);
        expect(Math.max(...values)).toBeLessThanOrEqual(1000);
      }
    }
    expect(steps).toEqual(new Set([1, 10, 100]));
  });

  it('neighbours of numbers with hundreds', () => {
    for (let seed = 1; seed <= 20; seed++)
      for (const e of mathExercises('nbr', 1000, seed, 16)) {
        const n = Number(e.cells[1]);
        expect(n).toBeGreaterThanOrEqual(100);
        expect(n).toBeLessThanOrEqual(999);
        expect(e.answer).toBe(`${n - 1}, ${n + 1}`);
      }
  });
});

describe('0–1000 pages', () => {
  const ALL = MATH_TYPES.filter((t) => t !== 'problems' && t !== 'money');

  it('every type inside the paper, no text over another, no number in a box', () => {
    for (const carry of ['without', 'with', 'mixed'] as MathCarry[])
      for (const seed of [1, 2, 3, 7]) {
        const pages = buildWorksheetPages(cfg({ selectedItems: [...MATH_TYPES], mathRange: 1000, mathCarry: carry, mathSeed: seed, mathAnswers: true, curriculumLevel: 'II' }), 'full');
        pages.forEach((p, i) => {
          const where = `${carry} ${seed} page ${i + 1}`;
          expect(opsOutside(p, { minX: 0, minY: 0, maxX: p.width, maxY: p.height }), where).toEqual([]);
          expect(textOverlaps(p), where).toEqual([]);
          // the answer boxes of the exercise pages (not money and problems, with their white cards):
          // no printed number reaches into one
          if (i >= ALL.length) return;
          const flat = flattenOps(p.ops);
          const boxes = flat.filter((o) => o.t === 'rect' && o.fill === '#FFFFFF').map((o) => opBox(o)!);
          for (const t of flat) {
            if (t.t !== 'text' || !/^\d+$/.test(t.text) || t.size < 4.5) continue;
            const b = opBox(t)!;
            for (const x of boxes) expect(b.minX < x.maxX - 0.3 && x.minX < b.maxX - 0.3 && b.minY < x.maxY - 0.3 && x.minY < b.maxY - 0.3, `${where} "${t.text}"`).toBe(false);
          }
        });
      }
  });

  it('the boxes have room for three handwritten digits (other ranges keep their square boxes)', () => {
    const widths = (range: number, type: string) =>
      flattenOps(buildWorksheetPages(cfg({ selectedItems: [type], mathRange: range }), 'full')[0].ops)
        .filter((o) => o.t === 'rect' && o.fill === '#FFFFFF')
        .map((o) => (o as { w: number; h: number }).w / (o as { w: number; h: number }).h);
    for (const type of ['add', 'sub', 'missing', 'seq', 'nbr']) {
      expect(Math.min(...widths(1000, type)), type).toBeGreaterThan(1.45);
      expect(Math.max(...widths(100, type)), type).toBeCloseTo(1, 5);
    }
    // the sign of a comparison still goes in a square
    expect(Math.max(...widths(1000, 'cmp'))).toBeCloseTo(1, 5);
  });

  it('free plan: 0–1000 is part of the full plan, the free sheet stays at 10', () => {
    for (const type of ALL) {
      const free = textsOf(buildWorksheetPages(cfg({ selectedItems: [type], mathRange: 1000, mathCarry: 'with' }), 'free'));
      expect(free.some((t) => t.includes('(0–10)')), type).toBe(true);
      expect(free.some((t) => t.includes('1000') || t.includes('trecere')), type).toBe(false);
    }
    expect(textsOf(buildWorksheetPages(cfg({ selectedItems: ['money'], mathRange: 1000 }), 'free'))).toContain('Bani (până la 10 lei)');
  });

  it('saved settings: 1000 is kept, the old ranges unchanged, anything else dropped', () => {
    for (const r of MATH_RANGES) expect(sanitizeConfig(cfg({ mathRange: r })).mathRange).toBe(r);
    expect(MATH_RANGES).toEqual([5, 10, 20, 31, 100, 1000]);
    expect(sanitizeConfig(cfg({ mathRange: 1000, mathCarry: 'with' }))).toMatchObject({ mathRange: 1000, mathCarry: 'with' });
    for (const r of [0, 50, 999, 1001, 10000]) expect(sanitizeConfig({ ...cfg({}), mathRange: r }).mathRange, String(r)).toBeUndefined();
  });
});

describe('money in 0–1000: 100, 200 and 500 de lei too', () => {
  const sum = (n: Note[]) => n.reduce((a, b) => a + b, 0);

  it('uses the notes of clasa a II-a, every exercise right, amounts with hundreds', () => {
    expect(notesFor(1000)).toEqual([500, 200, 100, 50, 10, 5, 1]);
    expect(notesFor(100)).toEqual([50, 10, 5, 1]);
    const seen = new Set<number>();
    for (let seed = 1; seed <= 200; seed++) {
      const ex = moneyExercises(1000, rng(seed));
      expect(ex.map((e) => e.kind)).toEqual(['count', 'count', 'compare', 'compare', 'pay', 'exchange']);
      for (const e of ex) {
        const where = `seed ${seed} ${JSON.stringify(e)}`;
        const all = e.kind === 'compare' ? [...e.left, ...e.right] : e.kind === 'exchange' ? e.pairs.flatMap((p) => [...p.give, p.get]) : e.notes;
        for (const n of all) {
          expect(notesFor(1000), where).toContain(n);
          seen.add(n);
        }
        if (e.kind === 'count') {
          expect(sum(e.notes), where).toBeGreaterThanOrEqual(100);
          expect(sum(e.notes), where).toBeLessThanOrEqual(1000);
          expect(e.notes.length, where).toBeLessThanOrEqual(10);
          expect(e.answer).toBe(lei(sum(e.notes)));
        }
        if (e.kind === 'compare') {
          expect(Math.max(sum(e.left), sum(e.right)), where).toBeLessThanOrEqual(1000);
          expect(e.answer).toBe(sum(e.left) < sum(e.right) ? '<' : sum(e.left) > sum(e.right) ? '>' : '=');
        }
        if (e.kind === 'pay') {
          expect(e.target, where).toBeGreaterThanOrEqual(100);
          expect(e.target, where).toBeLessThanOrEqual(1000);
        }
        if (e.kind === 'exchange')
          for (const p of e.pairs) {
            expect(sum(p.give), where).toBe(p.count * p.get);
            expect(p.give[0], where).toBeGreaterThanOrEqual(100);
            expect(sum(p.give), where).toBeLessThanOrEqual(1000);
          }
      }
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([1, 5, 10, 50, 100, 200, 500]);
  });

  it('draws the page inside the paper, the notes say their value', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const pages = buildWorksheetPages(cfg({ selectedItems: ['money'], mathRange: 1000, mathAnswers: true, mathSeed: seed }), 'full');
      expect(pages).toHaveLength(2);
      pages.forEach((p, i) => {
        expect(opsOutside(p, { minX: 0, minY: 0, maxX: p.width, maxY: p.height }), `${seed} page ${i + 1}`).toEqual([]);
        expect(textOverlaps(p), `${seed} page ${i + 1}`).toEqual([]);
      });
    }
    const t = textsOf(Array.from({ length: 6 }, (_, s) => buildWorksheetPages(cfg({ selectedItems: ['money'], mathRange: 1000, mathSeed: s + 1 }), 'full')).flat());
    expect(t).toContain('Bani (până la 1000 de lei)');
    for (const note of ['100 de lei', '200 de lei', '500 de lei']) expect(t, note).toContain(note);
  });
});

describe('clasa a II-a: the sheets open on 0–1000 and print the codes of the programme', () => {
  const II = CLASS_PAGES.find((c) => c.level === 'II')!;
  const codes = (config: WorksheetConfig) => sheetCompetences(config, 'II').map((r) => r.code);

  it('each math preset at 0–1000 with its code, verbatim from the programme', () => {
    const text = (code: string) => findCompetence({ programme: 'mem-p-ii', level: 'II', code })!.text;
    const at = (id: string) => presetConfig(presetById(id)!, 'II');
    for (const id of ['mate-compara', 'mate-adunari', 'mate-scaderi', 'mate-lipsa', 'mate-sir', 'mate-vecini', 'mate-bani', 'mate-probleme']) expect(at(id).mathRange, id).toBe(1000);
    expect(codes(at('mate-compara'))).toEqual(['1.2']);
    expect(text('1.2')).toBe('Compararea numerelor în concentrul 0-1000');
    expect(codes(at('mate-sir'))).toEqual(['1.3']);
    expect(codes(at('mate-vecini'))).toEqual(['1.3']);
    expect(text('1.3')).toBe('Ordonarea numerelor în concentrul 0-1000, folosind poziționarea pe axa numerelor, estimări, aproximări');
    for (const id of ['mate-adunari', 'mate-scaderi', 'mate-lipsa']) expect(codes(at(id)), id).toEqual(['1.4']);
    expect(text('1.4')).toBe('Efectuarea de adunări și scăderi, mental și în scris, în concentrul 0-1000, recurgând la numărare și/sau grupare ori de câte ori este necesar');
    expect(codes(at('mate-probleme'))).toEqual(['5.2']);
    expect(text('5.2')).toMatch(/^Rezolvarea de probleme de tipul a±b=x; a±b±c=x în concentrul 0-1000;/);
    expect(codes(at('mate-bani'))).toEqual(['6.3']);
    expect(text('6.3')).toMatch(/prin utilizarea banilor în probleme-joc simple de tip venituri-cheltuieli, cu numere din concentrul 0-1000$/);
    // picture sums stay at 10: not clasa a II-a
    expect(codes(at('mate-imagini'))).toEqual([]);
  });

  it('0–1000 operations „cu trecere peste ordin” get no II code (the programme has them „fără”)', () => {
    for (const type of ['add', 'sub', 'mix', 'missing']) {
      expect(codes(cfg({ selectedItems: [type], mathRange: 1000 })), type).toEqual(['1.4']);
      expect(codes(cfg({ selectedItems: [type], mathRange: 1000, mathCarry: 'without' })), type).toEqual(['1.4']);
      expect(codes(cfg({ selectedItems: [type], mathRange: 1000, mathCarry: 'with' })), type).toEqual([]);
      expect(codes(cfg({ selectedItems: [type], mathRange: 1000, mathCarry: 'mixed' })), type).toEqual([]);
      // 0–100 is unchanged
      expect(codes(cfg({ selectedItems: [type], mathRange: 100, mathCarry: 'with' })), type).toEqual(['1.4']);
    }
    // comparing, ordering and problems do not depend on it
    expect(codes(cfg({ selectedItems: ['cmp', 'seq', 'problems'], mathRange: 1000, mathCarry: 'with' }))).toEqual(['1.2', '1.3', '5.2']);
    // 0–1000 is beyond clasa I
    expect(sheetCompetences(cfg({ selectedItems: ['add'], mathRange: 1000 }), 'I')).toEqual([]);
  });

  it('the class page: 10 of 33 competences have sheets; the evaluation prints 1.2, 1.4, 1.5, 5.2, 6.2', () => {
    // the headline counts CLR and MEM; Arte vizuale, Dezvoltare personală and limba modernă are counted apart (presets.ts)
    const items = headlineItems(II);
    expect(items).toHaveLength(33);
    // 1.5 the tables, 6.1 lengths and masses, 6.2 the clock and the calendar, 6.4 units (math-topics.test.ts)
    // 5.1 the table of the „Medii de viață” (explore.test.ts)
    expect(items.filter((i) => i.presets.length && i.programme === 'mem-p-ii').map((i) => i.code)).toEqual(['1.2', '1.3', '1.4', '1.5', '5.1', '5.2', '6.1', '6.2', '6.3', '6.4']);
    expect(classEvaluations(II).filter((e) => e.preset.id === 'evaluare-mate').map((e) => [e.preset.id, e.codes])).toEqual([['evaluare-mate', ['1.2', '1.4', '1.5', '5.2', '6.2']]]);
    const pages = buildWorksheetPages(presetConfig(presetById('evaluare-mate')!, 'II'), 'full');
    const t = textsOf(pages);
    // the numbers of the evaluation reach the hundreds
    expect(t.some((x) => /^\d{3}$/.test(x))).toBe(true);
    expect(t.join(' ')).toContain('Competențele specifice 1.2, 1.4');
  });
});
