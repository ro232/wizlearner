import type { GlyphDef, Glyph } from './types';
import { buildGlyph } from './geometry';

/**
 * Stroke data for the tracing alphabet ("litere de tipar" – simple print
 * letters), digits and basic shapes. Strokes are listed in the order a child
 * is taught to draw them; see geometry.ts for the DSL and the coordinate
 * system (cap height 100, x-height 50, baseline 100, descender 135).
 */

// ───────────────────────── uppercase ─────────────────────────

const UPPER: Record<string, GlyphDef> = {
  A: { width: 80, strokes: ['M 40 0 L 0 100', 'M 40 0 L 80 100', 'M 14 65 L 66 65'] },
  B: {
    width: 54,
    strokes: ['M 0 0 L 0 100', 'M 0 0 L 28 0 A 28 24 22 24 -90 90 L 0 48 l 28 48 A 28 74 26 26 -90 90 L 0 100'],
    arrows: [0.5, [0.22, 0.72]],
  },
  C: { width: 76, strokes: ['A 38 50 38 50 -40 -320'], arrows: [0.3] },
  D: { width: 70, strokes: ['M 0 0 L 0 100', 'M 0 0 L 22 0 A 22 50 48 50 -90 90 L 0 100'], arrows: [0.5, 0.45] },
  E: { width: 58, strokes: ['M 0 0 L 0 100', 'M 0 0 L 58 0', 'M 0 50 L 48 50', 'M 0 100 L 58 100'] },
  F: { width: 58, strokes: ['M 0 0 L 0 100', 'M 0 0 L 58 0', 'M 0 50 L 46 50'] },
  G: { width: 76, strokes: ['A 38 50 38 50 -40 -360 L 42 50'], arrows: [[0.3, 0.9]] },
  H: { width: 70, strokes: ['M 0 0 L 0 100', 'M 70 0 L 70 100', 'M 0 50 L 70 50'] },
  I: { width: 0, strokes: ['M 0 0 L 0 100'] },
  J: { width: 56, strokes: ['M 56 0 L 56 70 A 28 70 28 30 0 180'], arrows: [0.4] },
  K: { width: 66, strokes: ['M 0 0 L 0 100', 'M 60 0 L 0 55', 'M 14 42 L 66 100'] },
  L: { width: 56, strokes: ['M 0 0 L 0 100 L 56 100'] },
  M: { width: 90, strokes: ['M 0 0 L 0 100', 'M 0 0 L 45 72 L 90 0 L 90 100'] },
  N: { width: 70, strokes: ['M 0 0 L 0 100', 'M 0 0 L 70 100 L 70 0'] },
  O: { width: 80, strokes: ['A 40 50 40 50 -90 -450'], arrows: [0.25] },
  P: { width: 62, strokes: ['M 0 0 L 0 100', 'M 0 0 L 32 0 A 32 26 30 26 -90 90 L 0 52'], arrows: [0.5, 0.45] },
  Q: { width: 80, strokes: ['A 40 50 40 50 -90 -450', 'M 50 66 L 80 104'], arrows: [0.25, 0.5] },
  R: { width: 66, strokes: ['M 0 0 L 0 100', 'M 0 0 L 32 0 A 32 26 30 26 -90 90 L 0 52', 'M 26 52 L 66 100'], arrows: [0.5, 0.45, 0.5] },
  S: { width: 64, strokes: ['A 32 25 30 25 -30 -270 A 32 75 30 25 -90 150'], arrows: [[0.2, 0.75]] },
  T: { width: 70, strokes: ['M 35 0 L 35 100', 'M 0 0 L 70 0'] },
  U: { width: 70, strokes: ['M 0 0 L 0 65 A 35 65 35 35 180 0 L 70 0'], arrows: [[0.2, 0.82]] },
  V: { width: 76, strokes: ['M 0 0 L 38 100 L 76 0'] },
  W: { width: 100, strokes: ['M 0 0 L 25 100 L 50 0 L 75 100 L 100 0'] },
  X: { width: 70, strokes: ['M 0 0 L 70 100', 'M 70 0 L 0 100'] },
  Y: { width: 72, strokes: ['M 0 0 L 36 50 L 36 100', 'M 72 0 L 36 50'] },
  Z: { width: 66, strokes: ['M 0 0 L 66 0 L 0 100 L 66 100'] },
};

