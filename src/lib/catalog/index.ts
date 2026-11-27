/**
 * The catalogue behind „Caută fișe” (/cauta): every sheet a visitor can open in the generator,
 * computed from the code, never written by hand. One entry for
 *  - each ready-made sheet (curriculum/presets.ts SHEET_PRESETS) that is more than one item
 *    (three letters, an evaluation, „Adunări 0–31”);
 *  - each item of the generator: every letter, digit, shape, graphic exercise, math sheet and every
 *    set of every family of „Jocuri” (the same lists the picker shows: generator-controls.tsx).
 * A ready-made sheet that opens exactly one item („Primul sunet” = first:1) is not listed twice:
 * the item carries it (`presets`), with its description; where the ready-made sheet tunes the item
 * for the class (the clock), the item opens through it in those classes (`via`).
 *
 * For each entry: the title the generator itself uses, the classes it suits (where it prints a
 * competence code, plus the class its set was written for), the codes per class, whether the free
 * plan prints it (access.ts) and whether it has answers. Built once per build (the page is static).
 */
import type { WorksheetConfig } from '@/types';
import { NUMBERS, SHAPES } from '@/lib/constants';
import { isItemAllowed } from '@/lib/access';
import { ALPHABETS } from '@/lib/glyphs/data';
import { PATTERN_IDS, PATTERN_LABELS } from '@/lib/glyphs/patterns';
import { flattenOps } from '@/lib/glyphs/geometry';
import { SHEET_PRESETS, presetConfig, type SheetPreset } from '@/lib/curriculum/presets';
import { SCHOOL_LEVELS, sheetCompetences, type SchoolLevel } from '@/lib/curriculum/sheet';
import { COUNT_RANGES, DOT_SHAPES, DOT_SHAPE_LABELS, activityLabel, type DotShape } from '@/lib/worksheet/activities';
import { MATH_LABELS, MATH_TYPES, isMathType } from '@/lib/worksheet/math';
import { buildWorksheetPages } from '@/lib/worksheet/layout';
import { gameKeySection } from '@/lib/worksheet/game-keys';
import { isPhonologyItem, phonologyItems } from '@/lib/worksheet/phonology-pages';
import { isSortingItem, sortingItems } from '@/lib/worksheet/sorting-pages';
import { readingItems } from '@/lib/worksheet/reading-pages';
import { isReadingItem, readingSetLevel } from '@/lib/worksheet/reading';
import { funItems } from '@/lib/worksheet/fun-pages';
import { isFunItem } from '@/lib/worksheet/fun';
import { exploreItems } from '@/lib/worksheet/explore-pages';
import { isExploreItem } from '@/lib/worksheet/explore';
import { subjectItems } from '@/lib/worksheet/subjects-pages';
import { isSubjectItem } from '@/lib/worksheet/subjects';
import { clrItems } from '@/lib/worksheet/clr-pages';
import { clrSetLevel, isClrItem } from '@/lib/worksheet/clr';
import { memItems } from '@/lib/worksheet/mem-pages';
import { isMemItem, memSetLevel } from '@/lib/worksheet/mem';
import { m34Items } from '@/lib/worksheet/m34-pages';
import { isM34Item, m34SetLevel } from '@/lib/worksheet/m34';
import { r34Items } from '@/lib/worksheet/r34-pages';
import { isR34Item, r34SetLevel } from '@/lib/worksheet/r34';
import { itemConfig, itemParam, type ItemRef } from './item-link';
import { entryConfig } from './entry-config';
import { fold, words, type CatalogEntry, type SubjectId } from './search';

const LEVELS: SchoolLevel[] = SCHOOL_LEVELS.map((l) => l.id);
const inSchoolOrder = (levels: Iterable<SchoolLevel>) => LEVELS.filter((l) => new Set(levels).has(l));

/** The items of „Jocuri”, in the picker's order (generator-controls.tsx `allItems`). */
export function gameItems(): string[] {
  return [
    ...ALPHABETS.ro.map((l) => `find:${l}`), ...COUNT_RANGES, ...DOT_SHAPES.map((d) => `dots:${d}`),
    ...phonologyItems(), ...sortingItems(), ...readingItems(), ...funItems(), ...exploreItems(), ...clrItems(), ...memItems(), ...subjectItems(), ...r34Items(), ...m34Items(),
  ];
}

/** Every item the generator can open on its own, family by family. */
export function catalogItems(): ItemRef[] {
  const of = (category: ItemRef['category'], items: readonly string[]): ItemRef[] => items.map((item) => ({ category, item }));
  return [...of('letters', ALPHABETS.ro), ...of('numbers', NUMBERS), ...of('shapes', SHAPES), ...of('prewrite', PATTERN_IDS), ...of('math', MATH_TYPES), ...of('games', gameItems())];
}

