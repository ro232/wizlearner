import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import { buildWorksheetPages } from '@/lib/worksheet/layout';
import { CARRY_TYPES, NUMBER_MATH_TYPES as MATH_TYPES, borrows, carries, mathCarryOf, mathExercises, mathTitle, type MathCarry, type MathRange } from '@/lib/worksheet/math';
import { lei, moneyExercises, notesFor, type Note } from '@/lib/worksheet/money';
import { sanitizeConfig } from '@/stores/sanitize-config';
import { opsOutside } from './bounds';

const cfg = (over: Partial<WorksheetConfig>): WorksheetConfig => ({ ...DEFAULT_CONFIG, category: 'math', ...over });
const texts = (config: WorksheetConfig, tier: 'free' | 'full' = 'full') =>
  buildWorksheetPages(config, tier).flatMap((p) => p.ops.filter((o) => o.t === 'text').map((o) => (o as { text: string }).text));

/** a op b = r, whichever cell was the box. */
function operation(cells: (string | null)[], answer: string): { a: number; op: string; b: number; r: number } {
  const [a, op, b, , r] = cells.map((c) => (c === null ? answer : c));
  return { a: Number(a), op: op!, b: Number(b), r: Number(r) };
}

function seeded(seed: number) {
  let a = seed;
  return () => {
    a = (a * 16807) % 2147483647;
    return a / 2147483647;
  };
}

describe('0–31, the clasa pregătitoare range', () => {
  it('every number and result stays in 0–31; operations add or take away 1–5 (CP 1.4)', () => {
    for (const carry of [undefined, 'mixed', 'with', 'without'] as const)
      for (const type of MATH_TYPES)
        for (let seed = 1; seed <= 40; seed++)
          for (const e of mathExercises(type, 31, seed, 20, carry)) {
            const nums = e.cells.filter((c): c is string => c !== null && /^\d+$/.test(c)).map(Number);
            for (const n of nums) expect(n, `${type} ${e.cells.join(' ')}`).toBeLessThanOrEqual(31);
            for (const n of e.answer.split(', ').filter((x) => /^\d+$/.test(x)).map(Number)) expect(n).toBeLessThanOrEqual(31);
            if ((CARRY_TYPES as readonly string[]).includes(type)) {
              const { a, op, b, r } = operation(e.cells, e.answer);
              expect(op === '+' ? a + b : a - b, e.cells.join(' ')).toBe(r);
              expect(r).toBeGreaterThanOrEqual(0);
              if (op === '+') expect(Math.min(a, b), e.cells.join(' ')).toBeLessThanOrEqual(5);
              else expect(b >= 1 && b <= 5, e.cells.join(' ')).toBe(true);
            }
          }
  });

  it('the sheet says 0–31; the answers page too; picture sums stay 0–10', () => {
    const t = texts(cfg({ selectedItems: ['add', 'addpic', 'seq'], mathRange: 31, mathAnswers: true }));
    expect(t).toContain('Adunări (0–31)');
    expect(t).toContain('Completează șirul (0–31)');
    expect(t).toContain('Adunări cu imagini (0–10)');
    expect(t.filter((x) => x === 'Adunări (0–31)')).toHaveLength(2);
  });
});

