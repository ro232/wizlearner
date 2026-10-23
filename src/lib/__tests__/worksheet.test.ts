import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import { buildWorksheetPages, rowItems } from '@/lib/worksheet/layout';
import { uppercaseLetters, lowercaseLetters, pairedLetters } from '@/lib/glyphs/data';
import { NUMBERS, SHAPES } from '@/lib/constants';
import { PATTERN_IDS } from '@/lib/glyphs/patterns';
import { opsOutside } from './bounds';

const cases: [string, Partial<WorksheetConfig>][] = [
  ['RO uppercase', { selectedItems: uppercaseLetters('ro') }],
  ['RO lowercase', { letterMode: 'lowercase', selectedItems: lowercaseLetters('ro') }],
  ['RO paired, large', { letterMode: 'paired', selectedItems: pairedLetters('ro'), letterSize: 'large' }],
  ['numbers', { category: 'numbers', selectedItems: NUMBERS }],
  ['shapes', { category: 'shapes', selectedItems: SHAPES }],
  ['patterns', { category: 'prewrite', selectedItems: [...PATTERN_IDS] }],
  ['left-handed dotted', { selectedItems: ['B', 'Ș'], leftHandedMode: true, fontStyle: 'dotted' }],
  ['long name', { selectedItems: ['A'], childName: 'Maria-Magdalena Ștefănescu-Popovici', schoolName: 'Grădinița nr. 123' }],
];

describe('worksheet pages', () => {
  for (const [name, patch] of cases) {
    it(`stay on the paper: ${name}`, () => {
      const pages = buildWorksheetPages({ ...DEFAULT_CONFIG, ...patch }, 'full');
      for (const page of pages) {
        expect(opsOutside(page, { minX: 5, minY: 5, maxX: page.width - 5, maxY: page.height - 5 })).toEqual([]);
      }
    });
  }

  it('drop locked items on the free tier, keep them on paid tiers', () => {
    const config = { ...DEFAULT_CONFIG, selectedItems: ['A', 'Ă', 'M', 'Z'] };
    expect(rowItems(config, 'free').map((r) => r.item)).toEqual(['A', 'Ă']);
    expect(rowItems(config, 'starter').map((r) => r.item)).toEqual(['A', 'Ă', 'M', 'Z']);
  });
});

describe('words and names', () => {
  it('writes a name in the chosen case', async () => {
    const { wordInCase } = await import('@/lib/worksheet/layout');
    expect(wordInCase('ştefan', 'uppercase')).toBe('ȘTEFAN');
    expect(wordInCase('ANA-MARIA popescu', 'paired')).toBe('Ana-Maria Popescu');
    expect(wordInCase('Țara', 'lowercase')).toBe('țara');
    expect(wordInCase('OM DE ZĂPADĂ', 'paired', 'theme')).toBe('Om de zăpadă');
    expect(wordInCase('toamna', 'paired', 'typed')).toBe('Toamna');
  });

  it('traces a whole name as one row, keeping spaces and hyphens', () => {
    const config = { ...DEFAULT_CONFIG, childName: 'ana-maria ionescu', customWords: ['ana-maria ionescu'], letterMode: 'paired' as const, fillPage: false };
    const rows = rowItems(config, 'full');
    expect(rows).toHaveLength(1);
    expect(rows[0].word).toBe(true);
    expect(rows[0].item).toBe('Ana-Maria Ionescu');
    expect(rows[0].glyphs.map((g) => g.key).join('')).toBe('Ana-Maria Ionescu');
  });

  it('keeps a name with locked letters off the free tier', () => {
    const config = { ...DEFAULT_CONFIG, customWords: ['ADA', 'MARIA'] };
    expect(rowItems(config, 'free').map((r) => r.item)).toEqual(['ADA']);
  });

  it('fills a short single page with repetitions, but never adds a page', () => {
    const base = { ...DEFAULT_CONFIG, selectedItems: ['A', 'B'], rowsPerPage: 6 };
    const full = buildWorksheetPages({ ...base, fillPage: true }, 'full');
    const bare = buildWorksheetPages({ ...base, fillPage: false }, 'full');
    expect(full).toHaveLength(1);
    expect(full[0].ops.length).toBeGreaterThan(bare[0].ops.length * 2);
  });
});

describe('the child name', () => {
  it('is free to trace on every tier, other words are not', () => {
    const config = { ...DEFAULT_CONFIG, childName: 'Ștefan', customWords: ['Ștefan', 'MAMA'] };
    expect(rowItems(config, 'free').map((r) => r.item)).toEqual(['ȘTEFAN']);
  });
});
