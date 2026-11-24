import type { Tier, WorksheetConfig } from '@/types';
import { getGlyph, normalizeKey } from '@/lib/glyphs/data';
import { isItemAllowed } from '@/lib/access';
import { activityLabel, countSet, findGrid, isActivityItem } from './activities';
import { caseOf, firstSet, soundSet, splitSet, sylSet } from './phonology-pages';
import { SORT_SETS, gridLayout, groupSet, oddRows, sceneLayout, sortPictures } from './sorting-pages';
import { CATEGORY_NAMES } from './sorting';
import { readingKeySection } from './reading-pages';
import { answerKeyPages, type KeySection } from './answer-key';
import { funKeyExtras, funKeySection } from './fun-pages';
import { exploreKeySection } from './explore-pages';

/**
 * The answers of the game pages („Jocuri”) for the answers page: read from the same functions
 * that lay the pages out (findGrid, countSet, soundSet, firstSet, sylSet, splitSet, sortPictures,
 * oddRows, groupSet, sceneLayout, gridLayout), so they always match the drawing.
 *
 * „Unește punctele” and „Desenează unde ți se cere” (pos:5, pos:6) have no single answer: no section.
 * Neither do „Citește și desenează” and „Copiază” (read:draw, read:copy).
 */

const list = (xs: string[]) => xs.join(', ');

/** The section of one game item, or null when the item has nothing to check. */
export function gameKeySection(config: WorksheetConfig, item: string): KeySection | null {
  const [kind, arg = ''] = item.split(':');
  const n = Number(arg);
  switch (kind) {
    case 'find': {
      const target = normalizeKey(arg);
      if (!getGlyph(target)) return null;
      const lower = config.letterMode === 'lowercase';
      const t = lower ? target.toLowerCase() : target;
      const found = findGrid(target, lower).filter((l) => l === t).length;
      return { title: `Găsește litera ${t}`, entries: [`Litera ${t} apare de ${found} ori.`], perLine: 1 };
    }
    case 'count': {
      const { numbers } = countSet(n);
      return { title: `Numără și scrie (1–${n})`, entries: [`De sus în jos: ${list(numbers.map(String))}.`], perLine: 1 };
    }
    case 'sound': {
      const { words } = soundSet(arg);
      const yes = words.filter((w) => w.initial === arg).map((w) => w.word);
      const no = words.filter((w) => w.initial !== arg).map((w) => w.word);
      return {
        title: `Sunetul de la început: ${arg}`,
        entries: [`Se încercuiesc (${yes.length}): ${list(yes)}.`, `Nu se încercuiesc: ${list(no)}.`],
        perLine: 1,
      };
    }
    case 'first':
      return { title: activityLabel(item), entries: firstSet(n).map((w) => `${caseOf(config, w.word)} – ${caseOf(config, w.initial)}`), perLine: 4, numbered: true };
    case 'syl':
      return { title: activityLabel(item), entries: sylSet(n).map((w) => `${caseOf(config, w.syllables.join('-'))} (${w.syllables.length})`), perLine: 4, numbered: true };
    case 'split':
      return { title: activityLabel(item), entries: splitSet(n).map((w) => caseOf(config, w.syllables.join('-'))), perLine: 4, numbered: true };
    case 'sort': {
      const def = SORT_SETS[n - 1];
      const pics = sortPictures(n);
      // the pictures have no numbers on the page: counted from the top, as the adult reads them
      const entries = def.groups.map((g, gi) => {
        const mine = pics.map((p, i) => ({ p, at: i + 1 })).filter(({ p }) => p.group === gi);
        const what = def.by === 'shape' ? mine.map(({ at }) => String(at)) : mine.map(({ p, at }) => `${at}. ${p.word}`);
        return `${g.label.join(' ')}: ${list(what)}`;
      });
      return { title: activityLabel(item), entries: ['Imaginile, numărate de sus în jos:', ...entries], perLine: 1 };
    }
    case 'odd':
      return { title: activityLabel(item), entries: oddRows(n).map((r) => `${r.objects[r.intruder].word} (celelalte: ${CATEGORY_NAMES[r.cat]})`), perLine: 2, numbered: true };
    case 'group':
      return { title: activityLabel(item), entries: [list(groupSet(n, 0).kinds.map((k) => `${k.object.word}: ${k.count}`))], perLine: 1 };
    case 'pos': {
      if (n > 4) return null; // drawings: nothing to check
      const questions = n <= 2 ? sceneLayout(n, 0).questions : gridLayout(n, 0).questions;
      return { title: activityLabel(item), entries: questions.map((q) => q.answer.word), perLine: 5, numbered: true };
    }
    // „Citire și scriere” (reading-pages.ts): nothing for „Citește și desenează” and „Copiază”
    case 'read':
      return readingKeySection(config, item);
    // the fun preschool sheets and „Explorarea mediului”: nothing for „Urmărește linia”
    default:
      return funKeySection(item) ?? exploreKeySection(item);
  }
}

/** The sections of the game pages of this sheet, in page order (only the items the page builder draws). */
export function gameKeySections(config: WorksheetConfig, tier: Tier): KeySection[] {
  return config.selectedItems
    .filter((item) => isActivityItem(item) && isItemAllowed(item, 'games', tier))
    .map((item) => gameKeySection(config, item))
    .filter((s): s is KeySection => !!s);
}

/** The answers pages of a games sheet (none when no page has answers). */
export function gameAnswerPages(config: WorksheetConfig, tier: Tier) {
  const sections = gameKeySections(config, tier);
  // the mazes with their path and the scenes with the differences circled, under the answers
  const extras = funKeyExtras(config.selectedItems.filter((item) => isActivityItem(item) && isItemAllowed(item, 'games', tier)));
  return sections.length ? answerKeyPages(config, sections, extras) : [];
}