const SHAPE_NAMES: Record<string, string> = {
  circle: 'cerc', square: 'pătrat', triangle: 'triunghi', rectangle: 'dreptunghi', oval: 'oval',
  diamond: 'romb', star: 'stea', heart: 'inimă', hexagon: 'hexagon', pentagon: 'pentagon',
};

/** „Arte vizuale” among the sheets of subjects.ts; the English ones; the rest is „Dezvoltare personală”. */
const ART_KINDS = new Set(['sym', 'model', 'cut', 'lines']);

interface Family {
  family: string;
  subject: SubjectId;
}

/** The group and the subject of an item (the picker's group titles, the subject a teacher files it under). */
export function familyOf(ref: ItemRef): Family {
  const { category, item } = ref;
  if (category === 'letters') return { family: 'Litere de trasat', subject: 'romana' };
  if (category === 'prewrite') return { family: 'Exerciții grafice', subject: 'romana' };
  if (category === 'numbers') return { family: 'Cifre de trasat', subject: 'matematica' };
  if (category === 'shapes') return { family: 'Forme de trasat', subject: 'matematica' };
  if (category === 'math') return { family: 'Matematică', subject: 'matematica' };
  const kind = item.split(':')[0];
  if (isPhonologyItem(item)) return { family: 'Sunete și silabe', subject: 'romana' };
  if (isSortingItem(item)) return { family: 'Sortare, grupare, orientare în spațiu', subject: 'matematica' };
  if (isReadingItem(item)) return { family: 'Citire și scriere', subject: 'romana' };
  if (isFunItem(item)) return { family: 'Fișe distractive', subject: 'jocuri' };
  if (isExploreItem(item)) return { family: 'Explorarea mediului', subject: 'mediu' };
  if (isSubjectItem(item)) return ART_KINDS.has(kind) ? { family: 'Arte vizuale și abilități practice', subject: 'arte' } : kind === 'en' ? { family: 'Limba engleză', subject: 'engleza' } : { family: 'Dezvoltare personală', subject: 'dezvoltare' };
  if (isClrItem(item)) return { family: 'Comunicare în limba română', subject: 'romana' };
  if (isMemItem(item)) return { family: 'Matematică și explorarea mediului', subject: 'matematica' };
  if (isR34Item(item)) return { family: 'Limba și literatura română, clasele III–IV', subject: 'romana' };
  if (isM34Item(item)) return { family: 'Matematică, clasele III–IV', subject: 'matematica' };
  if (kind === 'find') return { family: 'Găsește litera', subject: 'romana' };
  if (kind === 'count') return { family: 'Numără și scrie', subject: 'matematica' };
  return { family: 'Unește punctele', subject: 'jocuri' };
}

/** The name of an item, as the generator itself calls it (activityLabel, MATH_LABELS, PATTERN_LABELS). */
export function itemTitle(ref: ItemRef): string {
  const { category, item } = ref;
  switch (category) {
    case 'letters':
      return `Litera ${item}`;
    case 'numbers':
      return Number(item) < 10 ? `Cifra ${item}` : `Numărul ${item}`;
    case 'shapes':
      return `Formă de trasat: ${SHAPE_NAMES[item] ?? item}`;
    case 'prewrite':
      return `Exerciții grafice: ${PATTERN_LABELS.ro[item as keyof typeof PATTERN_LABELS.ro].toLocaleLowerCase('ro')}`;
    case 'math':
      return isMathType(item) ? MATH_LABELS[item].title : item;
    default: {
      const [kind, arg] = item.split(':');
      if (kind === 'find') return `Găsește litera ${arg}`;
      if (kind === 'count') return `Numără și scrie (1–${arg})`;
      if (kind === 'dots') return `Unește punctele: ${DOT_SHAPE_LABELS[arg as DotShape] ?? arg}`;
      if (kind === 'sound') return `Sunetul de la început: ${arg}`;
      return activityLabel(item);
    }
  }
}

const ITEM_TEXT: Partial<Record<ItemRef['category'], string>> = {
  letters: 'Litera de tipar (grădiniță, clasa pregătitoare) sau de mână (din clasa I), apoi rânduri de urmărit și de scris singur.',
  numbers: 'Cifra cu ordinea liniilor, apoi rânduri de urmărit și de scris singur.',
  shapes: 'Forma de urmărit pe contur, rând cu rând.',
  prewrite: 'Rânduri de urmărit: mâna se pregătește pentru litere.',
};

