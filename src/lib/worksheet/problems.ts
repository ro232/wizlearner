import type { DrawOp } from '@/lib/glyphs/types';
import { countOf } from '@/components/worksheet/plural';
import { iconOps } from '@/lib/hints/icons';
import { textWidthMm, wrapText } from '@/lib/book/text';
import { INK, MUTED } from './rows';

/**
 * „Probleme cu imagini”: short word problems of the math sheets, after the programme
 * „Matematică și explorarea mediului” (competența specifică 5.2):
 *   CP:  „Probleme simple de adunare sau scădere cu 1-5 unități în concentrul 0-31, cu suport intuitiv”
 *   I:   „Probleme care se rezolvă printr-o operație” / „…prin două operații de adunare și/sau scădere”
 *   II:  „…de tipul a±b=x; a±b±c=x în concentrul 0-1000”
 *
 * Up to 0–31 the number added, taken away or compared is always 1–5 (CP 5.2); from 0–20 up it is
 * free; from 0–100 up the last problem of the page takes two operations (a ± b ± c).
 *
 * Each problem: a sentence or two and the question (no personal names: „În coș sunt…”,
 * „Bunica a cules…”), the objects drawn when there are at most 10 in a row (otherwise one picture
 * per number, as a card), and the answer area: „Rezolvare:” boxes and „Răspuns: ____”.
 * Numbers are written as digits; nouns agree with them („1 măr”, „3 mere”, „20 de mere”).
 */

// ───────────────────────── words ─────────────────────────

/** m: „câți”, „mai mulți”; f and n plural like f: „câte”, „mai multe”. */
export type Gender = 'm' | 'f' | 'n';
export interface Noun {
  one: string;
  many: string;
  g: Gender;
  emoji: string;
}

const noun = (one: string, many: string, g: Gender, emoji: string): Noun => ({ one, many, g, emoji });

export const NOUNS = {
  mar: noun('măr', 'mere', 'n', '🍎'),
  para: noun('pară', 'pere', 'f', '🍐'),
  portocala: noun('portocală', 'portocale', 'f', '🍊'),
  banana: noun('banană', 'banane', 'f', '🍌'),
  capsuna: noun('căpșună', 'căpșuni', 'f', '🍓'),
  rosie: noun('roșie', 'roșii', 'f', '🍅'),
  castravete: noun('castravete', 'castraveți', 'm', '🥒'),
  morcov: noun('morcov', 'morcovi', 'm', '🥕'),
  cartof: noun('cartof', 'cartofi', 'm', '🥔'),
  ou: noun('ou', 'ouă', 'n', '🥚'),
  paine: noun('pâine', 'pâini', 'f', '🍞'),
  bomboana: noun('bomboană', 'bomboane', 'f', '🍬'),
  balon: noun('balon', 'baloane', 'n', '🎈'),
  carte: noun('carte', 'cărți', 'f', '📖'),
  masina: noun('mașină', 'mașini', 'f', '🚗'),
  minge: noun('minge', 'mingi', 'f', '⚽'),
  stea: noun('stea', 'stele', 'f', '⭐'),
  lalea: noun('lalea', 'lalele', 'f', '🌷'),
  trandafir: noun('trandafir', 'trandafiri', 'm', '🌹'),
  brad: noun('brad', 'brazi', 'm', '🎄'),
  fluture: noun('fluture', 'fluturi', 'm', '🦋'),
  albina: noun('albină', 'albine', 'f', '🐝'),
  buburuza: noun('buburuză', 'buburuze', 'f', '🐞'),
  rata: noun('rață', 'rațe', 'f', '🦆'),
  peste: noun('pește', 'pești', 'm', '🐟'),
  oaie: noun('oaie', 'oi', 'f', '🐑'),
  gaina: noun('găină', 'găini', 'f', '🐔'),
  frunza: noun('frunză', 'frunze', 'f', '🍁'),
  castana: noun('castană', 'castane', 'f', '🌰'),
  sanie: noun('sanie', 'sănii', 'f', '🛷'),
} satisfies Record<string, Noun>;

/** „1 măr”, „3 mere”, „19 mere”, „20 de mere”, „101 mere”, „120 de mere”. */
export function counted(n: number, x: Noun): string {
  return countOf(n, x.one, x.many);
}

/** „Câți pești”, „Câte mere”. */
export const cate = (x: Noun) => (x.g === 'm' ? 'Câți' : 'Câte');

/** „mai mulți / mai puțini” (m), „mai multe / mai puține” (f, n). */
export const maiMulte = (x: Noun, more: boolean) => (x.g === 'm' ? (more ? 'mai mulți' : 'mai puțini') : more ? 'mai multe' : 'mai puține');

/** The verb agrees with the number it goes with: „mai vine 1 mașină”, „mai vin 3 mașini”. */
const v = (n: number, one: string, many: string) => (n === 1 ? one : many);

// ───────────────────────── scenes ─────────────────────────

interface Q {
  a: number;
  b: number;
  c: number;
  x: Noun;
  /** a, b, c with their noun: „3 mere”. */
  A: string;
  B: string;
  C: string;
  /** Comparison: „mai multe” or „mai puține”. */
  more: boolean;
}

interface Scene {
  id: string;
  /** The largest count that still makes sense here (no 450 apples in a basket). */
  max: number;
  /** The smallest first count that makes sense (a library has more than 12 books). */
  min?: number;
  nouns: Noun[];
  text: (q: Q) => string;
}

