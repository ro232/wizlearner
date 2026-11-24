import { countOf } from '@/components/worksheet/plural';
import { fmtNum } from './math';
import { hasSettledWords, numberWordsLarge } from './number-words';
import type { Block, Expr, Tok } from './blocks34';

/**
 * Matematică, clasa a III-a și a IV-a (programme mate-iii-iv, OMEN 5003/2014): the data of the sheets in the „Jocuri”
 * category (m34-pages.ts draws them). Items are "kind:n"; each set is written for one class (M34_SETS):
 *
 * - "nr:1–4"    Numerele naturale: 0–10 000 (III), 0–1 000 000 (IV): with digits and words, place value, compare, order
 * - "rom:1–4"   Cifrele romane: I, V, X (III); I, V, X, L, C, D, M (IV)
 * - "rot:1–4"   Rotunjirea numerelor: to tens, hundreds, thousands (III); also ten and hundred thousands (IV)
 * - "ops:1–4"   Ordinea efectuării operațiilor: round brackets (III); round and square brackets (IV)
 * - "inm:1–4"   Înmulțirea și împărțirea: × 10, 100, one digit, two digits; the tables of division (III); factors of up to
 *               three digits, division by one or two digits with a remainder (IV)
 * - "prob:1–4"  Probleme: „cu … mai mult / mai puțin”, „de … ori” (III); the graphic method, going backwards, comparison (IV)
 * - "fr:1–4"    Fracții: shaded parts, compare, add and subtract with the same denominator (III); improper fractions,
 *               the same numerator, hundredths, 25 %, 50 %, 75 % (IV)
 * - "per:1–2"   Perimetrul (III; IV also the area on a grid of 1 cm squares)
 * - "geo:1–2"   Linii, unghiuri, poligoane (III; IV right, acute and obtuse angles, parallel and perpendicular lines)
 * - "mas:1–4"   Unități de măsură: without conversions (III), with conversions (IV); time and money
 * - "date:1–2"  Tabele și grafice (III bar charts; IV bars and lines)
 * - "sir:1–2"   Modele și regularități
 *
 * Everything is made from the item by a seeded generator, so the page, its answers and the evaluation always agree, and
 * each answer is computed from the very numbers printed. Numbers from 10 000 up are written in groups of three digits.
 */

export type M34Kind = 'nr' | 'rom' | 'rot' | 'ops' | 'inm' | 'prob' | 'fr' | 'per' | 'geo' | 'mas' | 'date' | 'sir';
export const M34_KINDS: M34Kind[] = ['nr', 'rom', 'rot', 'ops', 'inm', 'prob', 'fr', 'per', 'geo', 'mas', 'date', 'sir'];
export type Level34 = 'III' | 'IV';
/** The class of each set, set 1 first. */
export const M34_SETS: Record<M34Kind, Level34[]> = {
  nr: ['III', 'III', 'IV', 'IV'],
  rom: ['III', 'III', 'IV', 'IV'],
  rot: ['III', 'III', 'IV', 'IV'],
  ops: ['III', 'III', 'IV', 'IV'],
  inm: ['III', 'III', 'IV', 'IV'],
  prob: ['III', 'III', 'IV', 'IV'],
  fr: ['III', 'III', 'IV', 'IV'],
  per: ['III', 'IV'],
  geo: ['III', 'IV'],
  mas: ['III', 'III', 'IV', 'IV'],
  date: ['III', 'IV'],
  sir: ['III', 'IV'],
};

const M34_ITEM = /^((nr|rom|rot|ops|inm|prob|fr|mas):[1-4]|(per|geo|date|sir):[12])$/;
export function isM34Item(item: string): boolean {
  return M34_ITEM.test(item);
}

export function m34Parts(item: string): [M34Kind, number] {
  const [k, n] = item.split(':');
  return [k as M34Kind, Number(n)];
}

/** The class a set is written for. */
export function m34SetLevel(item: string): Level34 | null {
  if (!isM34Item(item)) return null;
  const [k, n] = m34Parts(item);
  return M34_SETS[k][n - 1] ?? null;
}

/** The free plan: the first set of each class of each kind (nr:1 and nr:3; per:1 and per:2). */
export function isFreeM34Item(item: string): boolean {
  if (!isM34Item(item)) return false;
  const [k, n] = m34Parts(item);
  const levels = M34_SETS[k];
  return levels.indexOf(levels[n - 1]) === n - 1;
}

export function m34Items(): string[] {
  return M34_KINDS.flatMap((k) => M34_SETS[k].map((_, i) => `${k}:${i + 1}`));
}

// ───────────────────────── seeded randomness ─────────────────────────

