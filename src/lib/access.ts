import type { ContentCategory, Tier } from '@/types';
import { FREE_LIMITS } from '@/lib/constants';
import { baseLetter, normalizeKey } from '@/lib/glyphs/data';
import { READING_LEVELS, type ReadKind } from '@/lib/worksheet/reading';
import { isFunItem } from '@/lib/worksheet/fun';
import { isExploreItem } from '@/lib/worksheet/explore';
import { isSubjectItem } from '@/lib/worksheet/subjects';

/**
 * One place that decides whether an item is usable on a tier. The item picker,
 * the custom-word box and the page builder all ask here, so a locked letter
 * cannot reach a free PDF by another route (e.g. typing a word that contains it).
 *
 * This is a convenience gate in the browser, not a security boundary: the paid
 * tier itself is only ever set on the server (see supabase/migrations).
 */
/** Math sheets of the full plan only (a test checks they match math.ts PAID_MATH_TYPES). */
const PAID_MATH_ITEMS: readonly string[] = ['calmonth', 'units', 'frac'];

export function isItemAllowed(item: string, category: ContentCategory, tier: Tier): boolean {
  if (tier !== 'free') return true;
  switch (category) {
    case 'letters': {
      // "Aa", "ă", "Ș": every letter in the item must be a free one (Ă/Â count as A, Ș as S …).
      for (const ch of normalizeKey(item)) {
        if (!(FREE_LIMITS.letters as readonly string[]).includes(baseLetter(ch))) return false;
      }
      return true;
    }
    case 'numbers':
      return (FREE_LIMITS.numbers as readonly string[]).includes(item);
    case 'shapes':
      return (FREE_LIMITS.shapes as readonly string[]).includes(item);
    case 'prewrite':
      return (FREE_LIMITS.prewrite as readonly string[]).includes(item);
    case 'games': {
      // Free: find a free letter, count to 5, connect the dots of the star.
      const [kind, arg = ''] = item.split(':');
      if (kind === 'find') return isItemAllowed(arg, 'letters', tier);
      // „Sunete și silabe”: the sounds A–E and set 1 of each exercise (made of A–E words)
      if (kind === 'sound') return isItemAllowed(arg, 'letters', tier);
      if (kind === 'first' || kind === 'syl' || kind === 'split') return arg === '1';
      // sorting, grouping and spatial orientation: set 1 of each
      if (kind === 'sort' || kind === 'odd' || kind === 'group' || kind === 'pos') return arg === '1';
      // the fun preschool sheets and „Explorarea mediului”: set 1 of each (fun.ts, explore.ts)
      if ((isFunItem(item) || isExploreItem(item)) && arg === '1') return true;
      // Arte vizuale, Dezvoltare personală, limba engleză: set 1 of each (subjects.ts)
      if (isSubjectItem(item) && arg === '1') return true;
      // „Citire și scriere” ("read:<kind>:<set>"): the first set of each class (CP 1, I 1, II 1) of each kind
      if (kind === 'read') {
        const levels = READING_LEVELS[arg as ReadKind];
        const n = Number(item.split(':')[2]);
        return !!levels && levels.indexOf(levels[n - 1]) === n - 1;
      }
      return item === 'count:5' || item === 'dots:star';
    }
    case 'math':
      // every exercise type is free; numbers above 10 are part of the full plan (see buildMathPages), and so
      // are the other tables than 2, quarters and minutes on the clock (math.ts topicOptions) and three
      // clasa a II-a topics: the month's calendar, units of measure, halves and quarters (PAID_MATH_TYPES)
      return !PAID_MATH_ITEMS.includes(item);
    default:
      return false;
  }
}
