import { DEFAULT_CONFIG, type ContentCategory, type WorksheetConfig } from '@/types';
import { normalizeKey } from '@/lib/glyphs/data';
import { PATTERN_IDS } from '@/lib/glyphs/patterns';
import { SHAPES } from '@/lib/constants';

/**
 * A sheet configuration that comes from outside the running page — the browser's storage,
 * a project saved in the account, a row of the download history — is never trusted as it is.
 * A single `null` where a list is expected used to leave the generator on "Application error"
 * at every visit, until the visitor cleared the site data by hand.
 *
 * `sanitizeConfig` always answers with a complete, drawable configuration: every field that is
 * missing or of the wrong kind falls back to its default, lists keep only what fits.
 * A valid configuration comes out unchanged.
 */

/** The categories the generator can draw (the type also names two that were never built). */
const CATEGORIES: readonly ContentCategory[] = ['letters', 'numbers', 'shapes', 'prewrite', 'math', 'games'];
// Kept here (not imported from the math and games builders) so the store stays light on pages
// that only need the menu; a test checks they match MATH_TYPES and isActivityItem.
const MATH_IDS: readonly string[] = [
  'cmp', 'add', 'sub', 'mix', 'addpic', 'missing', 'seq', 'nbr', 'money', 'problems',
  // the other topics (TOPIC_MATH_TYPES): groups, multiplication, clock, calendar, measuring, fractions, shapes
  'groups', 'mul', 'div', 'mulmiss', 'clock', 'clockdraw', 'week', 'months', 'calmonth', 'length', 'mass', 'ruler', 'units', 'frac', 'figures',
];
const GAME_ITEM = /^(find:.+|count:(5|10)|dots:(star|heart|house|fish|boat|tree))$/;
// „Sunete și silabe” (phonology-pages.ts: isPhonologyItem)
const PHONO_ITEM = /^(sound:(A|B|C|D|F|L|M|P|R|S|T|U|V)|(first|syl|split):[1-6])$/;
// sorting, grouping and spatial orientation (sorting-pages.ts: isSortingItem)
const SORTING_ITEM = /^(sort|odd|group|pos):[1-6]$/;
// „Citire și scriere” (reading.ts: isReadingItem)
const READING_ITEM = /^read:((match|draw|fill|order):([1-9]|1[0-6])|(gap|copy):([1-9]|1\d|2[0-4])|text:([1-9]|1\d|20))$/;
// the fun preschool sheets (fun.ts: isFunItem) and „Explorarea mediului” (explore.ts: isExploreItem)
const FUN_ITEM = /^(color|colsum|maze|diff|trace|shadow):[1-6]$/;
const EXPLORE_ITEM = /^((plant|body|senses|home|habitat|move|baby|weather|wear|melt|cycle|cover|eat|tame|alive|food|mat|recycle|day|obs):[1-3]|(water|space):[1-4]|season:[1-7])$/;
// Arte vizuale, Dezvoltare personală, limba engleză (subjects.ts: isSubjectItem)
const SUBJECT_ITEM = /^((sym|model|en):[1-3]|(cut|lines|feel):[12]|(me|hyg|habit|job|jobuse|rules):1)$/;
// the sheets that fill the gaps of the programme (clr.ts: isClrItem, mem.ts: isMemItem)
const CLR_ITEM = /^(story:([1-9]|1[0-2])|(sign|msg):[1-9]|note:([1-9]|10)|written:[12]|listen:([1-9]|1[0-8])|book:[1-6])$/;
const MEM_ITEM = /^(terms:[1-6]|(place|coord):[1-3]|regular:[1-4]|(sort2|plan|cause|pict):[12]|(sides|solid|around|more):1)$/;
// clasa a III-a și a IV-a: Matematică (m34.ts: isM34Item)
const M34_ITEM = /^((nr|rom|rot|ops|inm|prob|fr|mas):[1-4]|(per|geo|date|sir):[12])$/;
// … and Limba și literatura română (r34.ts: isR34Item)
const R34_ITEM = /^(lect:[1-6]|(parti|orto|comp|func):[1-4]|(aud|punct|voc|dict|carte):[12])$/;
const MATH_RANGES: readonly number[] = [5, 10, 20, 31, 100, 1000, 10000, 1000000];