export function seed34(text: string): () => number {
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

/** A whole number from lo to hi (bounds that are not whole are rounded inwards). */
export const int = (rand: () => number, lo: number, hi: number) => {
  const a = Math.ceil(lo), b = Math.floor(hi);
  return a + Math.floor(rand() * (b - a + 1));
};
export function shuffled<T>(xs: readonly T[], rand: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
/** `count` different values from `make` (a key per value), in the order made. */
function distinct<T>(count: number, make: () => T, key: (x: T) => string = (x) => String(x)): T[] {
  const out: T[] = [];
  const seen = new Set<string>();
  for (let i = 0; out.length < count && i < count * 200; i++) {
    const x = make();
    if (seen.has(key(x))) continue;
    seen.add(key(x));
    out.push(x);
  }
  return out;
}

const f = fmtNum;
/** „1 pom”, „7 pomi”, „24 de pomi”, „12 345 de pomi”. */
export const cnt = (n: number, one: string, many: string) => countOf(n, one, many).replace(/^\d+/, f(n));
/** „de” before the noun after a number, when Romanian puts one („24 de mere”, „112 mere”). */
const de = (n: number) => (countOf(n, 'x', 'x').includes(' de ') ? ' de' : '');
export const MINUS = '−';
export const TIMES = '·';
const cmp = (a: number, b: number) => (a < b ? '<' : a > b ? '>' : '=');

// ───────────────────────── a sheet ─────────────────────────

export interface M34Sheet {
  level: Level34;
  title: string;
  instruction: string;
  help?: string;
  blocks: Block[];
  note?: string;
}

// ───────────────────────── Numerele naturale ─────────────────────────

/** A number with words a textbook prints one way (number-words.ts hasSettledWords), in [lo, hi]. */
function wordy(rand: () => number, lo: number, hi: number): number {
  for (;;) {
    const n = int(rand, lo, hi);
    if (hasSettledWords(n) && n % 10 !== 0) return n;
  }
}

function nrSheet(n: number): M34Sheet {
  const rand = seed34(`nr:${n}`);
  const iii = n <= 2;
  const lo = iii ? 1001 : 10001;
  const hi = iii ? 9999 : 999999;
  const boxW = iii ? 18 : 26;
  const toDigits = distinct(3, () => wordy(rand, lo, hi));
  // one with a zero inside (4 052, 305 017): the hard case
  toDigits[2] = (() => {
    for (;;) {
      const x = wordy(rand, lo, hi);
      if (/0/.test(String(x).slice(1))) return x;
    }
  })();
  const toWords = distinct(2, () => wordy(rand, iii ? 1001 : 20001, hi));
  const blocks: Block[] = [
    { t: 'fill', heading: 'Scrie numerele cu cifre.', items: toDigits.map((x) => ({ text: `${numberWordsLarge(x)} = {}`, answers: [f(x)] })), box: boxW },
    { t: 'fill', heading: 'Scrie numerele cu litere.', items: toWords.map((x) => ({ text: `${f(x)} = {_}`, answers: [numberWordsLarge(x)] })) },
  ];
  if (iii) {
    const place = distinct(3, () => int(rand, 1001, 9999));
    blocks.push({
      t: 'fill', heading: 'Completează: câte mii, sute, zeci și unități are numărul?',
      items: place.map((x) => ({ text: `${x} = {} mii + {} sute + {} zeci + {} unități`, answers: [Math.floor(x / 1000), Math.floor(x / 100) % 10, Math.floor(x / 10) % 10, x % 10].map(String) })),
      box: 8,
    });
  } else {
    const place = distinct(3, () => int(rand, 100001, 999999));
    blocks.push({
      t: 'fill', heading: 'Completează cifrele cerute.',
      items: place.map((x) => ({ text: `În ${f(x)}, cifra zecilor de mii este {}, a sutelor este {}, a unităților este {}.`, answers: [Math.floor(x / 10000) % 10, Math.floor(x / 100) % 10, x % 10].map(String) })),
      box: 8,
    });
  }
  const keep = iii ? 100 : 1000;
  const pairs = distinct(6, () => {
    const a = int(rand, lo, hi);
    const r = rand();
    const b = r < 0.17 ? a : r < 0.7 ? Math.max(lo, Math.min(hi, a - (a % keep) + int(rand, 0, keep - 1))) : int(rand, lo, hi);
    return [a, b] as const;
  }, (p) => p.join(','));
  if (!pairs.some(([a, b]) => a === b)) pairs[5] = [pairs[5][0], pairs[5][0]];
  blocks.push({ t: 'fill', heading: 'Compară numerele. Scrie în căsuță <, > sau =.', items: pairs.map(([a, b]) => ({ text: `${f(a)} {} ${f(b)}`, answers: [cmp(a, b)] })), cols: 2, box: 8 });
  const up = n % 2 === 1;
  const group = distinct(5, () => {
    // the same first digits, so the order is not given by the first one
    const head = int(rand, iii ? 2 : 20, iii ? 8 : 80);
    return head * (iii ? 1000 : 10000) + int(rand, 0, iii ? 999 : 9999);
  });
  const sorted = [...group].sort((a, b) => (up ? a - b : b - a));
  blocks.push({
    t: 'fill', heading: up ? 'Scrie numerele în ordine crescătoare (de la cel mai mic).' : 'Scrie numerele în ordine descrescătoare (de la cel mai mare).',
    items: [{ text: `${group.map(f).join(';  ')}:  {_}`, answers: [sorted.map(f).join(', ')] }],
  });
  if (!up) {
    const around = distinct(4, () => (rand() < 0.5 ? int(rand, lo / 1000 + 1, hi / 1000) * 1000 : int(rand, lo, hi)));
    blocks.push({ t: 'fill', heading: 'Scrie numărul dinainte și numărul de după.', items: around.map((x) => ({ text: `{} < ${f(x)} < {}`, answers: [f(x - 1), f(x + 1)] })), cols: 2, box: boxW });
    // the sorting block goes before the neighbours; drop the words block to keep the page to five tasks
    blocks.splice(1, 1);
  }
  return {
    level: iii ? 'III' : 'IV',
    title: iii ? 'Numerele până la 10 000' : 'Numerele până la 1 000 000',
    instruction: 'Citește cu atenție fiecare cerință și rezolvă.',
    help: iii ? 'Numerele de patru cifre: mii, sute, zeci, unități.' : 'De la 10 000 în sus, cifrele se scriu în grupe de câte trei: 456 789.',
    blocks,
  };
}

// ───────────────────────── Cifrele romane ─────────────────────────

const ROMAN: [number, string][] = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
const ROMAN_VALUE: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

/** 1–3999 in Roman numerals, the subtractive way taught in school (4 = IV, 9 = IX, 40 = XL, 90 = XC, 400 = CD, 900 = CM). */
export function toRoman(n: number): string {
  if (!Number.isInteger(n) || n < 1 || n > 3999) throw new Error(`toRoman: ${n}`);
  let out = '';
  let r = n;
  for (const [v, s] of ROMAN) while (r >= v) {
    out += s;
    r -= v;
  }
  return out;
}

/** A Roman numeral read back (only the well-formed ones: toRoman(fromRoman(s)) === s). */
export function fromRoman(s: string): number {
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const v = ROMAN_VALUE[s[i]], next = ROMAN_VALUE[s[i + 1]] ?? 0;
    if (!v) throw new Error(`fromRoman: ${s}`);
    total += v < next ? -v : v;
  }
  if (toRoman(total) !== s) throw new Error(`fromRoman: ${s} is not well formed`);
  return total;
}

/** A wrong way of writing n that children often try (IIII, VIIII, XXXX, IIX…), never a well-formed numeral. */
function wrongRoman(n: number): string {
  const right = toRoman(n);
  const repl: [RegExp, string][] = [[/CM/, 'DCCCC'], [/CD/, 'CCCC'], [/XC/, 'LXXXX'], [/XL/, 'XXXX'], [/IX/, 'VIIII'], [/IV/, 'IIII'], [/VIII$/, 'IIX'], [/III$/, 'IIV'], [/X$/, 'VV']];
  for (const [re, by] of repl) if (re.test(right)) return right.replace(re, by);
  return `${right}I`.replace(/IIII$/, 'IIIII');
}

function romSheet(n: number): M34Sheet {
  const rand = seed34(`rom:${n}`);
  const iii = n <= 2;
  // clasa a III-a: „formarea, citirea, scrierea numerelor cu cifrele romane I, V, X” (1–39); clasa a IV-a also L, C, D, M
  const pick = (count: number, lo: number, hi: number, must?: (x: number) => boolean) => distinct(count, () => {
    for (;;) {
      const x = int(rand, lo, hi);
      if (!must || must(x)) return x;
    }
  });
  const hard = (x: number) => /IV|IX|XL|XC|CD|CM/.test(toRoman(x));
  const toR = iii ? [...pick(5, 1, 20), ...pick(3, 21, 39, hard)] : [...pick(4, 40, 400, hard), ...pick(2, 401, 1999, hard), ...pick(2, 1900, 2099)];
  const toA = (iii ? [...pick(5, 2, 24), ...pick(3, 25, 39)] : [...pick(4, 41, 499, hard), ...pick(4, 500, 3999, hard)]).filter((x) => !toR.includes(x));
  const choose = pick(4, iii ? 4 : 40, iii ? 39 : 1999, hard);
  const blocks: Block[] = [
    { t: 'fill', heading: 'Scrie numerele cu cifre romane.', items: toR.map((x) => ({ text: `${f(x)} = {}`, answers: [toRoman(x)] })), cols: 4, box: iii ? 17 : 24 },
    { t: 'fill', heading: 'Scrie numerele cu cifre arabe.', items: toA.slice(0, 8).map((x) => ({ text: `${toRoman(x)} = {}`, answers: [f(x)] })), cols: iii ? 4 : 2, box: 13 },
    {
      t: 'choice', heading: 'Încercuiește scrierea corectă.',
      items: choose.map((x) => {
        const right = rand() < 0.5;
        const opts = right ? [toRoman(x), wrongRoman(x)] : [wrongRoman(x), toRoman(x)];
        return { text: `${f(x)}: {}`, options: opts, answer: right ? 0 : 1 };
      }),
      cols: 2,
    },
  ];
  if (iii) {
    const sums = distinct(4, () => {
      const a = int(rand, 2, 19), b = int(rand, 1, 39 - a);
      return [a, b] as const;
    }, (p) => p.join('+'));
    blocks.push({ t: 'fill', heading: 'Calculează. Scrie rezultatul tot cu cifre romane.', items: sums.map(([a, b]) => ({ text: `${toRoman(a)} + ${toRoman(b)} = {}`, answers: [toRoman(a + b)] })), cols: 2, box: 22 });
  } else {
    const years = pick(2, 1850, 2030);
    const centuries = pick(2, 14, 21);
    blocks.push({
      t: 'fill', heading: 'Anii și secolele se scriu des cu cifre romane. Completează.',
      items: [
        ...years.map((y) => ({ text: `anul ${y} = {}`, answers: [toRoman(y)] })),
        ...centuries.map((c) => ({ text: `secolul ${toRoman(c)} = secolul {}`, answers: [String(c)] })),
      ],
      cols: 2, box: 30,
    });
  }
  return {
    level: iii ? 'III' : 'IV',
    title: 'Cifrele romane',
    instruction: 'Rezolvă fiecare exercițiu.',
    help: iii ? 'I = 1, V = 5, X = 10. O cifră mai mică pusă în fața uneia mai mari se scade: IV = 4, IX = 9.' : 'I = 1, V = 5, X = 10, L = 50, C = 100, D = 500, M = 1000. Mai mică în fața uneia mai mari: se scade (XL = 40, CM = 900).',
    blocks,
  };
}

// ───────────────────────── Rotunjirea ─────────────────────────

/** n rounded to the nearest multiple of `to` (from 5 up, upwards: 4350 → 4400 at hundreds), as taught in school. */
export function roundTo(n: number, to: number): number {
  return Math.floor((n + to / 2) / to) * to;
}

const PLACE_NAMES: Record<number, string> = { 10: 'zeci', 100: 'sute', 1000: 'mii', 10000: 'zeci de mii', 100000: 'sute de mii' };

function rotSheet(n: number): M34Sheet {
  const rand = seed34(`rot:${n}`);
  const iii = n <= 2;
  const lo = iii ? 1001 : 100001;
  const hi = iii ? 9999 : 999999;
  const places = iii ? [10, 100, 1000] : n === 3 ? [100, 1000, 10000] : [1000, 10000, 100000];
  // numbers whose rounding is not just cutting the last digits off: half of them go up
  const numberFor = (to: number, upward: boolean) => {
    for (;;) {
      const x = int(rand, lo, hi);
      const r = roundTo(x, to);
      if (x % to !== 0 && (r > x) === upward) return x;
    }
  };
  const blocks: Block[] = places.map((to) => ({
    t: 'fill' as const,
    heading: `Rotunjește la ${PLACE_NAMES[to]}.`,
    items: distinct(6, () => numberFor(to, rand() < 0.5)).map((x) => ({ text: `${f(x)} ≈ {}`, answers: [f(roundTo(x, to))] })),
    cols: 3,
    box: iii ? 16 : 22,
  }));
  // the halfway case (5 goes up) and a choice between the two neighbours
  const to = places[1];
  const choices = distinct(4, () => {
    const base = int(rand, lo / to + 1, hi / to - 1) * to;
    const x = rand() < 0.4 ? base + to / 2 : base + int(rand, 1, to - 1);
    return x;
  }).map((x) => {
    const down = Math.floor(x / to) * to;
    const up = down + to;
    const right = roundTo(x, to);
    const order = rand() < 0.5;
    return { text: `${f(x)} rotunjit la ${PLACE_NAMES[to]}: {}`, options: order ? [f(down), f(up)] : [f(up), f(down)], answer: (order ? [down, up] : [up, down]).indexOf(right) };
  });
  blocks.push({ t: 'choice', heading: 'Încercuiește numărul rotunjit corect.', items: choices, cols: 2 });
  // a real-life use: about how many
  const people = numberFor(iii ? 100 : 1000, rand() < 0.5);
  const rp = roundTo(people, iii ? 100 : 1000);
  blocks.push({
    t: 'fill', heading: 'Rotunjim când spunem „cam câți”.',
    items: [{ text: `${iii ? 'Un sat' : 'Un oraș'} are ${cnt(people, 'locuitor', 'locuitori')}. Rotunjit la ${iii ? 'sute' : 'mii'}, numărul lor este cam {}.`, answers: [f(rp)] }],
    box: iii ? 16 : 22,
  });
  return {
    level: iii ? 'III' : 'IV',
    title: 'Rotunjirea numerelor',
    instruction: 'Rotunjește fiecare număr cum ți se cere.',
    help: 'Te uiți la cifra din dreapta locului la care rotunjești: 0, 1, 2, 3, 4 – rămâne; 5, 6, 7, 8, 9 – crește cu 1. Semnul ≈ înseamnă „aproximativ”.',
    blocks,
  };
}

// ───────────────────────── Ordinea operațiilor ─────────────────────────

/** An expression and its value, built so every step is a natural number and every division exact. */
interface Calc { text: string; value: number; leftToRight?: number }

/** Evaluates an expression written with +, −, ·, :, ( ), [ ] in the school order (brackets, then · and :, then + and −). */
export function evaluate(text: string): number {
  const src = text.replace(/\s+/g, '').replace(/−/g, '-').replace(/·/g, '*').replace(/:/g, '/').replace(/\[/g, '(').replace(/\]/g, ')');
  let i = 0;
  const num = (): number => {
    if (src[i] === '(') {
      i++;
      const v = expr();
      i++;
      return v;
    }
    let s = '';
    while (/\d/.test(src[i] ?? '')) s += src[i++];
    return Number(s);
  };
  const term = (): number => {
    let v = num();
    while (src[i] === '*' || src[i] === '/') {
      const op = src[i++];
      const r = num();
      if (op === '/' && v % r !== 0) throw new Error(`not exact: ${text}`);
      v = op === '*' ? v * r : v / r;
    }
    return v;
  };
  const expr = (): number => {
    let v = term();
    while (src[i] === '+' || src[i] === '-') {
      const op = src[i++];
      const r = term();
      v = op === '+' ? v + r : v - r;
      if (v < 0) throw new Error(`negative: ${text}`);
    }
    return v;
  };
  return expr();
}

function opsCalcs(rand: () => number, kind: 'plain' | 'round' | 'square', count: number, big: boolean): Calc[] {
  const t = () => int(rand, 2, 9);
  const make = (): Calc | null => {
    const a = int(rand, big ? 20 : 10, big ? 600 : 90);
    const p = t(), q = t(), r = t(), s = t();
    let text = '';
    if (kind === 'plain') {
      const forms = [
        `${a} + ${p} ${TIMES} ${q}`, `${a + p * q} ${MINUS} ${p} ${TIMES} ${q}`, `${p} ${TIMES} ${q} + ${r} ${TIMES} ${s}`, `${p * q} : ${q} + ${a}`,
        `${a} + ${r * s} : ${s}`, `${p} ${TIMES} ${q} ${MINUS} ${r * s} : ${r}`, `${a + p * q} ${MINUS} ${p} ${TIMES} ${q} + ${r}`,
      ];
      text = forms[int(rand, 0, forms.length - 1)];
    } else if (kind === 'round') {
      const forms = [
        `(${a} + ${p}) ${TIMES} ${q}`, `(${a} ${MINUS} ${p}) ${TIMES} ${q}`, `${p} ${TIMES} (${q} + ${r})`, `(${p * q} + ${r * q}) : ${q}`,
        `${a} ${MINUS} (${p} + ${q})`, `(${a} + ${p * r}) ${MINUS} ${q} ${TIMES} ${r}`, `${p} ${TIMES} (${a} ${MINUS} ${q})`, `(${q * r} ${MINUS} ${q}) : ${q}`,
      ];
      text = forms[int(rand, 0, forms.length - 1)];
    } else {
      const forms = [
        `[(${a} + ${p}) ${TIMES} ${q} ${MINUS} ${r}] ${TIMES} ${s}`, `[${a} ${MINUS} (${p} + ${q})] ${TIMES} ${r}`, `${s} ${TIMES} [${a} + (${p} ${MINUS} 1) ${TIMES} ${q}]`,
        `[(${p * q} + ${q * r}) : ${q} + ${s}] ${TIMES} ${t()}`, `${a * 10} ${MINUS} [${p} ${TIMES} (${q} + ${r}) + ${s}]`, `[${a} + ${p} ${TIMES} (${q} + ${r})] ${MINUS} ${s * 2}`,
      ];
      text = forms[int(rand, 0, forms.length - 1)];
    }
    try {
      const value = evaluate(text);
      if (value > (big ? 1000000 : 10000)) return null;
      return { text, value };
    } catch {
      return null;
    }
  };
  return distinct(count, () => {
    for (;;) {
      const c = make();
      if (c) return c;
    }
  }, (c) => c.text);
}

/** „a + b · c” worked left to right, ignoring the order of operations (the usual mistake); never the right result (c ≥ 2). */
function leftToRight(a: number, p: number, q: number): number {
  return (a + p) * q;
}

function opsSheet(n: number): M34Sheet {
  const rand = seed34(`ops:${n}`);
  const iii = n <= 2;
  const blocks: Block[] = [
    { t: 'fill', heading: 'Calculează. Înmulțirea și împărțirea se fac înaintea adunării și a scăderii.', items: opsCalcs(rand, 'plain', 6, !iii).map((c) => ({ text: `${c.text} = {}`, answers: [f(c.value)] })), cols: 2, box: 16 },
    { t: 'fill', heading: 'Calculează. Mai întâi ce este în paranteze.', items: opsCalcs(rand, 'round', 6, !iii).map((c) => ({ text: `${c.text} = {}`, answers: [f(c.value)] })), cols: 2, box: 16 },
  ];
  if (!iii) blocks.push({ t: 'fill', heading: 'Calculează. Întâi parantezele rotunde, apoi cele pătrate.', items: opsCalcs(rand, 'square', 4, true).map((c) => ({ text: `${c.text} = {}`, answers: [f(c.value)] })), cols: 1, box: 18 });
  // true or false: the right result, or the one of „from left to right”
  const tf = distinct(iii ? 4 : 3, () => [int(rand, 3, 20), int(rand, 2, 9), int(rand, 2, 9)] as const, (x) => x.join()).map(([a, p, q], k) => {
    const right = a + p * q;
    const shown = k % 2 === 0 ? right : leftToRight(a, p, q);
    return { text: `${a} + ${p} ${TIMES} ${q} = ${shown}`, answer: shown === right };
  });
  blocks.push({ t: 'tf', heading: 'Adevărat (A) sau fals (F)? Încercuiește.', items: tf });
  if (iii) {
    const [x, y, z] = [int(rand, 10, 40), int(rand, 2, 9), int(rand, 2, 9)];
    const [u, v, w] = [int(rand, 3, 9), int(rand, 10, 30), int(rand, 2, 9)];
    blocks.push({
      t: 'fill', heading: 'Scrie exercițiul, apoi calculează.',
      items: [
        { text: `La ${x} adaugă produsul numerelor ${y} și ${z}:  {_}`, answers: [`${x} + ${y} ${TIMES} ${z} = ${x + y * z}`] },
        { text: `Înmulțește cu ${u} suma numerelor ${v} și ${w}:  {_}`, answers: [`(${v} + ${w}) ${TIMES} ${u} = ${(v + w) * u}`] },
      ],
    });
  }
  return {
    level: iii ? 'III' : 'IV',
    title: 'Ordinea efectuării operațiilor',
    instruction: 'Calculează cu atenție, în ordinea corectă.',
    help: iii ? 'Mai întâi parantezele, apoi înmulțirile și împărțirile, la sfârșit adunările și scăderile.' : 'Parantezele rotunde, apoi cele pătrate; înmulțiri și împărțiri, apoi adunări și scăderi.',
    blocks,
  };
}

// ───────────────────────── Înmulțirea și împărțirea ─────────────────────────

/** An exercise to work in columns on the squares: its text and its answer. */
export interface ColumnExercise { text: string; answer: string }

function inmSheet(n: number): M34Sheet {
  const rand = seed34(`inm:${n}`);
  const blocks: Block[] = [];
  let column: ColumnExercise[] = [];
  if (n === 1) {
    // „înmulțirea unui număr cu 10, 100”; „înmulțirea a două numere dintre care unul este scris cu o cifră”; „…factorii au cel
    // puțin două cifre și rezultatul nu depășește 10.000”
    const tens = distinct(6, () => (rand() < 0.5 ? [int(rand, 11, 99), 10] : [int(rand, 11, 99), 100]) as [number, number], (p) => p.join());
    blocks.push({ t: 'fill', heading: 'Calculează în minte.', items: tens.map(([a, b]) => ({ text: `${a} ${TIMES} ${b} = {}`, answers: [f(a * b)] })), cols: 3, box: 15 });
    const one = distinct(2, () => [int(rand, 112, 2499), int(rand, 2, 4)] as [number, number], (p) => p.join());
    const two = distinct(2, () => {
      for (;;) {
        const a = int(rand, 12, 99), b = int(rand, 12, 99);
        if (a * b <= 10000) return [a, b] as [number, number];
      }
    }, (p) => p.join());
    column = [...one, ...two].map(([a, b]) => ({ text: `${a} ${TIMES} ${b} =`, answer: f(a * b) }));
    const miss = distinct(4, () => [int(rand, 2, 9), int(rand, 2, 9)] as [number, number], (p) => p.join());
    blocks.push({ t: 'fill', heading: 'Află numărul necunoscut.', items: miss.map(([a, b], k) => (k % 2 ? { text: `${a} ${TIMES} {} = ${a * b}`, answers: [String(b)] } : { text: `{} ${TIMES} ${b} = ${a * b}`, answers: [String(a)] })), cols: 4, box: 10 });
  } else if (n === 2) {
    // „împărțirea numerelor de două cifre la un număr de o cifră cu rest 0 (tabla împărțirii dedusă din tabla înmulțirii)”
    const table = distinct(8, () => [int(rand, 2, 9), int(rand, 2, 10)] as [number, number], (p) => p.join());
    blocks.push({ t: 'fill', heading: 'Calculează (tabla împărțirii).', items: table.map(([d, q]) => ({ text: `${d * q} : ${d} = {}`, answers: [String(q)] })), cols: 4, box: 10 });
    const twoDigit = distinct(6, () => {
      for (;;) {
        const d = int(rand, 2, 9), q = int(rand, 11, 49);
        if (d * q < 100) return [d, q] as [number, number];
      }
    }, (p) => p.join());
    blocks.push({ t: 'fill', heading: 'Împarte. Poți descompune: 84 : 4 = 80 : 4 + 4 : 4.', items: twoDigit.map(([d, q]) => ({ text: `${d * q} : ${d} = {}`, answers: [String(q)] })), cols: 3, box: 11 });
    const miss = distinct(4, () => [int(rand, 2, 9), int(rand, 2, 9)] as [number, number], (p) => p.join());
    blocks.push({ t: 'fill', heading: 'Află numărul necunoscut.', items: miss.map(([d, q], k) => (k % 2 ? { text: `${d * q} : {} = ${q}`, answers: [String(d)] } : { text: `{} : ${d} = ${q}`, answers: [String(d * q)] })), cols: 4, box: 10 });
    const check = distinct(2, () => {
      for (;;) {
        const d = int(rand, 3, 9), q = int(rand, 12, 32);
        if (d * q < 100) return [d, q] as [number, number];
      }
    }, (p) => p.join());
    blocks.push({
      t: 'fill', heading: 'Verifică împărțirea prin înmulțire.',
      items: check.map(([d, q]) => ({ text: `${d * q} : ${d} = ${q}, pentru că ${q} ${TIMES} ${d} = {}`, answers: [String(d * q)] })), cols: 2, box: 10,
    });
  } else if (n === 3) {
    // „înmulțirea unui număr cu 10, 100, 1 000”; „înmulțirea numerelor când factorii au cel mult trei cifre”
    const tens = distinct(6, () => [int(rand, 12, 999), [10, 100, 1000][int(rand, 0, 2)]] as [number, number], (p) => p.join());
    blocks.push({ t: 'fill', heading: 'Calculează în minte.', items: tens.map(([a, b]) => ({ text: `${a} ${TIMES} ${f(b)} = {}`, answers: [f(a * b)] })), cols: 3, box: 19 });
    column = [
      ...distinct(2, () => [int(rand, 105, 989), int(rand, 12, 98)] as [number, number], (p) => p.join()),
      ...distinct(2, () => [int(rand, 105, 989), int(rand, 105, 989)] as [number, number], (p) => p.join()),
    ].map(([a, b]) => ({ text: `${a} ${TIMES} ${b} =`, answer: f(a * b) }));
    // „proprietățile înmulțirii”: grouping the factors makes it easy
    const easy = distinct(3, () => {
      const pair = [[25, 4], [5, 20], [50, 2], [125, 8]][int(rand, 0, 3)];
      return [pair[0], int(rand, 7, 99), pair[1]] as [number, number, number];
    }, (p) => p.join());
    blocks.push({ t: 'fill', heading: 'Calculează ușor, grupând factorii potriviți.', items: easy.map(([a, b, c]) => ({ text: `${a} ${TIMES} ${b} ${TIMES} ${c} = {}`, answers: [f(a * b * c)] })), cols: 3, box: 16 });
  } else {
    // „împărțirea unui număr cu 10, 100, 1000”; „împărțirea numerelor mai mici de 1 000 000 la un număr de cel mult două
    // cifre (cu rest zero sau diferit de zero)”
    const tens = distinct(6, () => {
      const by = [10, 100, 1000][int(rand, 0, 2)];
      return [int(rand, 3, 950) * by, by] as [number, number];
    }, (p) => p.join());
    blocks.push({ t: 'fill', heading: 'Calculează în minte.', items: tens.map(([a, b]) => ({ text: `${f(a)} : ${f(b)} = {}`, answers: [f(a / b)] })), cols: 3, box: 15 });
    column = [
      ...distinct(2, () => [int(rand, 1003, 99999), int(rand, 3, 9)] as [number, number], (p) => p.join()),
      ...distinct(2, () => [int(rand, 1003, 99999), int(rand, 12, 48)] as [number, number], (p) => p.join()),
    ].map(([a, b]) => ({ text: `${f(a)} : ${b} =`, answer: `${f(Math.floor(a / b))}, rest ${a % b}` }));
    const rest = distinct(4, () => {
      const d = int(rand, 3, 9), q = int(rand, 4, 9), r = int(rand, 1, d - 1);
      return [d * q + r, d, q, r] as [number, number, number, number];
    }, (p) => p.join());
    blocks.push({ t: 'fill', heading: 'Completează câtul și restul.', items: rest.map(([a, d, q, r]) => ({ text: `${a} : ${d} = {} rest {}`, answers: [String(q), String(r)] })), cols: 2, box: 9 });
  }
  if (column.length) {
    const ex = column;
    blocks.splice(1, 0, {
      t: 'draw', heading: n <= 2 ? 'Calculează în coloană, pe pătrățele.' : n === 3 ? 'Calculează în coloană, pe pătrățele.' : 'Împarte pe pătrățele. Fă proba: cât · împărțitor + rest = deîmpărțit.',
      height: n === 2 ? 62 : 92, answers: ex.map((e, i) => `${String.fromCharCode(97 + i)}) ${e.text} ${e.answer}`),
      draw: () => undefined, // m34-pages.ts columnOps
    });
  }
  const titles = ['Înmulțirea până la 10 000', 'Împărțirea: tabla împărțirii', 'Înmulțirea până la 1 000 000', 'Împărțirea cu rest'];
  return { level: n <= 2 ? 'III' : 'IV', title: titles[n - 1], instruction: 'Rezolvă exercițiile.', blocks };
}

/** The column exercises of an „inm” set (the page draws them on squares). */
export function inmColumns(n: number): ColumnExercise[] {
  const b = inmSheet(n).blocks.find((x) => x.t === 'draw');
  return b && b.t === 'draw' ? b.answers.map((a) => {
    const m = a.match(/^[a-z]\) (.*=) (.*)$/)!;
    return { text: m[1], answer: m[2] };
  }) : [];
}

