/**
 * „Caută fișe” (/cauta): the shape of one catalogue entry and the search itself. Nothing heavy is
 * imported here: the page sends the catalogue (built once, at build time, by ./index.ts) to the
 * browser, and every keystroke is answered there, without a server call.
 */
import type { SchoolLevel } from '@/lib/curriculum/sheet';

export const SUBJECTS = [
  { id: 'romana', label: 'Limba română' },
  { id: 'matematica', label: 'Matematică' },
  { id: 'mediu', label: 'Explorarea mediului' },
  { id: 'arte', label: 'Arte vizuale' },
  { id: 'dezvoltare', label: 'Dezvoltare personală' },
  { id: 'engleza', label: 'Limba engleză' },
  { id: 'jocuri', label: 'Jocuri' },
] as const;
export type SubjectId = (typeof SUBJECTS)[number]['id'];

export const KINDS = [
  { id: 'fisa', label: 'Fișă' },
  { id: 'evaluare', label: 'Evaluare' },
] as const;
export type KindId = (typeof KINDS)[number]['id'];

/** The classes, as the chips and the badges name them; `words` are what people type for them. */
export const CLASSES: { id: SchoolLevel; label: string; short: string; words: string }[] = [
  { id: 'presc', label: 'Grădiniță', short: 'Grădiniță', words: 'gradinita prescolar prescolari' },
  { id: 'CP', label: 'Clasa pregătitoare', short: 'Pregătitoare', words: 'clasa pregatitoare cp' },
  { id: 'I', label: 'Clasa I', short: 'Clasa I', words: 'clasa i 1 intai' },
  { id: 'II', label: 'Clasa a II-a', short: 'Clasa a II-a', words: 'clasa ii 2 doua' },
  { id: 'III', label: 'Clasa a III-a', short: 'Clasa a III-a', words: 'clasa iii 3 treia' },
  { id: 'IV', label: 'Clasa a IV-a', short: 'Clasa a IV-a', words: 'clasa iv 4 patra' },
];

export interface CatalogEntry {
  /** Unique: "fisa:<preset>" for a ready-made sheet, "<category>:<item>" for one item of the generator. */
  id: string;
  title: string;
  /** One line about what the child does on it, where the code has one. */
  text?: string;
  /** The group it belongs to in the generator: „Citire și scriere”, „Explorarea mediului”. */
  family: string;
  subject: SubjectId;
  kind: KindId;
  /** The classes it suits, in school order (never empty). */
  levels: SchoolLevel[];
  /** The competence codes the sheet prints in each class („1.4”, „D.3.2”); a class without a code is left out. */
  codes: Partial<Record<SchoolLevel, string[]>>;
  /** Printable on the free plan (the same rule as the generator: access.ts). */
  free: boolean;
  /** Has a page with answers. */
  answers: boolean;
  /** Opens with /generator?fisa=<preset>. */
  preset?: string;
  /** Opens with /generator?item=<category>:<item>. */
  item?: string;
  /** Ready-made sheets (curriculum/presets.ts) that open exactly this item. */
  presets?: string[];
  /** Classes in which the item opens through its ready-made sheet, tuned for that class (the clock: half hours in clasa I, minutes in clasa a II-a). */
  via?: Partial<Record<SchoolLevel, string>>;
  /** More words to find it by (other names, words printed on the sheet), already folded. */
  words?: string;
}

export interface Filters {
  q: string;
  level?: SchoolLevel;
  subject?: SubjectId;
  kind?: KindId;
  free?: boolean;
  answers?: boolean;
}

/** Lowercase, without diacritics: „Școală”, „şcoală” and „scoala” are the same word. */
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

/** The words of a text, folded; a competence code („1.4”, „d.3.2”) stays one word. */
export function words(text: string): string[] {
  return fold(text)
    .split(/[^a-z0-9.]+/)
    .map((w) => w.replace(/^\.+|\.+$/g, ''))
    .filter(Boolean);
}

/** Words that say nothing about which sheet is meant („fișe de adunare” is a search for „adunare”). */
const FILLER = new Set(['fisa', 'fise', 'fisele', 'fisa.', 'de', 'la', 'cu', 'pentru', 'si', 'in', 'a', 'al', 'ale', 'lucru', 'pdf', 'copii', 'copiii']);
const CODE = /^([a-z]\.)?\d+\.\d+(\.\d+)?$/;

/** The words of a search that count. */
export function queryTokens(q: string): string[] {
  return words(q).filter((w) => !FILLER.has(w));
}

export interface Prepared {
  entry: CatalogEntry;
  title: string;
  titleWords: string[];
  restWords: string[];
  moreWords: string[];
  /** Codes per class, folded; `all` is every class together. */
  codes: Record<string, string[]>;
}

/** Done once when the page loads: everything folded and split, so a keystroke only compares strings. */
export function prepare(entries: CatalogEntry[]): Prepared[] {
  const subject = Object.fromEntries(SUBJECTS.map((s) => [s.id, s.label])) as Record<string, string>;
  const kind = Object.fromEntries(KINDS.map((k) => [k.id, k.label])) as Record<string, string>;
  return entries.map((entry) => {
    const codes: Record<string, string[]> = { all: [] };
    for (const [level, list] of Object.entries(entry.codes)) {
      codes[level] = (list ?? []).map(fold);
      codes.all.push(...codes[level]);
    }
    const classWords = CLASSES.filter((c) => entry.levels.includes(c.id)).map((c) => c.words).join(' ');
    return {
      entry,
      title: fold(entry.title),
      titleWords: words(entry.title),
      restWords: words(`${entry.family} ${entry.text ?? ''} ${subject[entry.subject]} ${kind[entry.kind]} ${classWords}`),
      moreWords: entry.words ? entry.words.split(' ') : [],
      codes,
    };
  });
}

