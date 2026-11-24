import type { PageOps } from '@/lib/glyphs/types';
import { buildAlphabetPages } from '@/lib/printables/alphabet';
import { buildCardPages, type CardOptions } from '@/lib/printables/cards';
import { buildTokenPages } from '@/lib/printables/tokens';
import { buildDiplomaPages } from '@/lib/printables/diplomas';
import { buildTimetablePages, buildTodayPages } from '@/lib/printables/classroom';

const cards = (o: Partial<CardOptions>): CardOptions => ({ set: 'letters', letters: [], perPage: 12, backs: false, script: 'print', letterCase: 'upper', numberMax: 20, objects: false, ...o });

/**
 * Reference printables: fingerprinted in sheets-visual.test.ts, drawn by printables-preview.test.ts.
 * Children's names here are made up.
 */
export const PRINTABLE_SAMPLES: Record<string, () => PageOps[]> = {
  'plansa-alfabet': () => buildAlphabetPages({ letters: ['A', 'Ă', 'Â', 'G', 'Î', 'M', 'Ș', 'W', 'Y'], script: 'print', ink: 'color', border: 'simple', strokeOrder: false }, 'full'),
  'plansa-alfabet-contur': () => buildAlphabetPages({ letters: ['B', 'Ț', 'Q'], script: 'print', ink: 'outline', border: 'dots', strokeOrder: true }, 'free'),
  'plansa-alfabet-mana': () => buildAlphabetPages({ letters: ['A', 'F', 'M', 'Ș', 'Z'], script: 'cursive', ink: 'color', border: 'dots', strokeOrder: false }, 'full'),
  'cartonase-litere': () => buildCardPages(cards({ letters: ['A', 'Ă', 'Â', 'B', 'C', 'D', 'E', 'M', 'Ș', 'W', 'G', 'J', 'Î', 'Ț'], backs: true }), 'free'),
  'cartonase-litere-mana-8': () => buildCardPages(cards({ letters: ['A', 'F', 'M', 'Ș', 'G', 'Z', 'W', 'K', 'J'], perPage: 8, script: 'cursive' }), 'full'),
  'cartonase-silabe': () => buildCardPages(cards({ set: 'syllables', letters: ['M', 'N', 'C'] }), 'full'),
  'cartonase-silabe-comune': () => buildCardPages(cards({ set: 'syllables', letterCase: 'lower', perPage: 8 }), 'full').slice(0, 1),
  'cartonase-imagini': () => buildCardPages(cards({ set: 'pictures', letters: ['B', 'Ș', 'T'], letterCase: 'lower', backs: true }), 'full'),
  'cartonase-imagini-mari': () => buildCardPages(cards({ set: 'pictures', letters: ['C'], perPage: 8 }), 'full').slice(0, 1),
  'cartonase-imagini-mana': () => buildCardPages(cards({ set: 'pictures', letters: ['P'], script: 'cursive' }), 'full').slice(0, 1),
  'cartonase-buline': () => buildCardPages(cards({ set: 'digits', numberMax: 20, backs: true }), 'full'),
  'cartonase-obiecte-8': () => buildCardPages(cards({ set: 'digits', numberMax: 20, perPage: 8, objects: true }), 'full'),
  'cartonase-numere-100': () => buildCardPages(cards({ set: 'numbers', numberMax: 100 }), 'full').slice(-2),
  'jetoane-numere-rotunde': () => buildTokenPages({ set: 'math', shape: 'round', letterCase: 'upper', numberMax: 10 }, 'full'),
  'jetoane-numere-20': () => buildTokenPages({ set: 'math', shape: 'square', letterCase: 'upper', numberMax: 20 }, 'full'),
  'jetoane-litere-mici': () => buildTokenPages({ set: 'letters', shape: 'square', letterCase: 'lower', numberMax: 10 }, 'full'),
  'jetoane-litere-mari': () => buildTokenPages({ set: 'letters', shape: 'round', letterCase: 'upper', numberMax: 10 }, 'free'),
  'diplome-grupa': () => buildDiplomaPages({ diploma: 'merit', feminine: false, nameScript: 'cursive', border: 'simple' }, { names: ['Ana-Maria Popescu', 'ȘTEFAN IONESCU', 'Luca'], teacher: 'Prof. Ioana Mărgărit', school: 'Școala Gimnazială nr. 5, București · clasa pregătitoare', date: '13 iunie 2027' }, 'full'),
  'diploma-cititoare-tipar': () => buildDiplomaPages({ diploma: 'cititor', feminine: true, nameScript: 'print', border: 'dots' }, { names: ['Irina Țăranu'] }, 'free'),
  'diploma-fara-nume': () => buildDiplomaPages({ diploma: 'gradinita', feminine: false, nameScript: 'cursive', border: 'none' }, { names: [], customReason: 'pentru toate desenele frumoase, cântecele și jocurile din grupa mare. Te așteaptă o școală minunată, cu prieteni noi!' }, 'full'),
  'diploma-cp': () => buildDiplomaPages({ diploma: 'cp', feminine: false, nameScript: 'cursive', border: 'simple' }, { names: ['Maximilian-Alexandru Constantinescu'], date: '20 iunie 2027', teacher: 'Elena Dumitrescu' }, 'full'),
  'orar-5': () => buildTimetablePages({ lessons: 5, border: 'simple' }, 'full'),
  'orar-7-buline': () => buildTimetablePages({ lessons: 7, border: 'dots' }, 'full'),
  'ziua-de-azi': () => buildTodayPages({ border: 'dots' }, 'full'),
};