// ───────────────────────── Probleme ─────────────────────────

export interface Problem { text: string; solution: string; answer: string }

function probSet(n: number): Problem[] {
  const rand = seed34(`prob:${n}`);
  if (n === 1) {
    const a = int(rand, 120, 480), b = int(rand, 35, 190);
    const c = int(rand, 260, 940), d = int(rand, 45, c - 100);
    return [
      {
        text: `Într-o livadă sunt ${cnt(a, 'măr', 'meri')}. Peri sunt cu ${b} mai mulți decât meri. Câți pomi sunt în livadă?`,
        solution: `${a} + ${b} = ${a + b} (peri); ${a} + ${a + b} = ${2 * a + b} (pomi)`,
        answer: cnt(2 * a + b, 'pom', 'pomi'),
      },
      {
        text: `Luni, un magazin a vândut ${cnt(c, 'kilogram', 'kilograme')} de mere, iar marți cu ${cnt(d, 'kilogram', 'kilograme')} mai puțin. Câte kilograme de mere a vândut în cele două zile?`,
        solution: `${c} ${MINUS} ${d} = ${c - d} (kg marți); ${c} + ${c - d} = ${2 * c - d} (kg)`,
        answer: `${cnt(2 * c - d, 'kilogram', 'kilograme')} de mere`,
      },
    ];
  }
  if (n === 2) {
    const a = int(rand, 12, 85), k = int(rand, 3, 9);
    const q = int(rand, 30, 140), m = int(rand, 3, 7);
    return [
      {
        text: `Ana are ${cnt(a, 'timbru', 'timbre')}. Fratele ei are de ${k} ori mai multe. Câte timbre au împreună?`,
        solution: `${a} ${TIMES} ${k} = ${a * k} (timbre are fratele); ${a} + ${a * k} = ${a + a * k} (timbre)`,
        answer: cnt(a + a * k, 'timbru', 'timbre'),
      },
      {
        text: `Într-o bibliotecă sunt ${cnt(q * m, 'carte', 'cărți')}. Bibliotecara împrumută elevilor de ${m} ori mai puține cărți decât are. Câte cărți rămân în bibliotecă?`,
        solution: `${q * m} : ${m} = ${q} (cărți împrumutate); ${q * m} ${MINUS} ${q} = ${q * m - q} (cărți)`,
        answer: cnt(q * m - q, 'carte', 'cărți'),
      },
    ];
  }
  if (n === 3) {
    const small = int(rand, 120, 2400), diff = int(rand, 40, 900);
    const k = int(rand, 3, 9), b = int(rand, 15, 95), x = int(rand, 12, 250);
    const c = int(rand, 4, 9), p = int(rand, 2, 6);
    return [
      {
        text: `Suma a două numere este ${f(2 * small + diff)}, iar diferența lor este ${diff}. Află cele două numere. Folosește un desen cu segmente.`,
        solution: `${f(2 * small + diff)} ${MINUS} ${diff} = ${f(2 * small)}; ${f(2 * small)} : 2 = ${f(small)} (numărul mic); ${f(small)} + ${diff} = ${f(small + diff)} (numărul mare)`,
        answer: `${f(small)} și ${f(small + diff)}`,
      },
      {
        text: `M-am gândit la un număr. L-am înmulțit cu ${k}, la rezultat am adăugat ${b} și am obținut ${f(x * k + b)}. La ce număr m-am gândit?`,
        solution: `mersul invers: ${f(x * k + b)} ${MINUS} ${b} = ${f(x * k)}; ${f(x * k)} : ${k} = ${x}`,
        answer: String(x),
      },
      {
        text: `3 caiete și 2 pixuri costă ${cnt(3 * c + 2 * p, 'leu', 'lei')}. 3 caiete și 5 pixuri costă ${cnt(3 * c + 5 * p, 'leu', 'lei')}. Cât costă un pix? Dar un caiet?`,
        solution: `metoda comparației: ${3 * c + 5 * p} ${MINUS} ${3 * c + 2 * p} = ${3 * p} (lei costă 3 pixuri); ${3 * p} : 3 = ${p} (lei un pix); ${3 * c + 2 * p} ${MINUS} 2 ${TIMES} ${p} = ${3 * c}; ${3 * c} : 3 = ${c} (lei un caiet)`,
        answer: `un pix ${cnt(p, 'leu', 'lei')}, un caiet ${cnt(c, 'leu', 'lei')}`,
      },
    ];
  }
  const a = int(rand, 1200, 4800), k = int(rand, 2, 4);
  const plus = (() => {
    for (;;) {
      const b = int(rand, 150, 2400);
      if ((a + b) % k === 0) return b;
    }
  })();
  const sacks = int(rand, 12, 48), kg = [25, 40, 50][int(rand, 0, 2)], sold = int(rand, 10, 90) * 10;
  const part = int(rand, 120, 4500), times = int(rand, 2, 6);
  const sell = Math.min(sold, sacks * kg - 50);
  return [
    {
      text: `O fabrică a produs în ianuarie ${cnt(a, 'piesă', 'piese')}, în februarie cu ${cnt(plus, 'piesă', 'piese')} mai mult, iar în martie de ${k} ori mai puține piese decât în februarie. Câte piese a produs în cele trei luni?`,
      solution: `${f(a)} + ${f(plus)} = ${f(a + plus)} (februarie); ${f(a + plus)} : ${k} = ${f((a + plus) / k)} (martie); ${f(a)} + ${f(a + plus)} + ${f((a + plus) / k)} = ${f(a + a + plus + (a + plus) / k)}`,
      answer: cnt(a + a + plus + (a + plus) / k, 'piesă', 'piese'),
    },
    {
      text: `Un fermier are ${cnt(sacks, 'sac', 'saci')} cu grâu, fiecare de ${kg} kg. Vinde ${f(sell)} kg. Câte kilograme de grâu îi rămân?`,
      solution: `${sacks} ${TIMES} ${kg} = ${f(sacks * kg)} (kg); ${f(sacks * kg)} ${MINUS} ${f(sell)} = ${f(sacks * kg - sell)} (kg)`,
      answer: `${f(sacks * kg - sell)} kg`,
    },
    {
      text: `Suma a două numere este ${f(part * (times + 1))}. Un număr este de ${times} ori mai mare decât celălalt. Află numerele.`,
      solution: `${times} + 1 = ${times + 1} (părți egale); ${f(part * (times + 1))} : ${times + 1} = ${f(part)} (numărul mic); ${f(part)} ${TIMES} ${times} = ${f(part * times)} (numărul mare)`,
      answer: `${f(part)} și ${f(part * times)}`,
    },
  ];
}