/**
 * How well one word of the search fits one list of words: the whole word, its beginning, or the
 * beginning without the last letter or two, so that „adunare” finds „Adunări” and „silabe” finds
 * „silabă”. One- and two-letter words („i”, „2”) must be the whole word.
 */
function fit(token: string, list: string[]): number {
  let best = 0;
  const stem1 = token.length >= 5 ? token.slice(0, -1) : null;
  const stem2 = token.length >= 7 ? token.slice(0, -2) : null;
  for (const w of list) {
    if (w === token) return 1;
    if (token.length < 3) continue;
    if (w.startsWith(token)) best = Math.max(best, 0.9);
    else if (stem1 && w.startsWith(stem1)) best = Math.max(best, 0.6);
    else if (stem2 && w.startsWith(stem2)) best = Math.max(best, 0.5);
  }
  return best;
}

/** The score of one word of the search for one sheet; 0 when the sheet has nothing to do with it. */
function tokenScore(token: string, p: Prepared, level?: SchoolLevel): number {
  if (CODE.test(token)) {
    const codes = (level && p.codes[level]) || p.codes.all;
    // „1.4” also finds preschool's „D.1.4”? No: codes are compared whole, as teachers write them.
    if (codes.includes(token)) return 80;
  }
  const inTitle = fit(token, p.titleWords);
  if (inTitle) return 100 * inTitle;
  if (token.length >= 3 && p.title.includes(token)) return 45;
  const inRest = fit(token, p.restWords);
  if (inRest) return 40 * inRest;
  const inMore = fit(token, p.moreWords);
  return inMore ? 15 * inMore : 0;
}

export function matchesFilters(entry: CatalogEntry, f: Omit<Filters, 'q'>): boolean {
  if (f.level && !entry.levels.includes(f.level)) return false;
  if (f.subject && entry.subject !== f.subject) return false;
  if (f.kind && entry.kind !== f.kind) return false;
  if (f.free && !entry.free) return false;
  if (f.answers && !entry.answers) return false;
  return true;
}

/**
 * The sheets that fit: every word of the search must be found (in the title, the description, the
 * family, the class, the codes or the words on the sheet) and every chosen filter must hold.
 * Best fit first; without words, the catalogue's own order.
 */
export function search(prepared: Prepared[], filters: Filters): CatalogEntry[] {
  const tokens = queryTokens(filters.q);
  const hits: { entry: CatalogEntry; score: number; size: number; at: number }[] = [];
  prepared.forEach((p, at) => {
    if (!matchesFilters(p.entry, filters)) return;
    let score = 0;
    for (const t of tokens) {
      const s = tokenScore(t, p, filters.level);
      if (!s) return;
      score += s;
    }
    hits.push({ entry: p.entry, score, size: tokens.length ? p.titleWords.length : 0, at });
  });
  // equally good: the shorter title first („Adunări” before „Adunări 0–31”), then the catalogue's order
  return hits.sort((a, b) => b.score - a.score || a.size - b.size || a.at - b.at).map((h) => h.entry);
}

/** The class a result opens in: the chosen one when the sheet suits it, else the first class of the sheet. */
export function openLevel(entry: CatalogEntry, level?: SchoolLevel): SchoolLevel {
  return level && entry.levels.includes(level) ? level : entry.levels[0];
}

/** The generator link of a result (the same addresses as presetHref and itemHref). */
export function entryHref(entry: CatalogEntry, level?: SchoolLevel): string {
  const clasa = openLevel(entry, level);
  const preset = entry.preset ?? entry.via?.[clasa];
  return preset ? `/generator?fisa=${encodeURIComponent(preset)}&clasa=${clasa}` : `/generator?item=${encodeURIComponent(entry.item ?? '')}&clasa=${clasa}`;
}

// ───────────────────────── the address of a search ─────────────────────────

const has = <T extends { id: string }>(list: readonly T[], id: string | null): boolean => !!id && list.some((x) => x.id === id);

/** /cauta?q=silabe&clasa=I&materie=romana&tip=fisa&gratuite=1&raspunsuri=1 → filters (unknown values are ignored). */
export function filtersFromQuery(params: URLSearchParams): Filters {
  const clasa = params.get('clasa');
  const level = CLASSES.find((c) => c.id.toLowerCase() === clasa?.toLowerCase())?.id;
  const materie = params.get('materie');
  const tip = params.get('tip');
  return {
    q: (params.get('q') ?? '').slice(0, 80),
    ...(level ? { level } : {}),
    ...(has(SUBJECTS, materie) ? { subject: materie as SubjectId } : {}),
    ...(has(KINDS, tip) ? { kind: tip as KindId } : {}),
    ...(params.get('gratuite') === '1' ? { free: true } : {}),
    ...(params.get('raspunsuri') === '1' ? { answers: true } : {}),
  };
}

export function filtersToQuery(f: Filters): string {
  const params = new URLSearchParams();
  if (f.q.trim()) params.set('q', f.q.trim());
  if (f.level) params.set('clasa', f.level);
  if (f.subject) params.set('materie', f.subject);
  if (f.kind) params.set('tip', f.kind);
  if (f.free) params.set('gratuite', '1');
  if (f.answers) params.set('raspunsuri', '1');
  return params.toString();
}

/** For analytics: how many results, as a band (never the words typed). */
export function resultBand(n: number): string {
  return n === 0 ? '0' : n <= 5 ? '1-5' : n <= 20 ? '6-20' : n <= 100 ? '21-100' : '100plus';
}
