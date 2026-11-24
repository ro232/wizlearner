import type { PageOps } from '@/lib/glyphs/types';
import type { Script, Tier } from '@/types';
import { ALPHABETS } from '@/lib/glyphs/data';
import { isItemAllowed } from '@/lib/access';
import { buildAlphabetPages, posterLetters } from './alphabet';
import { buildCardPages, cardsFor, CARD_SET_TITLES, type CardSet, type LetterCase } from './cards';
import { buildTokenPages, tokenList, type TokenSet, type TokenShape } from './tokens';
import { buildDiplomaPages, diplomaById, DIPLOMAS, type DiplomaId, type DiplomaText } from './diplomas';
import { buildTimetablePages, buildTodayPages } from './classroom';
import type { BorderStyle, InkMode } from './common';

/**
 * „Planșe pentru clasă” (/planse): one set of settings for every printable, the rule of what the
 * free plan downloads, and what may be saved in the account.
 *
 * Free plan: the alphabet posters and the letter cards of the free letters (A–E, with Ă and Â, as
 * everywhere on the site), and a diploma for one child, with the small „Creat cu …” line.
 * Full plan: everything else — the whole alphabet, syllables, picture and number cards, tokens,
 * diplomas for a whole list of names, the timetable and the „Ziua de azi” board — without the line.
 */

export type PrintableKind = 'alphabet' | 'cards' | 'tokens' | 'diploma' | 'timetable' | 'today';

export const PRINTABLE_KINDS: PrintableKind[] = ['alphabet', 'cards', 'tokens', 'diploma', 'timetable', 'today'];

/** Lowercase identifiers for analytics (ALLOWED_PROPS in src/lib/analytics.ts) and the address (?p=). */
export const PRINTABLE_IDS: Record<PrintableKind, string> = {
  alphabet: 'alfabet',
  cards: 'cartonase',
  tokens: 'jetoane',
  diploma: 'diplome',
  timetable: 'orar',
  today: 'ziua-de-azi',
};

export const PRINTABLE_TITLES: Record<PrintableKind, string> = {
  alphabet: 'Alfabetul pe perete',
  cards: 'Cartonașe',
  tokens: 'Jetoane',
  diploma: 'Diplome',
  timetable: 'Orarul clasei',
  today: 'Ziua de azi',
};

/** Every setting of every printable: what the page keeps, what a saved project holds. No names, no typed text. */
export interface PrintableSettings {
  kind: PrintableKind;
  /** Alphabet posters, letter / syllable / picture cards (capitals; empty = all). */
  letters: string[];
  script: Script;
  ink: InkMode;
  border: BorderStyle;
  strokeOrder: boolean;
  cardSet: CardSet;
  perPage: 8 | 12;
  backs: boolean;
  letterCase: LetterCase;
  numberMax: 10 | 20 | 100;
  objects: boolean;
  tokenSet: TokenSet;
  tokenShape: TokenShape;
  diploma: DiplomaId;
  feminine: boolean;
  nameScript: Script;
  /** Timetable: lessons a day. */
  lessons: number;
}

export const DEFAULT_PRINTABLE: PrintableSettings = {
  kind: 'alphabet',
  letters: [],
  script: 'print',
  ink: 'color',
  border: 'simple',
  strokeOrder: false,
  cardSet: 'letters',
  perPage: 12,
  backs: false,
  letterCase: 'upper',
  numberMax: 20,
  objects: false,
  tokenSet: 'math',
  tokenShape: 'round',
  diploma: 'merit',
  feminine: false,
  nameScript: 'cursive',
  lessons: 5,
};

export const EMPTY_TEXT: DiplomaText = { names: [] };

export function buildPrintablePages(s: PrintableSettings, text: DiplomaText, tier: Tier): PageOps[] {
  switch (s.kind) {
    case 'alphabet':
      return buildAlphabetPages({ letters: s.letters, script: s.script, ink: s.ink, border: s.border, strokeOrder: s.strokeOrder }, tier);
    case 'cards':
      return buildCardPages(cardOptions(s), tier);
    case 'tokens':
      return buildTokenPages({ set: s.tokenSet, shape: s.tokenShape, letterCase: s.letterCase, numberMax: s.numberMax === 10 ? 10 : 20 }, tier);
    case 'diploma':
      return buildDiplomaPages({ diploma: s.diploma, feminine: s.feminine, nameScript: s.nameScript, border: s.border }, text, tier);
    case 'timetable':
      return buildTimetablePages({ lessons: s.lessons, border: s.border }, tier);
    case 'today':
      return buildTodayPages({ border: s.border }, tier);
  }
}

const cardOptions = (s: PrintableSettings) => ({ set: s.cardSet, letters: s.letters, perPage: s.perPage, backs: s.backs, script: s.script, letterCase: s.letterCase, numberMax: s.numberMax, objects: s.objects });

