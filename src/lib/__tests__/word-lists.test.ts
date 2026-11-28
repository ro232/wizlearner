import { describe, expect, it } from 'vitest';
import { LETTER_LISTS, THEME_LISTS } from '@/lib/curriculum/data/cuvinte';
import { ALPHABETS, getGlyph } from '@/lib/glyphs/data';
import { cleanWord } from '@/stores/sanitize-config';

/** The ready-made word lists of „Cuvinte de trasat” (src/lib/curriculum/data/cuvinte.ts). */

// Romanian letters (Q, W, Y, K included), a space („om de zăpadă”), a hyphen („yo-yo”); small letters only
const WORD = /^[a-zăâîșț]+(?:[ -][a-zăâîșț]+)*$/;
// the letters that start (almost) no Romanian word for a child: their lists are short, with the letter inside
const SHORT = new Set(['Q', 'W', 'Y']);
const all = [...LETTER_LISTS, ...THEME_LISTS];

describe('word lists', () => {
  it('one list for each of the 31 letters, in the order of the alphabet', () => {
    expect(LETTER_LISTS.map((l) => l.id)).toEqual(ALPHABETS.ro);
    expect(LETTER_LISTS).toHaveLength(31);
  });

  it.each(all.map((l) => [l.title, l] as const))('%s: allowed characters, comma-below ș/ț, at most 14 letters, no duplicates', (_, list) => {
    for (const w of list.words) {
      expect(w, w).toMatch(WORD);
      // ş ţ (cedilla) and the capital forms never appear; the word is kept exactly as the sheet keeps it
      expect(/[\u015E\u015F\u0162\u0163]/.test(w), w).toBe(false);
      expect(cleanWord(w), w).toBe(w);
      expect(w.length, w).toBeLessThanOrEqual(14);
      expect(w.normalize('NFC'), w).toBe(w);
      // every letter has a drawing (the whole word is traced)
      for (const ch of w.replace(/[ -]/g, '')) expect(getGlyph(ch), `${w}: ${ch}`).toBeTruthy();
    }
    expect(new Set(list.words).size).toBe(list.words.length);
  });

  it.each(LETTER_LISTS.map((l) => [l.id, l] as const))('letter %s: every word has the letter; at the start unless marked „inside”', (letter, list) => {
    const small = letter.toLowerCase();
    for (const w of list.words) {
      expect(w.includes(small), w).toBe(true);
      if (!list.inside) expect(w.startsWith(small), w).toBe(true);
    }
    if (SHORT.has(letter)) {
      expect(list.words.length).toBeGreaterThanOrEqual(3);
      expect(list.words.length).toBeLessThanOrEqual(12);
    } else {
      expect(list.words.length).toBeGreaterThanOrEqual(8);
      expect(list.words.length).toBeLessThanOrEqual(12);
    }
  });

  it('the themes: about a dozen, 10–15 words each, distinct ids and titles', () => {
    expect(THEME_LISTS.length).toBeGreaterThanOrEqual(12);
    for (const t of THEME_LISTS) {
      expect(t.words.length, t.title).toBeGreaterThanOrEqual(10);
      expect(t.words.length, t.title).toBeLessThanOrEqual(15);
    }
    expect(new Set(THEME_LISTS.map((t) => t.id)).size).toBe(THEME_LISTS.length);
    expect(new Set(THEME_LISTS.map((t) => t.title)).size).toBe(THEME_LISTS.length);
  });
});