const MAX_ITEMS = 120;
const MAX_WORDS = 60;
const MAX_TEXT = 80;

/** A word or name as it is kept on the sheet: one form for ş/ș, single spaces, no edges. */
export function cleanWord(text: unknown): string {
  return typeof text === 'string' ? normalizeKey(text).replace(/\s+/g, ' ').trim() : '';
}

/** Whether a chosen item is something its category can draw ("A", "Aa" for letters; "7"; "circle"; "zigzag"; "add"; "find:A"). */
export function itemFitsCategory(item: unknown, category: ContentCategory): item is string {
  if (typeof item !== 'string' || !item || item.length > 24) return false;
  switch (category) {
    case 'letters': {
      // one letter, or a capital with its small letter ("Aa", "Șș")
      const chars = [...normalizeKey(item)];
      if (chars.length === 1) return /^\p{L}$/u.test(chars[0]);
      return chars.length === 2 && /^\p{L}$/u.test(chars[0]) && /^\p{L}$/u.test(chars[1]) && chars[0].toLowerCase() === chars[1].toLowerCase();
    }
    case 'numbers':
      return /^\d{1,3}$/.test(item);
    case 'shapes':
      return SHAPES.includes(item);
    case 'prewrite':
      return (PATTERN_IDS as readonly string[]).includes(item);
    case 'math':
      return MATH_IDS.includes(item);
    case 'games':
      if (PHONO_ITEM.test(item)) return true;
      if (SORTING_ITEM.test(item)) return true;
      if (READING_ITEM.test(item)) return true;
      if (FUN_ITEM.test(item) || EXPLORE_ITEM.test(item)) return true;
      if (SUBJECT_ITEM.test(item)) return true;
      if (CLR_ITEM.test(item) || MEM_ITEM.test(item)) return true;
      if (M34_ITEM.test(item) || R34_ITEM.test(item)) return true;
      return GAME_ITEM.test(item);
    default:
      return false;
  }
}

const oneOf = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;

const bool = (value: unknown, fallback: boolean): boolean => (typeof value === 'boolean' ? value : fallback);