// Romanian letters: base letter strokes + diacritic as the last stroke.
UPPER['Ă'] = { marks: 1, width: 80, strokes: [...UPPER.A.strokes, 'A 40 -30 16 10 200 -20'], arrows: [0.5, 0.5, 0.5, null] };
UPPER['Â'] = { marks: 1, width: 80, strokes: [...UPPER.A.strokes, 'M 24 -20 L 40 -34 L 56 -20'], arrows: [0.5, 0.5, 0.5, null] };
UPPER['Î'] = { marks: 1, width: 0, strokes: [...UPPER.I.strokes, 'M -16 -20 L 0 -34 L 16 -20'], arrows: [0.5, null] };
UPPER['Ș'] = { marks: 1, width: 64, strokes: [...UPPER.S.strokes, 'M 35 106 C 36 114 33 121 27 126'], arrows: [[0.2, 0.75], null] };
UPPER['Ț'] = { marks: 1, width: 70, strokes: [...UPPER.T.strokes, 'M 37 106 C 38 114 35 121 29 126'], arrows: [0.5, 0.5, null] };

// ───────────────────────── lowercase ─────────────────────────

const LOWER: Record<string, GlyphDef> = {
  a: { width: 52, strokes: ['A 26 75 26 25 -90 -450', 'M 52 50 L 52 100'], arrows: [0.25, 0.5] },
  b: { width: 52, strokes: ['M 0 0 L 0 100', 'A 26 75 26 25 180 540'], arrows: [0.5, 0.25] },
  c: { width: 52, strokes: ['A 26 75 26 25 -40 -320'], arrows: [0.3] },
  d: { width: 52, strokes: ['A 26 75 26 25 -90 -450', 'M 52 0 L 52 100'], arrows: [0.25, 0.5] },
  e: { width: 54, strokes: ['M 2 75 L 52 75 A 27 75 25 25 0 -320'], arrows: [[0.2, 0.6]] },
  f: { width: 42, strokes: ['A 28 14 14 14 -30 -180 L 14 100', 'M 0 50 L 30 50'], arrows: [0.55, 0.5] },
  g: { width: 52, strokes: ['A 26 75 26 25 -90 -450', 'M 52 50 L 52 108 A 30 108 22 27 0 180'], arrows: [0.25, 0.35] },
  h: { width: 54, strokes: ['M 0 0 L 0 100', 'M 0 77 A 27 77 27 27 180 360 L 54 100'], arrows: [0.5, 0.45] },
  i: { width: 0, strokes: ['M 0 50 L 0 100', 'M 0 30 L 0 30.01'], arrows: [0.5, null] },
  j: { width: 22, strokes: ['M 22 50 L 22 108 A 11 108 11 27 0 180', 'M 22 30 L 22 30.01'], arrows: [0.35, null] },
  k: { width: 50, strokes: ['M 0 0 L 0 100', 'M 44 50 L 0 80', 'M 14 70 L 50 100'] },
  l: { width: 0, strokes: ['M 0 0 L 0 100'] },
  m: {
    width: 88,
    strokes: ['M 0 50 L 0 100', 'M 0 72 A 22 72 22 22 180 360 L 44 100', 'M 44 72 A 66 72 22 22 180 360 L 88 100'],
    arrows: [0.5, 0.42, 0.42],
  },
  n: { width: 54, strokes: ['M 0 50 L 0 100', 'M 0 77 A 27 77 27 27 180 360 L 54 100'], arrows: [0.5, 0.45] },
  o: { width: 52, strokes: ['A 26 75 26 25 -90 -450'], arrows: [0.25] },
  p: { width: 52, strokes: ['M 0 50 L 0 135', 'A 26 75 26 25 180 540'], arrows: [0.5, 0.25] },
  q: { width: 52, strokes: ['A 26 75 26 25 -90 -450', 'M 52 50 L 52 135'], arrows: [0.25, 0.5] },
  r: { width: 36, strokes: ['M 0 50 L 0 100', 'M 0 77 A 24 77 24 27 180 300'], arrows: [0.5, 0.55] },
  s: { width: 44, strokes: ['A 22 62.5 20 12.5 -30 -270 A 22 87.5 20 12.5 -90 150'], arrows: [[0.2, 0.75]] },
  t: { width: 30, strokes: ['M 14 20 L 14 86 A 28 86 14 14 180 90', 'M 0 50 L 30 50'], arrows: [0.4, 0.5] },
  u: { width: 54, strokes: ['M 0 50 L 0 73 A 27 73 27 27 180 0 L 54 50', 'M 54 50 L 54 100'], arrows: [[0.2, 0.82], 0.5] },
  v: { width: 52, strokes: ['M 0 50 L 26 100 L 52 50'] },
  w: { width: 78, strokes: ['M 0 50 L 19.5 100 L 39 50 L 58.5 100 L 78 50'] },
  x: { width: 50, strokes: ['M 0 50 L 50 100', 'M 50 50 L 0 100'] },
  y: { width: 54, strokes: ['M 0 50 L 27 100', 'M 54 50 L 10 135'] },
  z: { width: 48, strokes: ['M 0 50 L 48 50 L 0 100 L 48 100'] },
};

