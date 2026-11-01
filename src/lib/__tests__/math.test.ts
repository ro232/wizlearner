import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG } from '@/types';
import { buildWorksheetPages, hasContent } from '@/lib/worksheet/layout';
import { MATH_RANGES, MATH_TYPES, mathExercises } from '@/lib/worksheet/math';
import { opsOutside } from './bounds';

const calc = (cells: (string | null)[], fill: string) => {
  const c = cells.map((x) => (x === null ? fill : x));
  return c;
};

describe('math sheets', () => {
  it('every exercise is correct, inside its range, and never negative', () => {
    for (const range of MATH_RANGES)
      for (const type of MATH_TYPES)
        for (const seed of [1, 2, 3]) {
          for (const e of mathExercises(type, range, seed, 20)) {
            const nums = e.cells.filter((c): c is string => c !== null && /^\d+$/.test(c)).map(Number);
            for (const n of nums) expect(n, `${type} ${range}`).toBeLessThanOrEqual(range);
            for (const n of nums) expect(n).toBeGreaterThanOrEqual(0);
            if (['add', 'sub', 'mix', 'addpic', 'missing'].includes(type)) {
              const answers = e.answer.split(', ');
              const filled = calc(e.cells, answers[0]);
              const [a, op, b, , r] = filled;
              const res = op === '+' ? Number(a) + Number(b) : Number(a) - Number(b);
              expect(res, `${type} ${range} ${e.cells.join(' ')} = ${e.answer}`).toBe(Number(r));
              if (range === 100 && op === '+' && type !== 'addpic') expect((Number(a) % 10) + (Number(b) % 10)).toBeLessThan(10);
              if (range === 100 && op !== '+') expect(Number(a) % 10).toBeGreaterThanOrEqual(Number(b) % 10);
            }
            if (type === 'cmp') {
              const [a, , b] = e.cells.map(Number);
              expect(e.answer).toBe(a < b ? '<' : a > b ? '>' : '=');
            }
          }
        }
  });

  it('builds one page per type plus answers, inside the page, and a new set on demand', () => {
    const config = { ...DEFAULT_CONFIG, category: 'math' as const, selectedItems: [...MATH_TYPES], mathRange: 20, mathAnswers: true };
    expect(hasContent(config, 'full')).toBe(true);
    const pages = buildWorksheetPages(config, 'full');
    expect(pages.length).toBeGreaterThanOrEqual(MATH_TYPES.length + 1);
    pages.forEach((p, i) => expect(opsOutside(p, { minX: 0, minY: 0, maxX: p.width, maxY: p.height }), `page ${i + 1}`).toEqual([]));
    const again = buildWorksheetPages({ ...config, mathSeed: 2 }, 'full');
    expect(JSON.stringify(again[1])).not.toBe(JSON.stringify(pages[1]));
    expect(JSON.stringify(buildWorksheetPages(config, 'full')[1])).toBe(JSON.stringify(pages[1]));
  });

  it('the free plan stops at 10', () => {
    const page = buildWorksheetPages({ ...DEFAULT_CONFIG, category: 'math', selectedItems: ['add'], mathRange: 100 }, 'free')[0];
    const title = page.ops.find((o) => o.t === 'text') as { text: string };
    expect(title.text).toContain('0–10');
  });
});