describe('„fără / cu trecere peste ordin”', () => {
  const ranges: MathRange[] = [20, 31, 100];

  it('"without" never carries or borrows, "with" always does (brute force over many seeds)', () => {
    for (const range of ranges)
      for (const carry of ['without', 'with'] as MathCarry[])
        for (const type of CARRY_TYPES)
          for (let seed = 1; seed <= 150; seed++)
            for (const e of mathExercises(type, range, seed, 20, carry)) {
              const { a, op, b, r } = operation(e.cells, e.answer);
              const where = `${type} ${range} ${carry} seed ${seed}: ${e.cells.join(' ')} → ${e.answer}`;
              expect(op === '+' ? a + b : a - b, where).toBe(r);
              expect(r >= 0 && a <= range && b <= range && r <= range, where).toBe(true);
              const crosses = op === '+' ? carries(a, b) : borrows(a, b);
              expect(crosses, where).toBe(carry === 'with');
              // „fără” from 0–20 up works with the ten (14 + 5), not only 3 + 4
              if (carry === 'without') expect(op === '+' ? r : a, where).toBeGreaterThanOrEqual(10);
              // 0–100 „cu trecere” is past 20
              if (carry === 'with' && range === 100) expect(op === '+' ? r : a, where).toBeGreaterThan(20);
            }
  });

  it('"mixed" has both', () => {
    for (const range of ranges) {
      const all = Array.from({ length: 10 }, (_, s) => mathExercises('add', range, s + 1, 20, 'mixed')).flat();
      const n = all.filter((e) => carries(...(e.cells.filter((c) => c && /^\d+$/.test(c)).map(Number) as [number, number]))).length;
      expect(n, String(range)).toBeGreaterThan(all.length * 0.15);
      expect(n, String(range)).toBeLessThan(all.length * 0.85);
    }
  });

  it('unset keeps every existing sheet exactly as it was', () => {
    for (const type of MATH_TYPES)
      for (const seed of [1, 2, 3]) {
        expect(mathExercises(type, 20, seed, 20, 'mixed')).toEqual(mathExercises(type, 20, seed, 20));
        expect(mathExercises(type, 100, seed, 20, 'without')).toEqual(mathExercises(type, 100, seed, 20));
        expect(mathExercises(type, 10, seed, 20, 'with')).toEqual(mathExercises(type, 10, seed, 20));
      }
    expect(mathCarryOf({ mathRange: 100 })).toBe('without');
    expect(mathCarryOf({ mathRange: 20 })).toBe('mixed');
    expect(mathCarryOf({ mathRange: 10, mathCarry: 'with' })).toBe('mixed');
  });

  it('the title says which, for additions and subtractions only', () => {
    expect(mathTitle('add', 100, 'without')).toBe('Adunări (0–100), fără trecere peste ordin');
    expect(mathTitle('sub', 20, 'with')).toBe('Scăderi (0–20), cu trecere peste ordin');
    expect(mathTitle('mix', 31, 'mixed')).toBe('Adunări și scăderi (0–31)');
    expect(mathTitle('cmp', 100, 'with')).toBe('Compară numerele (0–100)');
    const t = texts(cfg({ selectedItems: ['mix', 'seq'], mathRange: 100, mathCarry: 'with', mathAnswers: true }));
    expect(t.filter((x) => x === 'Adunări și scăderi (0–100), cu trecere peste ordin')).toHaveLength(2);
    expect(t).toContain('Completează șirul (0–100)');
  });

  it('is kept by the saved settings, only with a known value', () => {
    expect(sanitizeConfig({ ...cfg({}), mathCarry: 'with', mathRange: 31 }).mathCarry).toBe('with');
    expect(sanitizeConfig({ ...cfg({}), mathRange: 31 }).mathRange).toBe(31);
    expect(sanitizeConfig({ ...cfg({}), mathCarry: 'always' }).mathCarry).toBeUndefined();
  });
});