LOWER['ă'] = { marks: 1, width: 52, strokes: [...LOWER.a.strokes, 'A 26 26 14 9 200 -20'], arrows: [0.25, 0.5, null] };
LOWER['â'] = { marks: 1, width: 52, strokes: [...LOWER.a.strokes, 'M 12 34 L 26 20 L 40 34'], arrows: [0.25, 0.5, null] };
LOWER['î'] = { marks: 1, width: 0, strokes: ['M 0 50 L 0 100', 'M -14 34 L 0 20 L 14 34'], arrows: [0.5, null] };
LOWER['ș'] = { marks: 1, width: 44, strokes: [...LOWER.s.strokes, 'M 24 106 C 25 114 22 121 16 126'], arrows: [[0.2, 0.75], null] };
LOWER['ț'] = { marks: 1, width: 30, strokes: [...LOWER.t.strokes, 'M 17 106 C 18 114 15 121 9 126'], arrows: [0.4, 0.5, null] };

// ───────────────────────── digits ─────────────────────────

const DIGITS: Record<string, GlyphDef> = {
  '0': { width: 64, strokes: ['A 32 50 32 50 -90 -450'], arrows: [0.25] },
  '1': { width: 28, strokes: ['M 0 25 L 28 0 L 28 100'] },
  '2': { width: 60, strokes: ['A 30 28 30 28 -150 50 L 0 100 L 60 100'], arrows: [[0.22, 0.62, 0.9]] },
  '3': { width: 58, strokes: ['A 26 25 26 25 -150 110 A 28 75 30 25 -110 150'], arrows: [[0.2, 0.7]] },
  '4': { width: 64, strokes: ['M 44 0 L 0 68 L 64 68', 'M 44 0 L 44 100'] },
  '5': { width: 60, strokes: ['M 6 0 L 2 45 L 22 45 A 30 72 30 28 -105 150', 'M 6 0 L 58 0'], arrows: [[0.12, 0.62], 0.5] },
  '6': { width: 60, strokes: ['M 52 0 C 28 8 2 40 0 70 A 30 70 30 30 180 -180'], arrows: [[0.18, 0.62]] },
  '7': { width: 60, strokes: ['M 0 0 L 60 0 L 20 100'] },
  '8': { width: 58, strokes: ['A 30 25 26 25 -45 -270 A 30 75 28 25 -90 270 A 30 25 26 25 -270 -405'], arrows: [[0.12, 0.5]] },
  '9': { width: 60, strokes: ['A 30 28 28 28 0 -360 L 58 72 A 36 72 22 28 0 100'], arrows: [[0.3, 0.8]] },
};

// ───────────────────────── shapes (100 × 100 box) ─────────────────────────