const { mar, para, portocala, banana, capsuna, rosie, castravete, morcov, cartof, ou, paine, bomboana, balon, carte, masina, minge, stea, lalea, trandafir, brad, fluture, albina, buburuza, rata, peste, oaie, gaina, frunza, castana, sanie } = NOUNS;

/** „am / mai primesc”: how many in all. */
const ADD: Scene[] = [
  { id: 'cos', max: 31, nouns: [mar, para, portocala, banana], text: (q) => `În coș sunt ${q.A}. Mama mai pune ${q.B}. ${cate(q.x)} ${q.x.many} sunt acum în coș?` },
  { id: 'gradina', max: 100, nouns: [lalea, trandafir], text: (q) => `În grădină au înflorit ${q.A}. Azi ${v(q.b, 'a', 'au')} mai înflorit ${q.B}. ${cate(q.x)} ${q.x.many} au înflorit în total?` },
  { id: 'parcare', max: 1000, nouns: [masina], text: (q) => `În parcare sunt ${q.A}. Mai ${v(q.b, 'vine', 'vin')} ${q.B}. Câte mașini sunt acum în parcare?` },
  { id: 'raft', max: 100, nouns: [carte], text: (q) => `Pe raft sunt ${q.A}. Bunicul mai aduce ${q.B}. Câte cărți sunt acum pe raft?` },
  { id: 'biblioteca', max: 1000, min: 50, nouns: [carte], text: (q) => `Biblioteca școlii are ${q.A}. Anul acesta a primit încă ${q.B}. Câte cărți are acum biblioteca?` },
  { id: 'cuibar', max: 10, nouns: [ou], text: (q) => `În cuibar sunt ${q.A}. Găina mai face ${q.B}. Câte ouă sunt acum în cuibar?` },
  { id: 'baloane', max: 31, nouns: [balon], text: (q) => `Tata a umflat ${q.A}, iar mama a umflat ${q.B}. Câte baloane au umflat împreună?` },
  { id: 'lac', max: 31, nouns: [rata], text: (q) => `Pe lac înoată ${q.A}. Mai ${v(q.b, 'vine', 'vin')} ${q.B}. Câte rațe sunt acum pe lac?` },
  { id: 'acvariu', max: 20, nouns: [peste], text: (q) => `În acvariu sunt ${q.A}. Tata mai pune ${q.B}. Câți pești sunt acum în acvariu?` },
  { id: 'pajiste', max: 100, nouns: [oaie], text: (q) => `Pe pajiște pasc ${q.A}. Mai ${v(q.b, 'vine', 'vin')} ${q.B}. Câte oi sunt acum pe pajiște?` },
  { id: 'ferma', max: 1000, min: 20, nouns: [gaina], text: (q) => `La fermă sunt ${q.A}. Fermierul mai cumpără ${q.B}. Câte găini sunt acum la fermă?` },
  { id: 'borcan', max: 100, nouns: [bomboana], text: (q) => `În borcan sunt ${q.A}. Mama mai pune ${q.B}. Câte bomboane sunt acum în borcan?` },
  { id: 'veverita', max: 31, nouns: [castana], text: (q) => `Veverița a adunat ${q.A}. Apoi a mai găsit ${q.B}. Câte castane are acum veverița?` },
  { id: 'arici', max: 10, nouns: [mar], text: (q) => `Ariciul are ${q.A}. Mai găsește în iarbă ${q.B}. Câte mere are acum ariciul?` },
  { id: 'brutarie', max: 1000, min: 20, nouns: [paine], text: (q) => `Brutăria a copt dimineața ${q.A} și la prânz încă ${q.B}. Câte pâini a copt în total?` },
  { id: 'stup', max: 1000, min: 100, nouns: [albina], text: (q) => `În stup sunt ${q.A}. Se mai ${v(q.b, 'întoarce', 'întorc')} de pe câmp ${q.B}. Câte albine sunt acum în stup?` },
  { id: 'fluturi', max: 20, nouns: [fluture, albina, buburuza], text: (q) => `În grădină zboară ${q.A}. Mai ${v(q.b, 'vine', 'vin')} ${q.B}. ${cate(q.x)} ${q.x.many} zboară acum în grădină?` },
  { id: 'livada', max: 1000, min: 50, nouns: [mar, para], text: (q) => `În livadă s-au cules luni ${q.A}, iar marți ${q.B}. ${cate(q.x)} ${q.x.many} s-au cules în total?` },
  { id: 'alee', max: 100, nouns: [frunza], text: (q) => `Pe alee sunt ${q.A}. Vântul mai aduce ${q.B}. Câte frunze sunt acum pe alee?` },
  { id: 'cer', max: 100, nouns: [stea], text: (q) => `Pe cer s-au aprins ${q.A}. Apoi ${v(q.b, 's-a', 's-au')} mai aprins ${q.B}. Câte stele strălucesc acum pe cer?` },
  { id: 'magazin', max: 1000, min: 20, nouns: [minge], text: (q) => `Magazinul are ${q.A}. Azi ${v(q.b, 'a', 'au')} mai sosit ${q.B}. Câte mingi are acum magazinul?` },
  { id: 'derdelus', max: 31, nouns: [sanie], text: (q) => `Pe derdeluș sunt ${q.A}. Mai ${v(q.b, 'vine', 'vin')} ${q.B}. Câte sănii sunt acum pe derdeluș?` },
  { id: 'legume', max: 100, nouns: [rosie, castravete, morcov], text: (q) => `Bunica a cules ${q.A}. Bunicul a mai cules ${q.B}. ${cate(q.x)} ${q.x.many} au cules împreună?` },
];

