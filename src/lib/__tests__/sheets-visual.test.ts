import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import { buildWorksheetPages } from '@/lib/worksheet/layout';
import { buildGroupPages } from '@/lib/worksheet/group';
import { buildNameBookPages } from '@/lib/worksheet/name-book';
import { buildBookPages, DEFAULT_BOOK_CONFIG } from '@/lib/book/interior';
import { buildCoverPage } from '@/lib/book/cover';
import { pageToSvg } from '@/lib/glyphs/backends/svg';
import { MATH_TYPES } from '@/lib/worksheet/math';
import { THEMES } from '@/lib/themes';
import type { PageOps } from '@/lib/glyphs/types';

/**
 * Reference fingerprints of every kind of sheet. A change that alters how any sheet looks
 * (on purpose or not) fails here and names the sheet. To look at the difference:
 *   npm run sheets:preview   (draws all of them to ./sheets-preview)
 * If the change is wanted: npx vitest run -u, and commit the new snapshot.
 */
export const SAMPLES: Record<string, () => PageOps[]> = {};
const sheet = (name: string, patch: Partial<WorksheetConfig>) => {
  SAMPLES[name] = () => buildWorksheetPages({ ...DEFAULT_CONFIG, ...patch } as WorksheetConfig, 'full');
};
for (const level of ['beginner', 'intermediate', 'advanced'] as const) {
  sheet(`litere-tipar-${level}`, { difficulty: level, letterMode: 'paired', selectedItems: ['Aa', 'Șș', 'Mm'], customWords: ['toamna'] });
  sheet(`litere-mana-${level}`, { difficulty: level, script: 'cursive', letterMode: 'paired', selectedItems: ['Aa', 'Gg'], customWords: ['Bogdan'] });
}
sheet('cifre', { category: 'numbers', selectedItems: ['0', '3', '7', '12'] });
sheet('forme', { category: 'shapes', selectedItems: ['circle', 'triangle', 'star', 'heart'] });
sheet('grafice', { category: 'prewrite', selectedItems: ['zigzag', 'waves', 'loops', 'castle'] });
sheet('jocuri', { category: 'games', selectedItems: ['find:Ș', 'count:10', 'dots:star'] });
sheet('matematica-10', { category: 'math', selectedItems: [...MATH_TYPES], mathRange: 10, mathAnswers: true });
sheet('matematica-100', { category: 'math', selectedItems: ['add', 'sub', 'seq'], mathRange: 100 });
sheet('caiet-alfabet-mana', { letterMode: 'paired', script: 'cursive', selectedItems: ['Aa', 'Bb', 'Șș'], pagePerItem: true, itemWords: true, fillPage: false });
sheet('optiuni', { letterMode: 'paired', selectedItems: ['Aa'], leftHandedMode: true, orientation: 'landscape', backgroundPattern: 'dictando', guideColor: 'blue', traceDensity: 'dense', customTitle: 'Fișă de lucru pentru grupa mare – săptămâna 12' });
SAMPLES['grupa'] = () => buildGroupPages({ names: ['Ana', 'Ștefan'], themeId: THEMES[0].id, letters: ['M'], letterMode: 'uppercase', difficulty: 'beginner', withFindPages: true }).pages;
SAMPLES['caiet-nume'] = () => buildNameBookPages('Ioana', 'print');
SAMPLES['caiet-kdp'] = () => buildBookPages(DEFAULT_BOOK_CONFIG).filter((_, i) => i % 7 === 0);
SAMPLES['coperta-kdp-mana'] = () => [buildCoverPage({ ...DEFAULT_BOOK_CONFIG, script: 'cursive' }, 60) as PageOps];

const fingerprint = (p: PageOps) => createHash('sha256').update(pageToSvg(p)).digest('hex').slice(0, 16);

describe('how every kind of sheet looks', () => {
  for (const [name, build] of Object.entries(SAMPLES)) {
    it(name, () => {
      expect(build().map(fingerprint)).toMatchSnapshot();
    });
  }
});
