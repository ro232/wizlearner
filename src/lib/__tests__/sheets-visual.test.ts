import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import { buildWorksheetPages } from '@/lib/worksheet/layout';
import { buildGroupPages } from '@/lib/worksheet/group';
import { buildNameBookPages } from '@/lib/worksheet/name-book';
import { buildBookPages, DEFAULT_BOOK_CONFIG } from '@/lib/book/interior';
import { buildCoverPage } from '@/lib/book/cover';
import { pageToSvg } from '@/lib/glyphs/backends/svg';
import { NUMBER_MATH_TYPES as MATH_TYPES } from '@/lib/worksheet/math';
import { THEMES } from '@/lib/themes';
import { SHEET_PRESETS, presetConfig } from '@/lib/curriculum/presets';
import type { PageOps } from '@/lib/glyphs/types';
import { PRINTABLE_SAMPLES } from './printables-samples';

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
sheet('sunete-silabe', { category: 'games', selectedItems: ['sound:A', 'first:1', 'syl:1', 'split:1'], curriculumLevel: 'CP' });
sheet('sortare', { category: 'games', selectedItems: ['sort:1', 'sort:3', 'sort:4', 'sort:5', 'odd:1', 'odd:4', 'group:1', 'group:4'], curriculumLevel: 'presc' });
sheet('orientare', { category: 'games', selectedItems: ['pos:1', 'pos:3', 'pos:5'], curriculumLevel: 'CP' });
// „Citire și scriere”: the sets of each class, the answers, the handwriting model
sheet('citire-cp', { category: 'games', selectedItems: ['read:match:1', 'read:gap:1', 'read:draw:1', 'read:copy:1'], curriculumLevel: 'CP' });
sheet('citire-1', { category: 'games', selectedItems: ['read:match:4', 'read:gap:3', 'read:draw:4', 'read:fill:1', 'read:order:1', 'read:copy:3', 'read:text:1'], curriculumLevel: 'I', mathAnswers: true });
sheet('citire-2', { category: 'games', selectedItems: ['read:gap:5', 'read:fill:4', 'read:order:4', 'read:copy:5', 'read:text:4'], curriculumLevel: 'II', mathAnswers: true });
sheet('citire-mana', { category: 'games', selectedItems: ['read:copy:4', 'read:copy:6'], script: 'cursive', letterMode: 'paired' });
// fun preschool sheets and „Explorarea mediului”, with their answers (drawn mazes and scenes)
sheet('fun-coloreaza', { category: 'games', selectedItems: ['color:1', 'color:6', 'colsum:4'], curriculumLevel: 'presc', mathAnswers: true });
sheet('fun-labirint-diferente', { category: 'games', selectedItems: ['maze:1', 'maze:6', 'diff:2', 'diff:6'], mathAnswers: true });
sheet('fun-linii-umbre', { category: 'games', selectedItems: ['trace:3', 'trace:6', 'shadow:1', 'shadow:6'], curriculumLevel: 'presc' });
sheet('explorare-presc', { category: 'games', selectedItems: ['plant:1', 'body:1', 'home:1', 'move:1', 'baby:1', 'season:1', 'season:5', 'weather:1', 'wear:1'], curriculumLevel: 'presc', mathAnswers: true });
sheet('explorare-scoala', { category: 'games', selectedItems: ['senses:1', 'habitat:1', 'water:1', 'melt:1'], curriculumLevel: 'I', mathAnswers: true });
// Arte vizuale și abilități practice, Dezvoltare personală, limba engleză (subjects-pages.ts), with their answers
sheet('arte-vizuale', { category: 'games', selectedItems: ['sym:1', 'sym:3', 'model:3', 'cut:1', 'cut:2', 'lines:1', 'lines:2'], curriculumLevel: 'CP', mathAnswers: true });
sheet('dezvoltare-personala', { category: 'games', selectedItems: ['feel:1', 'feel:2', 'me:1', 'hyg:1', 'habit:1', 'job:1', 'jobuse:1', 'rules:1'], curriculumLevel: 'I', childName: 'Ioana', mathAnswers: true });
sheet('limba-engleza', { category: 'games', selectedItems: ['en:1', 'en:2', 'en:3'], curriculumLevel: 'II', mathAnswers: true });
// the sheets that fill the gaps of the programme (clr-pages.ts, mem-pages.ts), with their answers
sheet('comunicare-cp', { category: 'games', selectedItems: ['story:1', 'story:2', 'sign:1', 'note:1', 'note:2'], curriculumLevel: 'CP', mathAnswers: true });
sheet('comunicare-2', { category: 'games', selectedItems: ['sign:2', 'sign:3', 'msg:1', 'msg:2', 'msg:3'], curriculumLevel: 'II', mathAnswers: true });
sheet('comunicare-presc', { category: 'games', selectedItems: ['written:1', 'written:2'], curriculumLevel: 'presc', mathAnswers: true });
sheet('mate-termeni', { category: 'games', selectedItems: ['terms:1', 'terms:3', 'terms:5'], curriculumLevel: 'I', mathAnswers: true });
sheet('mate-numere-figuri-2', { category: 'games', selectedItems: ['place:1', 'coord:1', 'sides:1', 'solid:1'], curriculumLevel: 'II', mathAnswers: true });
sheet('mate-regularitati-sortare', { category: 'games', selectedItems: ['regular:1', 'regular:3', 'regular:4', 'sort2:1', 'sort2:2'], curriculumLevel: 'II', mathAnswers: true });
sheet('mate-experimente', { category: 'games', selectedItems: ['plan:1', 'plan:2', 'cause:1', 'cause:2'], curriculumLevel: 'II', mathAnswers: true });
sheet('mate-presc', { category: 'games', selectedItems: ['around:1', 'pict:1', 'pict:2', 'more:1'], curriculumLevel: 'presc', mathAnswers: true });
sheet('matematica-10', { category: 'math', selectedItems: MATH_TYPES.filter((t) => t !== 'money' && t !== 'problems'), mathRange: 10, mathAnswers: true });
sheet('matematica-100', { category: 'math', selectedItems: ['add', 'sub', 'seq'], mathRange: 100 });
sheet('matematica-31', { category: 'math', selectedItems: MATH_TYPES.filter((t) => t !== 'problems'), mathRange: 31, mathAnswers: true });
sheet('matematica-20-cu-trecere', { category: 'math', selectedItems: ['add', 'sub', 'mix', 'missing'], mathRange: 20, mathCarry: 'with', mathAnswers: true });
sheet('matematica-31-fara-trecere', { category: 'math', selectedItems: ['add', 'sub'], mathRange: 31, mathCarry: 'without' });
sheet('matematica-100-cu-trecere', { category: 'math', selectedItems: ['add', 'sub', 'mix', 'missing'], mathRange: 100, mathCarry: 'with', mathAnswers: true });
sheet('matematica-100-amestecat', { category: 'math', selectedItems: ['mix'], mathRange: 100, mathCarry: 'mixed' });
// 0–1000, clasa a II-a
sheet('matematica-1000', { category: 'math', selectedItems: ['cmp', 'add', 'sub', 'missing', 'seq', 'nbr'], mathRange: 1000, mathAnswers: true, curriculumLevel: 'II' });
sheet('matematica-1000-cu-trecere', { category: 'math', selectedItems: ['add', 'sub', 'mix', 'missing'], mathRange: 1000, mathCarry: 'with', mathAnswers: true });
for (const r of [5, 10, 20, 31, 100, 1000]) sheet(`bani-${r}`, { category: 'math', selectedItems: ['money'], mathRange: r, mathAnswers: true });
for (const r of [5, 10, 20, 31, 100, 1000]) sheet(`probleme-${r}`, { category: 'math', selectedItems: ['problems'], mathRange: r, mathAnswers: r === 10 || r === 100, curriculumLevel: r === 1000 ? 'II' : r === 20 || r === 100 ? 'I' : r === 5 ? 'presc' : 'CP' });
// the other topics: equal groups, the tables, the clock, the calendar, measuring, halves and quarters, shapes
sheet('matematica-grupe-10', { category: 'math', selectedItems: ['groups'], mathRange: 10, mathAnswers: true, curriculumLevel: 'CP' });
sheet('matematica-inmultire', { category: 'math', selectedItems: ['groups', 'mul', 'div', 'mulmiss'], mathRange: 1000, mathAnswers: true, curriculumLevel: 'II' });
sheet('matematica-tabla-7', { category: 'math', selectedItems: ['mul', 'div', 'mulmiss'], mathRange: 1000, mathTable: 7 });
sheet('matematica-ceas-clasa-1', { category: 'math', selectedItems: ['clock', 'clockdraw'], mathRange: 100, mathClock: 'half', mathAnswers: true, curriculumLevel: 'I' });
sheet('matematica-ceas-minute', { category: 'math', selectedItems: ['clock', 'clockdraw'], mathRange: 1000, mathClock: 'five', mathAnswers: true, curriculumLevel: 'II' });
sheet('matematica-calendar', { category: 'math', selectedItems: ['week', 'months', 'calmonth'], mathRange: 1000, mathAnswers: true, curriculumLevel: 'II' });
sheet('matematica-masurari', { category: 'math', selectedItems: ['length', 'mass', 'ruler', 'units'], mathRange: 1000, mathAnswers: true, curriculumLevel: 'II' });
sheet('matematica-fractii-figuri', { category: 'math', selectedItems: ['frac', 'figures'], mathRange: 1000, mathAnswers: true });
// „Pagină cu răspunsuri”: the games, and math with a class (no curriculum line on the answers)
sheet('jocuri-raspunsuri', { category: 'games', selectedItems: ['find:Ș', 'count:10', 'sound:A', 'first:1', 'syl:1', 'split:1', 'sort:1', 'sort:5', 'odd:4', 'group:1', 'pos:1', 'pos:3'], mathAnswers: true, curriculumLevel: 'CP' });
sheet('matematica-raspunsuri-clasa', { category: 'math', selectedItems: [...MATH_TYPES], mathRange: 10, mathAnswers: true, curriculumLevel: 'CP' });
// „Evaluare”: every class that has one
for (const p of SHEET_PRESETS.filter((x) => x.evaluation)) for (const level of p.levels ?? []) SAMPLES[`${p.id}-${level}`] = () => buildWorksheetPages(presetConfig(p, level), 'full');
sheet('caiet-alfabet-mana', { letterMode: 'paired', script: 'cursive', selectedItems: ['Aa', 'Bb', 'Șș'], pagePerItem: true, itemWords: true, fillPage: false });
sheet('optiuni', { letterMode: 'paired', selectedItems: ['Aa'], leftHandedMode: true, orientation: 'landscape', backgroundPattern: 'dictando', guideColor: 'blue', traceDensity: 'dense', customTitle: 'Fișă de lucru pentru grupa mare – săptămâna 12' });
SAMPLES['grupa'] = () => buildGroupPages({ names: ['Ana', 'Ștefan'], themeId: THEMES[0].id, letters: ['M'], letterMode: 'uppercase', difficulty: 'beginner', withFindPages: true }).pages;
SAMPLES['caiet-nume'] = () => buildNameBookPages('Ioana', 'print');
SAMPLES['caiet-kdp'] = () => buildBookPages(DEFAULT_BOOK_CONFIG).filter((_, i) => i % 7 === 0);
SAMPLES['coperta-kdp-mana'] = () => [buildCoverPage({ ...DEFAULT_BOOK_CONFIG, script: 'cursive' }, 60) as PageOps];
// „Planșe pentru clasă”: posters, cards, tokens, diplomas, the timetable and „Ziua de azi”
Object.assign(SAMPLES, PRINTABLE_SAMPLES);

const fingerprint = (p: PageOps) => createHash('sha256').update(pageToSvg(p)).digest('hex').slice(0, 16);

describe('how every kind of sheet looks', () => {
  for (const [name, build] of Object.entries(SAMPLES)) {
    it(name, () => {
      expect(build().map(fingerprint)).toMatchSnapshot();
    });
  }
});
