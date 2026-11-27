import { countOf } from '@/components/worksheet/plural';
import { currentVariant, vkey } from './variant';

/**
 * Data of the „Matematică și explorarea mediului” sheets that fill the gaps of the programme
 * (see mem-pages.ts), and of three preschool sheets of domain E:
 *
 * - "terms:1–6"   Termenii operațiilor (MEM 1.6): sets 1–2 clasa pregătitoare (sumă, total, diferență,
 *                 =, +, -), 3–4 clasa I (also termen, <, >), 5–6 clasa a II-a (also descăzut, scăzător,
 *                 produs, factor, cât, deîmpărțit, împărțitor, ·, :);
 * - "place:1–3"   Formează numărul (II 1.1): hundreds, tens and units drawn, numbers in digits and words;
 * - "coord:1–3"   Coordonate (II 2.1): a 5 × 5 grid, columns A–E, rows 1–5;
 * - "sides:1"     Laturi, vârfuri, axa de simetrie (II 2.2, plane shapes);
 * - "solid:1"     Corpuri geometrice (II 2.2): cub, cuboid, cilindru, sferă, con;
 * - "regular:1–4" Modele și regularități (MEM 3.1): sets 1–2 clasa I, 3–4 clasa a II-a;
 * - "sort2:1–2"   Sortare după două criterii (I 5.1; II 5.1, the table);
 * - "plan:1–2"    Plan de lucru (II 4.1): the steps of an experiment, and „și”, „sau”, „nu”;
 * - "cause:1–2"   Ce se întâmplă dacă…? (II 4.2);
 * - "around:1"    Forme în jurul nostru (preschool E.2.3; CP 2.2, I 2.2);
 * - "pict:1–2"    Pictograma (preschool E.2.5);
 * - "more:1"      Mai repede, mai cald… (preschool E.1.2).
 *
 * The exercises with numbers are made from the item by a seeded generator: the same sheet every time.
 * Pictures are Twemoji, quoted here so that scripts/build-hint-icons.mjs draws them into icons.json.
 *
 * „Altă variantă” (variant.ts): the first variant of every item is the sheet as it was written (the
 * constants below); the others are drawn by the `…Set(n, variant)` functions from the pools next to
 * them, under the rules their comments give. „Plan de lucru” and „Ce se întâmplă dacă…?” are each one
 * authored experiment: they have no other variant.
 */

export type MemKind = 'terms' | 'place' | 'coord' | 'sides' | 'solid' | 'regular' | 'sort2' | 'plan' | 'cause' | 'around' | 'pict' | 'more';
export const MEM_KINDS: MemKind[] = ['terms', 'place', 'coord', 'sides', 'solid', 'regular', 'sort2', 'plan', 'cause', 'around', 'pict', 'more'];
export const MEM_SETS: Record<MemKind, number> = { terms: 6, place: 3, coord: 3, sides: 1, solid: 1, regular: 4, sort2: 2, plan: 2, cause: 2, around: 1, pict: 2, more: 1 };

const MEM_ITEM = /^(terms:[1-6]|(place|coord):[1-3]|regular:[1-4]|(sort2|plan|cause|pict):[12]|(sides|solid|around|more):1)$/;

export function isMemItem(item: string): boolean {
  return MEM_ITEM.test(item);
}

/** The free plan: set 1 of each kind, and the first set of each class where the sets differ by class (terms 1, 3, 5; regular 1, 3). */
export function isFreeMemItem(item: string): boolean {
  if (!isMemItem(item)) return false;
  const [kind, arg] = item.split(':');
  if (kind === 'terms') return ['1', '3', '5'].includes(arg);
  if (kind === 'regular') return ['1', '3'].includes(arg);
  return arg === '1';
}

/** The class a set is written for, for the kinds whose sets differ by class (the others: null). */
export function memSetLevel(item: string): 'CP' | 'I' | 'II' | null {
  const [kind, arg] = item.split(':');
  const n = Number(arg);
  if (kind === 'terms') return n <= 2 ? 'CP' : n <= 4 ? 'I' : 'II';
  if (kind === 'regular') return n <= 2 ? 'I' : 'II';
  return null;
}

// ───────────────────────── seeded randomness ─────────────────────────

