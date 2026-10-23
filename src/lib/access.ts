import type { ContentCategory, Tier } from '@/types';
import { FREE_LIMITS } from '@/lib/constants';
import { baseLetter, normalizeKey } from '@/lib/glyphs/data';

/**
 * One place that decides whether an item is usable on a tier. The item picker,
 * the custom-word box and the page builder all ask here, so a locked letter
 * cannot reach a free PDF by another route (e.g. typing a word that contains it).
 *
 * This is a convenience gate in the browser, not a security boundary: the paid
 * tier itself is only ever set on the server (see supabase/migrations).
 */
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
      return item === 'count:5' || item === 'dots:star';
    }
    default:
      return false;
  }
}