/** „am / dau, mănânc, zboară”: how many are left. */
const SUB: Scene[] = [
  { id: 'cos', max: 31, nouns: [mar, para, banana, portocala, capsuna], text: (q) => `În coș sunt ${q.A}. Copiii mănâncă ${q.B}. ${cate(q.x)} ${q.x.many} au rămas în coș?` },
  { id: 'parcare', max: 1000, nouns: [masina], text: (q) => `În parcare sunt ${q.A}. Pleacă ${q.B}. Câte mașini au rămas în parcare?` },
  { id: 'baloane', max: 31, nouns: [balon], text: (q) => `La serbare sunt ${q.A}. Vântul ia ${q.B}. Câte baloane au rămas?` },
  { id: 'lac', max: 31, nouns: [rata], text: (q) => `Pe lac înoată ${q.A}. ${v(q.b, 'Iese', 'Ies')} din apă ${q.B}. Câte rațe au rămas pe lac?` },
  { id: 'flori', max: 20, nouns: [fluture, albina, buburuza], text: (q) => `Pe flori stau ${q.A}. Zboară ${q.B}. ${cate(q.x)} ${q.x.many} au rămas pe flori?` },
  { id: 'vecina', max: 100, nouns: [rosie, castravete, mar, para], text: (q) => `Bunica a cules ${q.A}. Îi dă vecinei ${q.B}. ${cate(q.x)} ${q.x.many} i-au rămas bunicii?` },
  { id: 'borcan', max: 100, nouns: [bomboana], text: (q) => `În borcan sunt ${q.A}. Copiii mănâncă ${q.B}. Câte bomboane au rămas în borcan?` },
  { id: 'raft', max: 100, nouns: [carte], text: (q) => `Pe raft sunt ${q.A}. Copiii iau ${q.B} la școală. Câte cărți au rămas pe raft?` },
  { id: 'pom', max: 100, nouns: [mar, para], text: (q) => `Într-un pom sunt ${q.A}. Bunicul culege ${q.B}. ${cate(q.x)} ${q.x.many} au rămas în pom?` },
  { id: 'pajiste', max: 100, nouns: [oaie], text: (q) => `Pe pajiște pasc ${q.A}. Pleacă spre stână ${q.B}. Câte oi au rămas pe pajiște?` },
  { id: 'cer', max: 100, nouns: [stea], text: (q) => `Pe cer strălucesc ${q.A}. Norii acoperă ${q.B}. Câte stele se mai văd?` },
  { id: 'brutarie', max: 1000, min: 20, nouns: [paine], text: (q) => `Brutăria a copt ${q.A}. Până la prânz a vândut ${q.B}. Câte pâini au rămas?` },
  { id: 'magazin', max: 1000, min: 20, nouns: [minge], text: (q) => `Magazinul avea ${q.A}. Azi a vândut ${q.B}. Câte mingi au rămas în magazin?` },
  { id: 'biblioteca', max: 1000, min: 50, nouns: [carte], text: (q) => `Biblioteca are ${q.A}. Copiii au împrumutat ${q.B}. Câte cărți au rămas în bibliotecă?` },
  { id: 'copac', max: 100, nouns: [frunza], text: (q) => `Într-un copac sunt ${q.A}. Vântul scutură ${q.B}. Câte frunze au rămas în copac?` },
  { id: 'veverita', max: 31, nouns: [castana], text: (q) => `Veverița are ${q.A}. Mănâncă ${q.B}. Câte castane i-au rămas?` },
  { id: 'oua', max: 31, nouns: [ou], text: (q) => `În coș sunt ${q.A}. Mama folosește ${q.B} pentru o prăjitură. Câte ouă au rămas în coș?` },
  { id: 'derdelus', max: 31, nouns: [sanie], text: (q) => `Pe derdeluș sunt ${q.A}. Copiii pleacă acasă cu ${q.B}. Câte sănii au rămas pe derdeluș?` },
  { id: 'depozit', max: 1000, min: 100, nouns: [mar, cartof, morcov], text: (q) => `În depozit sunt ${q.A}. Un camion duce la piață ${q.B}. ${cate(q.x)} ${q.x.many} au rămas în depozit?` },
];