/** The class a set was written for, where its family keeps one (READING_LEVELS, SIGN_SET_LEVELS, M34_SETS …). */
function ownLevel(item: string): SchoolLevel | null {
  return readingSetLevel(item) ?? clrSetLevel(item) ?? (isMemItem(item) ? memSetLevel(item) : null) ?? (isM34Item(item) ? m34SetLevel(item) : null) ?? (isR34Item(item) ? r34SetLevel(item) : null);
}

/** The codes a sheet prints in a class, as teachers write them: „1.4”; „D.3.2” in preschool. */
export function codesOf(config: WorksheetConfig, level: SchoolLevel): string[] {
  return sheetCompetences(config, level).map((r) => (r.programme === 'et-presc' ? `${r.domain}.${r.code}` : r.code));
}

function codesByLevel(levels: SchoolLevel[], config: (level: SchoolLevel) => WorksheetConfig): CatalogEntry['codes'] {
  const out: CatalogEntry['codes'] = {};
  for (const level of levels) {
    const codes = codesOf(config(level), level);
    if (codes.length) out[level] = codes;
  }
  return out;
}

/** Whether the sheet has a page with answers (the same question the generator asks: game-keys.ts; every math sheet has one). */
function hasAnswers(config: WorksheetConfig): boolean {
  if (config.category === 'math') return true;
  if (config.evaluation) return config.category === 'games';
  return config.category === 'games' && config.selectedItems.some((i) => !!gameKeySection(config, i));
}

const isFree = (config: WorksheetConfig) => config.selectedItems.every((i) => isItemAllowed(i, config.category, 'free'));

/** The classes a ready-made sheet is listed in: its own list, else every class where it prints a code (as /programa does). */
function presetLevels(p: SheetPreset): SchoolLevel[] {
  return p.levels ? inSchoolOrder(p.levels) : LEVELS.filter((l) => sheetCompetences(presetConfig(p, l), l).length > 0);
}

/** The one item a ready-made sheet opens in a class, when it is nothing more than that item. */
function soleItem(p: SheetPreset, level: SchoolLevel): ItemRef | null {
  const config = presetConfig(p, level);
  if (p.evaluation || config.selectedItems.length !== 1) return null;
  const category = config.category as ItemRef['category'];
  // a letter is listed once, by its capital; „Aa” is how it opens from clasa I (item-link.ts)
  const item = category === 'letters' ? [...config.selectedItems[0]][0] : config.selectedItems[0];
  const ref: ItemRef = { category, item };
  return JSON.stringify(itemConfig(ref, level)) === JSON.stringify(config) ? ref : null;
}

/** A ready-made sheet that is one item with settings chosen per class (nothing else): „Cât este ceasul?”. */
function tunedItem(p: SheetPreset): ItemRef | null {
  if (p.evaluation || Object.keys(p.config).some((k) => k !== 'category' && k !== 'selectedItems')) return null;
  if (p.config.selectedItems?.length !== 1 || p.config.category === 'letters') return null;
  if (Object.values(p.byLevel ?? {}).some((c) => c && 'selectedItems' in c)) return null;
  return { category: p.config.category as ItemRef['category'], item: p.config.selectedItems[0] };
}

/** The words printed on page 1 of a sheet (headings, instructions, the words to read), folded. */
function printedWords(config: WorksheetConfig): string[] {
  const [first] = buildWorksheetPages(config, 'full');
  if (!first) return [];
  const out: string[] = [];
  for (const op of flattenOps(first.ops)) {
    if (op.t !== 'text' || op.emoji) continue;
    for (const w of words(op.text)) if (w.length >= 4 && /^[a-z]+$/.test(w)) out.push(w);
  }
  return out;
}

/** At most this many extra words per sheet. */
const MAX_WORDS = 28;
/** A word printed on more than this share of the sheets („nume”, „data”, „încercuiește”) finds nothing. */
const COMMON = 0.06;