/** „Compune o problemă…”: the exercise the child's problem must be solved by (III 5.1, IV 5.1: „…rezolvarea și/sau compunerea de probleme”). */
function composeExercise(n: number): string {
  const rand = seed34(`prob:compose:${n}`);
  const a = int(rand, 120, 480), b = int(rand, 20, 90), k = int(rand, 2, 6);
  return [`${a} + (${a} ${MINUS} ${b})`, `${b} ${TIMES} ${k} + ${a}`, `(${a} + ${b}) ${TIMES} ${k}`, `${a * k} : ${k} ${MINUS} ${b}`][n - 1];
}

function probSheet(n: number): M34Sheet {
  const problems = probSet(n);
  const iii = n <= 2;
  const rows = problems.length === 2 ? 12 : 6;
  const blocks: Block[] = problems.map((p, i) => ({ t: 'write' as const, heading: `Problema ${i + 1}`, prompts: [p.text], rows, ruling: 'grid' as const, answer: `${p.solution}. Răspuns: ${p.answer}.` }));
  const ex = composeExercise(n);
  blocks.push({ t: 'write', heading: `Compune o problemă care se rezolvă prin exercițiul: ${ex}.`, rows: 'fill', ruling: 'dictando', answer: `Problema copilului; se rezolvă prin ${ex} = ${f(evaluate(ex))}.` });
  return {
    level: iii ? 'III' : 'IV',
    title: iii ? 'Probleme cu două operații' : 'Probleme: metode de rezolvare',
    instruction: 'Citește problema, scrie rezolvarea pe pătrățele și răspunsul.',
    help: iii ? '„Cu … mai mult” înseamnă adunare, „de … ori mai mult” înseamnă înmulțire.' : 'Desenul cu segmente, mersul invers, metoda comparației: alege ce te ajută.',
    blocks,
  };
}

export function m34Problems(n: number): Problem[] {
  return probSet(n);
}

// ───────────────────────── Fracții ─────────────────────────

/** The names of the parts: „doime” … „zecime”, and „sutime” (IV). */
export const PART_NAMES: Record<number, [string, string]> = {
  2: ['doime', 'doimi'], 3: ['treime', 'treimi'], 4: ['pătrime', 'pătrimi'], 5: ['cincime', 'cincimi'], 6: ['șesime', 'șesimi'],
  7: ['șeptime', 'șeptimi'], 8: ['optime', 'optimi'], 9: ['noime', 'noimi'], 10: ['zecime', 'zecimi'], 100: ['sutime', 'sutimi'],
};
const FEM_COUNT = ['', 'o', 'două', 'trei', 'patru', 'cinci', 'șase', 'șapte', 'opt', 'nouă', 'zece'];
/** „trei optimi”, „o doime”, „două cincimi”, „treizeci și șapte de sutimi”. */
export function fractionWords(a: number, b: number): string {
  const [one, many] = PART_NAMES[b];
  if (a === 1) return `o ${one}`;
  if (a <= 10) return `${FEM_COUNT[a]} ${many}`;
  const words = numberWordsLarge(a).replace(/unu$/, 'una').replace(/ doi$/, ' două').replace(/^doisprezece$/, 'douăsprezece');
  return `${words}${de(a)} ${many}`;
}

