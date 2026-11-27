import type { DrawOp } from '@/lib/glyphs/types';
import { iconOps } from '@/lib/hints/icons';
import { textWidthMm } from '@/lib/book/text';
import { ACCENT, INK, MUTED, PAPER } from './rows';

/**
 * „Măsurări”.
 *   length  lengths in units that are not standard: a pencil or a ribbon with a row of cubes or paper
 *           clips under it, exactly as long; the child counts them (CP 6.1 „Utilizarea unor măsuri
 *           neconvenționale pentru determinarea și compararea lungimilor”), then names the longest and
 *           the shortest
 *   mass    heavier / lighter on a balance: the pan that goes down holds the heavier thing, and the
 *           pictures agree with it (an elephant and a puppy, never the other way round)
 *   ruler   lengths in centimetres on a drawn ruler (clasa I „centimetrul”, „Instrumente de măsură:
 *           rigla”), then lines to draw with a real ruler
 *   units   clasa a II-a: which unit (m, cm, l, ml, kg, g), which instrument, 1 m = 100 cm …
 *
 * Clasa a II-a (the same two sheets were too easy for it; presc, CP and clasa I keep them as they are):
 *   length  lengthSheetII: eight to seventeen units (smaller ones), and two questions that compare two
 *           objects („Obiectul a) este mai lung decât obiectul c) cu □ cuburi.”): II 6.1
 *   mass    massSheetII: a balance in equilibrium, a thing on one pan and standard weights on the other
 *           (1, 2, 5, 10 kg or 50, 100, 200, 500 g): the child adds them; then the heaviest and the lightest,
 *           and masses to compare with <, >, = (1 kg = 1000 g). II 6.4 „…unităților de măsură uzuale pentru
 *           … masă (… kilogramul, gramul) și a unor instrumente adecvate”, contents „Masă: Unități standard:
 *           kilogramul, gramul (1 kg = 1000 g); Instrumente de măsură: cântarul, balanța”
 *
 * Every drawing is unambiguous: the objects start where the units start and end on a unit's edge,
 * no two objects of a sheet are equally long, the units offered for a question measure different
 * things (a length, a capacity, a mass), so only one fits.
 */

