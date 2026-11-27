/**
 * One sheet of the generator, opened by address: /generator?item=<category>:<item>&clasa=<level>
 * (e.g. item=games:read:match:4&clasa=I, item=math:add&clasa=II, item=letters:Ș&clasa=CP).
 * Used by „Caută fișe” (/cauta), which lists every set of every family; the ready-made starting
 * points keep their own address (/generator?fisa=<preset>&clasa=<level>, curriculum/presets.ts).
 *
 * The settings go through sanitizeConfig like everything else that comes from outside, so an
 * item the generator cannot draw is simply dropped (and the link then opens nothing).
 */
import type { ContentCategory, WorksheetConfig } from '@/types';
import { presetConfig } from '@/lib/curriculum/presets';
import type { SchoolLevel } from '@/lib/curriculum/sheet';

export const ITEM_CATEGORIES = ['letters', 'numbers', 'shapes', 'prewrite', 'math', 'games'] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export interface ItemRef {
  category: ItemCategory;
  item: string;
}

/** "games:read:match:4" → { category: 'games', item: 'read:match:4' }; null for anything else. */
export function parseItemParam(value: string | null | undefined): ItemRef | null {
  if (!value || value.length > 40) return null;
  const at = value.indexOf(':');
  if (at < 1) return null;
  const category = value.slice(0, at);
  const item = value.slice(at + 1);
  if (!(ITEM_CATEGORIES as readonly string[]).includes(category) || !item) return null;
  return { category: category as ItemCategory, item };
}

export function itemParam(ref: ItemRef): string {
  return `${ref.category}:${ref.item}`;
}

/** Handwriting starts in clasa I (CLR I 4.1 „Scrierea literelor de mână”); before it, letters are printed capitals. */
const HANDWRITING: readonly SchoolLevel[] = ['I', 'II', 'III', 'IV'];

/**
 * The generator settings of one item for a class: the same defaults as a ready-made sheet
 * (presetConfig: the number range of the class for math), with the class selected.
 * A letter opens as a printed capital up to clasa pregătitoare and as the handwritten pair („Aa”) from clasa I.
 */
export function itemConfig(ref: ItemRef, level: SchoolLevel): WorksheetConfig {
  let config: Partial<WorksheetConfig> = { category: ref.category as ContentCategory, selectedItems: [ref.item] };
  if (ref.category === 'letters') {
    const upper = ref.item.toLocaleUpperCase('ro');
    config = HANDWRITING.includes(level)
      ? { ...config, selectedItems: [`${upper}${upper.toLocaleLowerCase('ro')}`], letterMode: 'paired', script: 'cursive' }
      : { ...config, selectedItems: [upper], letterMode: 'uppercase', script: 'print' };
  }
  return presetConfig({ id: '', title: '', text: '', config }, level);
}

/** The generator link of an item for a class. */
export function itemHref(ref: ItemRef, level: SchoolLevel): string {
  return `/generator?item=${encodeURIComponent(itemParam(ref))}&clasa=${level}`;
}