/** A figure divided into equal parts, some shaded: how m34-pages.ts draws it. */
export interface FracFigure { shape: 'circle' | 'bar' | 'grid'; parts: number; shaded: number }

export interface FracSheet { level: Level34; title: string; help: string; blocks: Block[]; figures: FracFigure[]; color: FracFigure[] }

function fracSheet(n: number): FracSheet {
  const rand = seed34(`fr:${n}`);
  const blocks: Block[] = [];
  let figures: FracFigure[] = [];
  let color: FracFigure[] = [];
  const den = () => int(rand, 3, 10);
  if (n === 1) {
    // „diviziuni ale unui întreg: doime, treime, ..., zecime; reprezentări prin desene”; „fracție, numitor, numărător”
    figures = distinct(6, () => {
      const parts = int(rand, 2, 10);
      return { shape: (parts <= 8 && rand() < 0.5 ? 'circle' : 'bar') as FracFigure['shape'], parts, shaded: int(rand, 1, parts - 1) };
    }, (x) => `${x.parts}/${x.shaded}`);
    color = distinct(3, () => {
      const parts = int(rand, 3, 8);
      return { shape: (rand() < 0.5 ? 'circle' : 'bar') as FracFigure['shape'], parts, shaded: int(rand, 1, parts - 1) };
    }, (x) => `${x.parts}/${x.shaded}`);
    const words = distinct(4, () => {
      const b = den();
      return [int(rand, 1, b - 1), b] as [number, number];
    }, (p) => p.join('/'));
    const terms = distinct(2, () => {
      const b = den();
      return [int(rand, 1, b - 1), b] as [number, number];
    }, (p) => p.join('/'));
    blocks.push({ t: 'draw', heading: 'Ce parte din fiecare figură este colorată? Scrie fracția.', height: 52, answers: figures.map((x, i) => `${String.fromCharCode(97 + i)}) ${x.shaded}/${x.parts}`), draw: () => undefined });
    blocks.push({ t: 'draw', heading: 'Colorează partea arătată de fracție.', height: 34, answers: color.map((x, i) => `${String.fromCharCode(97 + i)}) ${x.shaded} din ${x.parts} părți`), draw: () => undefined });
    blocks.push({ t: 'expr', heading: 'Scrie fracția cu cifre.', items: words.map(([a, b]) => ({ toks: [`${fractionWords(a, b)} =`, { fbox: true }], answer: `${a}/${b}` })), cols: 2 });
    blocks.push({
      t: 'expr', heading: 'Completează.',
      items: terms.map(([a, b]) => ({ toks: ['La', { f: [a, b] }, 'numărătorul este', { box: 9 }, 'și numitorul este', { box: 9 }], answer: `numărătorul ${a}, numitorul ${b}`, score: 2 })),
    });
    return { level: 'III', title: 'Fracții: părți ale întregului', help: 'Întregul este împărțit în părți egale. Numitorul spune în câte, numărătorul câte luăm.', blocks, figures, color };
  }
  if (n === 2) {
    // compare, order (same denominator ≤ 10), add and subtract with the same denominator (III 2.4 „…sau cu fracții cu același numitor”)
    const pairs = distinct(6, () => {
      const b = den();
      const a = int(rand, 1, b), c = rand() < 0.15 ? a : int(rand, 1, b);
      return [a, c, b] as [number, number, number];
    }, (p) => p.join());
    blocks.push({ t: 'expr', heading: 'Compară fracțiile. Scrie <, > sau =.', items: pairs.map(([a, c, b]) => ({ toks: [{ f: [a, b] }, { box: 8 }, { f: [c, b] }], answer: `${a}/${b} ${cmp(a, c)} ${c}/${b}` })), cols: 3 });
    const b = int(rand, 7, 10);
    const ord = shuffled(distinct(4, () => int(rand, 1, b - 1)), rand);
    blocks.push({ t: 'expr', heading: 'Scrie fracțiile în ordine crescătoare.', items: [{ toks: [...ord.flatMap((a, k): Tok[] => (k ? [',', { f: [a, b] }] : [{ f: [a, b] }])), ':', { line: 70 }], answer: [...ord].sort((x, y) => x - y).map((a) => `${a}/${b}`).join(', ') }] });
    const sums = distinct(6, () => {
      const d = den();
      const plus = rand() < 0.5;
      const a = int(rand, 1, d - 1);
      const c = plus ? int(rand, 1, d - a) : int(rand, 1, a);
      return [a, c, d, plus ? 1 : 0] as [number, number, number, number];
    }, (p) => p.join());
    blocks.push({
      t: 'expr', heading: 'Calculează. Numitorul rămâne același.',
      items: sums.map(([a, c, d, plus]) => ({ toks: [{ f: [a, d] }, plus ? '+' : MINUS, { f: [c, d] }, '=', { fbox: true, den: d }], answer: `${a}/${d} ${plus ? '+' : MINUS} ${c}/${d} = ${plus ? a + c : a - c}/${d}` })),
      cols: 3,
    });
    const whole = int(rand, 4, 9);
    const eaten = int(rand, 1, whole - 2), later = int(rand, 1, whole - eaten - 1);
    blocks.push({
      t: 'expr', heading: `O pizza este tăiată în ${whole} felii egale. Dan mănâncă ${eaten === 1 ? 'o felie' : `${eaten} felii`}, apoi încă ${later === 1 ? 'una' : later}. Ce parte din pizza a mâncat?`,
      items: [{ toks: ['Dan a mâncat', { fbox: true }, 'din pizza.'], answer: `${eaten}/${whole} + ${later}/${whole} = ${eaten + later}/${whole}` }],
    });
    return { level: 'III', title: 'Fracții: comparare, adunare, scădere', help: 'Când numitorul e același, compari, aduni și scazi numărătorii.', blocks, figures, color };
  }
  if (n === 3) {
    // „fracții subunitare, echiunitare, supraunitare”; „adunarea și scăderea fracțiilor cu același numitor”; IV 2.2 „…fracțiilor
    // care au același numărător sau același numitor…”
    const kinds = shuffled([...distinct(2, () => { const b = den(); return [int(rand, 1, b - 1), b] as [number, number]; }, (p) => p.join()),
      ...distinct(2, () => { const b = den(); return [b, b] as [number, number]; }, (p) => p.join()),
      ...distinct(2, () => { const b = den(); return [int(rand, b + 1, 2 * b + 3), b] as [number, number]; }, (p) => p.join())], rand);
    const kindOf = ([a, b]: [number, number]) => (a < b ? 'subunitară' : a === b ? 'echiunitară' : 'supraunitară');
    blocks.push({
      t: 'expr', heading: 'Încercuiește felul fiecărei fracții.',
      items: kinds.map((fr) => ({ toks: [{ f: fr }, { pick: ['subunitară', 'echiunitară', 'supraunitară'] }], answer: `${fr[0]}/${fr[1]} ${kindOf(fr)}` })),
      cols: 2,
    });
    const sameTop = distinct(4, () => {
      const a = int(rand, 1, 7);
      const b = int(rand, a + 1, 10), c = int(rand, a + 1, 10);
      return [a, b, c] as [number, number, number];
    }, (p) => p.join()).map(([a, b, c]) => ({ toks: [{ f: [a, b] }, { box: 8 }, { f: [a, c] }] as Tok[], answer: `${a}/${b} ${cmp(c, b)} ${a}/${c}` }));
    blocks.push({ t: 'expr', heading: 'Compară. Același numărător: mai mare e fracția cu numitorul mai mic.', items: sameTop, cols: 4 });
    const sums = distinct(6, () => {
      const d = den();
      const plus = rand() < 0.5;
      const a = int(rand, 2, 2 * d);
      const c = plus ? int(rand, 1, 2 * d) : int(rand, 1, a - 1);
      return [a, c, d, plus ? 1 : 0] as [number, number, number, number];
    }, (p) => p.join());
    blocks.push({
      t: 'expr', heading: 'Calculează.',
      items: sums.map(([a, c, d, plus]) => ({ toks: [{ f: [a, d] }, plus ? '+' : MINUS, { f: [c, d] }, '=', { fbox: true }], answer: `${a}/${d} ${plus ? '+' : MINUS} ${c}/${d} = ${plus ? a + c : a - c}/${d}` })),
      cols: 3,
    });
    const d = int(rand, 5, 9);
    const read = int(rand, 1, d - 2);
    blocks.push({
      t: 'expr', heading: `Ioana a citit în prima zi ${fractionWords(read, d)} dintr-o carte, iar a doua zi încă ${fractionWords(1, d)}. Ce parte din carte mai are de citit?`,
      items: [{ toks: ['Mai are de citit', { fbox: true }, 'din carte.'], answer: `${d}/${d} ${MINUS} ${read}/${d} ${MINUS} 1/${d} = ${d - read - 1}/${d}` }],
    });
    return { level: 'IV', title: 'Fracții subunitare, echiunitare, supraunitare', help: 'Subunitară: numărătorul mai mic decât numitorul; echiunitară: egali (un întreg); supraunitară: mai mare.', blocks, figures, color };
  }
  // n === 4: „diviziuni ale unui întreg: sutime”; „scrierea procentuală (numai pentru 25%, 50%, 75%)”; IV 2.2 „…numitor egal cu 100”
  figures = distinct(3, () => ({ shape: 'grid' as const, parts: 100, shaded: int(rand, 6, 94) }), (x) => String(x.shaded));
  const hundredths = distinct(4, () => int(rand, 3, 97));
  blocks.push({ t: 'draw', heading: 'Pătratul are 100 de pătrățele. Ce parte este colorată? Scrie fracția.', height: 50, answers: figures.map((x, i) => `${String.fromCharCode(97 + i)}) ${x.shaded}/100`), draw: () => undefined });
  blocks.push({ t: 'expr', heading: 'Scrie fracția cu cifre.', items: hundredths.map((a) => ({ toks: [`${fractionWords(a, 100)} =`, { fbox: true }], answer: `${a}/100` })), cols: 2 });
  const pct = shuffled([25, 50, 75], rand);
  blocks.push({
    t: 'expr', heading: 'Procentul înseamnă „din 100”. Completează.',
    items: pct.map((p) => ({ toks: [`${p}% =`, { fbox: true, den: 100 }] as Tok[], answer: `${p}% = ${p}/100`, score: 1 })).concat(
      pct.map((p) => ({ toks: [{ f: [p === 75 ? 3 : 1, p === 50 ? 2 : 4] }, '=', { box: 9 }, '%'] as Tok[], answer: `${p === 50 ? '1/2' : p === 25 ? '1/4' : '3/4'} = ${p}%`, score: 1 })),
    ),
    cols: 3,
  });
  const cmpH = distinct(4, () => [int(rand, 5, 95), int(rand, 5, 95)] as [number, number], (p) => p.join()).map(([a, c]) => ({ toks: [{ f: [a, 100] }, { box: 8 }, { f: [c, 100] }] as Tok[], answer: `${a}/100 ${cmp(a, c)} ${c}/100` }));
  blocks.push({ t: 'expr', heading: 'Compară sutimile.', items: cmpH, cols: 4 });
  return { level: 'IV', title: 'Sutimi și procente', help: 'O sutime este una din 100 de părți egale. 25% = un sfert, 50% = o jumătate, 75% = trei sferturi.', blocks, figures, color };
}