const int = (value: unknown, min: number, max: number, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;

const text = (value: unknown, max = MAX_TEXT): string => (typeof value === 'string' ? value.slice(0, max) : '');

function unique(list: string[]): string[] {
  return Array.from(new Set(list));
}

export function sanitizeConfig(raw: unknown): WorksheetConfig {
  const r = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_CONFIG;
  const category = oneOf(r.category, CATEGORIES, d.category);

  const selectedItems = Array.isArray(r.selectedItems)
    ? unique(r.selectedItems.filter((i): i is string => itemFitsCategory(i, category))).slice(0, MAX_ITEMS)
    : [];
  const customWords = Array.isArray(r.customWords)
    ? unique(r.customWords.filter((w): w is string => typeof w === 'string' && !!w.trim() && w.length <= MAX_TEXT)).slice(0, MAX_WORDS)
    : [];

  let wordPictures: Record<string, string> | undefined;
  if (r.wordPictures && typeof r.wordPictures === 'object' && !Array.isArray(r.wordPictures)) {
    const pairs = Object.entries(r.wordPictures as Record<string, unknown>).filter(
      (e): e is [string, string] => typeof e[1] === 'string' && e[1].length <= 16 && e[0].length <= MAX_TEXT,
    );
    wordPictures = Object.fromEntries(pairs.slice(0, MAX_WORDS));
  }

  const config: WorksheetConfig = {
    category,
    alphabet: oneOf(r.alphabet, ['ro', 'en'] as const, d.alphabet),
    letterMode: oneOf(r.letterMode, ['uppercase', 'lowercase', 'paired'] as const, d.letterMode),
    selectedItems,
    customWords,
    difficulty: oneOf(r.difficulty, ['beginner', 'intermediate', 'advanced'] as const, d.difficulty),
    fontStyle: oneOf(r.fontStyle, ['dashed', 'dotted', 'outline', 'cursive'] as const, d.fontStyle),
    letterSize: oneOf(r.letterSize, ['small', 'medium', 'large'] as const, d.letterSize),
    pageSize: oneOf(r.pageSize, ['a4', 'a5', 'letter', 'b5'] as const, d.pageSize),
    orientation: oneOf(r.orientation, ['portrait', 'landscape'] as const, d.orientation),
    tracingVisibility: int(r.tracingVisibility, 1, 10, d.tracingVisibility),
    rowSpacing: oneOf(r.rowSpacing, ['tight', 'normal', 'wide'] as const, d.rowSpacing),
    guideColor: oneOf(r.guideColor, ['blue', 'gray', 'green', 'orange', 'purple'] as const, d.guideColor),
    backgroundPattern: oneOf(r.backgroundPattern, ['blank', 'grid', 'guides', 'patratele', 'dictando', 'lines'] as const, d.backgroundPattern),
    rowsPerPage: int(r.rowsPerPage, 1, 12, d.rowsPerPage),
    repetitionsPerItem: int(r.repetitionsPerItem, 1, 5, d.repetitionsPerItem),
    showGuideLines: bool(r.showGuideLines, d.showGuideLines),
    showDirectionalArrows: bool(r.showDirectionalArrows, d.showDirectionalArrows),
    showStartDots: bool(r.showStartDots, d.showStartDots),
    showLetterIcons: bool(r.showLetterIcons, d.showLetterIcons),
    showRewardSection: bool(r.showRewardSection, d.showRewardSection),
    fullPageMode: bool(r.fullPageMode, d.fullPageMode),
    leftHandedMode: bool(r.leftHandedMode, d.leftHandedMode),
    fillPage: bool(r.fillPage, d.fillPage ?? true),
    childName: text(r.childName),
    dateField: bool(r.dateField, d.dateField),
    customTitle: text(r.customTitle),
    schoolName: text(r.schoolName),
  };

  // Optional settings: present only when they were set, and only with a value we know.
  if (r.script === 'print' || r.script === 'cursive') config.script = r.script;
  if (typeof r.pagePerItem === 'boolean') config.pagePerItem = r.pagePerItem;
  if (typeof r.itemWords === 'boolean') config.itemWords = r.itemWords;
  if (r.traceDensity === 'sparse' || r.traceDensity === 'normal' || r.traceDensity === 'dense') config.traceDensity = r.traceDensity;
  if (typeof r.mathRange === 'number' && MATH_RANGES.includes(r.mathRange)) config.mathRange = r.mathRange;
  if (typeof r.mathSeed === 'number' && Number.isFinite(r.mathSeed)) config.mathSeed = int(r.mathSeed, 0, 1_000_000_000, 1);
  if (typeof r.mathAnswers === 'boolean') config.mathAnswers = r.mathAnswers;
  if (typeof r.evaluation === 'boolean' && (category === 'math' || category === 'games')) config.evaluation = r.evaluation;
  if (r.mathCarry === 'without' || r.mathCarry === 'with' || r.mathCarry === 'mixed') config.mathCarry = r.mathCarry;
  if (typeof r.mathTable === 'number' && [0, 2, 3, 4, 5, 6, 7, 8, 9, 10].includes(r.mathTable)) config.mathTable = r.mathTable;
  if (r.mathClock === 'hour' || r.mathClock === 'half' || r.mathClock === 'quarter' || r.mathClock === 'five') config.mathClock = r.mathClock;
  if (r.curriculumLevel === 'presc' || r.curriculumLevel === 'CP' || r.curriculumLevel === 'I' || r.curriculumLevel === 'II' || r.curriculumLevel === 'III' || r.curriculumLevel === 'IV') config.curriculumLevel = r.curriculumLevel;
  if (wordPictures) config.wordPictures = wordPictures;
  return config;
}
