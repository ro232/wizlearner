import type { PageOps } from '@/lib/glyphs/types';
import { DEFAULT_CONFIG, type Difficulty, type LetterMode, type Script, type WorksheetConfig } from '@/types';
import { normalizeKey } from '@/lib/glyphs/data';
import { themeById } from '@/lib/themes';
import { buildWorksheetPages } from './layout';

/** Kindergarten groups and classes rarely pass 30; the cap keeps one PDF printable. */
export const MAX_CHILDREN = 40;
/** Rows on one child's page, and how many of them can be letters of the week. */
export const ROWS_PER_SHEET = 7;
export const MAX_LETTERS = 2;

export interface GroupOptions {
  /** One child per entry, as the teacher typed them. */
  names: string[];
  /** A weekly theme (its words are traced, with pictures), or none. */
  themeId?: string;
  /** Letters of the week, traced before the words. */
  letters: string[];
  letterMode: LetterMode;
  difficulty: Difficulty;
  /** A different level for some children, by the child's key (see NameList.keys; the name, for a name that appears once). */
  levels?: Record<string, Difficulty>;
  /** The key of each child, in the order of `names`; without it the name is the key. */
  keys?: string[];
  /** Weekly pack: after each child's sheet, a "find the letter" page per letter of the week. */
  withFindPages?: boolean;
  /** Print letters (default) or joined handwriting, for the first grade. */
  script?: Script;
}

export interface NameList {
  /** One entry per child, in the order of the list, at most MAX_CHILDREN. Namesakes are kept. */
  names: string[];
  /** A stable key per child for settings kept beside the list (the level): the name, and
   *  "Maria#2" for the second child with the same name. */
  keys: string[];
  /** How many names the list has in all (more than `names.length` when it passes the cap). */
  total: number;
  /** Names that appear more than once, each with how many times ("Maria", 2). */
  repeated: { name: string; count: number }[];
}

/** One cell or line → a name: no row number in front, single spaces, ş → ș. */
function cleanName(raw: string): string {
  return normalizeKey(raw)
    .replace(/^\s*\d+\s*[.):\-–]?\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** A table cell that can be part of a name: it has letters and no digits (not "3", "5 ani", "12.03.2021"). */
const isNameCell = (cell: string) => /\p{L}/u.test(cell) && !/\d/.test(cell);

/**
 * A pasted list → the children, one sheet each.
 *   - one name per line, or names separated by commas or semicolons;
 *   - a row copied from a spreadsheet (names separated by tabs);
 *   - a table copied from the class register (several lines with tabs: "1 ⇥ Popescu Ana ⇥ 5 ani"):
 *     one child per line, made of the cells that look like a name.
 * Two children with the same name both stay on the list: each gets a sheet.
 */
export function parseNameList(text: string): NameList {
  const lines = text.split(/[\r\n]+/);
  const table = lines.filter((l) => l.includes('\t') && l.trim()).length > 1;
  const all: string[] = [];
  for (const line of lines) {
    const cells = line.includes('\t') ? line.split('\t').map((c) => c.trim()).filter(isNameCell) : [line];
    const entries = table && line.includes('\t') ? [cells.join(' ')] : cells;
    for (const entry of entries) {
      for (const raw of entry.split(/[,;]+/)) {
        const name = cleanName(raw);
        if (name) all.push(name);
      }
    }
  }

  const names = all.slice(0, MAX_CHILDREN);
  const seen = new Map<string, number>();
  const firstSpelling = new Map<string, string>();
  const keys = names.map((name) => {
    const k = name.toLocaleLowerCase('ro');
    const n = (seen.get(k) ?? 0) + 1;
    seen.set(k, n);
    if (n === 1) firstSpelling.set(k, name);
    return n === 1 ? name : `${name}#${n}`;
  });
  const repeated = [...seen.entries()].filter(([, n]) => n > 1).map(([k, count]) => ({ name: firstSpelling.get(k) ?? k, count }));
  return { names, keys, total: all.length, repeated };
}

/** The names of a pasted list (see parseNameList). */
export function parseNames(text: string): string[] {
  return parseNameList(text).names;
}

const LEVEL: Record<Difficulty, Partial<WorksheetConfig>> = {
  beginner: { fontStyle: 'dashed', tracingVisibility: 8 },
  intermediate: { fontStyle: 'dotted', tracingVisibility: 5 },
  advanced: { fontStyle: 'dotted', tracingVisibility: 3 },
};

/** The sheet of one child: their name first, then the letters of the week, then the theme words. */
export function childSheetConfig(name: string, opts: Omit<GroupOptions, 'names'>): WorksheetConfig {
  const theme = themeById(opts.themeId);
  // One page per child: the name, up to two letters of the week, then as many theme words as fit.
  const cursive = opts.script === 'cursive';
  // Handwriting is practised as capital + small letter (Aa), the small one joined in words.
  const letters = opts.letters.slice(0, MAX_LETTERS).map((l) => (cursive && l.length === 1 ? `${l.toUpperCase()}${l.toLowerCase()}` : l));
  const room = ROWS_PER_SHEET - 1 - letters.length;
  const words = theme ? theme.words.slice(0, room).map((w) => w.word) : [];
  const wordPictures = theme ? Object.fromEntries(theme.words.map((w) => [w.word, w.emoji])) : {};
  return {
    ...DEFAULT_CONFIG,
    ...LEVEL[opts.difficulty],
    category: 'letters',
    alphabet: 'ro',
    letterMode: cursive ? 'paired' : opts.letterMode,
    script: opts.script ?? 'print',
    difficulty: opts.difficulty,
    // Handwriting rows are taller (tails under the line): one size down keeps a child on one page.
    letterSize: cursive ? 'small' : 'medium',
    selectedItems: letters,
    customWords: [name, ...words],
    wordPictures,
    childName: name,
    customTitle: theme ? `Tema: ${theme.title}` : 'Fișa mea',
    rowsPerPage: ROWS_PER_SHEET,
    repetitionsPerItem: 1,
    fillPage: false,
    showLetterIcons: true,
  };
}

/** Every child's sheet, one after another, ready for one PDF. */
export function buildGroupPages(opts: GroupOptions): { pages: PageOps[]; perChild: number[] } {
  const pages: PageOps[] = [];
  const perChild: number[] = [];
  opts.names.forEach((name, i) => {
    // Built as "full": the group feature itself is what is paid for (checked by the page).
    const difficulty = opts.levels?.[opts.keys?.[i] ?? name] ?? opts.difficulty;
    const sheet = buildWorksheetPages(childSheetConfig(name, { ...opts, difficulty }), 'full');
    if (opts.withFindPages && opts.letters.length) {
      const games = { ...childSheetConfig(name, { ...opts, difficulty }), category: 'games' as const, selectedItems: opts.letters.slice(0, MAX_LETTERS).map((l) => `find:${l}`) };
      sheet.push(...buildWorksheetPages(games, 'full'));
    }
    perChild.push(sheet.length);
    pages.push(...sheet);
  });
  return { pages, perChild };
}