/** How many things a download holds (posters, cards, tokens, diplomas): for the button and analytics. */
export function printableCount(s: PrintableSettings, text: DiplomaText): number {
  switch (s.kind) {
    case 'alphabet': return posterLetters(s.letters).length;
    case 'cards': return cardsFor(cardOptions(s)).length;
    case 'tokens': return tokenList({ set: s.tokenSet, shape: s.tokenShape, letterCase: s.letterCase, numberMax: s.numberMax === 10 ? 10 : 20 }).length;
    case 'diploma': return Math.max(1, text.names.filter((n) => n.trim()).length);
    default: return 1;
  }
}

const freeLetter = (l: string) => isItemAllowed(l, 'letters', 'free');
export const FREE_LETTERS = ALPHABETS.ro.filter(freeLetter);

export interface Allowed {
  settings: PrintableSettings;
  text: DiplomaText;
  /** Part of what was asked (some letters, the first name), not all of it. */
  partial: boolean;
}

/**
 * What this plan downloads of what is on screen: all of it, the free part of it, or nothing
 * (null: the whole printable belongs to the full plan). A convenience gate in the browser, like
 * src/lib/access.ts; the plan itself is only ever set on the server.
 */
export function allowedPrintable(s: PrintableSettings, text: DiplomaText, tier: Tier): Allowed | null {
  if (tier !== 'free') return { settings: s, text, partial: false };
  if (s.kind === 'alphabet' || (s.kind === 'cards' && s.cardSet === 'letters')) {
    const asked = posterLetters(s.letters);
    const free = asked.filter(freeLetter);
    if (!free.length) return null;
    return { settings: { ...s, letters: free }, text, partial: free.length < asked.length };
  }
  if (s.kind === 'diploma') {
    const names = text.names.filter((n) => n.trim());
    return { settings: s, text: { ...text, names: names.slice(0, 1) }, partial: names.length > 1 };
  }
  return null;
}

// ───────────────────────── saved projects ─────────────────────────

const obj = (raw: unknown): Record<string, unknown> => (raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {});
const oneOf = <T extends string | number>(v: unknown, allowed: readonly T[], fallback: T): T => ((allowed as readonly unknown[]).includes(v) ? (v as T) : fallback);
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);

/**
 * The settings, and only the settings, of a printable: what goes into a saved project or a row of
 * the download history, and how one written by an older version of the site is read back. Built
 * key by key from the known fields, so nothing typed on the page (the children's names, the
 * teacher, the school, the date, a title of her own) can ever travel with it.
 */
export function sanitizePrintable(raw: unknown): PrintableSettings {
  const r = obj(raw);
  const d = DEFAULT_PRINTABLE;
  return {
    kind: oneOf(r.kind, PRINTABLE_KINDS, d.kind),
    letters: Array.isArray(r.letters) ? ALPHABETS.ro.filter((l) => (r.letters as unknown[]).includes(l)) : [],
    script: oneOf(r.script, ['print', 'cursive'] as const, d.script),
    ink: oneOf(r.ink, ['color', 'outline'] as const, d.ink),
    border: oneOf(r.border, ['simple', 'dots', 'none'] as const, d.border),
    strokeOrder: bool(r.strokeOrder, d.strokeOrder),
    cardSet: oneOf(r.cardSet, Object.keys(CARD_SET_TITLES) as CardSet[], d.cardSet),
    perPage: oneOf(r.perPage, [8, 12] as const, d.perPage),
    backs: bool(r.backs, d.backs),
    letterCase: oneOf(r.letterCase, ['upper', 'lower'] as const, d.letterCase),
    numberMax: oneOf(r.numberMax, [10, 20, 100] as const, d.numberMax),
    objects: bool(r.objects, d.objects),
    tokenSet: oneOf(r.tokenSet, ['math', 'letters'] as const, d.tokenSet),
    tokenShape: oneOf(r.tokenShape, ['round', 'square'] as const, d.tokenShape),
    diploma: oneOf(r.diploma, DIPLOMAS.map((x) => x.id), d.diploma),
    feminine: bool(r.feminine, d.feminine),
    nameScript: oneOf(r.nameScript, ['print', 'cursive'] as const, d.nameScript),
    lessons: oneOf(r.lessons, [4, 5, 6, 7] as const, d.lessons as 5),
  };
}

/** A short name for a saved printable or a history row, from the settings alone („Cartonașe: silabe”). */
export function printableTitle(s: PrintableSettings): string {
  switch (s.kind) {
    case 'alphabet': {
      const n = posterLetters(s.letters).length;
      return n === ALPHABETS.ro.length ? 'Alfabetul pe perete' : `Alfabetul pe perete: ${posterLetters(s.letters).slice(0, 8).join(', ')}${n > 8 ? '…' : ''}`;
    }
    case 'cards':
      return `Cartonașe: ${CARD_SET_TITLES[s.cardSet].toLocaleLowerCase('ro')}`;
    case 'tokens':
      return s.tokenSet === 'math' ? 'Jetoane: numere și semne' : 'Jetoane: litere';
    case 'diploma':
      return `Diplome: ${diplomaById(s.diploma).label}`;
    default:
      return PRINTABLE_TITLES[s.kind];
  }
}