export function buildCatalog(): CatalogEntry[] {
  const items = catalogItems();
  const byItem = new Map<string, CatalogEntry>();
  const extra = new Map<string, { levels: Set<SchoolLevel>; names: string[] }>();

  // 1. the ready-made sheets: their own entry, or carried by the item they open
  const standalone: CatalogEntry[] = [];
  const carried = new Map<string, { preset: SheetPreset; level: SchoolLevel; tuned: boolean }[]>();
  for (const p of SHEET_PRESETS) {
    const levels = presetLevels(p);
    const tuned = tunedItem(p);
    const sole = levels.map((l) => soleItem(p, l) ?? tuned);
    if (levels.length && sole.every((s) => s)) {
      sole.forEach((ref, i) => {
        const key = itemParam(ref!);
        carried.set(key, [...(carried.get(key) ?? []), { preset: p, level: levels[i], tuned: !soleItem(p, levels[i]) }]);
      });
      continue;
    }
    const all = levels.length ? levels : LEVELS;
    const config = presetConfig(p, all[0]);
    const first: ItemRef = { category: config.category as ItemRef['category'], item: config.selectedItems[0] };
    const { family, subject } = familyOf(first);
    standalone.push({
      id: `fisa:${p.id}`,
      title: p.title,
      text: p.text,
      family: p.evaluation ? 'Evaluări' : family,
      subject,
      kind: p.evaluation ? 'evaluare' : 'fisa',
      levels: all,
      codes: codesByLevel(all, (l) => presetConfig(p, l)),
      free: all.every((l) => isFree(presetConfig(p, l))),
      answers: hasAnswers(config),
      preset: p.id,
    });
  }

  // 2. every item of the generator
  const entries: CatalogEntry[] = items.map((ref) => {
    const key = itemParam(ref);
    const { family, subject } = familyOf(ref);
    const from = carried.get(key) ?? [];
    const coded = LEVELS.filter((l) => sheetCompetences(itemConfig(ref, l), l).length > 0);
    const own = ref.category === 'games' ? ownLevel(ref.item) : null;
    const levels = inSchoolOrder([...coded, ...(own ? [own] : []), ...from.map((f) => f.level)]);
    extra.set(key, { levels: new Set(levels), names: from.map((f) => f.preset.title) });
    const config = itemConfig(ref, levels[0] ?? 'presc');
    const via = Object.fromEntries(from.filter((f) => f.tuned).map((f) => [f.level, f.preset.id]));
    const example = ref.category === 'math' && isMathType(ref.item) ? MATH_LABELS[ref.item].text : '';
    const entry: CatalogEntry = {
      id: key,
      title: itemTitle(ref),
      text: from[0]?.preset.text ?? (example ? example.charAt(0).toLocaleUpperCase('ro') + example.slice(1) : ITEM_TEXT[ref.category]),
      family,
      subject,
      kind: 'fisa',
      levels,
      codes: {},
      free: isFree(config),
      answers: hasAnswers(config),
      item: key,
      ...(from.length ? { presets: Array.from(new Set(from.map((f) => f.preset.id))) } : {}),
      ...(Object.keys(via).length ? { via } : {}),
    };
    byItem.set(key, entry);
    return entry;
  });

  // 3. a set without a class of its own (a maze, „Planetele”) goes where the other sets of its kind go; the games, to the small ones
  const kindOf = (e: CatalogEntry) => (e.item!.startsWith('games:') ? e.item!.split(':').slice(0, 2).join(':') : e.item!.split(':')[0]);
  for (const e of entries) {
    if (e.levels.length) continue;
    const siblings = entries.filter((o) => o !== e && kindOf(o) === kindOf(e)).flatMap((o) => Array.from(extra.get(o.id)!.levels));
    e.levels = siblings.length ? inSchoolOrder(siblings) : ['presc', 'CP'];
  }
  for (const e of entries) e.codes = codesByLevel(e.levels, (l) => entryConfig(e, l)!);

  // 4. more words to find a sheet by: the names of the ready-made sheets it carries, and what is printed on it
  const printed = new Map<string, string[]>();
  for (const e of [...standalone, ...entries]) {
    const config = entryConfig(e, e.levels[0])!;
    if (config.category !== 'games') continue;
    // without the class: the line with the competence at the bottom of the page is not what the sheet is about
    printed.set(e.id, Array.from(new Set(printedWords({ ...config, curriculumLevel: undefined }))));
  }
  const seenIn = new Map<string, number>();
  for (const list of Array.from(printed.values())) for (const w of list) seenIn.set(w, (seenIn.get(w) ?? 0) + 1);
  const tooCommon = Math.max(8, Math.round(printed.size * COMMON));
  for (const e of [...standalone, ...entries]) {
    const known = new Set(words(`${e.title} ${e.text ?? ''} ${e.family}`));
    const names = (extra.get(e.id)?.names ?? []).flatMap((n) => words(n));
    const more = [...names, ...(printed.get(e.id) ?? []).filter((w) => (seenIn.get(w) ?? 0) <= tooCommon)].filter((w) => !known.has(w));
    const unique = Array.from(new Set(more)).slice(0, MAX_WORDS);
    if (unique.length) e.words = unique.map(fold).join(' ');
  }

  return [...standalone, ...entries];
}

let cached: CatalogEntry[] | null = null;
/** The catalogue, built once. */
export function catalog(): CatalogEntry[] {
  return (cached ??= buildCatalog());
}