export function memSeed(text: string): () => number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const int = (rand: () => number, lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
const pick = <T,>(rand: () => number, xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
function mixed<T>(rand: () => number, xs: readonly T[]): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ───────────────────────── Termenii operațiilor ─────────────────────────

/** An operation drawn big, with a box under each number for its name (an empty word: no box). */
export interface TermLabel { tokens: [string, string, string, string, string]; words: [string, string, string] }
/** A sentence with one box: `text` holds „{}” where the box is. */
export interface TermSentence { text: string; answer: string }
/** An exercise with one sign missing: the tokens, „?” for the box. */
export interface TermSign { tokens: string[]; answer: string }
/** Clasa pregătitoare: a picture problem, written as an operation („3 + 2 = 5”, the taken ones crossed out). */
export interface TermPicture { op: '+' | '−'; a: number; b: number; picture: string }
export interface TermsSet { level: 'CP' | 'I' | 'II'; labels: TermLabel[]; bank: string[]; signs: TermSign[]; sentences: TermSentence[]; pictures: TermPicture[] }

export const MINUS = '−';
export const TIMES = '·';

function evalOp(a: number, op: string, b: number): number | null {
  if (op === '+') return a + b;
  if (op === MINUS) return a - b;
  if (op === TIMES) return a * b;
  if (op === ':') return b && a % b === 0 ? a / b : null;
  return null;
}

/** „a ? b = c”: the ops of the class that make it true (one, on a sheet). */
export function opsThatFit(a: number, b: number, c: number, ops: string[]): string[] {
  return ops.filter((op) => evalOp(a, op, b) === c);
}

/** „a ? b”: <, > or =. */
export function cmpSign(a: number, b: number): string {
  return a < b ? '<' : a > b ? '>' : '=';
}

/** Two numbers of 3 digits whose sum carries in no column (II: „fără trecere peste ordin”). */
function noCarry(rand: () => number): [number, number] {
  const a = [int(rand, 1, 7), int(rand, 0, 8), int(rand, 0, 8)];
  const b = [int(rand, 1, 8 - a[0]), int(rand, 0, 9 - a[1]), int(rand, 0, 9 - a[2])];
  return [a[0] * 100 + a[1] * 10 + a[2], b[0] * 100 + b[1] * 10 + b[2]];
}
/** A subtraction of 3 digits that borrows in no column. */
function noBorrow(rand: () => number): [number, number] {
  const a = [int(rand, 3, 9), int(rand, 1, 9), int(rand, 1, 9)];
  const b = [int(rand, 1, a[0] - 1), int(rand, 0, a[1]), int(rand, 0, a[2])];
  return [a[0] * 100 + a[1] * 10 + a[2], b[0] * 100 + b[1] * 10 + b[2]];
}

export function termsSet(n: number, variant = currentVariant()): TermsSet {
  const rand = memSeed(vkey(`terms:${n}`, variant));
  if (n <= 2) {
    // clasa pregătitoare, 0–10: one term is 1–5 (CP 1.4 „…adăugarea /extragerea a 1-5 elemente”)
    const add = () => { const b = int(rand, 1, 5); const a = int(rand, 1, 10 - b); return [a, b]; };
    const sub = () => { const b = int(rand, 1, 5); const a = int(rand, b + 1, 10); return [a, b]; };
    const signs: TermSign[] = [];
    for (let i = 0; i < 6; i++) {
      const plus = i % 2 === 0;
      const [a, b] = plus ? add() : sub();
      const c = plus ? a + b : a - b;
      const op = plus ? '+' : MINUS;
      signs.push(i < 4 ? { tokens: [String(a), '?', String(b), '=', String(c)], answer: op } : { tokens: [String(a), op, String(b), '?', String(c)], answer: '=' });
    }
    const [a1, b1] = add();
    const [a2, b2] = add();
    const [c1, d1] = sub();
    const x = int(rand, 2, 5);
    const y = int(rand, 2, 5);
    return {
      level: 'CP', labels: [], bank: [], signs,
      sentences: [
        { text: `Suma numerelor ${a1} și ${b1} este {}.`, answer: String(a1 + b1) },
        { text: `Diferența numerelor ${c1} și ${d1} este {}.`, answer: String(c1 - d1) },
        { text: `Suma numerelor ${a2} și ${b2} este {}.`, answer: String(a2 + b2) },
        { text: `Ana are ${x} mere și Ion are ${y} mere. Câte mere au în total? {}`, answer: String(x + y) },
      ],
      pictures: [
        { op: '+', a: int(rand, 2, 5), b: int(rand, 1, 4), picture: n === 1 ? '🍎' : '🌷' },
        { op: '−', a: int(rand, 5, 8), b: int(rand, 1, 4), picture: n === 1 ? '🎈' : '🐟' },
      ],
    };
  }
  if (n <= 4) {
    // clasa I, 0–100
    const two = () => int(rand, 11, 59);
    const a = two(); const b = int(rand, 11, 99 - a);
    const c = int(rand, 40, 99); const d = int(rand, 11, c - 11);
    const signs: TermSign[] = [];
    const p = int(rand, 12, 98); let q = int(rand, 12, 98); if (q === p) q = p > 50 ? p - 9 : p + 9;
    signs.push({ tokens: [String(p), '?', String(q)], answer: cmpSign(p, q) });
    const t1 = int(rand, 2, 6) * 10; const t2 = int(rand, 1, 3) * 10;
    signs.push({ tokens: [String(t1), '+', String(t2), '?', String(t1 + t2)], answer: '=' });
    const u1 = int(rand, 21, 60); const u2 = int(rand, 11, 30); const near = u1 + u2 + (rand() < 0.5 ? -int(rand, 1, 9) : int(rand, 1, 9));
    signs.push({ tokens: [String(u1), '+', String(u2), '?', String(near)], answer: cmpSign(u1 + u2, near) });
    const v = int(rand, 30, 90); const w = int(rand, 11, v - 11);
    signs.push({ tokens: [String(v), '?', String(w), '=', String(v - w)], answer: MINUS });
    const e = int(rand, 11, 50); const f = int(rand, 11, 99 - e);
    signs.push({ tokens: [String(e), '?', String(f), '=', String(e + f)], answer: '+' });
    const g = int(rand, 12, 98); let h = int(rand, 12, 98); if (h === g || cmpSign(g, h) === cmpSign(p, q)) h = g > 55 ? g - int(rand, 3, 9) : g + int(rand, 3, 9);
    signs.push({ tokens: [String(g), '?', String(h)], answer: cmpSign(g, h) });
    const s1 = int(rand, 11, 50); const s2 = int(rand, 11, 99 - s1);
    const k1 = int(rand, 20, 99); const k2 = int(rand, 10, k1 - 10);
    const tt = int(rand, 11, 40); const ss = tt + int(rand, 11, 99 - tt);
    const x = int(rand, 20, 45); const y = int(rand, 11, 99 - x);
    return {
      level: 'I',
      labels: [
        { tokens: [String(a), '+', String(b), '=', String(a + b)], words: ['termen', 'termen', 'sumă'] },
        { tokens: [String(c), MINUS, String(d), '=', String(c - d)], words: ['', '', 'diferență'] },
      ],
      bank: ['termen', 'sumă', 'diferență'],
      signs,
      sentences: [
        { text: `Suma numerelor ${s1} și ${s2} este {}.`, answer: String(s1 + s2) },
        { text: `Diferența numerelor ${k1} și ${k2} este {}.`, answer: String(k1 - k2) },
        { text: `Un termen este ${tt}, iar suma este ${ss}. Celălalt termen este {}.`, answer: String(ss - tt) },
        { text: `În coș sunt ${countOf(x, 'măr roșu', 'mere roșii')} și ${countOf(y, 'măr verde', 'mere verzi')}. Câte mere sunt în total? {}`, answer: String(x + y) },
      ],
      pictures: [],
    };
  }
  // clasa a II-a: 0–1000 without carrying (II contents), the tables in 0–100
  const [a, b] = noBorrow(rand);
  const p = int(rand, 3, 9); const q = int(rand, 3, 9);
  const dv = int(rand, 3, 9); const k = int(rand, 3, 9);
  const signs: TermSign[] = [];
  const opsII = ['+', MINUS, TIMES, ':'];
  for (const op of [TIMES, ':', '+', MINUS]) {
    for (;;) {
      let x: number; let y: number;
      if (op === TIMES) { x = int(rand, 3, 9); y = int(rand, 3, 9); } else if (op === ':') { y = int(rand, 3, 9); x = y * int(rand, 3, 9); } else if (op === '+') { [x, y] = noCarry(rand); } else { [x, y] = noBorrow(rand); }
      const c = evalOp(x, op, y)!;
      if (opsThatFit(x, y, c, opsII).length !== 1) continue;
      signs.push({ tokens: [String(x), '?', String(y), '=', String(c)], answer: op });
      break;
    }
  }
  const [s1, s2] = noCarry(rand);
  const [k1, k2] = noBorrow(rand);
  const [m1, m2] = noBorrow(rand);
  const f1 = int(rand, 2, 9); const f2 = int(rand, 2, 9);
  const c1 = int(rand, 2, 9); const c2 = int(rand, 2, 9);
  const g1 = int(rand, 2, 9); const g2 = int(rand, 2, 9);
  return {
    level: 'II',
    labels: [
      { tokens: [String(a), MINUS, String(b), '=', String(a - b)], words: ['descăzut', 'scăzător', 'diferență'] },
      { tokens: [String(p), TIMES, String(q), '=', String(p * q)], words: ['factor', 'factor', 'produs'] },
      { tokens: [String(dv * k), ':', String(dv), '=', String(k)], words: ['deîmpărțit', 'împărțitor', 'cât'] },
    ],
    bank: ['descăzut', 'scăzător', 'diferență', 'factor', 'produs', 'deîmpărțit', 'împărțitor', 'cât'],
    signs,
    sentences: [
      { text: `Suma numerelor ${s1} și ${s2} este {}.`, answer: String(s1 + s2) },
      { text: `Diferența dintre ${k1} și ${k2} este {}.`, answer: String(k1 - k2) },
      { text: `Produsul numerelor ${f1} și ${f2} este {}.`, answer: String(f1 * f2) },
      { text: `Câtul numerelor ${c1 * c2} și ${c1} este {}.`, answer: String(c2) },
      { text: `Descăzutul este ${m1}, iar scăzătorul este ${m2}. Diferența este {}.`, answer: String(m1 - m2) },
      { text: `Un factor este ${g1}, iar celălalt factor este ${g2}. Produsul este {}.`, answer: String(g1 * g2) },
    ],
    pictures: [],
  };
}

// ───────────────────────── Formează numărul (clasa a II-a) ─────────────────────────

export interface PlaceSet {
  /** Drawn as hundreds (squares), tens (bars), units (small squares): at most 4 hundreds, 5 tens, 6 units. */
  blocks: number[];
  /** Written in words: the child writes the digits. */
  toDigits: number[];
  /** Written in digits: the child writes the words. */
  toWords: number[];
}

export const PLACE_SETS: PlaceSet[] = [
  { blocks: [234, 152, 306], toDigits: [452, 118, 270], toWords: [207, 615] },
  { blocks: [321, 140, 213], toDigits: [903, 560, 714], toWords: [112, 480] },
  { blocks: [125, 402, 231], toDigits: [1000, 216, 350], toWords: [119, 862] },
];

/**
 * The numbers of a „Formează numărul” sheet. Every variant keeps the mix of the written sets: the
 * drawn numbers have at most 4 hundreds, 5 tens and 6 units, one of them with no tens or no units; in
 * words, a number with every digit, one with a zero and one that ends in 11–19; in digits, a number
 * with no tens and another one. No number comes twice on the sheet.
 */
export function placeSet(n: number, variant = currentVariant()): PlaceSet {
  if (variant === 1) return PLACE_SETS[n - 1];
  const rand = memSeed(vkey(`place:${n}`, variant));
  const seen = new Set<number>();
  const fresh = (make: () => number): number => {
    for (;;) {
      const v = make();
      if (seen.has(v)) continue;
      seen.add(v);
      return v;
    }
  };
  const drawn = (zero: boolean) => fresh(() => {
    const h = int(rand, 1, 4);
    if (!zero) return h * 100 + int(rand, 1, 5) * 10 + int(rand, 1, 6);
    return rand() < 0.5 ? h * 100 + int(rand, 1, 6) : h * 100 + int(rand, 1, 5) * 10;
  });
  const full = () => fresh(() => int(rand, 1, 9) * 100 + int(rand, 2, 9) * 10 + int(rand, 1, 9));
  const teen = () => fresh(() => int(rand, 1, 9) * 100 + int(rand, 11, 19));
  const noTens = () => fresh(() => int(rand, 1, 9) * 100 + int(rand, 1, 9));
  const round = () => fresh(() => int(rand, 1, 9) * 100 + int(rand, 1, 9) * 10);
  // the first drawn number is the example: one with hundreds, tens and units
  const blocks = [drawn(false), ...mixed(rand, [drawn(false), drawn(true)])];
  const toDigits = mixed(rand, [full(), rand() < 0.5 ? noTens() : round(), teen()]);
  const toWords = mixed(rand, [noTens(), rand() < 0.5 ? full() : teen()]);
  return { blocks, toDigits, toWords };
}

// ───────────────────────── Coordonate (clasa a II-a) ─────────────────────────

export const COORD_COLS = ['A', 'B', 'C', 'D', 'E'];
export const COORD_ROWS = 5;
/** Picture, its name with the article (as in „Unde se află pisica?”). */
export const COORD_PICTURES: [string, string][] = [
  ['🐱', 'pisica'], ['🐶', 'câinele'], ['🍎', 'mărul'], ['🌳', 'copacul'], ['🚗', 'mașina'], ['⭐', 'steaua'],
  ['🎈', 'balonul'], ['🐟', 'peștele'], ['🏠', 'casa'], ['🦋', 'fluturele'], ['🌷', 'laleaua'], ['⚽', 'mingea'],
];
/** What the child draws in an empty cell. */
export const COORD_DRAW = ['un cerc', 'un triunghi', 'o inimă', 'un soare', 'o floare', 'un pătrat'];

export interface CoordSet {
  /** The pictures and their cells: column 0–4 (A–E), row 1–5 (row 1 at the bottom, as on a chessboard). */
  placed: { picture: string; name: string; col: number; row: number }[];
  /** „Ce se află în căsuța B3?”: indexes into `placed`. */
  whatIn: number[];
  /** „În ce căsuță se află pisica?”: indexes into `placed`. */
  whereIs: number[];
  /** „Desenează un cerc în căsuța D2.”: empty cells. */
  draw: { what: string; col: number; row: number }[];
}

export const cellName = (col: number, row: number) => `${COORD_COLS[col]}${row}`;

export function coordSet(n: number, variant = currentVariant()): CoordSet {
  const rand = memSeed(vkey(`coord:${n}`, variant));
  const cells = Array.from({ length: 25 }, (_, i) => ({ col: i % 5, row: Math.floor(i / 5) + 1 }));
  const shuffle = <T,>(xs: T[]) => {
    const a = [...xs];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const pics = shuffle(COORD_PICTURES).slice(0, 7);
  const spots = shuffle(cells);
  const placed = pics.map(([picture, name], i) => ({ picture, name, ...spots[i] }));
  const draws = shuffle(COORD_DRAW).slice(0, 2).map((what, i) => ({ what, ...spots[7 + i] }));
  return { placed, whatIn: [0, 1, 2], whereIs: [3, 4, 5], draw: draws };
}

// ───────────────────────── Laturi și vârfuri; corpuri (clasa a II-a) ─────────────────────────

export type PlaneShape = 'triangle' | 'square' | 'rectangle' | 'circle' | 'semicircle' | 'right-triangle';
/** Name, sides, vertices. */
export const PLANE_FACTS: Record<'triangle' | 'square' | 'rectangle' | 'circle', [string, number, number]> = {
  triangle: ['triunghi', 3, 3],
  square: ['pătrat', 4, 4],
  rectangle: ['dreptunghi', 4, 4],
  circle: ['cerc', 0, 0],
};
/** The rows of „Câte laturi și câte vârfuri?”: the shape and how it is drawn (turned, long, tall). */
export const SIDES_ROWS: { shape: keyof typeof PLANE_FACTS; look: number }[] = [
  { shape: 'triangle', look: 0 }, { shape: 'rectangle', look: 0 }, { shape: 'circle', look: 0 }, { shape: 'square', look: 1 }, { shape: 'triangle', look: 1 },
];
/** „Este linia punctată o axă de simetrie?”: the shape, the line, the answer. */
export const SYMMETRY_TILES: { shape: PlaneShape; line: 'vertical' | 'horizontal' | 'diagonal'; answer: boolean }[] = [
  { shape: 'square', line: 'vertical', answer: true },
  { shape: 'rectangle', line: 'diagonal', answer: false },
  { shape: 'triangle', line: 'vertical', answer: true },
  { shape: 'circle', line: 'horizontal', answer: true },
  { shape: 'right-triangle', line: 'vertical', answer: false },
  { shape: 'semicircle', line: 'vertical', answer: true },
];

/** Every way a shape of the first exercise can be drawn (`look` 1: turned, or tall). */
const SIDES_POOL: (typeof SIDES_ROWS)[number][] = [
  { shape: 'triangle', look: 0 }, { shape: 'triangle', look: 1 }, { shape: 'rectangle', look: 0 }, { shape: 'rectangle', look: 1 },
  { shape: 'square', look: 0 }, { shape: 'square', look: 1 }, { shape: 'circle', look: 0 },
];
/**
 * Every line the sheet can draw through a shape, with the answer read from the drawing (planeOps, axisLine
 * in mem-pages.ts): the square and the circle are symmetric about all three lines, the rectangle about the
 * vertical and the horizontal but not about its diagonal, the triangle (its two slanted sides equal) and the
 * semicircle only about the vertical, the right triangle about none of them.
 */
export const SYMMETRY_POOL: typeof SYMMETRY_TILES = [
  { shape: 'square', line: 'vertical', answer: true }, { shape: 'square', line: 'horizontal', answer: true }, { shape: 'square', line: 'diagonal', answer: true },
  { shape: 'rectangle', line: 'vertical', answer: true }, { shape: 'rectangle', line: 'horizontal', answer: true }, { shape: 'rectangle', line: 'diagonal', answer: false },
  { shape: 'triangle', line: 'vertical', answer: true }, { shape: 'triangle', line: 'horizontal', answer: false },
  { shape: 'circle', line: 'vertical', answer: true }, { shape: 'circle', line: 'horizontal', answer: true }, { shape: 'circle', line: 'diagonal', answer: true },
  { shape: 'right-triangle', line: 'vertical', answer: false }, { shape: 'right-triangle', line: 'horizontal', answer: false },
  { shape: 'semicircle', line: 'vertical', answer: true }, { shape: 'semicircle', line: 'horizontal', answer: false },
];

export interface SidesSet { rows: typeof SIDES_ROWS; tiles: typeof SYMMETRY_TILES }

/**
 * The shapes of „Laturi, vârfuri, axa de simetrie”. Another variant: five shapes to count on, every kind
 * of shape among them (the first, the example, never the circle, which has nothing to count), and six
 * lines to judge, no shape more than twice, at least two that are axes and at least two that are not.
 */
export function sidesSet(variant = currentVariant()): SidesSet {
  if (variant === 1) return { rows: SIDES_ROWS, tiles: SYMMETRY_TILES };
  const rand = memSeed(vkey('sides:1', variant));
  const one = (shape: string) => pick(rand, SIDES_POOL.filter((r) => r.shape === shape));
  let rows = [one('triangle'), one('rectangle'), one('square'), one('circle')];
  rows.push(pick(rand, SIDES_POOL.filter((r) => r.shape !== 'circle' && !rows.includes(r))));
  do rows = mixed(rand, rows); while (rows[0].shape === 'circle');
  for (;;) {
    const tiles = mixed(rand, SYMMETRY_POOL).slice(0, 6);
    const yes = tiles.filter((t) => t.answer).length;
    const most = Math.max(...tiles.map((t) => tiles.filter((x) => x.shape === t.shape).length));
    if (yes >= 2 && yes <= 4 && most <= 2) return { rows, tiles };
  }
}

export type Solid = 'cub' | 'cuboid' | 'cilindru' | 'sferă' | 'con';
export const SOLIDS: Solid[] = ['cub', 'cuboid', 'cilindru', 'sferă', 'con'];
/** An everyday object of the shape of each solid, with its name. */
export const SOLID_OBJECTS: Record<Solid, [string, string]> = {
  cub: ['🎲', 'zarul'], cuboid: ['📦', 'cutia'], cilindru: ['🥫', 'conserva'], sferă: ['⚽', 'mingea'], con: ['🍦', 'cornetul'],
};
/** „Câte vârfuri are…?” and „Câte fețe are…?”, as asked on the sheet, with the answers. */
export const SOLID_FACTS: TermSentence[] = [
  { text: 'Cubul are {} fețe.', answer: '6' },
  { text: 'Cubul are {} vârfuri.', answer: '8' },
  { text: 'Cuboidul are {} fețe.', answer: '6' },
  { text: 'Cuboidul are {} vârfuri.', answer: '8' },
  { text: 'Câte vârfuri are conul? {}', answer: '1' },
  { text: 'Câte vârfuri are sfera? {}', answer: '0' },
];

// ───────────────────────── Modele și regularități (MEM 3.1) ─────────────────────────

/** A row of pictures repeating `unit`: `shown` of them, then the box for the next one. */
export interface PicturePattern { unit: string[]; shown: number; options: [string, string, string] }
/** A row of numbers from `start`, each one `step` more (or `step` times, `times`). */
export interface NumberPattern { start: number; step: number; times?: boolean }
/** Figures that grow: „stairs” (1, 3, 5 … squares), „sticks” (a row of squares made of 4, 7, 10 … sticks). */
export interface Growing { kind: 'stairs' | 'sticks'; ask: [number, number] }
export interface RegularSet {
  level: 'I' | 'II';
  pictures: PicturePattern[];
  numbers: NumberPattern[];
  /** Clasa a II-a: the rule is written too („+ 100”). */
  withRule: boolean;
  growing?: Growing;
  /** A problem from everyday life: the text, `{}` where the answer goes; or a row of beads and the k-th. */
  problem: { text: string; answer: string } | { text: string; unit: string[]; ask: number; options: [string, string] };
}

export const SHOWN_NUMBERS = 5;

export const REGULAR_SETS: RegularSet[] = [
  {
    level: 'I', withRule: false,
    pictures: [
      { unit: ['🍎', '🍐'], shown: 7, options: ['🍎', '🍐', '🍓'] },
      { unit: ['🌷', '🌷', '🌼'], shown: 7, options: ['🌼', '🌷', '🌸'] },
      { unit: ['🐱', '🐶', '🐭'], shown: 7, options: ['🐭', '🐱', '🐶'] },
    ],
    numbers: [{ start: 3, step: 2 }, { start: 15, step: 5 }, { start: 90, step: -10 }, { start: 1, step: 3 }],
    problem: { text: 'Mărgelele sunt înșirate mereu așa. Ce culoare are a zecea mărgea?', unit: ['🔴', '🔵'], ask: 10, options: ['🔴', '🔵'] },
  },
  {
    level: 'I', withRule: false,
    pictures: [
      { unit: ['⭐', '🌙'], shown: 7, options: ['⭐', '🌙', '☀️'] },
      { unit: ['🚗', '🚌', '🚲'], shown: 7, options: ['🚌', '🚲', '🚗'] },
      { unit: ['🍓', '🍓', '🍒', '🍒'], shown: 8, options: ['🍓', '🍒', '🍎'] },
    ],
    numbers: [{ start: 4, step: 4 }, { start: 20, step: 10 }, { start: 50, step: -5 }, { start: 11, step: 11 }],
    problem: { text: 'Florile din grădină sunt plantate mereu așa. Ce floare este a noua?', unit: ['🌷', '🌼', '🌼'], ask: 9, options: ['🌷', '🌼'] },
  },
  {
    level: 'II', withRule: true,
    pictures: [],
    numbers: [{ start: 100, step: 100 }, { start: 250, step: 50 }, { start: 900, step: -100 }, { start: 7, step: 3 }, { start: 3, step: 2, times: true }],
    growing: { kind: 'stairs', ask: [4, 6] },
    problem: { text: 'Ana merge la înot o dată la 3 zile: pe 2, pe 5 și pe 8 ale lunii. În ce zi a lunii merge a șasea oară? {}', answer: '17' },
  },
  {
    level: 'II', withRule: true,
    pictures: [],
    numbers: [{ start: 1000, step: -50 }, { start: 125, step: 25 }, { start: 2, step: 2, times: true }, { start: 505, step: 5 }, { start: 640, step: -20 }],
    growing: { kind: 'sticks', ask: [4, 6] },
    problem: { text: 'Pe raft, cărțile sunt așezate mereu așa: una roșie, două verzi, una roșie, două verzi… Câte cărți verzi sunt printre primele 12? {}', answer: '8' },
  },
];

/** Pictures that go together in a row, to draw the units of a variant from. */
const PATTERN_THEMES: string[][] = [
  ['🍎', '🍐', '🍓', '🍒', '🍌'],
  ['🌷', '🌼', '🌸', '🌻'],
  ['🐱', '🐶', '🐭', '🐰', '🐻'],
  ['🚗', '🚌', '🚲', '🚂', '🚁'],
  ['⭐', '🌙', '☀️', '☁️'],
  ['⚽', '🎈', '🧸', '🎲'],
];
/** The units of a picture row, as places in the theme: AB, AAB, ABB, ABC, AABB. */
const PATTERN_UNITS: number[][] = [[0, 1], [0, 0, 1], [0, 1, 1], [0, 1, 2], [0, 0, 1, 1]];
/** „a zecea mărgea”, „al zecelea cartonaș”: written out, never derived. */
const ORDINAL_F: Record<number, string> = { 5: 'a cincea', 6: 'a șasea', 7: 'a șaptea', 8: 'a opta', 9: 'a noua', 10: 'a zecea', 11: 'a unsprezecea', 12: 'a douăsprezecea' };
const ORDINAL_M: Record<number, string> = { 8: 'al optulea', 9: 'al nouălea', 10: 'al zecelea', 11: 'al unsprezecelea', 12: 'al doisprezecelea' };
/** The rows of things of the clasa I problem: the two pictures, and the question for the k-th. */
const ROW_PROBLEMS: { pictures: string[]; text: (k: number) => string }[] = [
  { pictures: ['🔴', '🔵'], text: (k) => `Mărgelele sunt înșirate mereu așa. Ce culoare are ${ORDINAL_F[k]} mărgea?` },
  { pictures: ['🌷', '🌼', '🌻', '🌸'], text: (k) => `Florile din grădină sunt plantate mereu așa. Ce floare este ${ORDINAL_F[k]}?` },
  { pictures: ['🟥', '🟨', '🟦', '🟩'], text: (k) => `Cartonașele sunt așezate mereu așa. Ce culoare are ${ORDINAL_M[k]} cartonaș?` },
];

/**
 * The patterns of a „Modele și regularități” sheet. Another variant keeps the shape of the set's class:
 * - clasa I: three picture rows (three different units, each shown at least twice, the next picture
 *   once among three choices), four number rows in 0–100 (a small step, by fives or tens, one going
 *   down, one more), a row of things and its k-th;
 * - clasa a II-a: five number rows in 0–1000 with the rule to write (by hundreds, by 20, 25 or 50, one
 *   going down, a small step, one doubling), the figures that grow, a problem with a rule.
 */
export function regularSet(n: number, variant = currentVariant()): RegularSet {
  const base = REGULAR_SETS[n - 1];
  if (variant === 1) return base;
  const rand = memSeed(vkey(`regular:${n}`, variant));
  if (base.level === 'I') {
    const themes = mixed(rand, PATTERN_THEMES).slice(0, 3);
    const units = mixed(rand, PATTERN_UNITS).slice(0, 3);
    const pictures: PicturePattern[] = themes.map((theme, i) => {
      const t = mixed(rand, theme);
      const unit = units[i].map((k) => t[k]);
      const kinds = [...new Set(unit)];
      // the three choices: the pictures of the unit, and one more of the theme when the unit has two
      const options = mixed(rand, kinds.length === 3 ? kinds : [...kinds, t[2]]) as [string, string, string];
      return { unit, shown: unit.length === 4 ? 8 : 7, options };
    });
    const small = mixed(rand, [2, 3, 4]);
    const by = pick(rand, [5, 10]);
    const down = pick(rand, [-10, -5, -2]);
    const numbers: NumberPattern[] = [
      { start: int(rand, 1, 12), step: small[0] },
      { start: by * int(rand, 1, 3), step: by },
      { start: down === -10 ? pick(rand, [70, 80, 90, 100]) : down === -5 ? pick(rand, [40, 45, 50, 60]) : pick(rand, [20, 24, 30]), step: down },
      rand() < 0.3 ? { start: 11, step: 11 } : { start: int(rand, 10, 40), step: small[1] },
    ];
    const row = pick(rand, ROW_PROBLEMS);
    const two = mixed(rand, row.pictures).slice(0, 2);
    const unit = pick(rand, [[0, 1], [0, 0, 1], [0, 1, 1]]).map((k) => two[k]);
    const ask = int(rand, 8, 12);
    return { level: 'I', withRule: false, pictures, numbers, problem: { text: row.text(ask), unit, ask, options: [two[0], two[1]] } };
  }
  const mid = pick(rand, [20, 25, 50]);
  const down = pick(rand, [-100, -50, -20]);
  const rows: NumberPattern[] = [
    { start: pick(rand, [50, 100, 150, 200, 300, 400]), step: 100 },
    { start: mid * int(rand, 2, 12), step: mid },
    { start: down === -100 ? pick(rand, [800, 900, 950, 1000]) : down === -50 ? pick(rand, [650, 800, 1000]) : pick(rand, [380, 500, 640]), step: down },
    { start: int(rand, 2, 12), step: pick(rand, [3, 4, 6, 7, 8, 9]) },
    { start: int(rand, 1, 5), step: 2, times: true },
  ];
  // the first row is the example, with its rule written: never the doubling
  let numbers = mixed(rand, rows);
  while (numbers[0].times) numbers = mixed(rand, rows);
  const growing: Growing = { kind: base.growing?.kind ?? 'stairs', ask: [4, pick(rand, [5, 6, 7, 8, 10])] };
  let problem: RegularSet['problem'];
  if (rand() < 0.5) {
    const d = int(rand, 2, 4);
    const s = int(rand, 1, 4);
    const k = int(rand, 5, 7);
    problem = { text: `Ana merge la înot o dată la ${d} zile: pe ${s}, pe ${s + d} și pe ${s + 2 * d} ale lunii. În ce zi a lunii merge ${ORDINAL_F[k]} oară? {}`, answer: String(s + (k - 1) * d) };
  } else {
    const first = pick(rand, [9, 12, 15, 18]);
    const green = rand() < 0.5;
    problem = { text: `Pe raft, cărțile sunt așezate mereu așa: una roșie, două verzi, una roșie, două verzi… Câte cărți ${green ? 'verzi' : 'roșii'} sunt printre primele ${first}? {}`, answer: String(green ? (2 * first) / 3 : first / 3) };
  }
  return { level: 'II', withRule: true, pictures: [], numbers, growing, problem };
}

/** The numbers of a number row: the `count` first ones. */
export function numberRow(p: NumberPattern, count: number): number[] {
  return Array.from({ length: count }, (_, i) => (p.times ? p.start * p.step ** i : p.start + i * p.step));
}

/** „+ 2”, „− 10”, „· 2”: the rule of a number row. */
export function ruleOf(p: NumberPattern): string {
  if (p.times) return `${TIMES} ${p.step}`;
  return p.step < 0 ? `${MINUS} ${-p.step}` : `+ ${p.step}`;
}

/** The picture that comes after the `shown` ones. */
export function nextPicture(p: PicturePattern): string {
  return p.unit[p.shown % p.unit.length];
}

/** How many squares (stairs) or sticks (a row of squares) figure `k` has. */
export function growingCount(g: Growing, k: number): number {
  return g.kind === 'stairs' ? 2 * k - 1 : 3 * k + 1;
}

// ───────────────────────── Sortare după două criterii ─────────────────────────

export interface Sort2Item { picture?: string; shape?: 'circle' | 'square' | 'triangle'; big?: boolean; name: string; col: number; row: number }
export interface Sort2Set { cols: string[]; rows: string[]; colTitle: string; rowTitle: string; items: Sort2Item[] }

const shapeItem = (shape: 'circle' | 'square' | 'triangle', big: boolean): Sort2Item => ({
  shape, big, name: `${{ circle: 'cerc', square: 'pătrat', triangle: 'triunghi' }[shape]} ${big ? 'mare' : 'mic'}`, col: ['circle', 'square', 'triangle'].indexOf(shape), row: big ? 0 : 1,
});

export const SORT2_SETS: Sort2Set[] = [
  {
    colTitle: 'forma', rowTitle: 'mărimea', cols: ['CERC', 'PĂTRAT', 'TRIUNGHI'], rows: ['MARE', 'MIC'],
    items: [shapeItem('circle', true), shapeItem('square', false), shapeItem('triangle', true), shapeItem('circle', false), shapeItem('square', true), shapeItem('triangle', false), shapeItem('circle', true), shapeItem('triangle', false), shapeItem('square', false)],
  },
  {
    colTitle: 'locul unde merge', rowTitle: 'motor', cols: ['PE USCAT', 'PE APĂ', 'ÎN AER'], rows: ['ARE MOTOR', 'NU ARE MOTOR'],
    items: [
      { picture: '🚗', name: 'mașina', col: 0, row: 0 }, { picture: '⛵', name: 'barca cu pânze', col: 1, row: 1 }, { picture: '🚁', name: 'elicopterul', col: 2, row: 0 },
      { picture: '🚲', name: 'bicicleta', col: 0, row: 1 }, { picture: '🚤', name: 'barca cu motor', col: 1, row: 0 }, { picture: '🪂', name: 'parașuta', col: 2, row: 1 },
      { picture: '🚌', name: 'autobuzul', col: 0, row: 0 }, { picture: '🛶', name: 'canoea', col: 1, row: 1 }, { picture: '✈️', name: 'avionul', col: 2, row: 0 },
    ],
  },
];

/** More means of transport for the second table, each in its one cell (none that could be argued: no scooter, no steam engine). */
const SORT2_VEHICLES: Sort2Item[] = [
  ...SORT2_SETS[1].items,
  { picture: '🚜', name: 'tractorul', col: 0, row: 0 }, { picture: '🚑', name: 'ambulanța', col: 0, row: 0 },
  { picture: '🚢', name: 'vaporul', col: 1, row: 0 }, { picture: '🚀', name: 'racheta', col: 2, row: 0 }, { picture: '🪁', name: 'zmeul', col: 2, row: 1 },
];

/**
 * The nine things of a „Sortează după două criterii” sheet. Another variant: nine again, at least one for
 * every cell of the table (shapes: one of each shape and size, and three more; transport: drawn from
 * the pool above), no picture twice.
 */
export function sort2Set(n: number, variant = currentVariant()): Sort2Set {
  const base = SORT2_SETS[n - 1];
  if (variant === 1) return base;
  const rand = memSeed(vkey(`sort2-set:${n}`, variant));
  const cells = base.rows.flatMap((_, row) => base.cols.map((__, col) => ({ col, row })));
  if (n === 1) {
    const all = cells.map((c) => shapeItem((['circle', 'square', 'triangle'] as const)[c.col], c.row === 0));
    return { ...base, items: [...all, ...mixed(rand, all).slice(0, 3)] };
  }
  const pool = mixed(rand, SORT2_VEHICLES);
  const items = cells.map((c) => pool.find((i) => i.col === c.col && i.row === c.row)!);
  for (const i of pool) if (items.length < 9 && !items.includes(i)) items.push(i);
  return { ...base, items };
}

// ───────────────────────── Plan de lucru; Ce se întâmplă dacă…? (clasa a II-a) ─────────────────────────

export interface PlanSet {
  title: string;
  /** The steps in their order: picture, sentence. */
  steps: [string, string][];
  /** „Adevărat” or „fals”, with „și”, „sau”, „nu”. */
  statements: [string, boolean][];
  /** The drawing of what the child expects to see. */
  draw: string;
}

export const PLAN_SETS: PlanSet[] = [
  {
    title: 'Cum încolțește fasolea?',
    steps: [
      ['🫙', 'Pun vată udă într-un borcan.'],
      ['🫘', 'Așez boabele de fasole pe vată.'],
      ['🪟', 'Pun borcanul la fereastră, la lumină și la căldură.'],
      ['📝', 'După cinci zile, desenez ce am observat.'],
    ],
    statements: [
      ['Fasolea are nevoie de apă și de căldură ca să încolțească.', true],
      ['Întâi desenez ce am observat, apoi pun fasolea pe vată.', false],
      ['În borcan pot pune vată udă sau hârtie udă.', true],
      ['Boabele de fasole nu au nevoie de apă ca să încolțească.', false],
    ],
    draw: 'Desenează cum crezi că arată fasolea după cinci zile.',
  },
  {
    title: 'Ce atrage magnetul?',
    steps: [
      ['📎', 'Adun pe masă un cui, o agrafă, o gumă și o hârtie.'],
      ['🧲', 'Apropii magnetul, pe rând, de fiecare obiect.'],
      ['🗂️', 'Pun obiectele atrase într-o parte, iar pe celelalte în alta.'],
      ['📝', 'Scriu ce am aflat: magnetul atrage obiectele de fier.'],
    ],
    statements: [
      ['Magnetul atrage cuiul și agrafa.', true],
      ['Magnetul atrage guma.', false],
      ['Hârtia nu este atrasă de magnet.', true],
      ['Magnetul atrage guma sau hârtia.', false],
    ],
    draw: 'Desenează obiectele pe care le atrage magnetul.',
  },
];

export interface CauseSet {
  /** „Dacă…” with its picture, and „atunci…”, in matching order. */
  pairs: [string, string, string][];
  /** Sentences to complete with a word from the bank: `{}` where it goes. */
  complete: TermSentence[];
  bank: string[];
}

export const CAUSE_SETS: CauseSet[] = [
  {
    pairs: [
      ['🧲', 'Dacă apropii magnetul de un cui,', 'cuiul este atras de magnet.'],
      ['🪴', 'Dacă nu uzi planta multe zile,', 'planta se usucă.'],
      ['🥁', 'Dacă lovești toba mai tare,', 'sunetul este mai puternic.'],
      ['🍫', 'Dacă lași ciocolata la soare,', 'ciocolata se topește.'],
      ['🌇', 'Dacă Soarele apune,', 'se face întuneric.'],
    ],
    complete: [
      { text: 'Dacă pui apa în congelator, apa {}.', answer: 'îngheață' },
      { text: 'Dacă apeși întrerupătorul, becul {}.', answer: 'se aprinde' },
      { text: 'Dacă scoți bateriile din lanternă, lanterna {}.', answer: 'nu mai luminează' },
    ],
    bank: ['se aprinde', 'îngheață', 'se topește', 'nu mai luminează'],
  },
  {
    pairs: [
      ['🧊', 'Dacă lași gheața la soare,', 'gheața se topește.'],
      ['🎈', 'Dacă umfli balonul prea tare,', 'balonul se sparge.'],
      ['🌧️', 'Dacă plouă mult,', 'pe stradă apar bălți.'],
      ['💡', 'Dacă se rupe firul lămpii,', 'becul nu se mai aprinde.'],
      ['🌱', 'Dacă ții planta mult la întuneric,', 'frunzele ei se îngălbenesc.'],
    ],
    complete: [
      { text: 'Dacă freci palmele una de alta, ele se {}.', answer: 'încălzesc' },
      { text: 'Dacă arunci mingea în sus, ea {}.', answer: 'cade înapoi' },
      { text: 'Dacă pui zahăr în ceai și amesteci, zahărul {}.', answer: 'se dizolvă' },
    ],
    bank: ['cade înapoi', 'se dizolvă', 'încălzesc', 'îngheață'],
  },
];

// ───────────────────────── grădiniță: forme, pictograma, comparații ─────────────────────────

export const AROUND_SHAPES = ['circle', 'square', 'triangle', 'rectangle'] as const;
export const AROUND_LABELS = ['CERC', 'PĂTRAT', 'TRIUNGHI', 'DREPTUNGHI'];
/** Object, its name, the index of its shape in AROUND_SHAPES. */
export const AROUND_ROWS: [string, string, number][] = [
  ['🕒', 'ceasul', 0], ['🍕', 'felia de pizza', 2], ['🚪', 'ușa', 3], ['🪟', 'fereastra', 1],
  ['🍪', 'biscuitul', 0], ['⚠️', 'semnul de atenție', 2], ['📱', 'telefonul', 3], ['📐', 'echerul', 2],
];

/** More things with a plain shape, to draw the rows of a variant from (the window is the only square: it is always there). */
const AROUND_POOL: [string, string, number][] = [...AROUND_ROWS, ['🧭', 'busola', 0], ['☀️', 'soarele', 0], ['✉️', 'plicul', 3], ['📕', 'cartea', 3]];

/**
 * The eight things of „Forme în jurul nostru”. Another variant: eight of the pool, every shape among
 * them and none more than three times.
 */
export function aroundRows(variant = currentVariant()): [string, string, number][] {
  if (variant === 1) return AROUND_ROWS;
  const rand = memSeed(vkey('around:1', variant));
  for (;;) {
    const rows = mixed(rand, AROUND_POOL).slice(0, AROUND_ROWS.length);
    const of = AROUND_SHAPES.map((_, k) => rows.filter((r) => r[2] === k).length);
    if (of.every((c) => c >= 1 && c <= 3)) return rows;
  }
}

/** The three kinds of a pictogram, with their names (plural, as in „Din care sunt cele mai multe?”). */
export const PICT_KINDS: [string, string][][] = [
  [['🍎', 'mere'], ['🍐', 'pere'], ['🍓', 'căpșuni']],
  [['🐱', 'pisici'], ['🐶', 'câini'], ['🐰', 'iepuri']],
];
export const PICT_MAX = 6;

/** How many of each kind (all different, 2–6). */
export function pictCounts(n: number, variant = currentVariant()): number[] {
  const rand = memSeed(vkey(`pict:${n}`, variant));
  const pool = [2, 3, 4, 5, 6];
  const out: number[] = [];
  while (out.length < 3) {
    const v = pool[Math.floor(rand() * pool.length)];
    if (!out.includes(v)) out.push(v);
  }
  return out;
}

/** The question, the two pictures with their names, the index of the answer. */
export const MORE_ROWS: [string, [string, string], [string, string], number][] = [
  ['Cine merge mai repede?', ['🐢', 'broasca țestoasă'], ['🐇', 'iepurele'], 1],
  ['Ce este mai cald?', ['🔥', 'focul'], ['🧊', 'gheața'], 0],
  ['Ce face mai mult zgomot?', ['📖', 'cartea'], ['🥁', 'toba'], 1],
  ['Ce zboară mai sus?', ['✈️', 'avionul'], ['🦋', 'fluturele'], 0],
  ['Ce a fost mai întâi?', ['🐥', 'puiul'], ['🥚', 'oul'], 1],
  ['Când este mai întuneric?', ['☀️', 'ziua'], ['🌙', 'noaptea'], 1],
  ['Ce este mai rece?', ['🍦', 'înghețata'], ['☕', 'ceaiul fierbinte'], 0],
  ['Ce se topește mai repede la soare?', ['⛄', 'omul de zăpadă'], ['🪨', 'piatra'], 0],
];

/** More comparisons nobody argues about, to draw the rows of a variant from. */
const MORE_POOL: typeof MORE_ROWS = [
  ...MORE_ROWS,
  ['Cine este mai mare?', ['🐘', 'elefantul'], ['🐭', 'șoarecele'], 0],
  ['Cine este mai înalt?', ['🐕', 'câinele'], ['🦒', 'girafa'], 1],
  ['Ce este mai greu?', ['🎈', 'balonul'], ['🪨', 'piatra'], 1],
  ['Cine merge mai încet?', ['🐌', 'melcul'], ['🐎', 'calul'], 0],
  ['Ce este mai dulce?', ['🍋', 'lămâia'], ['🍯', 'mierea'], 1],
  ['Ce luminează mai tare?', ['🕯️', 'lumânarea'], ['☀️', 'soarele'], 1],
  ['Ce este mai lung?', ['🚂', 'trenul'], ['🚗', 'mașina'], 0],
  ['Ce este mai moale?', ['🧸', 'ursulețul de pluș'], ['🪨', 'piatra'], 0],
];

/**
 * The eight questions of „Mai repede, mai cald…”. Another variant: eight of the pool, no picture twice on
 * the page, the two pictures of a row in either order, and the answer on the left in three to five rows
 * (so „always the second one” is never a way to answer).
 */
export function moreRows(variant = currentVariant()): typeof MORE_ROWS {
  if (variant === 1) return MORE_ROWS;
  const rand = memSeed(vkey('more:1', variant));
  for (;;) {
    const rows: typeof MORE_ROWS = [];
    for (const r of mixed(rand, MORE_POOL)) {
      const seen = rows.flatMap((x) => [x[1][0], x[2][0]]);
      if (rows.length < MORE_ROWS.length && !seen.includes(r[1][0]) && !seen.includes(r[2][0])) rows.push(rand() < 0.5 ? r : [r[0], r[2], r[1], 1 - r[3]]);
    }
    const left = rows.filter((r) => r[3] === 0).length;
    if (rows.length === MORE_ROWS.length && left >= 3 && left <= 5) return rows;
  }
}
