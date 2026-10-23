import type { PageOps } from '@/lib/glyphs/types';
import { DEFAULT_CONFIG, type Difficulty, type LetterMode, type WorksheetConfig } from '@/types';
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
  /** A different level for some children (keyed by name as listed). */
  levels?: Record<string, Difficulty>;
  /** Weekly pack: after each child's sheet, a "find the letter" page per letter of the week. */
  withFindPages?: boolean;
}

/** A pasted list (one per line, or separated by commas) → clean, unique names. */
export function parseNames(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/[\n,;]+/)) {
    const name = normalizeKey(raw).replace(/^\s*\d+[.)]\s*/, '').replace(/\s+/g, ' ').trim();
    if (!name) continue;
    const key = name.toLocaleLowerCase('ro');
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
    if (out.length >= MAX_CHILDREN) break;
  }
  return out;
}

const LEVEL: Record<Difficulty, Partial<WorksheetConfig>> = {
  beginner: { fontStyle: 'dashed', tracingVisibility: 8 },
  intermediate: { fontStyle: 'dotted', tracingVisibility: 5 },
  advanced: { fontStyle: 'outline', tracingVisibility: 3 },
};

/** The sheet of one child: their name first, then the letters of the week, then the theme words. */
export function childSheetConfig(name: string, opts: Omit<GroupOptions, 'names'>): WorksheetConfig {
  const theme = themeById(opts.themeId);
  // One page per child: the name, up to two letters of the week, then as many theme words as fit.
  const letters = opts.letters.slice(0, MAX_LETTERS);
  const room = ROWS_PER_SHEET - 1 - letters.length;
  const words = theme ? theme.words.slice(0, room).map((w) => w.word) : [];
  const wordPictures = theme ? Object.fromEntries(theme.words.map((w) => [w.word, w.emoji])) : {};
  return {
    ...DEFAULT_CONFIG,
    ...LEVEL[opts.difficulty],
    category: 'letters',
    alphabet: 'ro',
    letterMode: opts.letterMode,
    difficulty: opts.difficulty,
    letterSize: 'medium',
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
  for (const name of opts.names) {
    // Built as "full": the group feature itself is what is paid for (checked by the page).
    const difficulty = opts.levels?.[name] ?? opts.difficulty;
    const sheet = buildWorksheetPages(childSheetConfig(name, { ...opts, difficulty }), 'full');
    if (opts.withFindPages && opts.letters.length) {
      const games = { ...childSheetConfig(name, { ...opts, difficulty }), category: 'games' as const, selectedItems: opts.letters.slice(0, MAX_LETTERS).map((l) => `find:${l}`) };
      sheet.push(...buildWorksheetPages(games, 'full'));
    }
    perChild.push(sheet.length);
    pages.push(...sheet);
  }
  return { pages, perChild };
}
