import type { LessonCounts, LessonConfig, WorksheetConfig } from '@/types';
import { normalizeKey } from '@/lib/glyphs/data';
import { groupOf } from './letter-groups';

/**
 * „Lecția literei”: one letter (or one group of letters) and a sheet built in four parts, as a lesson
 * of the abecedar goes: the letter, its syllables, words with it, a sentence. `config.lesson` holds the
 * number of rows of each part and the words and the sentence; the letter is `selectedItems[0]`, in
 * the letter mode of the sheet, so a change of mode or script carries it as it carries any letter.
 *
 * Kept light (no glyph drawing, no texts): the store and sanitizeConfig read it on every page; the
 * syllables and titles are in lesson-text.ts, read by layout.ts and the controls of the generator.
 */

export const LESSON_SECTIONS = ['letter', 'syll', 'words', 'sentence'] as const;
export type LessonSection = (typeof LESSON_SECTIONS)[number];

export const LESSON_COUNT_MIN = 0;
export const LESSON_COUNT_MAX = 8;
export const LESSON_DEFAULT_COUNTS: LessonCounts = { letter: 4, syll: 1, words: 3, sentence: 2 };
/** Handwriting rows are taller: one letter row and one word row fewer keep the lesson on two pages. */
export const LESSON_DEFAULT_COUNTS_CURSIVE: LessonCounts = { letter: 3, syll: 1, words: 2, sentence: 2 };
/** The words kept for a lesson (the sheet traces `counts.words` of them; „Altă variantă” moves on to the next ones). */
export const LESSON_MAX_WORDS = 12;
export const LESSON_SENTENCE_MAX = 80;
/** A sentence shrunk under this share of the letter size (about the size „Mici”) is called long in the controls. */
export const LESSON_SENTENCE_SMALL = 0.5;

export const clampLessonCount = (n: number): number => Math.min(LESSON_COUNT_MAX, Math.max(LESSON_COUNT_MIN, Math.round(n)));

/** Is this a lesson sheet? (a lesson on another category is ignored) */
export function isLesson(config: Pick<WorksheetConfig, 'category' | 'lesson'>): boolean {
  return config.category === 'letters' && !!config.lesson;
}

/** The letter of a letter item („M”, „m”, „Mm” → „M”), or null. */
export function lessonLetter(item: string): string | null {
  const ch = [...normalizeKey(item)][0];
  return ch && /\p{L}/u.test(ch) && !groupOf(item) ? ch.toUpperCase() : null;
}

/** Does a text contain the letter (any case, Ă ≠ A) or the group of the lesson? */
export function hasLessonLetter(text: string, item: string): boolean {
  const t = normalizeKey(text).toLocaleLowerCase('ro');
  const group = groupOf(item);
  if (group) return t.includes(group);
  const L = lessonLetter(item);
  return !!L && t.includes(L.toLocaleLowerCase('ro'));
}

// ───────────────────────── sanitizing ─────────────────────────

const WORD = /^\p{L}+(?:[ -]\p{L}+)*$/u;

/** A word of the lesson as it is kept: one form for ş/ș, single spaces, letters, spaces and hyphens only. */
export function cleanLessonWord(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const w = normalizeKey(raw).replace(/\s+/g, ' ').trim();
  return w.length <= 24 && WORD.test(w) ? w : '';
}

/**
 * The sentence as it is kept: one line, letters, spaces and „- , . ! ?” only, single spaces, at most
 * 80 characters. Anything else (digits, quotes, tags, control characters) is dropped.
 */
export function cleanLessonSentence(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return normalizeKey(raw)
    .replace(/[^\p{L} ,.!?-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, LESSON_SENTENCE_MAX)
    .trim();
}

const count = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? clampLessonCount(v) : fallback);

/** A lesson from outside (storage, a saved sheet, a link): complete, with only what fits. */
export function sanitizeLesson(raw: unknown): LessonConfig {
  const r = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const c = (r.counts && typeof r.counts === 'object' && !Array.isArray(r.counts) ? r.counts : {}) as Record<string, unknown>;
  const d = LESSON_DEFAULT_COUNTS;
  const out: LessonConfig = {
    counts: { letter: count(c.letter, d.letter), syll: count(c.syll, d.syll), words: count(c.words, d.words), sentence: count(c.sentence, d.sentence) },
  };
  if (Array.isArray(r.words)) {
    const words: string[] = [];
    for (const w of r.words) {
      const clean = cleanLessonWord(w);
      if (clean && !words.includes(clean)) words.push(clean);
      if (words.length >= LESSON_MAX_WORDS) break;
    }
    out.words = words;
  }
  const sentence = cleanLessonSentence(r.sentence);
  if (sentence) out.sentence = sentence;
  return out;
}