const SHAPES: Record<string, GlyphDef> = {
  'shape:circle': { width: 100, strokes: ['A 50 50 50 50 -90 -450'], arrows: [0.25] },
  'shape:oval': { width: 100, strokes: ['A 50 50 50 35 -90 -450'], arrows: [0.25] },
  'shape:square': { width: 100, strokes: ['M 0 0 L 0 100 L 100 100 L 100 0 L 0 0'] },
  'shape:rectangle': { width: 100, strokes: ['M 0 20 L 0 80 L 100 80 L 100 20 L 0 20'] },
  'shape:triangle': { width: 100, strokes: ['M 50 0 L 100 100 L 0 100 L 50 0'] },
  'shape:diamond': { width: 100, strokes: ['M 50 0 L 100 50 L 50 100 L 0 50 L 50 0'] },
  'shape:star': {
    width: 100,
    strokes: ['M 50 2 L 61.8 35.8 L 97.6 36.5 L 69 58.2 L 79.4 92.5 L 50 72 L 20.6 92.5 L 31 58.2 L 2.4 36.5 L 38.2 35.8 L 50 2'],
  },
  'shape:heart': {
    width: 100,
    strokes: ['A 27 30 23 23 180 360 A 73 30 23 23 180 360 C 96 55 62 78 50 95 C 38 78 4 55 4 30'],
    arrows: [[0.12, 0.6]],
  },
  'shape:hexagon': { width: 100, strokes: ['M 50 0 L 93.3 25 L 93.3 75 L 50 100 L 6.7 75 L 6.7 25 L 50 0'] },
  'shape:pentagon': { width: 100, strokes: ['M 50 2 L 97.6 36.5 L 79.4 92.5 L 20.6 92.5 L 2.4 36.5 L 50 2'] },
};

// Punctuation that appears in names ("Maria-Magdalena").
const PUNCT: Record<string, GlyphDef> = {
  '-': { width: 28, strokes: ['M 0 66 L 28 66'], arrows: [null] },
};

export const GLYPH_DEFS: Record<string, GlyphDef> = { ...UPPER, ...LOWER, ...DIGITS, ...SHAPES, ...PUNCT };

const cache = new Map<string, Glyph>();

/** Build (and cache) the glyph for a key: a letter, a digit or `shape:<name>`. */
export function getGlyph(key: string): Glyph | undefined {
  const k = normalizeKey(key);
  const hit = cache.get(k);
  if (hit) return hit;
  const def = GLYPH_DEFS[k];
  if (!def) return undefined;
  const g = buildGlyph(k, def);
  cache.set(k, g);
  return g;
}

export function hasGlyph(key: string): boolean {
  return normalizeKey(key) in GLYPH_DEFS;
}

/** Map cedilla variants (ş ţ) and decomposed forms to the comma-below letters. */
export function normalizeKey(key: string): string {
  return key
    .normalize('NFC')
    .replace(/Ş/g, 'Ș')
    .replace(/ş/g, 'ș')
    .replace(/Ţ/g, 'Ț')
    .replace(/ţ/g, 'ț');
}

// ───────────────────────── alphabets ─────────────────────────

export type Alphabet = 'ro' | 'en';

export const ALPHABETS: Record<Alphabet, string[]> = {
  ro: ['A', 'Ă', 'Â', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'Î', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'Ș', 'T', 'Ț', 'U', 'V', 'W', 'X', 'Y', 'Z'],
  en: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
};

export function uppercaseLetters(alphabet: Alphabet): string[] {
  return [...ALPHABETS[alphabet]];
}
export function lowercaseLetters(alphabet: Alphabet): string[] {
  return ALPHABETS[alphabet].map((l) => l.toLowerCase());
}
export function pairedLetters(alphabet: Alphabet): string[] {
  return ALPHABETS[alphabet].map((l) => `${l}${l.toLowerCase()}`);
}

/** Ă/Â → A, Î → I, Ș → S, Ț → T (used for free-tier checks and icon lookups). */
export function baseLetter(letter: string): string {
  const u = normalizeKey(letter).toUpperCase();
  const map: Record<string, string> = { Ă: 'A', Â: 'A', Î: 'I', Ș: 'S', Ț: 'T' };
  return map[u] || u;
}

/** Letters of a word that we can draw, in the requested case. */
export function lettersOfWord(word: string, mode: 'uppercase' | 'lowercase' | 'paired'): string[] {
  const out: string[] = [];
  for (const ch of normalizeKey(word).toUpperCase()) {
    if (!hasGlyph(ch) || !/\p{L}/u.test(ch)) continue;
    const item = mode === 'uppercase' ? ch : mode === 'lowercase' ? ch.toLowerCase() : `${ch}${ch.toLowerCase()}`;
    if (!out.includes(item)) out.push(item);
  }
  return out;
}