/** „cu atât mai mult / mai puțin”: how many in the second place. */
const CMP: Scene[] = [
  { id: 'cosuri', max: 31, nouns: [mar, para, portocala, cartof, morcov], text: (q) => `În primul coș sunt ${q.A}. În al doilea coș sunt cu ${q.B} ${maiMulte(q.x, q.more)}. ${cate(q.x)} ${q.x.many} sunt în al doilea coș?` },
  { id: 'rafturi', max: 100, nouns: [carte], text: (q) => `Pe raftul de sus sunt ${q.A}. Pe raftul de jos sunt cu ${q.B} ${maiMulte(q.x, q.more)}. Câte cărți sunt pe raftul de jos?` },
  { id: 'bunici', max: 100, nouns: [rosie, mar, para, castravete], text: (q) => `Bunicul a cules ${q.A}. Bunica a cules cu ${q.B} ${maiMulte(q.x, q.more)}. ${cate(q.x)} ${q.x.many} a cules bunica?` },
  { id: 'clase', max: 100, nouns: [lalea, trandafir, brad], text: (q) => `Clasa noastră a plantat ${q.A}. Clasa vecină a plantat cu ${q.B} ${maiMulte(q.x, q.more)}. ${cate(q.x)} ${q.x.many} a plantat clasa vecină?` },
  { id: 'lacuri', max: 31, nouns: [rata], text: (q) => `Pe un lac înoată ${q.A}. Pe celălalt lac înoată cu ${q.B} ${maiMulte(q.x, q.more)}. Câte rațe înoată pe celălalt lac?` },
  { id: 'brutarii', max: 1000, min: 20, nouns: [paine], text: (q) => `Prima brutărie a copt ${q.A}. A doua brutărie a copt cu ${q.B} ${maiMulte(q.x, q.more)}. Câte pâini a copt a doua brutărie?` },
  { id: 'ferme', max: 1000, min: 20, nouns: [gaina, oaie, rata], text: (q) => `La prima fermă sunt ${q.A}. La a doua fermă sunt cu ${q.B} ${maiMulte(q.x, q.more)}. ${cate(q.x)} ${q.x.many} sunt la a doua fermă?` },
  { id: 'parcari', max: 100, nouns: [masina], text: (q) => `În parcarea școlii sunt ${q.A}. În parcarea magazinului sunt cu ${q.B} ${maiMulte(q.x, q.more)}. Câte mașini sunt în parcarea magazinului?` },
  { id: 'stupi', max: 1000, min: 100, nouns: [albina], text: (q) => `Într-un stup sunt ${q.A}. În stupul vecin sunt cu ${q.B} ${maiMulte(q.x, q.more)}. Câte albine sunt în stupul vecin?` },
  { id: 'borcane', max: 100, nouns: [bomboana], text: (q) => `Într-un borcan sunt ${q.A}. În celălalt borcan sunt cu ${q.B} ${maiMulte(q.x, q.more)}. Câte bomboane sunt în celălalt borcan?` },
];

type Op = '+' | '−';
interface TwoScene extends Scene {
  ops: [Op, Op];
}

/** Two operations, a ± b ± c (from 0–100 up). „−, +” always gives back at most what was taken. */
const TWO: TwoScene[] = [
  { id: 'parcare', max: 1000, ops: ['+', '−'], nouns: [masina], text: (q) => `În parcare sunt ${q.A}. Mai ${v(q.b, 'vine', 'vin')} ${q.B}, apoi pleacă ${q.C}. Câte mașini sunt acum în parcare?` },
  { id: 'brutarie', max: 1000, min: 20, ops: ['−', '−'], nouns: [paine], text: (q) => `Brutăria a copt ${q.A}. Dimineața a vândut ${q.B}, iar după-amiaza încă ${q.C}. Câte pâini au rămas?` },
  { id: 'bunica', max: 100, ops: ['+', '−'], nouns: [rosie, castravete, mar], text: (q) => `Bunica a cules luni ${q.A} și marți ${q.B}. Le-a dat vecinilor ${q.C}. ${cate(q.x)} ${q.x.many} i-au rămas bunicii?` },
  { id: 'biblioteca', max: 1000, min: 50, ops: ['−', '+'], nouns: [carte], text: (q) => `Biblioteca avea ${q.A}. Copiii au împrumutat ${q.B}, apoi au adus înapoi ${q.C}. Câte cărți sunt acum în bibliotecă?` },
  { id: 'magazin', max: 1000, min: 20, ops: ['+', '+'], nouns: [minge], text: (q) => `Magazinul avea ${q.A}. Luni ${v(q.b, 'a', 'au')} sosit ${q.B}, iar marți încă ${q.C}. Câte mingi are acum magazinul?` },
  { id: 'borcan', max: 100, ops: ['+', '−'], nouns: [bomboana], text: (q) => `În borcan sunt ${q.A}. Mama mai pune ${q.B}, apoi copiii mănâncă ${q.C}. Câte bomboane sunt acum în borcan?` },
  { id: 'depozit', max: 1000, min: 100, ops: ['−', '−'], nouns: [mar, cartof], text: (q) => `În depozit sunt ${q.A}. Luni s-au vândut ${q.B}, iar marți ${q.C}. ${cate(q.x)} ${q.x.many} au rămas în depozit?` },
  { id: 'ferma', max: 1000, min: 20, ops: ['+', '−'], nouns: [gaina], text: (q) => `La fermă sunt ${q.A}. Fermierul mai cumpără ${q.B}, apoi vinde ${q.C}. Câte găini sunt acum la fermă?` },
];

/** Every scene, for tests (every noun has its picture, every text reads well). */
export const PROBLEM_SCENES = { add: ADD, sub: SUB, cmp: CMP, two: TWO };

// ───────────────────────── problems ─────────────────────────

export type ProblemKind = 'add' | 'sub' | 'more' | 'less' | 'two';

export interface Step {
  a: number;
  op: Op;
  b: number;
  r: number;
}

export interface WordProblem {
  kind: ProblemKind;
  text: string;
  noun: Noun;
  /** The numbers the text gives, in order; `taken` marks what goes away (crossed out in the picture). */
  given: { n: number; taken?: boolean }[];
  steps: Step[];
  result: number;
  /** For the answers page: „4 + 3 = 7 (7 mere)”. */
  answer: string;
  /** Comparison only: „cu 3 mai multe”. */
  caption?: string;
}

