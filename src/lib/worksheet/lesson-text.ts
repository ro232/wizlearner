import type { LetterMode } from '@/types';
import { groupOf, type LetterGroup } from './letter-groups';
import { LESSON_MAX_WORDS, lessonLetter } from './lesson';

/**
 * „Lecția literei”: what the sheet writes besides the letter — the syllables, the case of the lines,
 * the title, the words a lesson starts with; and the hint word and picture of each group of letters. Apart from lesson.ts so that the pages that only carry
 * the store (every page) do not carry these too.
 */

/**
 * The word and picture under the model of a group row (as „avion” under A). Every one starts with its
 * group and has a picture in the hint set.
 */
export const GROUP_HINTS: Record<LetterGroup, { word: string; emoji: string }> = {
  ce: { word: 'ceapă', emoji: '🧅' },
  ci: { word: 'cireș', emoji: '🍒' },
  ge: { word: 'geam', emoji: '🪟' },
  gi: { word: 'girafă', emoji: '🦒' },
  che: { word: 'cheie', emoji: '🔑' },
  chi: { word: 'chitară', emoji: '🎸' },
  ghe: { word: 'gheată', emoji: '🥾' },
  ghi: { word: 'ghiozdan', emoji: '🎒' },
};

const VOWELS = new Set(['A', 'Ă', 'Â', 'E', 'I', 'Î', 'O', 'U']);
/** Consonant + â is written inside words (mână, câine, pâine); only these are common enough for a syllable row. */
const WITH_Â = new Set(['B', 'C', 'D', 'F', 'G', 'H', 'L', 'M', 'P', 'R', 'S', 'T', 'Ț', 'V', 'Z']);
/** Letters without syllables of their own in Romanian words for children (quiz, weekend, taxi, yoga). */
const NO_SYLLABLES = new Set(['Q', 'W', 'X', 'Y']);
/** The consonants a vowel is read with first in the abecedar. */
const VOWEL_PARTNERS = ['m', 'n', 'p', 't', 'l'];

const GROUP_SYLLABLES: Record<LetterGroup, string[]> = {
  ce: ['ce', 'cea', 'ci', 'cio', 'ciu'],
  ci: ['ci', 'cio', 'ciu', 'ce', 'cea'],
  ge: ['ge', 'gea', 'gi', 'gio', 'giu'],
  gi: ['gi', 'gio', 'giu', 'ge', 'gea'],
  che: ['che', 'chi'],
  chi: ['chi', 'che'],
  ghe: ['ghe', 'ghi'],
  ghi: ['ghi', 'ghe'],
};

/**
 * The syllables of the lesson, in small letters:
 * - a consonant with the vowels: ma me mi mo mu mă mâ (C and G without e and i: those are the groups
 *   ce, ci, ge, gi, taught on their own; K without ă and â; â only where words have it);
 * - a vowel with the consonants m, n, p, t, l: ma na pa ta la (Î, which starts words: în, îm);
 * - a group: itself and the forms with a vowel after it that words have (ce cea ci cio ciu; che chi);
 * - Q, W, X, Y: none.
 */
export function lessonSyllables(item: string): string[] {
  const group = groupOf(item);
  if (group) return [...GROUP_SYLLABLES[group]];
  const L = lessonLetter(item);
  if (!L || NO_SYLLABLES.has(L)) return [];
  const l = L.toLowerCase();
  if (L === 'Î') return ['în', 'îm'];
  if (L === 'Â') return ['mâ', 'pâ', 'câ', 'lâ', 'râ'];
  if (VOWELS.has(L)) return VOWEL_PARTNERS.map((c) => c + l);
  const vowels = L === 'C' || L === 'G' ? ['a', 'o', 'u', 'ă'] : L === 'K' ? ['a', 'e', 'i', 'o', 'u'] : ['a', 'e', 'i', 'o', 'u', 'ă'];
  const out = vowels.map((v) => l + v);
  if (WITH_Â.has(L)) out.push(`${l}â`);
  return out;
}

/** Syllables, words and the sentence are written in capitals on a sheet of capitals, as typed otherwise. */
export function lessonCase(text: string, mode: LetterMode): string {
  return mode === 'uppercase' ? text.toLocaleUpperCase('ro') : text;
}

/** The title of a lesson sheet: „Litera M”, „Grupul de litere che”. */
export function lessonTitle(item: string | undefined): string {
  if (!item) return 'Lecția literei';
  const group = groupOf(item);
  if (group) return `Grupul de litere ${item}`;
  const L = lessonLetter(item);
  return L ? `Litera ${L}` : 'Lecția literei';
}

/** The words a lesson starts with, from a ready-made list: the shortest first (they trace best), at most LESSON_MAX_WORDS. */
export function lessonWords(list: readonly string[]): string[] {
  return list
    .map((w, i) => ({ w, i }))
    .sort((a, b) => [...a.w].length - [...b.w].length || a.i - b.i)
    .map((x) => x.w)
    .slice(0, LESSON_MAX_WORDS);
}
