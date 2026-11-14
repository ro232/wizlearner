import type { WorksheetConfig } from '@/types';
import { normalizeKey } from '@/lib/glyphs/data';
import { PATTERN_LABELS, isPatternId } from '@/lib/glyphs/patterns';
import { MATH_LABELS, isMathType } from './math';
import { activityLabel, isActivityItem } from './activities';

/**
 * The owner's rule, promised in the privacy policy: a child's name is never stored on our
 * servers. Everything that leaves the browser for the account (a saved sheet, its title, a
 * row of the download history) goes through the two functions below.
 */

/** One form to compare names in: ş → ș, single spaces, small letters ("ŞTEFAN " = "Ștefan"). */
function nameKey(text: string): string {
  return normalizeKey(text ?? '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('ro');
}

/** The name and each of its parts ("Maria Popescu" → maria popescu, maria, popescu). */
function nameKeys(childName: string): Set<string> {
  const whole = nameKey(childName);
  const keys = new Set<string>();
  if (!whole) return keys;
  keys.add(whole);
  // single letters are not a name ("A. Popescu" must not remove the letter A from a title)
  for (const part of whole.split(/[\s-]+/)) if ([...part].length > 1) keys.add(part);
  return keys;
}

/** Whether a typed word is the child's name, or one of its parts, in any spelling of case and ş/ș. */
export function isChildName(word: string, childName: string): boolean {
  const key = nameKey(word);
  return !!key && nameKeys(childName).has(key);
}

/** Whether a text mentions the child's name (whole, or one of its parts as a whole word). */
function mentionsName(text: string, childName: string): boolean {
  const hay = nameKey(text);
  if (!hay) return false;
  const whole = nameKey(childName);
  if (whole && hay.includes(whole)) return true;
  const words = new Set(hay.split(/[^\p{L}\p{N}]+/u).filter(Boolean));
  for (const key of nameKeys(childName)) if (words.has(key)) return true;
  return false;
}

/**
 * What goes into the account when a sheet is saved: every setting, but not the child's
 * name — not in the header, not as a traced row, not in a title that quotes it.
 */
export function configForSaving(config: WorksheetConfig): WorksheetConfig {
  const name = config.childName ?? '';
  const customWords = (config.customWords ?? []).filter((w) => !isChildName(w, name));
  const out: WorksheetConfig = {
    ...config,
    childName: '',
    customWords,
    customTitle: mentionsName(config.customTitle ?? '', name) ? '' : config.customTitle ?? '',
  };
  if (config.wordPictures) {
    out.wordPictures = Object.fromEntries(Object.entries(config.wordPictures).filter(([w]) => !isChildName(w, name)));
  }
  return out;
}

const KIND: Partial<Record<WorksheetConfig['category'], string>> = {
  letters: 'Litere',
  numbers: 'Cifre',
  shapes: 'Forme',
  prewrite: 'Exerciții',
  math: 'Matematică',
  games: 'Jocuri',
};

/**
 * A short default name for a saved sheet ("Litere: A, Ă, B" / "Litere: MAMA").
 * It is built from what `configForSaving` keeps, so it can be given the sheet exactly as it is
 * on screen: the child's name never gets into the title.
 */
export function defaultSheetName(config: WorksheetConfig): string {
  const safe = configForSaving(config);
  const kind = KIND[safe.category] ?? 'Fișă';
  const words = safe.category === 'letters' ? safe.customWords : [];
  // what the person chose, in words: "Adunări", not the internal "add"
  const label = (i: string) =>
    safe.category === 'math' && isMathType(i) ? MATH_LABELS[i].title
    : safe.category === 'games' && isActivityItem(i) ? activityLabel(i)
    : safe.category === 'prewrite' && isPatternId(i) ? PATTERN_LABELS.ro[i]
    : i;
  const items = [...(safe.selectedItems ?? []).map(label), ...words].slice(0, 5).join(', ');
  return items ? `${kind}: ${items}` : kind;
}
