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