// ───────────────────────── hints (word + emoji per letter) ─────────────────────────

export interface LetterHint {
  word: string;
  emoji: string;
}

export const LETTER_HINTS: Record<Alphabet, Record<string, LetterHint>> = {
  ro: {
    A: { word: 'avion', emoji: '✈️' },
    Ă: { word: 'pălărie', emoji: '🎩' },
    Â: { word: 'pâine', emoji: '🍞' },
    B: { word: 'balon', emoji: '🎈' },
    C: { word: 'casă', emoji: '🏠' },
    D: { word: 'delfin', emoji: '🐬' },
    E: { word: 'elefant', emoji: '🐘' },
    F: { word: 'fluture', emoji: '🦋' },
    G: { word: 'girafă', emoji: '🦒' },
    H: { word: 'hipopotam', emoji: '🦛' },
    I: { word: 'iepure', emoji: '🐰' },
    Î: { word: 'înghețată', emoji: '🍦' },
    J: { word: 'jucărie', emoji: '🧸' },
    K: { word: 'koala', emoji: '🐨' },
    L: { word: 'leu', emoji: '🦁' },
    M: { word: 'măr', emoji: '🍎' },
    N: { word: 'nor', emoji: '☁️' },
    O: { word: 'ou', emoji: '🥚' },
    P: { word: 'pisică', emoji: '🐱' },
    Q: { word: 'quiz', emoji: '❓' },
    R: { word: 'rață', emoji: '🦆' },
    S: { word: 'soare', emoji: '☀️' },
    Ș: { word: 'șarpe', emoji: '🐍' },
    T: { word: 'tren', emoji: '🚂' },
    Ț: { word: 'țestoasă', emoji: '🐢' },
    U: { word: 'urs', emoji: '🐻' },
    V: { word: 'vulpe', emoji: '🦊' },
    W: { word: 'web', emoji: '🕸️' },
    X: { word: 'xilofon', emoji: '🎵' },
    Y: { word: 'yoga', emoji: '🧘' },
    Z: { word: 'zebră', emoji: '🦓' },
  },
  en: {
    A: { word: 'apple', emoji: '🍎' },
    B: { word: 'ball', emoji: '⚽' },
    C: { word: 'cat', emoji: '🐱' },
    D: { word: 'dog', emoji: '🐶' },
    E: { word: 'egg', emoji: '🥚' },
    F: { word: 'fish', emoji: '🐟' },
    G: { word: 'grapes', emoji: '🍇' },
    H: { word: 'house', emoji: '🏠' },
    I: { word: 'ice cream', emoji: '🍦' },
    J: { word: 'juice', emoji: '🧃' },
    K: { word: 'kite', emoji: '🪁' },
    L: { word: 'lemon', emoji: '🍋' },
    M: { word: 'moon', emoji: '🌙' },
    N: { word: 'nut', emoji: '🥜' },
    O: { word: 'orange', emoji: '🍊' },
    P: { word: 'pen', emoji: '🖊️' },
    Q: { word: 'queen', emoji: '👸' },
    R: { word: 'rainbow', emoji: '🌈' },
    S: { word: 'star', emoji: '⭐' },
    T: { word: 'tree', emoji: '🌳' },
    U: { word: 'umbrella', emoji: '☂️' },
    V: { word: 'violin', emoji: '🎻' },
    W: { word: 'whale', emoji: '🐋' },
    X: { word: 'xylophone', emoji: '🎵' },
    Y: { word: 'yarn', emoji: '🧶' },
    Z: { word: 'zebra', emoji: '🦓' },
  },
};

export function hintFor(item: string, alphabet: Alphabet): LetterHint | undefined {
  const first = normalizeKey(item)[0];
  if (!first || /[0-9]/.test(first) || item.startsWith('shape:')) return undefined;
  const upper = first.toUpperCase();
  return LETTER_HINTS[alphabet][upper] || LETTER_HINTS.ro[upper] || LETTER_HINTS.en[baseLetter(upper)];
}