describe('„Bani”', () => {
  it('writes lei the Romanian way', () => {
    expect([1, 2, 5, 10, 19, 20, 21, 31, 50, 100].map(lei)).toEqual(['1 leu', '2 lei', '5 lei', '10 lei', '19 lei', '20 de lei', '21 de lei', '31 de lei', '50 de lei', '100 de lei']);
  });

  it('uses the notes of the programme: 1, 5, 10 lei up to 31; 50 de lei only in 0–100', () => {
    expect(notesFor(5)).toEqual([5, 1]);
    expect(notesFor(10)).toEqual([10, 5, 1]);
    expect(notesFor(31)).toEqual([10, 5, 1]);
    expect(notesFor(100)).toEqual([50, 10, 5, 1]);
  });

  it('every exercise is right, within the range, over many seeds', () => {
    const sum = (n: Note[]) => n.reduce((a, b) => a + b, 0);
    for (const range of [5, 10, 20, 31, 100])
      for (let seed = 1; seed <= 300; seed++) {
        const ex = moneyExercises(range, seeded(seed));
        expect(ex.map((e) => e.kind)).toEqual(['count', 'count', 'compare', 'compare', 'pay', 'exchange']);
        const kinds = notesFor(range);
        for (const e of ex) {
          const where = `${range} seed ${seed} ${JSON.stringify(e)}`;
          const all = e.kind === 'compare' ? [...e.left, ...e.right] : e.kind === 'exchange' ? e.pairs.flatMap((p) => [...p.give, p.get]) : e.notes;
          for (const n of all) expect(kinds, where).toContain(n);
          if (e.kind === 'count') {
            expect(sum(e.notes), where).toBeLessThanOrEqual(range);
            expect(e.notes.length, where).toBeGreaterThanOrEqual(2);
            expect(e.notes.length, where).toBeLessThanOrEqual(10);
            expect(e.answer).toBe(lei(sum(e.notes)));
          }
          if (e.kind === 'compare') {
            const [a, b] = [sum(e.left), sum(e.right)];
            expect(Math.max(a, b), where).toBeLessThanOrEqual(range);
            expect(Math.max(e.left.length, e.right.length), where).toBeLessThanOrEqual(6);
            expect(e.answer).toBe(a < b ? '<' : a > b ? '>' : '=');
          }
          if (e.kind === 'pay') {
            expect(e.target, where).toBeLessThanOrEqual(range);
            expect(e.notes.length, where).toBeLessThanOrEqual(10);
            // the example answer is made of notes that are on the sheet
            const example = e.answer.replace('de exemplu: ', '').split(' + ').map(Number);
            expect(example.reduce((a, b) => a + b, 0), where).toBe(e.target);
            const left = [...e.notes] as number[];
            for (const n of example) {
              const i = left.indexOf(n);
              expect(i, where).toBeGreaterThanOrEqual(0);
              left.splice(i, 1);
            }
          }
          if (e.kind === 'exchange') {
            expect(e.pairs.length, where).toBeGreaterThanOrEqual(1);
            for (const p of e.pairs) {
              expect(sum(p.give), where).toBe(p.count * p.get);
              expect(sum(p.give), where).toBeLessThanOrEqual(range);
              expect(p.count >= 2 && p.count <= 10, where).toBe(true);
            }
            expect(e.answer).toBe(e.pairs.map((p) => p.count).join('; '));
          }
        }
        // one comparison is equal amounts in different notes
        const cmp = ex.filter((e) => e.kind === 'compare');
        expect(cmp.some((e) => e.answer === '='), `${range} ${seed}`).toBe(true);
      }
  });

  it('draws a page inside the paper, with an answers page', () => {
    for (const r of [5, 10, 20, 31, 100]) {
      const pages = buildWorksheetPages(cfg({ selectedItems: ['money'], mathRange: r, mathAnswers: true }), 'full');
      expect(pages).toHaveLength(2);
      pages.forEach((p, i) => expect(opsOutside(p, { minX: 0, minY: 0, maxX: p.width, maxY: p.height }), `${r} page ${i + 1}`).toEqual([]));
      const t = texts(cfg({ selectedItems: ['money'], mathRange: r, mathAnswers: true }));
      expect(t.filter((x) => x === `Bani (până la ${lei(r)})`)).toHaveLength(2);
      if (r < 100) expect(t, String(r)).not.toContain('50 de lei');
    }
  });

  it('free plan: money up to 10 lei is the free sample; 31, 100 and the carry choice are in the full plan', () => {
    const free = texts(cfg({ selectedItems: ['money'], mathRange: 31 }), 'free');
    expect(free).toContain('Bani (până la 10 lei)');
    const free31 = texts(cfg({ selectedItems: ['add'], mathRange: 31, mathCarry: 'with' }), 'free');
    expect(free31).toContain('Adunări (0–10)');
    expect(free31.some((x) => x.includes('trecere'))).toBe(false);
    expect(texts(cfg({ selectedItems: ['money'], mathRange: 31 }), 'full')).toContain('Bani (până la 31 de lei)');
  });
});