export function m34Fractions(n: number): FracSheet {
  return fracSheet(n);
}

// ───────────────────────── Perimetrul și aria ─────────────────────────

export interface PerFigure { shape: 'square' | 'rectangle' | 'triangle' | 'rhombus' | 'parallelogram'; sides: number[]; unit: 'cm' | 'm' }
export const perimeter = (p: PerFigure) => (p.shape === 'square' || p.shape === 'rhombus' ? 4 * p.sides[0] : p.shape === 'rectangle' || p.shape === 'parallelogram' ? 2 * (p.sides[0] + p.sides[1]) : p.sides.reduce((s, x) => s + x, 0));
export const SHAPE_NAMES: Record<PerFigure['shape'], string> = { square: 'pătrat', rectangle: 'dreptunghi', triangle: 'triunghi', rhombus: 'romb', parallelogram: 'paralelogram' };

/** The shapes drawn on the grid of 1 cm squares (IV: „Aria unei suprafețe … rețele de pătrate cu latura de 1 cm”): cells. */
export interface AreaShape { cells: [number, number][] }

export interface PerSheet { level: Level34; figures: PerFigure[]; areas: AreaShape[]; blocks: Block[] }

function perimeterSum(p: PerFigure): string {
  const s = p.shape === 'square' || p.shape === 'rhombus' ? [p.sides[0], p.sides[0], p.sides[0], p.sides[0]] : p.shape === 'triangle' ? p.sides : [p.sides[0], p.sides[1], p.sides[0], p.sides[1]];
  return `${s.join(' + ')} = ${perimeter(p)} ${p.unit}`;
}

function perSheet(n: number): PerSheet {
  const rand = seed34(`per:${n}`);
  const iii = n === 1;
  const tri = () => {
    for (;;) {
      const a = int(rand, 3, 9), b = int(rand, 3, 9), c = int(rand, 3, 9);
      if (a + b > c + 1 && a + c > b + 1 && b + c > a + 1) return [a, b, c];
    }
  };
  const w = int(rand, 5, 9);
  const figures: PerFigure[] = iii
    ? [{ shape: 'square', sides: [int(rand, 3, 6)], unit: 'cm' }, { shape: 'rectangle', sides: [w, int(rand, 2, w - 2)], unit: 'cm' }, { shape: 'triangle', sides: tri(), unit: 'cm' }]
    : [{ shape: 'rhombus', sides: [int(rand, 3, 6)], unit: 'cm' }, { shape: 'parallelogram', sides: [w, int(rand, 3, w - 1)], unit: 'cm' }, { shape: 'triangle', sides: tri(), unit: 'cm' }];
  const blocks: Block[] = [
    { t: 'draw', heading: 'Află perimetrul fiecărei figuri: adună lungimile tuturor laturilor.', height: 56, answers: figures.map((p, i) => `${String.fromCharCode(97 + i)}) ${SHAPE_NAMES[p.shape]}: P = ${perimeterSum(p)}`), draw: () => undefined },
  ];
  let areas: AreaShape[] = [];
  if (iii) {
    const side = int(rand, 12, 48), L = int(rand, 20, 60), l = int(rand, 8, L - 4);
    blocks.push(
      { t: 'write', heading: 'Problema 1', prompts: [`Un teren în formă de pătrat are latura de ${side} m. Câți metri de gard trebuie pentru a-l împrejmui?`], rows: 6, ruling: 'grid', answer: `P = ${side} + ${side} + ${side} + ${side} = ${4 * side} m (sau 4 ${TIMES} ${side} = ${4 * side}). Răspuns: ${4 * side} m de gard.` },
      { t: 'write', heading: 'Problema 2', prompts: [`O grădină dreptunghiulară are lungimea de ${L} m și lățimea de ${l} m. Află perimetrul grădinii.`], rows: 6, ruling: 'grid', answer: `P = ${L} + ${l} + ${L} + ${l} = ${2 * (L + l)} m. Răspuns: ${2 * (L + l)} m.` },
    );
  } else {
    const p = int(rand, 5, 15) * 4;
    blocks.push({ t: 'fill', heading: 'Află latura, știind perimetrul.', items: [{ text: `Un pătrat are perimetrul de ${p} cm. Latura lui are {} cm.`, answers: [String(p / 4)] }, { text: `Un romb are perimetrul de ${p + 8} cm. Latura lui are {} cm.`, answers: [String((p + 8) / 4)] }], box: 11 });
    // three shapes of squares of 1 cm (true size): a rectangle, an L, a step
    const rw = int(rand, 3, 5), rh = int(rand, 2, 3);
    const rect: [number, number][] = [];
    for (let x = 0; x < rw; x++) for (let y = 0; y < rh; y++) rect.push([x, y]);
    const lShape: [number, number][] = [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2], ...(rand() < 0.5 ? [[3, 2] as [number, number]] : [])];
    const step: [number, number][] = [[0, 2], [1, 2], [2, 2], [1, 1], [2, 1], [2, 0]];
    areas = [{ cells: rect }, { cells: lShape }, { cells: step }];
    blocks.push({ t: 'draw', heading: 'Fiecare pătrățel are latura de 1 cm. Câte pătrățele are fiecare figură? Aceasta este aria ei.', height: 48, answers: areas.map((a, i) => `${String.fromCharCode(97 + i)}) ${a.cells.length} cm²`), draw: () => undefined });
  }
  return { level: iii ? 'III' : 'IV', figures, areas, blocks };
}

export function m34Perimeter(n: number): PerSheet {
  return perSheet(n);
}

// ───────────────────────── Linii, unghiuri, poligoane ─────────────────────────

export type LineKind = 'dreaptă' | 'semidreaptă' | 'segment' | 'linie frântă' | 'linie curbă' | 'punct';
export const LINE_KINDS: LineKind[] = ['dreaptă', 'semidreaptă', 'segment', 'linie frântă', 'linie curbă', 'punct'];
export type AngleKind = 'drept' | 'ascuțit' | 'obtuz';
export type PairKind = 'paralele' | 'perpendiculare' | 'concurente';

export interface GeoSheet { level: Level34; lines: LineKind[]; angles: { deg: number; turn: number }[]; pairs: { kind: PairKind; turn: number }[]; polygons: PerFigure['shape'][]; blocks: Block[] }

export const angleKind = (deg: number): AngleKind => (deg === 90 ? 'drept' : deg < 90 ? 'ascuțit' : 'obtuz');

function geoSheet(n: number): GeoSheet {
  const rand = seed34(`geo:${n}`);
  if (n === 1) {
    const lines = shuffled(LINE_KINDS, rand);
    const polygons = shuffled<PerFigure['shape']>(['square', 'rectangle', 'triangle'], rand);
    const angles = shuffled([90, 90, 40, 130, 90, 60], rand).map((deg) => ({ deg, turn: int(rand, 0, 3) * 90 + (rand() < 0.5 ? 0 : 20) }));
    return {
      level: 'III', lines, angles, pairs: [], polygons,
      blocks: [
        { t: 'draw', heading: 'Scrie sub fiecare desen ce este: dreaptă, semidreaptă, segment, linie frântă, linie curbă, punct.', height: 46, answers: lines.map((l, i) => `${String.fromCharCode(97 + i)}) ${l}`), draw: () => undefined },
        { t: 'draw', heading: 'Câte laturi, câte vârfuri și câte unghiuri are fiecare poligon?', height: 44, answers: polygons.map((p, i) => `${String.fromCharCode(97 + i)}) ${SHAPE_NAMES[p]}: ${p === 'triangle' ? 3 : 4} laturi, ${p === 'triangle' ? 3 : 4} vârfuri, ${p === 'triangle' ? 3 : 4} unghiuri`), score: 9, draw: () => undefined },
        { t: 'draw', heading: 'Unghiurile drepte arată ca un colț de caiet. Încercuiește unghiurile drepte.', height: 34, answers: [`unghiurile drepte: ${angles.map((a, i) => (a.deg === 90 ? String.fromCharCode(97 + i) : '')).filter(Boolean).join(', ')}`], score: angles.length, draw: () => undefined },
      ],
    };
  }
  const angles = shuffled([90, 35, 120, 90, 65, 150], rand).map((deg) => ({ deg, turn: int(rand, 0, 7) * 45 }));
  const pairs = shuffled<PairKind>(['paralele', 'perpendiculare', 'concurente', 'paralele', 'perpendiculare'], rand).map((kind) => ({ kind, turn: int(rand, 0, 3) * 30 }));
  const polygons = shuffled<PerFigure['shape']>(['square', 'rectangle', 'rhombus', 'parallelogram', 'triangle'], rand);
  return {
    level: 'IV', lines: [], angles, pairs, polygons,
    blocks: [
      { t: 'draw', heading: 'Încercuiește felul fiecărui unghi: drept, ascuțit (mai mic decât cel drept) sau obtuz (mai mare).', height: 60, answers: angles.map((a, i) => `${String.fromCharCode(97 + i)}) ${angleKind(a.deg)}`), draw: () => undefined },
      { t: 'draw', heading: 'Cum sunt dreptele? Încercuiește: paralele, perpendiculare sau doar concurente (se taie, dar nu în unghi drept).', height: 40, answers: pairs.map((p, i) => `${String.fromCharCode(97 + i)}) ${p.kind}`), draw: () => undefined },
      { t: 'draw', heading: 'Scrie numele fiecărui poligon: pătrat, dreptunghi, romb, paralelogram, triunghi.', height: 40, answers: polygons.map((p, i) => `${String.fromCharCode(97 + i)}) ${SHAPE_NAMES[p]}`), draw: () => undefined },
    ],
  };
}

export function m34Geometry(n: number): GeoSheet {
  return geoSheet(n);
}

// ───────────────────────── Unități de măsură ─────────────────────────

