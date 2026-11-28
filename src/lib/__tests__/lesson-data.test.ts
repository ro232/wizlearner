import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import { GROUP_LISTS, LETTER_LISTS } from '@/lib/curriculum/data/cuvinte';
import { LESSON_SENTENCES } from '@/lib/curriculum/data/propozitii';
import { LETTER_GROUPS } from '@/lib/worksheet/letter-groups';
import { LESSON_DEFAULT_COUNTS, LESSON_SENTENCE_SMALL, cleanLessonSentence, hasLessonLetter } from '@/lib/worksheet/lesson';
import { lessonSentenceFit } from '@/lib/worksheet/layout';
import { getGlyph } from '@/lib/glyphs/data';
import { hasCursive } from '@/lib/glyphs/cursive';
import { cleanWord } from '@/stores/sanitize-config';

/** The data of „Lecția literei”: the words of the groups (cuvinte.ts) and the suggested sentences (propozitii.ts). */

const WORD = /^[a-zăâîșț]+$/;
const CEDILLA = /[ŞşŢţ]/;

describe('word lists of the groups of letters', () => {
  it('one list for each group, in order', () => {
    expect(GROUP_LISTS.map((l) => l.id)).toEqual([...LETTER_GROUPS]);
  });

  it.each(GROUP_LISTS.map((l) => [l.id, l] as const))('%s: 8–10 words, each with its group, small letters, ș/ț with the comma, no duplicates', (group, list) => {
    expect(list.words.length).toBeGreaterThanOrEqual(8);
    expect(list.words.length).toBeLessThanOrEqual(10);
    expect(new Set(list.words).size).toBe(list.words.length);
    for (const w of list.words) {
      expect(w, w).toMatch(WORD);
      expect(CEDILLA.test(w), w).toBe(false);
      expect(cleanWord(w), w).toBe(w);
      expect(w.length, w).toBeLessThanOrEqual(14);
      expect(w.includes(group), `${group}: ${w}`).toBe(true);
      for (const ch of w) expect(getGlyph(ch), `${w}: ${ch}`).toBeTruthy();
    }
  });

  it('„ce” is not „che”: a word of ce/ge has no h after the c/g there', () => {
    for (const g of ['ce', 'ci', 'ge', 'gi']) {
      const list = GROUP_LISTS.find((l) => l.id === g)!;
      // with every „che” (or „ghe” …) taken out, the word still has its „ce”
      for (const w of list.words) expect(w.split(`${g.charAt(0)}h${g.slice(1)}`).join('|').includes(g), `${g}: ${w}`).toBe(true);
    }
  });
});

describe('suggested sentences', () => {
  const keys = Object.keys(LESSON_SENTENCES);

  it('every letter (Q, W, Y apart) and every group has 3–5', () => {
    const letters = LETTER_LISTS.map((l) => l.id).filter((l) => !['Q', 'W', 'Y'].includes(l));
    expect(keys.sort()).toEqual([...letters, ...LETTER_GROUPS].sort());
    for (const k of keys) {
      expect(LESSON_SENTENCES[k].length, k).toBeGreaterThanOrEqual(3);
      expect(LESSON_SENTENCES[k].length, k).toBeLessThanOrEqual(5);
      expect(new Set(LESSON_SENTENCES[k]).size, k).toBe(LESSON_SENTENCES[k].length);
    }
  });

  it.each(keys.map((k) => [k] as const))('%s: has its letter or group; 3–6 words; a capital first, a full stop last; kept as typed', (k) => {
    for (const s of LESSON_SENTENCES[k]) {
      expect(hasLessonLetter(s, k), `${k}: ${s}`).toBe(true);
      const words = s.replace(/\.$/, '').split(' ');
      expect(words.length, s).toBeGreaterThanOrEqual(3);
      expect(words.length, s).toBeLessThanOrEqual(6);
      expect(s, s).toMatch(/^[A-ZĂÂÎȘȚ][a-zăâîșț]*( [A-Za-zĂÂÎȘȚăâîșț]+)*\.$/);
      expect(CEDILLA.test(s), s).toBe(false);
      expect(s.length, s).toBeLessThanOrEqual(30);
      expect(cleanLessonSentence(s), s).toBe(s);
      // every letter can be traced, in print and in handwriting
      for (const ch of s.replace(/[ .]/g, '')) {
        expect(getGlyph(ch), `${s}: ${ch}`).toBeTruthy();
        expect(hasCursive(ch), `${s}: ${ch}`).toBe(true);
      }
    }
  });

  it('none is so long that the controls call it long (capitals, the largest letters)', () => {
    const long: string[] = [];
    for (const k of keys) {
      for (const sentence of LESSON_SENTENCES[k]) {
        const config: WorksheetConfig = { ...DEFAULT_CONFIG, selectedItems: [k.length > 1 ? k.toUpperCase() : k], lesson: { counts: LESSON_DEFAULT_COUNTS, sentence } };
        if (lessonSentenceFit(config)! < LESSON_SENTENCE_SMALL) long.push(`${sentence} ${lessonSentenceFit(config)!.toFixed(2)}`);
      }
    }
    expect(long).toEqual([]);
  });
});
