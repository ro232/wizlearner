import type { LetterMode } from '@/types';

/**
 * „Grupuri de litere”: ce, ci, ge, gi, che, chi, ghe, ghi — taught in clasa pregătitoare and clasa I
 * as one unit, written together. On a letter sheet a group is an item like a letter, written in the
 * letter mode of the sheet: „ce” (mici), „CE” (mari), „Ce” (mare și mici, as at the start of a word).
 *
 * The item is the group itself, as written. It can never be mistaken for a letter item: a letter
 * item is one letter or a capital with its own small letter („Aa”, „Șș”), and every group is two or
 * three different letters. The letters of the group are drawn one after the other, each with its own
 * stroke order (handwriting: joined, as a word), and access follows its letters, as for any word.
 *
 * Kept light (no glyph imports): the store, sanitizeConfig and the picker read it.
 */

export const LETTER_GROUPS = ['ce', 'ci', 'ge', 'gi', 'che', 'chi', 'ghe', 'ghi'] as const;
export type LetterGroup = (typeof LETTER_GROUPS)[number];

const GROUP_SET = new Set<string>(LETTER_GROUPS);

/** A group in the form of a letter mode: ce / CE / Ce. */
export function groupInMode(group: string, mode: LetterMode): string {
  const g = group.toLowerCase();
  if (mode === 'uppercase') return g.toUpperCase();
  if (mode === 'paired') return g.charAt(0).toUpperCase() + g.slice(1);
  return g;
}

/** The group of an item („CHE”, „Che”, „che” → „che”), or null for anything else („Cc”, „cE”). */
export function groupOf(item: unknown): LetterGroup | null {
  if (typeof item !== 'string') return null;
  const g = item.toLowerCase();
  if (!GROUP_SET.has(g)) return null;
  // only the three forms the picker makes
  return item === g || item === g.toUpperCase() || item === g.charAt(0).toUpperCase() + g.slice(1) ? (g as LetterGroup) : null;
}

export const isGroupItem = (item: unknown): item is string => groupOf(item) !== null;

/** The groups as the picker shows them for a letter mode. */
export function groupItems(mode: LetterMode): string[] {
  return LETTER_GROUPS.map((g) => groupInMode(g, mode));
}

/** A letter or group item written in another letter mode („M” → „m”, „Mm”; „CHE” → „che”, „Che”). */
export function itemInMode(item: string, mode: LetterMode): string {
  const g = groupOf(item);
  if (g) return groupInMode(g, mode);
  const ch = [...item][0] ?? '';
  if (!ch) return item;
  return mode === 'uppercase' ? ch.toUpperCase() : mode === 'lowercase' ? ch.toLowerCase() : `${ch.toUpperCase()}${ch.toLowerCase()}`;
}