function masSheet(n: number): M34Sheet {
  const rand = seed34(`mas:${n}`);
  const blocks: Block[] = [];
  if (n === 1) {
    // without conversions (III 4.2 „Operarea cu unități de măsură standardizate, fără transformări”)
    const units: [string, string[], number][] = shuffled<[string, string[], number]>([
      ['Lungimea clasei: 8 {}', ['m', 'cm', 'km'], 0], ['Lungimea unui creion: 15 {}', ['cm', 'm', 'km'], 0], ['Drumul până la munte: 120 {}', ['km', 'm', 'cm'], 0],
      ['Un sac de cartofi: 25 {}', ['kg', 'g', 'l'], 0], ['O ciocolată: 100 {}', ['g', 'kg', 'l'], 0], ['Apa dintr-o găleată: 10 {}', ['l', 'ml', 'kg'], 0],
      ['O linguriță de sirop: 5 {}', ['ml', 'l', 'g'], 0], ['Grosimea unei monede: 2 {}', ['mm', 'cm', 'm'], 0],
    ], rand).slice(0, 6).map(([t, o]) => {
      const opts = shuffled(o, rand);
      return [t, opts, opts.indexOf(o[0])];
    });
    blocks.push({ t: 'choice', heading: 'Încercuiește unitatea de măsură potrivită.', items: units.map(([text, options, answer]) => ({ text, options, answer })), cols: 2 });
    const ops = distinct(6, () => {
      const u = ['cm', 'm', 'g', 'kg', 'l', 'ml'][int(rand, 0, 5)];
      const big = u === 'g' || u === 'ml' ? 900 : 90;
      const a = int(rand, 10, big), b = int(rand, 5, Math.max(6, big - a));
      const plus = rand() < 0.5 || a <= b;
      return [a, b, u, plus] as const;
    }, (x) => x.join());
    blocks.push({ t: 'fill', heading: 'Calculează. Rezultatul are aceeași unitate de măsură.', items: ops.map(([a, b, u, plus]) => ({ text: `${a} ${u} ${plus ? '+' : MINUS} ${b} ${u} = {} ${u}`, answers: [String(plus ? a + b : a - b)] })), cols: 2, box: 13 });
    const tools: [string, string[]][] = [
      ['lungimea unei camere', ['ruleta', 'cântarul', 'ceasul']], ['masa unei pungi cu mere', ['cântarul', 'rigla', 'ruleta']],
      ['lungimea unui caiet', ['rigla', 'balanța', 'ceasul']], ['talia pentru o haină', ['metrul de croitorie', 'cântarul', 'rigla']],
    ];
    blocks.push({
      t: 'choice', heading: 'Cu ce măsori? Încercuiește instrumentul.',
      items: tools.map(([what, o]) => {
        const opts = shuffled(o, rand);
        return { text: `${what}: {}`, options: opts, answer: opts.indexOf(o[0]) };
      }),
    });
    const a = int(rand, 120, 450), b = int(rand, 80, a - 20);
    blocks.push({ t: 'fill', heading: 'Rezolvă.', items: [{ text: `O sfoară are ${a} cm. Se taie din ea ${b} cm. Câți centimetri au rămas? {} cm`, answers: [String(a - b)] }], box: 13 });
    return { level: 'III', title: 'Lungimea, masa, capacitatea', instruction: 'Alege unitatea potrivită și calculează.', help: 'Lungime: m, dm, cm, mm, km. Masă: kg, g. Capacitate: l, ml.', blocks };
  }
  if (n === 2) {
    // time („ora (citirea ceasului), ziua, săptămâna, anul”) and money („leul și banul, euro și eurocentul”; „schimburi
    // monetare echivalente în aceeași unitate monetară”)
    blocks.push({
      t: 'fill', heading: 'Completează.',
      items: [
        { text: 'O zi are {} de ore.', answers: ['24'] }, { text: 'O săptămână are {} zile.', answers: ['7'] }, { text: 'Un an are {} luni.', answers: ['12'] },
        { text: 'O oră are {} de minute.', answers: ['60'] }, { text: '1 leu = {} de bani', answers: ['100'] }, { text: '1 euro = {} de eurocenți', answers: ['100'] },
      ],
      cols: 2, box: 11,
    });
    const money = distinct(4, () => {
      const l1 = int(rand, 1, 9), b1 = int(rand, 1, 6) * 10, l2 = int(rand, 1, 9), b2 = int(rand, 1, 9 - b1 / 10) * 10;
      return [l1, b1, l2, b2] as [number, number, number, number];
    }, (x) => x.join()).filter(([, b1, , b2]) => b1 + b2 < 100);
    blocks.push({
      t: 'fill', heading: 'Adună banii: leii cu leii, banii cu banii.',
      items: money.map(([l1, b1, l2, b2]) => ({ text: `${cnt(l1, 'leu', 'lei')} și ${cnt(b1, 'ban', 'bani')} + ${cnt(l2, 'leu', 'lei')} și ${cnt(b2, 'ban', 'bani')} = {} lei și {} de bani`, answers: [String(l1 + l2), String(b1 + b2)] })),
      cols: 1, box: 10,
    });
    const days = int(rand, 2, 4);
    const price = int(rand, 3, 9), pay = 20;
    blocks.push({
      t: 'fill', heading: 'Rezolvă.',
      items: [
        { text: `O carte costă ${cnt(price, 'euro', 'euro')}. Plătești cu o bancnotă de ${pay} de euro. Câți euro primești rest? {}`, answers: [String(pay - price)] },
        { text: `Bunica vine în vizită peste ${days} săptămâni. Câte zile sunt până atunci? {}`, answers: [String(days * 7)] },
      ],
      box: 11,
    });
    return { level: 'III', title: 'Timpul și banii', instruction: 'Completează și rezolvă.', help: '1 leu = 100 de bani. 1 euro = 100 de eurocenți.', blocks };
  }
  if (n === 3) {
    // IV „transformări pentru lungime/volum/masă în limita operațiilor cunoscute” (incl. tona și chintalul)
    const conv: [string, string, number][] = shuffled<[string, string, number]>([
      ['m', 'cm', 100], ['km', 'm', 1000], ['dm', 'cm', 10], ['m', 'mm', 1000], ['kg', 'g', 1000], ['t', 'kg', 1000], ['q', 'kg', 100], ['l', 'ml', 1000], ['hl', 'l', 100], ['l', 'dl', 10],
    ], rand).slice(0, 8);
    blocks.push({ t: 'fill', heading: 'Transformă în unitatea cerută.', items: conv.map(([a, b, k]) => { const x = int(rand, 2, 9); return { text: `${x} ${a} = {} ${b}`, answers: [f(x * k)] }; }), cols: 2, box: 15 });
    const mixed = distinct(4, () => {
      const pick = int(rand, 0, 2);
      const [a, b, k] = ([['m', 'cm', 100], ['kg', 'g', 1000], ['km', 'm', 1000]] as const)[pick];
      return [int(rand, 2, 9), int(rand, 5, k - 5), a, b, k] as const;
    }, (x) => x.join()).map(([x, y, a, b, k]) => ({ text: `${x} ${a} ${y} ${b} = {} ${b}`, answers: [f(x * k + y)] }));
    blocks.push({ t: 'fill', heading: 'Transformă.', items: mixed, cols: 2, box: 15 });
    const cmps = distinct(3, () => {
      const x = int(rand, 2, 8);
      const y = rand() < 0.3 ? x * 100 : int(rand, 1, 9) * 100 + (rand() < 0.5 ? 0 : 50);
      return [x, y] as [number, number];
    }, (p) => p.join()).map(([x, y]) => ({ text: `${x} m {} ${y} cm`, answers: [cmp(x * 100, y)] }));
    blocks.push({ t: 'fill', heading: 'Compară. Transformă mai întâi în aceeași unitate.', items: cmps, cols: 3, box: 8 });
    const t = int(rand, 2, 5), sacks = int(rand, 8, 30), kg = 50;
    blocks.push({
      t: 'write', heading: 'Problemă', prompts: [`Un camion poate duce ${t} t. Câți saci de câte ${kg} kg încap în camion? În camion sunt deja ${cnt(sacks, 'sac', 'saci')}. Câți saci mai încap?`],
      rows: 6, ruling: 'grid', answer: `${t} t = ${f(t * 1000)} kg; ${f(t * 1000)} : ${kg} = ${t * 20} (saci); ${t * 20} ${MINUS} ${sacks} = ${t * 20 - sacks}. Răspuns: mai încap ${cnt(t * 20 - sacks, 'sac', 'saci')}.`,
    });
    return { level: 'IV', title: 'Transformări de unități de măsură', instruction: 'Transformă, compară și rezolvă.', help: '1 km = 1000 m, 1 m = 100 cm, 1 kg = 1000 g, 1 t = 1000 kg, 1 q = 100 kg, 1 l = 1000 ml, 1 hl = 100 l.', blocks };
  }
  // n === 4: time intervals and transformations (IV), money
  const conv: [string, string, number][] = [['ore', 'minute', 60], ['minute', 'secunde', 60], ['săptămâni', 'zile', 7], ['ani', 'luni', 12], ['zile', 'ore', 24]];
  blocks.push({
    t: 'fill', heading: 'Transformă.',
    items: [...conv.map(([a, b, k]) => { const x = int(rand, 2, 5); return { text: `${x} ${a} = {}${de(x * k)} ${b}`, answers: [String(x * k)] }; }), { text: '1 secol = {} de ani', answers: ['100'] }],
    cols: 2, box: 12,
  });
  const start = [int(rand, 8, 17), [0, 15, 20, 30, 40, 45][int(rand, 0, 5)]] as const;
  const dur = [int(rand, 1, 2), [10, 15, 25, 30, 35, 50][int(rand, 0, 5)]] as const;
  const endMin = start[0] * 60 + start[1] + dur[0] * 60 + dur[1];
  const hm = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
  const dep = [int(rand, 6, 10), [5, 10, 20, 35, 40, 50][int(rand, 0, 5)]] as const;
  const arrMin = dep[0] * 60 + dep[1] + int(rand, 2, 4) * 60 + int(rand, 1, 5) * 10;
  const trip = arrMin - (dep[0] * 60 + dep[1]);
  blocks.push({
    t: 'fill', heading: 'Calculează intervalele de timp.',
    items: [
      { text: `Filmul începe la ${hm(start[0] * 60 + start[1])} și durează ${dur[0] === 1 ? 'o oră' : '2 ore'} și ${cnt(dur[1], 'minut', 'minute')}. Se termină la ora {}.`, answers: [hm(endMin)] },
      { text: `Trenul pleacă la ${hm(dep[0] * 60 + dep[1])} și ajunge la ${hm(arrMin)}. Călătoria durează {} h și {} min.`, answers: [String(Math.floor(trip / 60)), String(trip % 60)] },
    ],
    box: 14,
  });
  const lei = distinct(3, () => [int(rand, 2, 19), int(rand, 1, 9) * 10 + int(rand, 0, 1) * 5] as [number, number], (p) => p.join());
  blocks.push({
    t: 'fill', heading: 'Transformă banii.',
    items: [
      ...lei.slice(0, 2).map(([l, b]) => ({ text: `${cnt(l, 'leu', 'lei')} și ${cnt(b, 'ban', 'bani')} = {}${de(l * 100 + b)} bani`, answers: [String(l * 100 + b)] })),
      { text: `${cnt(lei[2][0] * 100 + lei[2][1], 'ban', 'bani')} = {} lei și {}${de(lei[2][1])} bani`, answers: [String(lei[2][0]), String(lei[2][1])] },
      { text: `3 euro și 40 de eurocenți = {} de eurocenți`, answers: ['340'] },
    ],
    cols: 1, box: 12,
  });
  return { level: 'IV', title: 'Timpul și banii: transformări', instruction: 'Transformă și calculează.', help: '1 oră = 60 de minute, 1 minut = 60 de secunde, 1 an = 12 luni, 1 secol = 100 de ani; 1 leu = 100 de bani.', blocks };
}

// ───────────────────────── Tabele și grafice ─────────────────────────

export interface DataSheet { level: Level34; labels: string[]; values: number[]; line?: { labels: string[]; values: number[] }; blocks: Block[] }