const int = (rand: () => number, lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
function shuffle<T>(xs: T[], rand: () => number): T[] {
  const out = xs.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
const pickN = (rand: () => number, lo: number, hi: number, n: number) => shuffle(Array.from({ length: hi - lo + 1 }, (_, i) => lo + i), rand).slice(0, n);
const letter = (i: number) => `${String.fromCharCode(97 + i)})`;

function fit(text: string, size: number, room: number): number {
  return Math.min(size, (size * room) / Math.max(1, textWidthMm(text, size) * 1.06));
}

function box(ops: DrawOp[], x: number, cy: number, w: number, h: number): void {
  ops.push({ t: 'rect', x, y: cy - h / 2, w, h, rx: 1.6, fill: '#FFFFFF', stroke: INK, strokeWidth: 0.5 });
}

// ───────────────────────── objects ─────────────────────────

export type Thing = 'pencil' | 'ribbon';
const COLOURS = ['#3B82F6', '#22C55E', '#F97316', '#A855F7', '#EF4444', '#EAB308'];

/** A pencil (eraser at the left, point at the right) or a ribbon, from x to x + len, centred on cy. */
export function thingOps(kind: Thing, x: number, cy: number, len: number, h: number, colour: string): DrawOp[] {
  if (kind === 'ribbon') {
    return [
      { t: 'rect', x, y: cy - h / 2, w: len, h, rx: 1, fill: colour, stroke: INK, strokeWidth: 0.35 },
      { t: 'line', x1: x + 1.5, y1: cy, x2: x + len - 1.5, y2: cy, stroke: PAPER, strokeWidth: 0.5, dash: [1.6, 1.2] },
    ];
  }
  const tip = Math.min(9, len * 0.3);
  const eraser = Math.min(4, len * 0.12);
  const band = Math.min(1.8, len * 0.06);
  return [
    { t: 'rect', x, y: cy - h / 2, w: eraser, h, rx: 1, fill: '#F9A8D4', stroke: INK, strokeWidth: 0.35 },
    { t: 'rect', x: x + eraser, y: cy - h / 2, w: band, h, fill: '#CBD5E1', stroke: INK, strokeWidth: 0.35 },
    { t: 'rect', x: x + eraser + band, y: cy - h / 2, w: len - tip - eraser - band, h, fill: colour, stroke: INK, strokeWidth: 0.35 },
    { t: 'polygon', points: [{ x: x + len - tip, y: cy - h / 2 }, { x: x + len, y: cy }, { x: x + len - tip, y: cy + h / 2 }], fill: '#F5D0A9', stroke: INK, strokeWidth: 0.35 },
    { t: 'polygon', points: [{ x: x + len - tip * 0.32, y: cy - h * 0.16 }, { x: x + len, y: cy }, { x: x + len - tip * 0.32, y: cy + h * 0.16 }], fill: INK },
  ];
}

// ───────────────────────── length in cubes or clips ─────────────────────────

export type Unit = 'cube' | 'clip';
export const UNIT_NAMES: Record<Unit, { one: string; many: string }> = { cube: { one: 'cub', many: 'cuburi' }, clip: { one: 'agrafă', many: 'agrafe' } };

export interface LengthItem {
  thing: Thing;
  colour: string;
  /** How many units long (3–10). */
  units: number;
}

export interface LengthSheet {
  unit: Unit;
  items: LengthItem[];
  /** The size of one unit on the paper, when not UNIT_MM (clasa a II-a: smaller units, longer objects). */
  mm?: number;
  /** Clasa a II-a: pairs of objects to compare, [longer, shorter] (indexes into `items`). */
  compare?: [number, number][];
}

/** Five objects of different lengths, 3–10 units; cubes or paper clips for the whole sheet. */
export function lengthSheet(rand: () => number): LengthSheet {
  const unit: Unit = rand() < 0.5 ? 'cube' : 'clip';
  const lengths = pickN(rand, 3, 10, 5);
  const colours = shuffle(COLOURS, rand);
  return { unit, items: lengths.map((units, i) => ({ units, thing: rand() < 0.5 ? 'pencil' : 'ribbon', colour: colours[i % colours.length] })) };
}

/** The size of one unit of the clasa a II-a sheet (mm): seventeen of them fit before the answer box. */
export const UNIT_MM_II = 8;

/**
 * Clasa a II-a: five objects of different lengths, 8–17 units, and two pairs to compare, the difference
 * of each at least 2 units (and the two differences not the same number, so neither answer is a guess).
 */
export function lengthSheetII(rand: () => number): LengthSheet {
  const unit: Unit = rand() < 0.5 ? 'cube' : 'clip';
  const lengths = pickN(rand, 8, 17, 5);
  const colours = shuffle(COLOURS, rand);
  const items = lengths.map((units, i) => ({ units, thing: (rand() < 0.5 ? 'pencil' : 'ribbon') as Thing, colour: colours[i % colours.length] }));
  const pairs: [number, number][] = [];
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) if (lengths[i] - lengths[j] >= 2) pairs.push([i, j]);
  const mixed = shuffle(pairs, rand);
  const first = mixed[0];
  const diff = (p: [number, number]) => lengths[p[0]] - lengths[p[1]];
  const second = mixed.find((p) => diff(p) !== diff(first) && (p[0] !== first[0] || p[1] !== first[1])) ?? mixed[1];
  return { unit, items, mm: UNIT_MM_II, compare: [first, second] };
}

export const longest = (s: LengthSheet) => s.items.reduce((b, x, i) => (x.units > s.items[b].units ? i : b), 0);
export const shortest = (s: LengthSheet) => s.items.reduce((b, x, i) => (x.units < s.items[b].units ? i : b), 0);

export function lengthAnswers(s: LengthSheet): string[] {
  const n = UNIT_NAMES[s.unit];
  const count = (k: number) => `${k} ${k === 1 ? n.one : n.many}`;
  return [
    ...s.items.map((it, i) => `${letter(i)} ${count(it.units)}`),
    `Cel mai lung: ${letter(longest(s))} (${count(s.items[longest(s)].units)})`,
    `Cel mai scurt: ${letter(shortest(s))} (${count(s.items[shortest(s)].units)})`,
    ...(s.compare ?? []).map(([a, b]) => `${letter(a)} este mai lung decât ${letter(b)} cu ${count(s.items[a].units - s.items[b].units)}`),
  ];
}

/** The size of one unit on the paper (mm). */
export const UNIT_MM = 12;

function unitOps(unit: Unit, x: number, y: number, u: number): DrawOp[] {
  if (unit === 'cube') return [{ t: 'rect', x, y, w: u, h: u, fill: '#FDE68A', stroke: INK, strokeWidth: 0.45 }];
  // a paper clip: an outer loop and an inner one, open at the right
  const h = u * 0.42;
  const cy = y + u / 2;
  return [
    { t: 'rect', x: x + 0.3, y: cy - h / 2, w: u - 0.6, h, rx: h / 2, stroke: '#475569', strokeWidth: 0.55 },
    { t: 'rect', x: x + u * 0.18, y: cy - h * 0.25, w: u * 0.6, h: h * 0.5, rx: h * 0.25, stroke: '#475569', strokeWidth: 0.45 },
  ];
}

export function lengthOps(s: LengthSheet, x0: number, x1: number, top: number, bottom: number): DrawOp[] {
  const ops: DrawOp[] = [];
  const u = s.mm ?? UNIT_MM;
  const qH = 26 + (s.compare?.length ?? 0) * 11;
  const rowH = (bottom - top - qH) / s.items.length;
  const left = x0 + 10;
  const n = UNIT_NAMES[s.unit];
  s.items.forEach((it, i) => {
    const y = top + i * rowH;
    ops.push({ t: 'rect', x: x0, y: y + 1, w: x1 - x0, h: rowH - 2, rx: 3, fill: '#FBF7EE', stroke: '#E6DECD', strokeWidth: 0.4 });
    ops.push({ t: 'text', x: x0 + 2.5, y: y + 7, text: letter(i), size: 3.8, fill: MUTED, weight: 'bold' });
    const objH = 8;
    const block = objH + 2 + (s.unit === 'cube' ? u : u * 0.6);
    const oy = y + (rowH - block) / 2 + objH / 2;
    ops.push(...thingOps(it.thing, left, oy, it.units * u, objH, it.colour));
    const uy = oy + objH / 2 + 2 - (s.unit === 'cube' ? 0 : u * 0.2);
    for (let k = 0; k < it.units; k++) ops.push(...unitOps(s.unit, left + k * u, uy, u));
    // the answer: „□ cuburi”
    const by = y + rowH / 2;
    const bx = x1 - 4 - textWidthMm(n.many, 4.2) - 2 - 13;
    box(ops, bx, by, 13, 10);
    ops.push({ t: 'text', x: bx + 15, y: by + 1.5, text: n.many, size: 4.2, fill: INK, weight: 'bold' });
  });
  const qy = top + s.items.length * rowH + 5;
  const lines = ['Cel mai lung este obiectul', 'Cel mai scurt este obiectul'];
  const bx = x0 + Math.max(...lines.map((t) => textWidthMm(t, 4.4))) + 4;
  lines.forEach((t, k) => {
    const cy = qy + 4 + k * 11;
    ops.push({ t: 'text', x: x0, y: cy + 1.5, text: t, size: 4.4, fill: INK, weight: 'bold' });
    box(ops, bx, cy, 11, 9);
    ops.push({ t: 'text', x: bx + 13, y: cy + 1.5, text: '.', size: 4.4, fill: INK, weight: 'bold' });
  });
  // clasa a II-a: two objects compared, the difference in units
  (s.compare ?? []).forEach(([a, b], k) => {
    const cy = qy + 4 + (lines.length + k) * 11;
    const text = `Obiectul ${letter(a)} este mai lung decât obiectul ${letter(b)} cu`;
    ops.push({ t: 'text', x: x0, y: cy + 1.5, text, size: 4.4, fill: INK, weight: 'bold' });
    const cx = x0 + textWidthMm(text, 4.4) + 4;
    box(ops, cx, cy, 13, 9);
    ops.push({ t: 'text', x: cx + 15, y: cy + 1.5, text: `${n.many}.`, size: 4.4, fill: INK, weight: 'bold' });
  });
  return ops;
}

// ───────────────────────── heavier, lighter ─────────────────────────

/** Pairs whose weights no child doubts: the first is always the heavier. */
export const MASS_PAIRS: [{ picture: string; name: string }, { picture: string; name: string }][] = [
  [{ picture: '🐘', name: 'elefantul' }, { picture: '🐶', name: 'cățelul' }],
  [{ picture: '🍉', name: 'pepenele' }, { picture: '🍓', name: 'căpșuna' }],
  [{ picture: '🐄', name: 'vaca' }, { picture: '🐔', name: 'găina' }],
  [{ picture: '🚗', name: 'mașina' }, { picture: '⚽', name: 'mingea' }],
  [{ picture: '🎃', name: 'dovleacul' }, { picture: '🍋', name: 'lămâia' }],
  [{ picture: '🐻', name: 'ursul' }, { picture: '🐰', name: 'iepurașul' }],
  [{ picture: '📺', name: 'televizorul' }, { picture: '📖', name: 'cartea' }],
  [{ picture: '🥁', name: 'toba' }, { picture: '🎈', name: 'balonul' }],
  [{ picture: '🐴', name: 'calul' }, { picture: '🐱', name: 'pisica' }],
  [{ picture: '🚜', name: 'tractorul' }, { picture: '🚲', name: 'bicicleta' }],
];

export interface MassItem {
  pair: number;
  /** Where the heavier thing sits. */
  heavyLeft: boolean;
  /** What the child circles. */
  ask: 'heavy' | 'light';
}

export function massItems(rand: () => number, count = 6): MassItem[] {
  const pairs = pickN(rand, 0, MASS_PAIRS.length - 1, count);
  const asks = shuffle(Array.from({ length: count }, (_, i) => (i % 2 ? 'light' : 'heavy') as MassItem['ask']), rand);
  return pairs.map((pair, i) => ({ pair, heavyLeft: rand() < 0.5, ask: asks[i] }));
}

export function massAnswers(items: MassItem[]): string[] {
  return items.map((it, i) => {
    const [heavy, light] = MASS_PAIRS[it.pair];
    return it.ask === 'heavy' ? `${letter(i)} mai greu: ${heavy.name}` : `${letter(i)} mai ușor: ${light.name}`;
  });
}

/** The balance tilts by this much (degrees): plainly down on the heavier side. */
export const TILT = 13;

/** How far the stand reaches under the pivot (mm). */
const POST = 22;

/**
 * A balance with a pan on each end of the beam and the pictures on the pans; the beam turns around
 * (cx, py) and goes down on the heavier side.
 */
export function balanceOps(cx: number, py: number, arm: number, left: string, right: string, heavyLeft: boolean, pic: number): DrawOp[] {
  const ops: DrawOp[] = [];
  const a = ((heavyLeft ? -TILT : TILT) * Math.PI) / 180;
  // beam ends: the left one lower when the left is heavier (y grows downwards)
  const lx = cx - arm * Math.cos(a), ly = py - arm * Math.sin(a);
  const rx = cx + arm * Math.cos(a), ry = py + arm * Math.sin(a);
  // stand
  ops.push({ t: 'polygon', points: [{ x: cx - 15, y: py + POST }, { x: cx + 15, y: py + POST }, { x: cx + 10, y: py + POST - 4 }, { x: cx - 10, y: py + POST - 4 }], fill: '#94A3B8', stroke: INK, strokeWidth: 0.4 });
  ops.push({ t: 'polygon', points: [{ x: cx - 1.6, y: py + POST - 4 }, { x: cx + 1.6, y: py + POST - 4 }, { x: cx + 0.9, y: py }, { x: cx - 0.9, y: py }], fill: '#CBD5E1', stroke: INK, strokeWidth: 0.4 });
  ops.push({ t: 'line', x1: lx, y1: ly, x2: rx, y2: ry, stroke: INK, strokeWidth: 1.5 });
  for (const [ex, ey, picture] of [[lx, ly, left], [rx, ry, right]] as [number, number, string][]) {
    const half = pic * 0.62;
    const panTop = ey - 4.5;
    ops.push({ t: 'line', x1: ex, y1: ey, x2: ex, y2: panTop + 2, stroke: INK, strokeWidth: 0.6 });
    ops.push({ t: 'polygon', points: [{ x: ex - half, y: panTop }, { x: ex + half, y: panTop }, { x: ex + half - 3, y: panTop + 2.5 }, { x: ex - half + 3, y: panTop + 2.5 }], fill: '#E2E8F0', stroke: INK, strokeWidth: 0.4 });
    ops.push(...iconOps(picture, ex, panTop - pic / 2 - 0.2, pic));
  }
  ops.push({ t: 'circle', cx, cy: py, r: 1.7, fill: ACCENT, stroke: INK, strokeWidth: 0.3 });
  return ops;
}

/** Height of a balance drawing above its pivot (the pictures on the higher pan). */
const above = (arm: number, pic: number) => arm * Math.sin((TILT * Math.PI) / 180) + 4.7 + pic;

export function massOps(items: MassItem[], x0: number, x1: number, top: number, bottom: number): DrawOp[] {
  const ops: DrawOp[] = [];
  const cols = 2;
  const rows = Math.ceil(items.length / cols);
  const colW = (x1 - x0) / cols;
  const rowH = (bottom - top) / rows;
  items.forEach((it, i) => {
    const x = x0 + (i % cols) * colW;
    const y = top + Math.floor(i / cols) * rowH;
    ops.push({ t: 'rect', x: x + 1.2, y: y + 1.2, w: colW - 2.4, h: rowH - 2.4, rx: 4, fill: '#FBF7EE', stroke: '#E6DECD', strokeWidth: 0.4 });
    ops.push({ t: 'text', x: x + 4.5, y: y + 7.5, text: letter(i), size: 3.8, fill: MUTED, weight: 'bold' });
    const prompt = it.ask === 'heavy' ? 'Încercuiește ce este mai greu.' : 'Încercuiește ce este mai ușor.';
    ops.push({ t: 'text', x: x + colW / 2, y: y + rowH - 6, text: prompt, size: fit(prompt, 4, colW - 8), fill: INK, weight: 'bold', align: 'center' });
    const [heavy, light] = MASS_PAIRS[it.pair];
    const pic = Math.min(18, rowH * 0.25);
    const arm = Math.min(colW / 2 - pic * 0.62 - 5, 30);
    const room = rowH - 6 - 12; // the prompt under it
    const py = y + 4 + above(arm, pic) + (room - above(arm, pic) - POST) / 2;
    ops.push(...balanceOps(x + colW / 2, py, arm, it.heavyLeft ? heavy.picture : light.picture, it.heavyLeft ? light.picture : heavy.picture, it.heavyLeft, pic));
  });
  return ops;
}

// ───────────────────────── kilograms and grams (clasa a II-a) ─────────────────────────

export type MassUnit = 'kg' | 'g';
/** The standard weights put on the pan, heaviest first. */
export const WEIGHTS: Record<MassUnit, number[]> = { kg: [10, 5, 2, 1], g: [500, 200, 100, 50] };

/** Things a child has held or seen weighed, with masses nobody finds strange (name with the article). */
export const WEIGHED: Record<MassUnit, { picture: string; name: string; masses: number[] }[]> = {
  kg: [
    { picture: '🍉', name: 'pepenele', masses: [3, 4, 5, 6, 7] },
    { picture: '🎃', name: 'dovleacul', masses: [4, 5, 6, 7, 10] },
    { picture: '🐈', name: 'pisica', masses: [3, 4, 5, 6] },
    { picture: '🐕', name: 'câinele', masses: [10, 11, 12, 15, 20] },
    { picture: '🎒', name: 'ghiozdanul', masses: [2, 3, 4, 5] },
    { picture: '📦', name: 'cutia', masses: [1, 2, 6, 7, 11, 12] },
    { picture: '🐇', name: 'iepurele', masses: [2, 3, 4] },
  ],
  g: [
    { picture: '🍎', name: 'mărul', masses: [150, 200, 250] },
    { picture: '🍋', name: 'lămâia', masses: [100, 150] },
    { picture: '🍌', name: 'banana', masses: [150, 200] },
    { picture: '🍊', name: 'portocala', masses: [200, 250, 300] },
    { picture: '📕', name: 'cartea', masses: [300, 400, 500, 600] },
    { picture: '🍞', name: 'pâinea', masses: [300, 400, 500] },
    { picture: '🧀', name: 'cașcavalul', masses: [250, 400, 550, 700] },
    { picture: '🍫', name: 'ciocolata', masses: [100, 200, 300] },
  ],
};

/** The weights that make a mass, as few as possible (largest first); at most three for every mass of WEIGHED. */
export function weightsFor(mass: number, unit: MassUnit): number[] {
  const out: number[] = [];
  let left = mass;
  for (const w of WEIGHTS[unit]) while (left >= w) {
    out.push(w);
    left -= w;
  }
  return out;
}

export interface Weighed { picture: string; name: string; mass: number; weights: number[] }
export interface MassCompare { left: string; right: string; answer: '<' | '>' | '=' }
export interface MassSheetII {
  unit: MassUnit;
  /** Four things, each on a balance in equilibrium with its weights; four different masses. */
  items: Weighed[];
  /** Four pairs of masses to compare: in kilograms, in grams, a kilogram count and the same in grams, and a mixed pair. */
  compare: MassCompare[];
}

const sign = (a: number, b: number): MassCompare['answer'] => (a < b ? '<' : a > b ? '>' : '=');

export function massSheetII(rand: () => number): MassSheetII {
  const unit: MassUnit = rand() < 0.5 ? 'kg' : 'g';
  const items: Weighed[] = [];
  for (const thing of shuffle(WEIGHED[unit], rand)) {
    const free = shuffle(thing.masses, rand).filter((m) => !items.some((it) => it.mass === m));
    if (items.length < 4 && free.length) items.push({ picture: thing.picture, name: thing.name, mass: free[0], weights: weightsFor(free[0], unit) });
  }
  const [k1, k2] = pickN(rand, 2, 20, 2);
  const [g1, g2] = pickN(rand, 2, 19, 2).map((x) => x * 50);
  const same = int(rand, 1, 5);
  const kilos = int(rand, 1, 4);
  // a kilogram count against grams that are not the same mass, the answer plain from the thousands
  const grams = shuffle([500, 800, 1200, 1500, 2500, 3500, 4500], rand).find((g) => g !== kilos * 1000)!;
  const flip = (a: string, b: string, x: number, y: number): MassCompare => (rand() < 0.5 ? { left: a, right: b, answer: sign(x, y) } : { left: b, right: a, answer: sign(y, x) });
  const compare = shuffle([
    { left: `${k1} kg`, right: `${k2} kg`, answer: sign(k1, k2) },
    { left: `${g1} g`, right: `${g2} g`, answer: sign(g1, g2) },
    flip(`${same} kg`, `${same * 1000} g`, 1, 1),
    flip(`${kilos} kg`, `${grams} g`, kilos * 1000, grams),
  ], rand);
  return { unit, items, compare };
}

const heaviest = (s: MassSheetII) => s.items.reduce((b, x, i) => (x.mass > s.items[b].mass ? i : b), 0);
const lightest = (s: MassSheetII) => s.items.reduce((b, x, i) => (x.mass < s.items[b].mass ? i : b), 0);

export function massAnswersII(s: MassSheetII): string[] {
  return [
    ...s.items.map((it, i) => `${letter(i)} ${it.name}: ${it.mass} ${s.unit}`),
    `Cel mai greu: ${letter(heaviest(s))}`,
    `Cel mai ușor: ${letter(lightest(s))}`,
    ...s.compare.map((c, i) => `${letter(s.items.length + i)} ${c.left} ${c.answer} ${c.right}`),
  ];
}

/** A standard weight: a small brass block, wider at its base, with its mass written on it; `x` its left edge, `base` its bottom. */
function weightOps(value: number, unit: MassUnit, x: number, base: number, w: number): DrawOp[] {
  const k = WEIGHTS[unit].indexOf(value);
  const h = 12.5 - k * 1.4;
  const label = `${value} ${unit}`;
  return [
    { t: 'rect', x: x + w / 2 - 1.3, y: base - h - 1.6, w: 2.6, h: 2, rx: 0.8, fill: '#D9A441', stroke: INK, strokeWidth: 0.35 },
    { t: 'polygon', points: [{ x: x + 1.1, y: base - h }, { x: x + w - 1.1, y: base - h }, { x: x + w, y: base }, { x, y: base }], fill: '#F2C76B', stroke: INK, strokeWidth: 0.4 },
    { t: 'text', x: x + w / 2, y: base - h / 2 + 1.1, text: label, size: fit(label, 2.9, w - 1.6), fill: INK, weight: 'bold', align: 'center' },
  ];
}

const WEIGHT_W = 10.5;

/** A balance in equilibrium (the beam level): the thing on the left pan, its weights on the right one. */
export function levelBalanceOps(cx: number, py: number, arm: number, it: Weighed, unit: MassUnit, pic: number): DrawOp[] {
  const ops: DrawOp[] = [];
  ops.push({ t: 'polygon', points: [{ x: cx - 15, y: py + POST }, { x: cx + 15, y: py + POST }, { x: cx + 10, y: py + POST - 4 }, { x: cx - 10, y: py + POST - 4 }], fill: '#94A3B8', stroke: INK, strokeWidth: 0.4 });
  ops.push({ t: 'polygon', points: [{ x: cx - 1.6, y: py + POST - 4 }, { x: cx + 1.6, y: py + POST - 4 }, { x: cx + 0.9, y: py }, { x: cx - 0.9, y: py }], fill: '#CBD5E1', stroke: INK, strokeWidth: 0.4 });
  ops.push({ t: 'line', x1: cx - arm, y1: py, x2: cx + arm, y2: py, stroke: INK, strokeWidth: 1.5 });
  const panTop = py - 4.5;
  const row = it.weights.length * WEIGHT_W + (it.weights.length - 1);
  const halves = [pic * 0.62, Math.max(pic * 0.62, row / 2 + 2)];
  [cx - arm, cx + arm].forEach((ex, k) => {
    const half = halves[k];
    ops.push({ t: 'line', x1: ex, y1: py, x2: ex, y2: panTop + 2, stroke: INK, strokeWidth: 0.6 });
    ops.push({ t: 'polygon', points: [{ x: ex - half, y: panTop }, { x: ex + half, y: panTop }, { x: ex + half - 3, y: panTop + 2.5 }, { x: ex - half + 3, y: panTop + 2.5 }], fill: '#E2E8F0', stroke: INK, strokeWidth: 0.4 });
  });
  ops.push(...iconOps(it.picture, cx - arm, panTop - pic / 2 - 0.2, pic));
  it.weights.forEach((w, k) => ops.push(...weightOps(w, unit, cx + arm - row / 2 + k * (WEIGHT_W + 1), panTop - 0.2, WEIGHT_W)));
  ops.push({ t: 'circle', cx, cy: py, r: 1.7, fill: ACCENT, stroke: INK, strokeWidth: 0.3 });
  return ops;
}

export function massOpsII(s: MassSheetII, x0: number, x1: number, top: number, bottom: number): DrawOp[] {
  const ops: DrawOp[] = [];
  const cols = 2;
  const colW = (x1 - x0) / cols;
  const below = 24 + 9 + 2 * 12 + 2;
  const rowH = Math.min(74, (bottom - top - below) / 2);
  const name = (it: Weighed) => it.name.charAt(0).toLocaleUpperCase('ro') + it.name.slice(1);
  s.items.forEach((it, i) => {
    const x = x0 + (i % cols) * colW;
    const y = top + Math.floor(i / cols) * rowH;
    ops.push({ t: 'rect', x: x + 1.2, y: y + 1.2, w: colW - 2.4, h: rowH - 2.4, rx: 4, fill: '#FBF7EE', stroke: '#E6DECD', strokeWidth: 0.4 });
    ops.push({ t: 'text', x: x + 4.5, y: y + 7.5, text: letter(i), size: 3.8, fill: MUTED, weight: 'bold' });
    const pic = 17;
    const arm = 24;
    const up = 4.7 + pic;
    const room = rowH - 6 - 14;
    const py = y + 4 + up + (room - up - POST) / 2;
    ops.push(...levelBalanceOps(x + colW / 2, py, arm, it, s.unit, pic));
    // „Pepenele cântărește □ kg.”
    const text = `${name(it)} cântărește`;
    const size = fit(text, 4.2, colW - 8 - 13 - 12);
    const w = textWidthMm(text, size) + 3 + 13 + 2 + textWidthMm(`${s.unit}.`, 4.2);
    const tx = x + (colW - w) / 2;
    const cy = y + rowH - 9;
    ops.push({ t: 'text', x: tx, y: cy + 1.5, text, size, fill: INK, weight: 'bold' });
    box(ops, tx + textWidthMm(text, size) + 3, cy, 13, 9);
    ops.push({ t: 'text', x: tx + textWidthMm(text, size) + 3 + 13 + 2, y: cy + 1.5, text: `${s.unit}.`, size: 4.2, fill: INK, weight: 'bold' });
  });
  let y = top + 2 * rowH + 3;
  const lines = ['Cel mai greu este obiectul', 'Cel mai ușor este obiectul'];
  lines.forEach((t, k) => {
    const lx = x0 + k * colW;
    const cy = y + 5;
    ops.push({ t: 'text', x: lx, y: cy + 1.5, text: t, size: 4.2, fill: INK, weight: 'bold' });
    const bx = lx + textWidthMm(t, 4.2) + 3;
    box(ops, bx, cy, 11, 9);
    ops.push({ t: 'text', x: bx + 13, y: cy + 1.5, text: '.', size: 4.2, fill: INK, weight: 'bold' });
  });
  y += 14;
  ops.push({ t: 'text', x: x0, y: y + 5, text: 'Compară masele. Scrie <, > sau =.', size: 4.4, fill: INK, weight: 'bold' });
  ops.push({ t: 'text', x: x1, y: y + 5, text: '1 kg = 1000 g', size: 3.8, fill: MUTED, weight: 'bold', align: 'right' });
  y += 9;
  s.compare.forEach((c, i) => {
    const lx = x0 + (i % cols) * colW;
    const cy = y + Math.floor(i / cols) * 12 + 6;
    ops.push({ t: 'text', x: lx, y: cy + 1.4, text: letter(s.items.length + i), size: 3.6, fill: MUTED, weight: 'bold' });
    // the two masses on either side of the box, on fixed columns
    ops.push({ t: 'text', x: lx + 36, y: cy + 1.6, text: c.left, size: 5, fill: INK, weight: 'bold', align: 'right' });
    box(ops, lx + 39, cy, 11, 9);
    ops.push({ t: 'text', x: lx + 53, y: cy + 1.6, text: c.right, size: 5, fill: INK, weight: 'bold' });
  });
  return ops;
}

// ───────────────────────── a ruler, in centimetres ─────────────────────────

export interface RulerSheet {
  /** Objects to measure, whole centimetres (3–12). */
  measure: LengthItem[];
  /** Lines to draw with a ruler (cm). */
  draw: number[];
}

export function rulerSheet(rand: () => number): RulerSheet {
  const cm = pickN(rand, 3, 12, 4);
  const colours = shuffle(COLOURS, rand);
  return {
    measure: cm.map((units, i) => ({ units, thing: rand() < 0.5 ? 'pencil' : 'ribbon', colour: colours[i % colours.length] })),
    draw: pickN(rand, 3, 12, 2),
  };
}

export function rulerAnswers(s: RulerSheet): string[] {
  return [...s.measure.map((it, i) => `${letter(i)} ${it.units} cm`), ...s.draw.map((n, i) => `${letter(s.measure.length + i)} o linie de ${n} cm`)];
}

export const RULER_CM = 14;

/** A ruler from 0 to RULER_CM cm, its 0 at x0r, top edge at y: millimetre ticks, the numbers under the centimetres. */
export function rulerOps(x0r: number, y: number): DrawOp[] {
  const ops: DrawOp[] = [];
  const h = 11;
  ops.push({ t: 'rect', x: x0r - 4, y, w: RULER_CM * 10 + 8, h, rx: 1, fill: '#FEF9C3', stroke: INK, strokeWidth: 0.45 });
  for (let mm = 0; mm <= RULER_CM * 10; mm++) {
    const len = mm % 10 === 0 ? 4 : mm % 5 === 0 ? 2.8 : 1.6;
    ops.push({ t: 'line', x1: x0r + mm, y1: y, x2: x0r + mm, y2: y + len, stroke: INK, strokeWidth: mm % 10 === 0 ? 0.35 : 0.18 });
    if (mm % 10 === 0) ops.push({ t: 'text', x: x0r + mm, y: y + 8.2, text: String(mm / 10), size: 2.9, fill: INK, weight: 'bold', align: 'center' });
  }
  return ops;
}

export function rulerSheetOps(s: RulerSheet, x0: number, x1: number, top: number, bottom: number): DrawOp[] {
  const ops: DrawOp[] = [];
  const x0r = x0 + 14;
  const drawH = 24;
  const head = 9;
  const measureH = (bottom - top - head - s.draw.length * drawH - 6) / s.measure.length;
  s.measure.forEach((it, i) => {
    const y = top + i * measureH;
    ops.push({ t: 'rect', x: x0, y: y + 1, w: x1 - x0, h: measureH - 2, rx: 3, fill: '#FBF7EE', stroke: '#E6DECD', strokeWidth: 0.4 });
    ops.push({ t: 'text', x: x0 + 2.5, y: y + 7, text: letter(i), size: 3.8, fill: MUTED, weight: 'bold' });
    const block = 7 + 0.6 + 11;
    const oy = y + (measureH - block) / 2 + 3.5;
    ops.push(...thingOps(it.thing, x0r, oy, it.units * 10, 7, it.colour));
    ops.push(...rulerOps(x0r, oy + 3.5 + 0.6));
    const by = y + measureH / 2;
    const bx = x1 - 4 - textWidthMm('cm', 4.2) - 2 - 13;
    box(ops, bx, by, 13, 10);
    ops.push({ t: 'text', x: bx + 15, y: by + 1.5, text: 'cm', size: 4.2, fill: INK, weight: 'bold' });
  });
  let y = top + s.measure.length * measureH + 6;
  ops.push({ t: 'text', x: x0, y: y + 5, text: 'Desenează cu rigla, pornind de la punct:', size: 4.4, fill: INK, weight: 'bold' });
  y += head;
  s.draw.forEach((n, k) => {
    const cy = y + k * drawH + drawH / 2;
    const label = `${letter(s.measure.length + k)} o linie de ${n} cm`;
    ops.push({ t: 'text', x: x0 + 2.5, y: cy - 4.5, text: label, size: 4.2, fill: INK, weight: 'bold' });
    ops.push({ t: 'circle', cx: x0r, cy: cy + 3, r: 1.1, fill: INK });
    ops.push({ t: 'line', x1: x0r, y1: cy + 3, x2: x1 - 6, y2: cy + 3, stroke: '#E2E8F0', strokeWidth: 0.3, dash: [1, 1.5] });
  });
  return ops;
}

// ───────────────────────── units (clasa a II-a) ─────────────────────────

type Qty = 'L' | 'C' | 'M';
const UNITS: Record<Qty, string[]> = { L: ['m', 'cm'], C: ['l', 'ml'], M: ['kg', 'g'] };
const UNIT_QUESTIONS: { text: string; q: Qty; answer: string }[] = [
  { text: 'Cât de lungă este sala de clasă?', q: 'L', answer: 'm' },
  { text: 'Cât de lung este creionul?', q: 'L', answer: 'cm' },
  { text: 'Cât de înalt este copacul?', q: 'L', answer: 'm' },
  { text: 'Cât de lată este palma?', q: 'L', answer: 'cm' },
  { text: 'Câtă apă încape în găleată?', q: 'C', answer: 'l' },
  { text: 'Cât sirop este într-o linguriță?', q: 'C', answer: 'ml' },
  { text: 'Cât lapte este într-o sticlă mare?', q: 'C', answer: 'l' },
  { text: 'Cât cântărește un sac cu cartofi?', q: 'M', answer: 'kg' },
  { text: 'Cât cântărește o bomboană?', q: 'M', answer: 'g' },
  { text: 'Cât cântărește un pepene?', q: 'M', answer: 'kg' },
];
type Tool = 'L' | 'M' | 'T';
const TOOLS: Record<Tool, string[]> = { L: ['rigla', 'ruleta', 'metrul de tâmplărie', 'panglica de croitorie'], M: ['cântarul', 'balanța'], T: ['ceasul'] };
const TOOL_QUESTIONS: { text: string; q: Tool; answer: string }[] = [
  { text: 'Cu ce măsurăm lungimea caietului?', q: 'L', answer: 'rigla' },
  { text: 'Cu ce măsurăm lungimea unei camere?', q: 'L', answer: 'ruleta' },
  { text: 'Cu ce măsoară croitorul o rochie?', q: 'L', answer: 'panglica de croitorie' },
  { text: 'Cu ce cântărim un sac cu mere?', q: 'M', answer: 'cântarul' },
  { text: 'Cu ce cântărim o scrisoare?', q: 'M', answer: 'balanța' },
  { text: 'Cu ce aflăm cât durează pauza?', q: 'T', answer: 'ceasul' },
];

export interface ChoiceItem {
  text: string;
  options: string[];
  answer: string;
}

export interface Conversion {
  /** „1 m = □ cm”: left, the unit of the box, the answer. */
  left: string;
  unit: string;
  answer: string;
}

export interface UnitsSheet {
  units: ChoiceItem[];
  tools: ChoiceItem[];
  conversions: Conversion[];
}

export function unitsSheet(rand: () => number): UnitsSheet {
  const units = shuffle(UNIT_QUESTIONS, rand).slice(0, 5).map((u) => {
    // the right unit and one unit of each of the other two quantities
    const others = (['L', 'C', 'M'] as Qty[]).filter((q) => q !== u.q).map((q) => UNITS[q][int(rand, 0, 1)]);
    return { text: u.text, answer: u.answer, options: shuffle([u.answer, ...others], rand) };
  });
  const tools = (['L', 'M', 'T'] as Tool[]).map((kind) => {
    const qs = TOOL_QUESTIONS.filter((t) => t.q === kind);
    const t = qs[int(rand, 0, qs.length - 1)];
    const others = (['L', 'M', 'T'] as Tool[]).filter((q) => q !== kind).map((q) => TOOLS[q].filter((x) => x !== 'panglica de croitorie' && x !== 'metrul de tâmplărie')[0]);
    return { text: t.text, answer: t.answer, options: shuffle([t.answer, ...others], rand) };
  });
  const k = int(rand, 2, 9);
  const conversions: Conversion[] = shuffle(
    [
      { left: '1 m', unit: 'cm', answer: '100' },
      { left: '1 kg', unit: 'g', answer: '1000' },
      { left: '1 l', unit: 'ml', answer: '1000' },
      { left: '1 m', unit: 'mm', answer: '1000' },
    ],
    rand,
  ).slice(0, 3);
  conversions.push({ left: `${k} m`, unit: 'cm', answer: String(k * 100) });
  return { units, tools: shuffle(tools, rand), conversions };
}

export function unitsAnswers(s: UnitsSheet): string[] {
  return [
    ...s.units.map((u, i) => `1. ${letter(i)} ${u.answer}`),
    ...s.tools.map((u, i) => `2. ${letter(i)} ${u.answer}`),
    ...s.conversions.map((c, i) => `3. ${letter(i)} ${c.left} = ${c.answer} ${c.unit}`),
  ];
}

function choiceRow(ops: DrawOp[], c: ChoiceItem, label: string, x0: number, x1: number, cy: number, optW: number): void {
  ops.push({ t: 'text', x: x0, y: cy + 1.4, text: label, size: 3.6, fill: MUTED, weight: 'bold' });
  const optsX = x1 - 3 * optW - 2 * 3;
  ops.push({ t: 'text', x: x0 + 8, y: cy + 1.5, text: c.text, size: fit(c.text, 4.2, optsX - x0 - 12), fill: INK, weight: 'bold' });
  c.options.forEach((o, k) => {
    const x = optsX + k * (optW + 3);
    ops.push({ t: 'rect', x, y: cy - 4.5, w: optW, h: 9, rx: 4.5, fill: PAPER, stroke: '#94A3B8', strokeWidth: 0.4 });
    ops.push({ t: 'text', x: x + optW / 2, y: cy + 1.4, text: o, size: fit(o, 4.2, optW - 3), fill: INK, weight: 'bold', align: 'center' });
  });
}

export function unitsOps(s: UnitsSheet, x0: number, x1: number, top: number, bottom: number): DrawOp[] {
  const ops: DrawOp[] = [];
  const rowH = 12;
  const heads = ['1. Ce unitate de măsură folosim? Încercuiește.', '2. Cu ce măsurăm? Încercuiește.', '3. Completează.'];
  const convRows = Math.ceil(s.conversions.length / 2);
  const used = 3 * 9 + (s.units.length + s.tools.length + convRows) * rowH + convRows * 4;
  const gap = Math.min(16, Math.max(6, (bottom - top - used) / 2));
  let y = top;
  ops.push({ t: 'text', x: x0, y: y + 5, text: heads[0], size: 4.4, fill: INK, weight: 'bold' });
  y += 9;
  s.units.forEach((u, i) => choiceRow(ops, u, letter(i), x0, x1, y + i * rowH + rowH / 2, 15));
  y += s.units.length * rowH + gap;
  ops.push({ t: 'text', x: x0, y: y + 5, text: heads[1], size: 4.4, fill: INK, weight: 'bold' });
  y += 9;
  const toolW = Math.max(22, ...s.tools.flatMap((t) => t.options.map((o) => textWidthMm(o, 4.2) + 6)));
  s.tools.forEach((u, i) => choiceRow(ops, u, letter(i), x0, x1, y + i * rowH + rowH / 2, toolW));
  y += s.tools.length * rowH + gap;
  ops.push({ t: 'text', x: x0, y: y + 5, text: heads[2], size: 4.4, fill: INK, weight: 'bold' });
  y += 9;
  const colW = (x1 - x0) / 2;
  s.conversions.forEach((c, i) => {
    const x = x0 + (i % 2) * colW;
    const cy = y + Math.floor(i / 2) * (rowH + 4) + rowH / 2 + 2;
    ops.push({ t: 'text', x, y: cy + 1.4, text: letter(i), size: 3.6, fill: MUTED, weight: 'bold' });
    const lhs = `${c.left} =`;
    ops.push({ t: 'text', x: x + 8, y: cy + 2, text: lhs, size: 5.6, fill: INK, weight: 'bold' });
    const bx = x + 8 + textWidthMm(lhs, 5.6) + 3;
    box(ops, bx, cy, 20, 10);
    ops.push({ t: 'text', x: bx + 22, y: cy + 2, text: c.unit, size: 5.6, fill: INK, weight: 'bold' });
  });
  return ops;
}
