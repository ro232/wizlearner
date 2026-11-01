import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import { buildWorksheetPages } from '@/lib/worksheet/layout';
import { pairedLetters, uppercaseLetters } from '@/lib/glyphs/data';
import { opsOutside } from './bounds';

const book = (patch: Partial<WorksheetConfig>): WorksheetConfig => ({
  ...DEFAULT_CONFIG, category: 'letters', alphabet: 'ro', pagePerItem: true, itemWords: true, fillPage: false, ...patch,
});

describe('ready-made workbooks', () => {
  it('one page per letter, titled with it, the word on the last two rows', () => {
    const letters = uppercaseLetters('ro');
    const pages = buildWorksheetPages(book({ letterMode: 'uppercase', selectedItems: letters }), 'full');
    expect(pages).toHaveLength(letters.length);
    const title = (i: number) => (pages[i].ops.find((o) => o.t === 'text') as { text: string }).text;
    expect(title(0)).toBe('Litera A');
    expect(title(letters.indexOf('Ș'))).toBe('Litera Ș');
    pages.forEach((p, i) => expect(opsOutside(p, { minX: 0, minY: 0, maxX: p.width, maxY: p.height }), `page ${i + 1}`).toEqual([]));
  });

  it('works in handwriting and for the digits, and the free plan gets only the free pages', () => {
    for (const level of [{ letterSize: 'large' as const, rowsPerPage: 5 }, { letterSize: 'small' as const, rowsPerPage: 9 }]) {
      const cur = buildWorksheetPages(book({ letterMode: 'paired', script: 'cursive', selectedItems: pairedLetters('ro'), ...level }), 'full');
      expect(cur).toHaveLength(31);
      cur.forEach((p, i) => expect(opsOutside(p, { minX: 0, minY: 0, maxX: p.width, maxY: p.height }), `cursive page ${i + 1}`).toEqual([]));
    }
    const digits = buildWorksheetPages({ ...book({ category: 'numbers', selectedItems: '0123456789'.split('') }), itemWords: false }, 'full');
    expect(digits).toHaveLength(10);
    const free = buildWorksheetPages(book({ letterMode: 'uppercase', selectedItems: uppercaseLetters('ro') }), 'free');
    expect(free).toHaveLength(7); // A Ă Â B C D E
  });
});