function dataSheet(n: number): DataSheet {
  const rand = seed34(`date:${n}`);
  if (n === 1) {
    const labels = ['Ana', 'Dan', 'Maria', 'Radu', 'Elena'];
    const values = distinct(5, () => int(rand, 2, 9));
    const most = labels[values.indexOf(Math.max(...values))];
    const least = labels[values.indexOf(Math.min(...values))];
    const total = values.reduce((s, v) => s + v, 0);
    return {
      level: 'III', labels, values,
      blocks: [
        { t: 'draw', heading: 'Tabelul arată câte cărți a citit fiecare copil într-o lună. Desenează graficul cu bare: colorează pentru fiecare copil atâtea pătrățele câte cărți a citit.', height: 86, answers: [labels.map((l, i) => `${l}: ${values[i]}`).join(', ')], score: 5, draw: () => undefined },
        {
          t: 'fill', heading: 'Răspunde folosind tabelul.',
          items: [
            { text: 'Cine a citit cele mai multe cărți? {_}', answers: [most] }, { text: 'Cine a citit cele mai puține? {_}', answers: [least] },
            { text: `Câte cărți au citit ${labels[0]} și ${labels[1]} împreună? {}`, answers: [String(values[0] + values[1])] }, { text: 'Câte cărți au citit toți copiii? {}', answers: [String(total)] },
          ],
          box: 11,
        },
      ],
    };
  }
  const labels = ['luni', 'marți', 'miercuri', 'joi', 'vineri'];
  const values = distinct(5, () => int(rand, 1, 9) * 10);
  const tl = ['ora 8', 'ora 10', 'ora 12', 'ora 14', 'ora 16'];
  const tv = [int(rand, 2, 6), 0, 0, 0, 0];
  for (let i = 1; i < 5; i++) tv[i] = i < 3 ? tv[i - 1] + int(rand, 2, 5) : Math.max(0, tv[i - 1] + (i === 3 ? int(rand, 0, 2) : -int(rand, 1, 4)));
  const maxDay = labels[values.indexOf(Math.max(...values))];
  const hot = tl[tv.indexOf(Math.max(...tv))];
  return {
    level: 'IV', labels, values, line: { labels: tl, values: tv },
    blocks: [
      {
        t: 'draw', heading: 'Graficul cu bare arată câte bilete s-au vândut la teatrul de păpuși. Răspunde.', height: 62,
        answers: [`${labels.map((l, i) => `${l}: ${values[i]}`).join(', ')}; cele mai multe: ${maxDay}; total: ${values.reduce((s, v) => s + v, 0)}; diferența dintre ${labels[0]} și ${labels[4]}: ${Math.abs(values[0] - values[4])}`], score: 3, draw: () => undefined,
      },
      {
        t: 'fill', heading: 'Folosește graficul cu bare.',
        items: [
          { text: 'În ce zi s-au vândut cele mai multe bilete? {_}', answers: [maxDay] },
          { text: 'Câte bilete s-au vândut în toată săptămâna? {}', answers: [String(values.reduce((s, v) => s + v, 0))] },
          { text: `Cu câte bilete s-au vândut mai ${values[0] > values[4] ? 'multe' : 'puține'} luni decât vineri? {}`, answers: [String(Math.abs(values[0] - values[4]))] },
        ],
        box: 12,
      },
      {
        t: 'draw', heading: 'Graficul liniar arată temperatura (în grade) într-o zi de primăvară. Răspunde.', height: 58,
        answers: [`${tl.map((l, i) => `${l}: ${tv[i]}°`).join(', ')}; cel mai cald: ${hot}; creșterea de la ora 8 la ora 12: ${tv[2] - tv[0]}°`], score: 2, draw: () => undefined,
      },
    ],
  };
}

export function m34Data(n: number): DataSheet {
  return dataSheet(n);
}

// ───────────────────────── Modele și regularități ─────────────────────────

export interface Pattern { start: number; rule: 'add' | 'sub' | 'mul' | 'double1'; k: number }
export function patternValues(p: Pattern, len: number): number[] {
  const out = [p.start];
  for (let i = 1; i < len; i++) {
    const v = out[i - 1];
    out.push(p.rule === 'add' ? v + p.k : p.rule === 'sub' ? v - p.k : p.rule === 'mul' ? v * p.k : v * 2 + 1);
  }
  return out;
}
export function ruleText(p: Pattern): string {
  return p.rule === 'add' ? `fiecare număr este cu ${p.k} mai mare decât cel dinainte` : p.rule === 'sub' ? `fiecare număr este cu ${p.k} mai mic decât cel dinainte` : p.rule === 'mul' ? `fiecare număr este de ${p.k} ori mai mare decât cel dinainte` : 'fiecare număr este dublul celui dinainte, plus 1';
}

/** A repeating pattern of shapes for „ce urmează?”: its unit and how many are shown. */
export interface ShapePattern { unit: ('circle' | 'square' | 'triangle' | 'star')[]; shown: number }

export interface SirSheet { level: Level34; shapes: ShapePattern[]; blocks: Block[] }

function sirSheet(n: number): SirSheet {
  const rand = seed34(`sir:${n}`);
  if (n === 1) {
    const pats: Pattern[] = [
      { start: int(rand, 5, 30), rule: 'add', k: int(rand, 6, 25) }, { start: int(rand, 300, 900), rule: 'sub', k: [25, 50, 100][int(rand, 0, 2)] },
      { start: int(rand, 2, 5), rule: 'mul', k: 2 }, { start: int(rand, 1000, 3000), rule: 'add', k: [100, 250, 500][int(rand, 0, 2)] },
    ];
    const ruleOf: Pattern = { start: int(rand, 3, 12), rule: 'add', k: int(rand, 3, 9) };
    const shapes: ShapePattern[] = [{ unit: ['triangle', 'circle', 'circle'], shown: 7 }, { unit: ['square', 'star', 'circle', 'star'], shown: 8 }];
    return {
      level: 'III', shapes,
      blocks: [
        { t: 'fill', heading: 'Continuă șirurile după regulă: scrie următoarele două numere.', items: pats.map((p) => { const v = patternValues(p, 6); return { text: `${v.slice(0, 4).map(f).join(',  ')},  {},  {}`, answers: v.slice(4).map(f) }; }), cols: 1, box: 16 },
        { t: 'draw', heading: 'Ce figuri urmează? Desenează următoarele două figuri.', height: 34, answers: shapes.map((s, i) => `${String.fromCharCode(97 + i)}) ${[0, 1].map((k) => SHAPE_WORD[s.unit[(s.shown + k) % s.unit.length]]).join(', ')}`), score: 4, draw: () => undefined },
        { t: 'fill', heading: 'Ce regulă observi? Scrie regula.', items: [{ text: `${patternValues(ruleOf, 5).join(',  ')}:  {_}`, answers: [ruleText(ruleOf)] }] },
        { t: 'fill', heading: 'Găsește greșeala din șir și scrie numărul corect.', items: (() => { const p: Pattern = { start: int(rand, 10, 40), rule: 'add', k: int(rand, 4, 9) }; const v = patternValues(p, 6); const at = int(rand, 2, 4); const shown = v.map((x, i) => (i === at ? x + int(rand, 1, 3) : x)); return [{ text: `${shown.join(',  ')}:  în loc de ${shown[at]} trebuie {}`, answers: [String(v[at])] }]; })(), box: 12 },
      ],
    };
  }
  const explain: Pattern[] = [{ start: int(rand, 2, 6), rule: 'double1', k: 0 }, { start: int(rand, 40, 90), rule: 'add', k: int(rand, 11, 19) }, { start: int(rand, 3, 5), rule: 'mul', k: 3 }];
  const make: Pattern = { start: int(rand, 4, 15), rule: 'add', k: int(rand, 6, 14) };
  const back: Pattern = { start: int(rand, 900, 999), rule: 'sub', k: int(rand, 12, 48) };
  return {
    level: 'IV', shapes: [],
    blocks: [
      { t: 'fill', heading: 'Explică regula fiecărui șir, apoi scrie următorul număr.', items: explain.map((p) => { const v = patternValues(p, 5); return { text: `${v.slice(0, 4).map(f).join(', ')}, {}  Regula: {_}`, answers: [f(v[4]), ruleText(p)] }; }), cols: 1, box: 14 },
      { t: 'fill', heading: 'Scrie tu șirul după regula dată.', items: [
        { text: `Începe cu ${make.start}; ${ruleText(make)}: {_}`, answers: [patternValues(make, 6).join(', ')] },
        { text: `Începe cu ${back.start}; ${ruleText(back)}: {_}`, answers: [patternValues(back, 6).join(', ')] },
      ] },
      { t: 'write', heading: 'Inventează tu o regulă. Scrie regula și primele șase numere ale șirului.', rows: 3, ruling: 'dictando', answer: 'Răspunsul copilului: verificați că numerele respectă regula scrisă.' },
    ],
  };
}

export const SHAPE_WORD: Record<ShapePattern['unit'][number], string> = { circle: 'cerc', square: 'pătrat', triangle: 'triunghi', star: 'stea' };

export function m34Patterns(n: number): SirSheet {
  return sirSheet(n);
}

// ───────────────────────── every sheet ─────────────────────────

export const M34_TITLES: Record<M34Kind, string> = {
  nr: 'Numerele naturale', rom: 'Cifrele romane', rot: 'Rotunjirea numerelor', ops: 'Ordinea operațiilor', inm: 'Înmulțirea și împărțirea', prob: 'Probleme',
  fr: 'Fracții', per: 'Perimetrul', geo: 'Linii și unghiuri', mas: 'Unități de măsură', date: 'Tabele și grafice', sir: 'Modele și regularități',
};

/** The sheet of an item: its class, title, instruction and tasks (drawings are filled in by m34-pages.ts). */
export function m34Sheet(item: string): M34Sheet {
  const [kind, n] = m34Parts(item);
  switch (kind) {
    case 'nr': return nrSheet(n);
    case 'rom': return romSheet(n);
    case 'rot': return rotSheet(n);
    case 'ops': return opsSheet(n);
    case 'inm': return inmSheet(n);
    case 'prob': return probSheet(n);
    case 'mas': return masSheet(n);
    case 'fr': {
      const s = fracSheet(n);
      return { level: s.level, title: s.title, instruction: 'Rezolvă exercițiile cu fracții.', help: s.help, blocks: s.blocks };
    }
    case 'per': {
      const s = perSheet(n);
      return { level: s.level, title: n === 1 ? 'Perimetrul' : 'Perimetrul și aria', instruction: 'Citește cu atenție și rezolvă.', help: 'Perimetrul este suma lungimilor tuturor laturilor.', blocks: s.blocks };
    }
    case 'geo': {
      const s = geoSheet(n);
      return { level: s.level, title: n === 1 ? 'Linii, unghiuri, poligoane' : 'Unghiuri și drepte', instruction: 'Privește desenele și rezolvă.', blocks: s.blocks };
    }
    case 'date': {
      const s = dataSheet(n);
      return { level: s.level, title: n === 1 ? 'Tabelul și graficul cu bare' : 'Grafice cu bare și liniare', instruction: 'Citește datele și răspunde.', blocks: s.blocks };
    }
    case 'sir': {
      const s = sirSheet(n);
      return { level: s.level, title: 'Modele și regularități', instruction: 'Descoperă regula și continuă.', blocks: s.blocks };
    }
  }
}

export type { Expr };