const int = (rand: () => number, lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));

function shuffle<T>(items: T[], rand: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Up to 0–31 the second number is 1–5 (CP 5.2: „…cu 1-5 unități în concentrul 0-31”). */
const smallSteps = (range: number) => range <= 31;
/** The smallest number in a problem: 2, then 5 from 0–100, 20 from 0–1000. */
const lowest = (range: number) => (range >= 1000 ? 20 : range >= 100 ? 5 : 2);
/** The first number: from 6 in 0–31, so the sheet is not 0–10 again; bigger from 0–20 up. */
const firstFrom = (range: number) => (range >= 1000 ? 120 : range >= 100 ? 21 : range >= 20 ? 8 : range === 31 ? 6 : 2);

/** The kinds on one page, simplest first: 4 problems up to 5, then 5 (one comparison at 0–10, two from 0–20, two operations last from 0–100). */
export function problemKinds(range: number, rand: () => number): ProblemKind[] {
  if (range <= 5) return shuffle(['add', 'add', 'sub', 'sub'], rand);
  if (range <= 10) return [...shuffle<ProblemKind>(['add', 'add', 'sub', 'sub'], rand), rand() < 0.5 ? 'more' : 'less'];
  if (range < 100) return [...shuffle<ProblemKind>(['add', 'sub', rand() < 0.5 ? 'add' : 'sub'], rand), ...shuffle<ProblemKind>(['more', 'less'], rand)];
  return [...shuffle<ProblemKind>(['add', 'sub'], rand), ...shuffle<ProblemKind>(['more', 'less'], rand), 'two'];
}

/** a and b for one operation, every number and result in 1…range. */
function numbers(kind: Exclude<ProblemKind, 'two'>, range: number, rand: () => number): { a: number; b: number } {
  const lo = lowest(range);
  const from = firstFrom(range);
  if (kind === 'add') {
    if (smallSteps(range)) {
      const b = int(rand, 1, Math.min(5, range - 2));
      return { a: int(rand, Math.min(from, range - b), range - b), b };
    }
    const total = int(rand, from, range);
    // neither term tiny next to the other (not 7 + 31 at 0–100)
    const a = int(rand, Math.max(lo, Math.round(total * 0.2)), total - Math.max(lo, Math.round(total * 0.15)));
    return { a, b: total - a };
  }
  if (kind === 'sub') {
    if (smallSteps(range)) {
      const b = int(rand, 1, Math.min(5, range - 1));
      return { a: int(rand, Math.max(b + 1, from), range), b };
    }
    const a = int(rand, from, range);
    return { a, b: int(rand, Math.max(lo, Math.round(a * 0.1)), a - Math.max(lo, Math.round(a * 0.1))) };
  }
  // comparisons: the difference is at least 2, so the noun is always plural („cu 2 mere mai multe”)
  const b = smallSteps(range) ? int(rand, 2, 5) : int(rand, range >= 1000 ? 20 : range >= 100 ? 5 : 2, range >= 1000 ? 300 : range >= 100 ? 40 : 9);
  if (kind === 'more') return { a: int(rand, Math.min(from, range - b), range - b), b };
  return { a: int(rand, Math.max(b + (smallSteps(range) ? 1 : lo), from), range), b };
}

/** a, b, c for two operations; the number in between and the result stay in lo…range. */
function numbersTwo(ops: [Op, Op], range: number, rand: () => number): { a: number; b: number; c: number } {
  const lo = lowest(range);
  const [o1, o2] = ops;
  const from = Math.min(firstFrom(range), range - 3 * lo);
  if (o1 === '+' && o2 === '−') {
    const s = int(rand, from + lo, range);
    const a = int(rand, from, s - lo);
    return { a, b: s - a, c: int(rand, lo, s - lo) };
  }
  if (o1 === '−' && o2 === '−') {
    const a = int(rand, Math.max(3 * lo, from), range);
    const b = int(rand, lo, a - 2 * lo);
    return { a, b, c: int(rand, lo, a - b - lo) };
  }
  if (o1 === '−' && o2 === '+') {
    const a = int(rand, Math.max(2 * lo, from), range);
    const b = int(rand, lo, a - lo);
    return { a, b, c: int(rand, lo, Math.max(lo, Math.min(b, range - (a - b)))) };
  }
  const t = int(rand, from + 2 * lo, range);
  const a = int(rand, from, t - 2 * lo);
  const b = int(rand, lo, t - a - lo);
  return { a, b, c: t - a - b };
}

const apply = (a: number, op: Op, b: number) => (op === '+' ? a + b : a - b);

function chooseScene<S extends Scene>(scenes: S[], top: number, first: number, used: Set<string>, rand: () => number): S {
  const fits = (s: S) => s.max >= top && (s.min ?? 0) <= first;
  const pool = [scenes.filter((s) => fits(s) && !used.has(s.id)), scenes.filter(fits), scenes.filter((s) => s.max >= top), scenes];
  const list = pool.find((p) => p.length)!;
  return list[Math.floor(rand() * list.length)];
}

function chooseNoun(scene: Scene, used: Set<string>, rand: () => number): Noun {
  const fresh = scene.nouns.filter((n) => !used.has(n.one));
  const list = fresh.length ? fresh : scene.nouns;
  return list[Math.floor(rand() * list.length)];
}

function makeProblem(kind: ProblemKind, range: number, rand: () => number, usedScenes: Set<string>, usedNouns: Set<string>): WordProblem {
  let a: number, b: number, c = 0, steps: Step[], scene: Scene, given: WordProblem['given'];
  if (kind === 'two') {
    const s = chooseScene(TWO, range, 0, usedScenes, rand);
    scene = s;
    for (let tries = 0; ; tries++) {
      ({ a, b, c } = numbersTwo(s.ops, range, rand));
      // 29 + 9 − 9 says nothing: the two numbers after the first differ
      if ((a >= (s.min ?? 0) && b !== c) || tries > 50) break;
    }
    const r1 = apply(a, s.ops[0], b);
    steps = [{ a, op: s.ops[0], b, r: r1 }, { a: r1, op: s.ops[1], b: c, r: apply(r1, s.ops[1], c) }];
    given = [{ n: a }, { n: b, taken: s.ops[0] === '−' }, { n: c, taken: s.ops[1] === '−' }];
  } else {
    ({ a, b } = numbers(kind, range, rand));
    const op: Op = kind === 'add' || kind === 'more' ? '+' : '−';
    const r = apply(a, op, b);
    steps = [{ a, op, b, r }];
    scene = chooseScene(kind === 'add' ? ADD : kind === 'sub' ? SUB : CMP, Math.max(a, r), a, usedScenes, rand);
    given = kind === 'sub' ? [{ n: a }, { n: b, taken: true }] : [{ n: a }, { n: b }];
  }
  usedScenes.add(scene.id);
  const x = chooseNoun(scene, usedNouns, rand);
  usedNouns.add(x.one);
  const more = kind === 'more';
  const text = scene.text({ a, b, c, x, A: counted(a, x), B: counted(b, x), C: counted(c, x), more });
  const result = steps[steps.length - 1].r;
  const answer = `${steps.map((s) => `${s.a} ${s.op} ${s.b} = ${s.r}`).join('; ')} (${counted(result, x)})`;
  return {
    kind,
    text,
    noun: x,
    given,
    steps,
    result,
    answer,
    ...(kind === 'more' || kind === 'less' ? { caption: `cu ${b} ${maiMulte(x, more)}` } : {}),
  };
}

/** The problems of one page, seeded: no scene twice, a different object each time where possible. */
export function wordProblems(range: number, rand: () => number): WordProblem[] {
  const usedScenes = new Set<string>();
  const usedNouns = new Set<string>();
  return problemKinds(range, rand).map((kind) => makeProblem(kind, range, rand, usedScenes, usedNouns));
}

// ───────────────────────── drawing ─────────────────────────

const TEXT_SIZES = [4.2, 3.95, 3.7];
const BOX_H = 9.5;
const LINE_STEP = 11.5;
const RASPUNS_H = 8;
const LABEL_W = 18.5;
const CARD_H = 14;
const CARD_GAP = 3;
const CROSS = '#C2410C';

/** Up to 0–5 (grădiniță) the sign is printed and there is no „Răspuns” line to write. */
const signGiven = (range: number) => range <= 5;
const digitsOf = (range: number) => String(range).length;
const boxW = (range: number) => Math.max(10, 3 + digitsOf(range) * 3.2);

function opLineWidth(range: number): number {
  const sign = signGiven(range) ? 6 : 8.4;
  return 3 * boxW(range) + sign + 6 + 4 * 2.2;
}

/** The answer column: „Rezolvare:” and the boxes, then „Răspuns: ____”. */
function solutionWidth(range: number): number {
  return LABEL_W + opLineWidth(range) + 2;
}

function solutionHeight(p: WordProblem, range: number): number {
  return p.steps.length * LINE_STEP + (signGiven(range) ? 0 : RASPUNS_H);
}

/** At most 10 objects in a row are drawn one by one; more than that, one picture per number. */
export function drawsObjects(p: WordProblem): boolean {
  const [a, b] = [p.given[0].n, p.given[1]?.n ?? 0];
  switch (p.kind) {
    case 'add':
    case 'more':
      return a + b <= 10;
    case 'sub':
    case 'less':
      return a <= 10;
    default:
      return false;
  }
}

interface Card {
  n: number | null;
  taken?: boolean;
  caption?: string;
}

/** One card per number the text gives (what goes away crossed out); a comparison also gets the unknown, with „cu 3 mai multe”. */
function cardsOf(p: WordProblem): Card[] {
  if (p.kind === 'more' || p.kind === 'less') return [{ n: p.given[0].n }, { n: null, caption: p.caption }];
  return p.given.map((g) => ({ n: g.n, taken: g.taken }));
}

const CARD_ICON = 7.5;

function cardWidth(card: Card): number {
  const label = card.n === null ? '?' : String(card.n);
  const w = 2.4 + CARD_ICON + 2.2 + textWidthMm(label, 5.4) * 1.12 + 2.6;
  return Math.max(w, card.caption ? textWidthMm(card.caption, 2.8) * 1.08 + 4 : 0);
}

/** Cards in one row, or two when they do not fit. */
function cardRows(cards: Card[], width: number): Card[][] {
  const total = cards.reduce((s, c) => s + cardWidth(c) + CARD_GAP, -CARD_GAP);
  if (total <= width) return [cards];
  const half = Math.ceil(cards.length / 2);
  return [cards.slice(0, half), cards.slice(half)];
}

function pictureHeight(p: WordProblem, width: number): number {
  if (drawsObjects(p)) return p.kind === 'more' || p.kind === 'less' ? 18 : 10;
  const rows = cardRows(cardsOf(p), width).length;
  return rows * CARD_H + (rows - 1) * CARD_GAP;
}

function crossOps(cx: number, cy: number, s: number): DrawOp[] {
  const d = s * 0.42;
  return [
    { t: 'line', x1: cx - d, y1: cy - d, x2: cx + d, y2: cy + d, stroke: CROSS, strokeWidth: 0.6 },
    { t: 'line', x1: cx - d, y1: cy + d, x2: cx + d, y2: cy - d, stroke: CROSS, strokeWidth: 0.6 },
  ];
}

function cardOps(card: Card, emoji: string, x: number, y: number): DrawOp[] {
  const w = cardWidth(card);
  const unknown = card.n === null;
  const ops: DrawOp[] = [{ t: 'rect', x, y, w, h: CARD_H, rx: 2.2, fill: '#FFFFFF', stroke: unknown ? MUTED : '#CBBFA6', strokeWidth: 0.4, ...(unknown ? { dash: [1.3, 1] } : {}) }];
  const top = card.caption ? 5.2 : CARD_H / 2;
  const s = card.caption ? 6 : CARD_ICON;
  ops.push(...iconOps(emoji, x + 2.4 + s / 2, y + top, s));
  if (card.taken) ops.push(...crossOps(x + 2.4 + s / 2, y + top, s));
  ops.push({ t: 'text', x: x + 2.4 + s + 2.2, y: y + top + 1.9, text: unknown ? '?' : String(card.n), size: card.caption ? 5 : 5.4, fill: INK, weight: 'bold' });
  if (card.caption) ops.push({ t: 'text', x: x + w / 2, y: y + CARD_H - 2, text: card.caption, size: 2.8, fill: MUTED, weight: 'bold', align: 'center' });
  return ops;
}

/** One row of objects: plain, crossed out (taken away), framed (the extra ones) or empty dashed places (the missing ones). */
type Segment = { n: number; style: 'plain' | 'crossed' | 'extra' | 'missing' };

function rowsOf(p: WordProblem): Segment[][] {
  const [a, b] = [p.given[0].n, p.given[1].n];
  switch (p.kind) {
    case 'add':
      return [[{ n: a, style: 'plain' }, { n: b, style: 'plain' }]];
    case 'sub':
      return [[{ n: a - b, style: 'plain' }, { n: b, style: 'crossed' }]];
    case 'more':
      return [[{ n: a, style: 'plain' }], [{ n: a, style: 'plain' }, { n: b, style: 'extra' }]];
    default:
      return [[{ n: a, style: 'plain' }], [{ n: a - b, style: 'plain' }, { n: b, style: 'missing' }]];
  }
}

/** The objects of a problem, left aligned at x, centred on cy, within w × h. */
function objectsOps(p: WordProblem, x: number, cy: number, w: number, h: number, maxSize: number): DrawOp[] {
  const ops: DrawOp[] = [];
  const rows = rowsOf(p);
  const gap = 1.3;
  // add: a little space between the two groups (no sign: choosing the operation is the child's)
  const groupGap = p.kind === 'add' ? 5 : 0;
  const widest = Math.max(...rows.map((r) => r.reduce((s, g) => s + g.n, 0)));
  const s = Math.min(maxSize, (w - groupGap - (widest - 1) * gap) / widest, (h - (rows.length - 1) * 2) / rows.length);
  const rowH = s + 2;
  rows.forEach((row, r) => {
    const ry = cy + (r - (rows.length - 1) / 2) * rowH;
    let cx = x + s / 2;
    row.forEach((seg, k) => {
      if (k > 0) cx += groupGap;
      const start = cx;
      for (let i = 0; i < seg.n; i++) {
        if (seg.style === 'missing') ops.push({ t: 'rect', x: cx - s / 2, y: ry - s / 2, w: s, h: s, rx: s / 2, stroke: MUTED, strokeWidth: 0.35, dash: [1, 0.9] });
        else ops.push(...iconOps(p.noun.emoji, cx, ry, s));
        if (seg.style === 'crossed') ops.push(...crossOps(cx, ry, s));
        cx += s + gap;
      }
      if (seg.style === 'extra' && seg.n) {
        ops.push({ t: 'rect', x: start - s / 2 - 0.9, y: ry - s / 2 - 0.9, w: seg.n * (s + gap) - gap + 1.8, h: s + 1.8, rx: 1.6, stroke: MUTED, strokeWidth: 0.35, dash: [1.2, 1] });
      }
    });
  });
  return ops;
}

function picturesOps(p: WordProblem, x: number, cy: number, w: number, h: number, maxSize: number): DrawOp[] {
  if (drawsObjects(p)) return objectsOps(p, x, cy, w, h, maxSize);
  const ops: DrawOp[] = [];
  const rows = cardRows(cardsOf(p), w);
  const blockH = rows.length * CARD_H + (rows.length - 1) * CARD_GAP;
  rows.forEach((row, r) => {
    let cx = x;
    const y = cy - blockH / 2 + r * (CARD_H + CARD_GAP);
    for (const card of row) {
      ops.push(...cardOps(card, p.noun.emoji, cx, y));
      cx += cardWidth(card) + CARD_GAP;
    }
  });
  return ops;
}

function box(ops: DrawOp[], x: number, cy: number, w: number): void {
  ops.push({ t: 'rect', x, y: cy - BOX_H / 2, w, h: BOX_H, rx: 1.6, fill: '#FFFFFF', stroke: INK, strokeWidth: 0.5 });
}

function solutionOps(p: WordProblem, range: number, x: number, top: number, w: number): DrawOp[] {
  const ops: DrawOp[] = [];
  const bw = boxW(range);
  p.steps.forEach((step, i) => {
    const cy = top + BOX_H / 2 + 0.5 + i * LINE_STEP;
    if (i === 0) ops.push({ t: 'text', x, y: cy + 1.1, text: 'Rezolvare:', size: 3.1, fill: MUTED, weight: 'bold' });
    let cx = x + LABEL_W;
    box(ops, cx, cy, bw);
    cx += bw + 2.2;
    if (signGiven(range)) {
      ops.push({ t: 'text', x: cx + 3, y: cy + 2.6, text: step.op, size: 7.5, fill: INK, weight: 'bold', align: 'center' });
      cx += 6 + 2.2;
    } else {
      ops.push({ t: 'circle', cx: cx + 4.2, cy, r: 4, fill: '#FFFFFF', stroke: INK, strokeWidth: 0.45 });
      cx += 8.4 + 2.2;
    }
    box(ops, cx, cy, bw);
    cx += bw + 2.2;
    ops.push({ t: 'text', x: cx + 3, y: cy + 2.6, text: '=', size: 7.5, fill: INK, weight: 'bold', align: 'center' });
    cx += 6 + 2.2;
    box(ops, cx, cy, bw);
  });
  if (!signGiven(range)) {
    const by = top + p.steps.length * LINE_STEP + RASPUNS_H - 3;
    ops.push({ t: 'text', x, y: by, text: 'Răspuns:', size: 3.5, fill: INK, weight: 'bold' });
    ops.push({ t: 'line', x1: x + LABEL_W, y1: by + 0.6, x2: x + w, y2: by + 0.6, stroke: '#94A3B8', strokeWidth: 0.35 });
  }
  return ops;
}

/** The instruction under the title. */
export function problemsInstruction(range: number): string {
  return signGiven(range) ? 'Ascultă problema, numără imaginile și completează căsuțele.' : 'Citește problema. Scrie numerele, semnul în cerc și răspunsul.';
}

/** Space above the text, between text and body, under the body (mm). */
const PAD_TOP = 6.8;
const PAD_MID = 3.8;
const PAD_BOTTOM = 2.8;

/**
 * The problems of a page between `top` and `bottom`: each one gets the height it needs
 * (text lines, pictures, answer area), and what is left is shared out evenly. If they do not
 * fit (long texts), the text gets a little smaller.
 */
export function problemsPageOps(problems: WordProblem[], range: number, left: number, right: number, top: number, bottom: number): DrawOp[] {
  const ops: DrawOp[] = [];
  const width = right - left;
  const textX = left + 11;
  const textW = right - 4 - textX;
  const solW = solutionWidth(range);
  const solX = right - 4 - solW;
  const picX = left + 5;
  const picW = solX - 5 - picX;
  const maxIcon = range <= 5 ? 12 : 10;
  const plan = (size: number) =>
    problems.map((p) => {
      const lines = wrapText(p.text, textW, size);
      const body = Math.max(solutionHeight(p, range), pictureHeight(p, picW));
      return { lines, body, need: PAD_TOP + (lines.length - 1) * size * 1.42 + PAD_MID + body + PAD_BOTTOM };
    });
  const total = (l: ReturnType<typeof plan>) => l.reduce((s, x) => s + x.need, 0);
  let size = TEXT_SIZES[0];
  let layout = plan(size);
  for (const smaller of TEXT_SIZES.slice(1)) {
    if (total(layout) <= bottom - top) break;
    size = smaller;
    layout = plan(size);
  }
  const lh = size * 1.42;
  const spare = Math.max(0, bottom - top - total(layout));
  const extra = Math.min(16, spare / problems.length);
  let y = top;
  problems.forEach((p, i) => {
    const { lines, body, need } = layout[i];
    const h = need + extra;
    ops.push({ t: 'rect', x: left, y: y + 1.2, w: width, h: h - 2.4, rx: 4, fill: '#FBF7EE', stroke: '#E6DECD', strokeWidth: 0.4 });
    ops.push({ t: 'text', x: left + 4, y: y + PAD_TOP, text: `${i + 1}.`, size: 3.8, fill: MUTED, weight: 'bold' });
    lines.forEach((line, k) => ops.push({ t: 'text', x: textX, y: y + PAD_TOP + k * lh, text: line, size, fill: INK }));
    const bodyTop = y + PAD_TOP + (lines.length - 1) * lh + PAD_MID;
    const bodyH = body + extra;
    const cy = bodyTop + bodyH / 2;
    ops.push(...picturesOps(p, picX, cy, picW, bodyH, maxIcon));
    ops.push(...solutionOps(p, range, solX, cy - solutionHeight(p, range) / 2, solW));
    y += h;
  });
  return ops;
}
