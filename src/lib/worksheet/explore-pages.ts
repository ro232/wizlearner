import type { DrawOp, PageOps, Pt, Subpath } from '@/lib/glyphs/types';
import type { Tier, WorksheetConfig } from '@/types';
import { iconOps } from '@/lib/hints/icons';
import { INK, PAPER } from './rows';
import type { KeySection } from './answer-key';
import { BOTTOM, CELL_STROKE, H, M, SOFT, W, adultNote, derangement, exampleLine, exampleRing, exampleTag, fitSize, footer, frame, rng, seedOf, shuffle } from './page-kit';
import {
  BABY_SETS, EXPLORE_KINDS, EXPLORE_SETS, HABITAT_SET, HOME_SETS, MELT_OPTIONS, MELT_ROWS, MOVE_SET, SEASONS,
  SEASON_LABELS, SEASON_THINGS, SEASON_WORDS, SENSES, WATER_ROWS, WATER_STATES, WEAR, WEATHER, isExploreItem,
  type ChoiceSet, type ExploreKind, type Season,
} from './explore';

/**
 * „Explorarea mediului”: full pages in the „Jocuri” category (see activities.ts), seeded by the item:
 *
 * - "plant:1", "body:1"  Părțile plantei / corpului — a drawing, lines from its parts to empty boxes,
 *                        and the words to write or to cut out and stick;
 * - "senses:1"           Simțurile — join each sense organ with its sense;
 * - "home:1–2"           Cine unde trăiește? — circle the forest, the farm or the water;
 * - "habitat:1"          Mediile de viață (clasa a II-a) — an X in the table: forest, desert, poles, sea;
 * - "move:1"             Cum se deplasează? — flies, swims, walks, crawls;
 * - "baby:1–2"           Puiul cui este? — join the animal with the name of its young;
 * - "season:1"           Anotimpurile — circle the season of each picture (four trees);
 * - "season:2–5"         Ce se întâmplă primăvara / vara / toamna / iarna? — circle what fits;
 * - "weather:1"          Vremea — join the weather symbol with its name;
 * - "wear:1"             Ce iei cu tine? — if it rains, the umbrella …;
 * - "water:1"            Apa: solidă sau lichidă?; "melt:1" Ce se întâmplă cu apa? (clasa I).
 *
 * The layouts are computed by exported functions, which the tests and the answers page read.
 */

export const EXPLORE_KIND_TITLES: Record<ExploreKind, string> = {
  plant: 'Părțile plantei',
  body: 'Părțile corpului',
  senses: 'Simțurile',
  home: 'Cine unde trăiește?',
  habitat: 'Mediile de viață',
  move: 'Cum se deplasează?',
  baby: 'Puiul cui este?',
  season: 'Anotimpurile',
  weather: 'Vremea',
  wear: 'Ce iei cu tine?',
  water: 'Apa: solidă sau lichidă?',
  melt: 'Ce se întâmplă cu apa?',
};

const SHORT: Partial<Record<string, string>> = {
  'home:1': 'Unde trăiește? (1)', 'home:2': 'Unde trăiește? (2)', 'baby:1': 'Puiul cui este? (1)', 'baby:2': 'Puiul cui este? (2)',
  'season:1': 'anotimpurile', 'season:2': 'primăvara', 'season:3': 'vara', 'season:4': 'toamna', 'season:5': 'iarna',
};

/** Every item, in picker order. */
export function exploreItems(): string[] {
  return EXPLORE_KINDS.flatMap((k) => Array.from({ length: EXPLORE_SETS[k] }, (_, i) => `${k}:${i + 1}`));
}

export function exploreShortLabel(item: string): string {
  return SHORT[item] ?? EXPLORE_KIND_TITLES[item.split(':')[0] as ExploreKind] ?? item;
}

/** The season of a „Ce se întâmplă …?” set (season:2–5). */
const gridSeason = (n: number): Season => SEASONS[n - 2];

/** The title on the page (and in the answers). */
export function exploreTitle(item: string): string {
  const [kind, arg] = item.split(':') as [ExploreKind, string];
  if (kind === 'season' && arg !== '1') return `Ce se întâmplă ${SEASON_WORDS[gridSeason(Number(arg))]}?`;
  return EXPLORE_KIND_TITLES[kind] ?? item;
}

/** The name of the item in the lists and on the answers page („Cine unde trăiește? (2)”). */
export function exploreLabel(item: string): string {
  const [kind, arg] = item.split(':') as [ExploreKind, string];
  if (kind === 'home') return `${EXPLORE_KIND_TITLES.home} (${arg})`;
  if (kind === 'baby') return `${EXPLORE_KIND_TITLES.baby} (${arg})`;
  return exploreTitle(item);
}

const lower = (s: string) => s.toLocaleLowerCase('ro');

// ───────────────────────── drawn pictures: plant, body, trees ─────────────────────────

type Shape = { pts: Pt[]; fill: string };
type Stroke = { pts: Pt[]; w: number; color: string };

function ell(cx: number, cy: number, rx: number, ry: number, rot = 0, n = 32): Pt[] {
  const a = (rot * Math.PI) / 180;
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    const x = rx * Math.cos(t);
    const y = ry * Math.sin(t);
    return { x: cx + x * Math.cos(a) - y * Math.sin(a), y: cy + x * Math.sin(a) + y * Math.cos(a) };
  });
}
const pts = (...xy: number[]): Pt[] => Array.from({ length: xy.length / 2 }, (_, i) => ({ x: xy[2 * i], y: xy[2 * i + 1] }));

function line(p: Pt[]): Subpath {
  return { start: p[0], segs: p.slice(1).map((q) => ({ kind: 'L' as const, p: q })) };
}

/** Shapes and strokes in picture units → ops in mm. */
function drawn(shapes: (Shape | Stroke)[], ox: number, oy: number, s: number): DrawOp[] {
  const at = (p: Pt) => ({ x: ox + p.x * s, y: oy + p.y * s });
  return shapes.map((sh) =>
    'fill' in sh
      ? ({ t: 'polygon', points: sh.pts.map(at), fill: sh.fill, stroke: INK, strokeWidth: 0.45 } as DrawOp)
      : ({ t: 'path', subpaths: [line(sh.pts.map(at))], stroke: sh.color, strokeWidth: sh.w * s, cap: 'round' } as DrawOp),
  );
}

export interface LabelTarget {
  /** The word that goes in the box. */
  word: string;
  /** The point of the drawing the line goes to. */
  at: Pt[];
  side: 'left' | 'right';
}

export interface Labelling {
  /** The left edge and the width of the drawing, in picture units. */
  x0: number;
  w: number;
  h: number;
  shapes: (Shape | Stroke)[];
  targets: LabelTarget[];
}

const GREEN = '#5DAA3C';
const LEAF = '#7CC35A';
const BROWN = '#7A5230';

export const PLANT: Labelling = {
  x0: 18, w: 64, h: 122,
  shapes: [
    { pts: [...Array.from({ length: 17 }, (_, i) => ({ x: 18 + i * 4, y: 82 + 1.2 * Math.sin(i * 1.3) })), ...pts(82, 122, 18, 122)], fill: '#D9B58C' },
    // roots
    { pts: pts(50, 82, 50, 96, 49, 110), w: 2.4, color: BROWN },
    { pts: pts(50, 88, 42, 96, 36, 104), w: 1.8, color: BROWN },
    { pts: pts(50, 90, 59, 98, 64, 108), w: 1.8, color: BROWN },
    { pts: pts(49, 100, 43, 112), w: 1.4, color: BROWN },
    { pts: pts(50, 102, 56, 114), w: 1.4, color: BROWN },
    // stem, the stalk of the fruit
    { pts: pts(50, 83, 50, 60, 51, 40, 50, 22), w: 3.6, color: GREEN },
    { pts: pts(50.5, 44, 60, 40, 67.5, 42.5), w: 2, color: GREEN },
    // leaves
    { pts: ell(37, 62, 13, 5.5, -20), fill: LEAF },
    { pts: ell(63, 56, 13, 5.5, 20), fill: LEAF },
    { pts: pts(49, 57.8, 27, 65.6), w: 0.7, color: GREEN },
    { pts: pts(51, 51.8, 73, 59.6), w: 0.7, color: GREEN },
    // the fruit
    { pts: ell(69, 49, 6.5, 6.5), fill: '#E53935' },
    { pts: pts(66, 42.5, 69, 44, 72, 42.5, 69, 41), fill: '#3E8E2F' },
    // the flower
    ...Array.from({ length: 5 }, (_, k) => {
      const a = ((k * 72 - 90) * Math.PI) / 180;
      return { pts: ell(50 + 8 * Math.cos(a), 16 + 8 * Math.sin(a), 6.5, 4.6, k * 72 - 90), fill: '#F06292' };
    }),
    { pts: ell(50, 16, 4.6, 4.6), fill: '#FDD835' },
  ],
  targets: [
    { word: 'FLOARE', at: [{ x: 56, y: 10 }], side: 'right' },
    { word: 'FRUCT', at: [{ x: 73, y: 50 }], side: 'right' },
    { word: 'FRUNZĂ', at: [{ x: 31, y: 63 }], side: 'left' },
    { word: 'TULPINĂ', at: [{ x: 50, y: 74 }], side: 'left' },
    { word: 'RĂDĂCINĂ', at: [{ x: 61, y: 103 }], side: 'right' },
  ],
};

const SKIN = '#F6C9A0';
const SHIRT = '#42A5F5';
const TROUSERS = '#3949AB';

export const BODY: Labelling = {
  x0: 10, w: 80, h: 150,
  shapes: [
    // legs and shoes
    { pts: pts(31, 90, 49, 90, 48, 139, 34, 139), fill: TROUSERS },
    { pts: pts(51, 90, 69, 90, 66, 139, 52, 139), fill: TROUSERS },
    { pts: ell(39, 142, 9, 4.2), fill: '#6D4C41' },
    { pts: ell(61, 142, 9, 4.2), fill: '#6D4C41' },
    // arms (sleeve, then the bare arm) and hands
    { pts: pts(33, 44, 25, 48, 17, 82, 24, 84, 32, 58), fill: SHIRT },
    { pts: pts(67, 44, 75, 48, 83, 82, 76, 84, 68, 58), fill: SHIRT },
    { pts: ell(20, 87, 5.2, 5.6), fill: SKIN },
    { pts: ell(80, 87, 5.2, 5.6), fill: SKIN },
    // neck, trunk
    { pts: pts(45, 33, 55, 33, 55, 44, 45, 44), fill: SKIN },
    { pts: pts(33, 42, 67, 42, 70, 93, 30, 93), fill: SHIRT },
    // head, hair, face
    { pts: ell(50, 22, 14, 14), fill: SKIN },
    { pts: [...Array.from({ length: 17 }, (_, i) => { const a = ((195 + i * 9.375) * Math.PI) / 180; return { x: 50 + 14.8 * Math.cos(a), y: 21 + 13.5 * Math.sin(a) }; }), ...pts(62, 16, 56, 13.5, 50, 15.5, 44, 13.5, 38, 16)], fill: '#8D5524' },
    { pts: ell(44.5, 22, 1.5, 1.8), fill: INK },
    { pts: ell(55.5, 22, 1.5, 1.8), fill: INK },
    { pts: pts(44, 28, 47, 30.5, 50, 31.2, 53, 30.5, 56, 28), w: 0.9, color: INK },
  ],
  targets: [
    { word: 'CAP', at: [{ x: 59, y: 26 }], side: 'right' },
    { word: 'GÂT', at: [{ x: 46, y: 38 }], side: 'left' },
    { word: 'TRUNCHI', at: [{ x: 60, y: 66 }], side: 'right' },
    { word: 'MÂINI', at: [{ x: 19, y: 88 }], side: 'left' },
    { word: 'PICIOARE', at: [{ x: 60, y: 118 }], side: 'right' },
  ],
};

/** A tree in the given season, `size` mm tall, its trunk's foot at (cx, bottom). */
export function treeOps(season: Season, cx: number, bottom: number, size: number): DrawOp[] {
  const s = size / 40;
  const at = (x: number, y: number) => ({ x: cx + (x - 20) * s, y: bottom + (y - 40) * s });
  const ops: DrawOp[] = [];
  ops.push({ t: 'polygon', points: [at(18, 40), at(22, 40), at(21.5, 24), at(18.5, 24)], fill: '#8D6E63', stroke: INK, strokeWidth: 0.3 });
  if (season === 'iarna') {
    for (const [a, b] of [[[20, 26], [12, 14]], [[20, 24], [27, 11]], [[20, 28], [30, 22]], [[20, 30], [9, 24]], [[16, 19], [18, 8]]] as [number, number][][]) {
      ops.push({ t: 'line', x1: at(a[0], a[1]).x, y1: at(a[0], a[1]).y, x2: at(b[0], b[1]).x, y2: at(b[0], b[1]).y, stroke: '#6D4C41', strokeWidth: 1.1 * s });
    }
    for (const [x, y] of [[12, 13], [27, 10], [30, 21], [9, 23], [18, 7]]) ops.push({ t: 'circle', cx: at(x, y).x, cy: at(x, y).y, r: 1.5 * s, fill: '#FFFFFF', stroke: '#90A4AE', strokeWidth: 0.25 });
    ops.push({ t: 'polygon', points: [at(2, 40), at(38, 40), at(34, 37), at(6, 37)], fill: '#FFFFFF', stroke: '#90A4AE', strokeWidth: 0.3 });
    return ops;
  }
  const crown = season === 'toamna' ? '#F4A23A' : season === 'vara' ? '#3E9B3A' : '#9BD77E';
  for (const [x, y, r] of [[12, 19, 8], [28, 19, 8], [20, 12, 10]]) ops.push({ t: 'circle', cx: at(x, y).x, cy: at(x, y).y, r: r * s, fill: crown, stroke: INK, strokeWidth: 0.3 });
  if (season === 'primavara') for (const [x, y] of [[14, 15], [22, 9], [27, 17], [18, 20], [11, 21], [25, 23], [20, 5]]) ops.push({ t: 'circle', cx: at(x, y).x, cy: at(x, y).y, r: 1.6 * s, fill: '#F8BBD0', stroke: '#E91E63', strokeWidth: 0.2 });
  if (season === 'toamna') for (const [x, y] of [[6, 34], [33, 31], [29, 37], [11, 38]]) ops.push({ t: 'circle', cx: at(x, y).x, cy: at(x, y).y, r: 1.4 * s, fill: '#E65100' });
  return ops;
}

export interface LabelLayout {
  ox: number;
  oy: number;
  scale: number;
  boxes: { word: string; x: number; y: number; w: number; h: number; to: Pt[]; from: Pt }[];
  bank: { word: string; x: number; y: number; w: number; h: number }[];
}

const BOX_W = 42;
const BOX_H = 13;

/** The drawing in the middle, the boxes on its sides at the height of their part, the word bank above. */
export function labelLayout(kind: 'plant' | 'body', top: number): LabelLayout {
  const pic = kind === 'plant' ? PLANT : BODY;
  const bankH = 20;
  const areaTop = top + bankH + 6;
  const roomW = W - 2 * M - 2 * BOX_W - 16;
  const roomH = BOTTOM - areaTop - 2;
  const scale = Math.min(roomW / pic.w, roomH / pic.h);
  const ox = (W - pic.w * scale) / 2 - pic.x0 * scale;
  const oy = areaTop + (roomH - pic.h * scale) / 2;
  const at = (p: Pt) => ({ x: ox + p.x * scale, y: oy + p.y * scale });
  const boxes: LabelLayout['boxes'] = [];
  for (const side of ['left', 'right'] as const) {
    const mine = pic.targets.filter((t) => t.side === side).sort((a, b) => a.at[0].y - b.at[0].y);
    let last = -Infinity;
    for (const t of mine) {
      const to = t.at.map(at);
      // the box at the height of its part, at least 4 mm under the box above
      const y = Math.max(to[0].y - BOX_H / 2, last + 4, areaTop);
      last = y + BOX_H;
      const x = side === 'left' ? M : W - M - BOX_W;
      boxes.push({ word: t.word, x, y, w: BOX_W, h: BOX_H, to, from: { x: side === 'left' ? x + BOX_W : x, y: y + BOX_H / 2 } });
    }
  }
  boxes.sort((a, b) => a.y - b.y || a.x - b.x);
  // the word bank: the words shuffled so that no word sits above its own box's place in the list
  const words = pic.targets.map((t) => t.word);
  const order = derangement(words.length, rng(seedOf(`label:${kind}`)));
  const cardW = (W - 2 * M - 4 * (words.length - 1)) / words.length;
  const bank = order.map((k, i) => ({ word: words[k], x: M + i * (cardW + 4), y: top + 2, w: cardW, h: bankH - 4 }));
  return { ox, oy, scale, boxes, bank };
}

function labelPage(config: WorksheetConfig, kind: 'plant' | 'body', tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const pic = kind === 'plant' ? PLANT : BODY;
  const top = frame(ops, config, EXPLORE_KIND_TITLES[kind], `Scrie în fiecare căsuță numele ${kind === 'plant' ? 'părții plantei' : 'părții corpului'}.`, 'Poți și să decupezi cuvintele de sus și să le lipești în căsuțe.');
  const lay = labelLayout(kind, top);
  for (const b of lay.bank) {
    ops.push({ t: 'rect', x: b.x, y: b.y, w: b.w, h: b.h, rx: 2, fill: SOFT, stroke: '#94A3B8', strokeWidth: 0.4, dash: [1.4, 1] });
    ops.push({ t: 'text', x: b.x + b.w / 2, y: b.y + b.h / 2 + 1.6, text: b.word, size: fitSize(b.word, 4.6, b.w - 4), fill: INK, weight: 'bold', align: 'center' });
  }
  ops.push(...drawn(pic.shapes, lay.ox, lay.oy, lay.scale));
  lay.boxes.forEach((b, i) => {
    for (const p of b.to) {
      ops.push({ t: 'line', x1: b.from.x, y1: b.from.y, x2: p.x, y2: p.y, stroke: INK, strokeWidth: 0.4 });
      ops.push({ t: 'circle', cx: p.x, cy: p.y, r: 1.1, fill: INK });
    }
    ops.push({ t: 'rect', x: b.x, y: b.y, w: b.w, h: b.h, rx: 2.5, fill: PAPER, stroke: INK, strokeWidth: 0.6 });
    ops.push({ t: 'text', x: b.x + 2, y: b.y + 3.6, text: String(i + 1), size: 2.6, fill: '#94A3B8', weight: 'bold' });
  });
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── join the two columns ─────────────────────────

export interface MatchSide { picture?: string; word?: string; caption?: string }
export interface MatchSet { title: string; instruction: string; help: string; left: MatchSide[]; right: MatchSide[]; names: string[] }

/** The two columns of a matching sheet: `order[i]` is the left item whose partner is on row i, right. */
export function matchSet(item: string): { set: MatchSet; order: number[] } {
  const [kind, arg] = item.split(':') as [ExploreKind, string];
  const n = Number(arg);
  let set: MatchSet;
  if (kind === 'senses') {
    set = { title: EXPLORE_KIND_TITLES.senses, instruction: 'Unește fiecare organ de simț cu simțul lui.', help: 'Un adult citește cuvintele, dacă este nevoie. Prima linie este exemplul.', left: SENSES.map(([p, c]) => ({ picture: p, caption: c })), right: SENSES.map(([, , w]) => ({ word: w })), names: SENSES.map(([, c, w]) => `${c} – ${lower(w)}`) };
  } else if (kind === 'baby') {
    const pairs = BABY_SETS[n - 1];
    set = { title: EXPLORE_KIND_TITLES.baby, instruction: 'Unește fiecare animal cu numele puiului său.', help: 'Un adult citește cuvintele, dacă este nevoie. Prima linie este exemplul.', left: pairs.map(([p, c]) => ({ picture: p, caption: c })), right: pairs.map(([, , w]) => ({ word: w })), names: pairs.map(([, c, w]) => `${c} – ${lower(w)}`) };
  } else if (kind === 'weather') {
    set = { title: EXPLORE_KIND_TITLES.weather, instruction: 'Unește fiecare semn al vremii cu numele lui.', help: 'Un adult citește cuvintele, dacă este nevoie. Prima linie este exemplul.', left: WEATHER.map(([p]) => ({ picture: p })), right: WEATHER.map(([, w]) => ({ word: w })), names: WEATHER.map(([, w]) => lower(w)) };
  } else {
    set = { title: EXPLORE_KIND_TITLES.wear, instruction: 'Unește vremea cu ce îți trebuie atunci.', help: 'Dacă plouă, atunci iei umbrela. Prima linie este exemplul.', left: WEAR.map(([p]) => ({ picture: p })), right: WEAR.map(([, , q]) => ({ picture: q })), names: WEAR.map(([, a, , b]) => `${a} – ${b}`) };
  }
  return { set, order: derangement(set.left.length, rng(seedOf(item))) };
}

function matchPage(config: WorksheetConfig, item: string, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const { set, order } = matchSet(item);
  const top = frame(ops, config, set.title, set.instruction, set.help);
  const rows = set.left.length;
  const gy = top + 2;
  const rowH = (BOTTOM - gy) / rows;
  const pic = Math.min(28, rowH - (set.left[0].caption ? 12 : 7));
  const leftX = M + 22;
  const cardW = 62;
  const rightIsWord = !!set.right[0].word;
  const rightX = rightIsWord ? W - M - cardW : W - M - pic - 8;
  const size = Math.min(...set.right.map((r) => (r.word ? fitSize(r.word, 7, cardW - 10) : 7)));
  const dotL = (i: number) => ({ x: leftX + pic / 2 + 8, y: gy + (i + 0.5) * rowH });
  const dotR = (i: number) => ({ x: rightX - 5, y: gy + (i + 0.5) * rowH });
  set.left.forEach((l, i) => {
    const cy = gy + (i + 0.5) * rowH - (l.caption ? 2.5 : 0);
    ops.push({ t: 'rect', x: leftX - pic / 2 - 3, y: cy - pic / 2 - 2, w: pic + 6, h: pic + 4 + (l.caption ? 5 : 0), rx: 4, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.5 });
    ops.push(...iconOps(l.picture!, leftX, cy, pic));
    if (l.caption) ops.push({ t: 'text', x: leftX, y: cy + pic / 2 + 4.6, text: l.caption, size: fitSize(l.caption, 3.2, pic + 4), fill: '#334155', align: 'center' });
    const d = dotL(i);
    ops.push({ t: 'circle', cx: d.x, cy: d.y, r: 1.4, fill: INK });
  });
  order.forEach((k, i) => {
    const r = set.right[k];
    const cy = gy + (i + 0.5) * rowH;
    if (r.word) {
      const h = Math.min(18, rowH - 10);
      ops.push({ t: 'rect', x: rightX, y: cy - h / 2, w: cardW, h, rx: 3, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.5 });
      ops.push({ t: 'text', x: rightX + cardW / 2, y: cy + size * 0.36, text: r.word, size, fill: INK, weight: 'bold', align: 'center' });
    } else {
      ops.push({ t: 'rect', x: rightX, y: cy - pic / 2 - 2, w: pic + 8, h: pic + 4, rx: 4, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.5 });
      ops.push(...iconOps(r.picture!, rightX + 4 + pic / 2, cy, pic));
    }
    const d = dotR(i);
    ops.push({ t: 'circle', cx: d.x, cy: d.y, r: 1.4, fill: INK });
  });
  const a = dotL(0);
  const b = dotR(order.indexOf(0));
  ops.push(exampleLine(a.x, a.y, b.x, b.y));
  exampleTag(ops, a.x + 3, a.y - 2.5);
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── circle the answer on each row ─────────────────────────

export interface Rows {
  set: ChoiceSet;
  /** How each choice is drawn: its picture, a tree of the season, a wavy line, or only the word. */
  look: ('icon' | 'tree' | 'wave' | 'word')[];
  /** The sentence of each row („Cubul de gheață stă la soare.”), for „Ce se întâmplă cu apa?”. */
  sentences?: string[];
}

/** The rows of a „circle the answer” sheet. */
export function choiceRows(item: string): Rows {
  const [kind, arg] = item.split(':') as [ExploreKind, string];
  const n = Number(arg);
  if (kind === 'home') return { set: HOME_SETS[n - 1], look: ['icon', 'icon', 'icon'] };
  if (kind === 'move') return { set: MOVE_SET, look: ['icon', 'icon', 'icon', 'wave'] };
  if (kind === 'season') {
    // two pictures of each season, shuffled, never two of one season in a row
    const rand = rng(seedOf(item));
    const picked = SEASONS.flatMap((s, si) => shuffle(SEASON_THINGS[s], rand).slice(0, 2).map(([picture, name]) => ({ picture, name, answer: si })));
    let rows = shuffle(picked, rand);
    for (let t = 0; t < 50 && rows.some((r, i) => i > 0 && rows[i - 1].answer === r.answer); t++) rows = shuffle(picked, rand);
    return {
      set: { title: EXPLORE_KIND_TITLES.season, instruction: 'Încercuiește anotimpul potrivit pentru fiecare imagine.', choices: SEASONS.map((s) => ({ label: SEASON_LABELS[s], symbol: '' })), rows },
      look: ['tree', 'tree', 'tree', 'tree'],
    };
  }
  if (kind === 'water') {
    return {
      set: { title: EXPLORE_KIND_TITLES.water, instruction: 'Încercuiește cum este apa din fiecare imagine.', choices: WATER_STATES.map((w) => ({ label: w, symbol: '' })), rows: WATER_ROWS.map(([picture, name, answer]) => ({ picture, name, answer })) },
      look: ['word', 'word'],
    };
  }
  return {
    set: { title: EXPLORE_KIND_TITLES.melt, instruction: 'Citește și încercuiește ce se întâmplă cu apa.', choices: MELT_OPTIONS.map((w) => ({ label: w, symbol: '' })), rows: MELT_ROWS.map(([picture, , answer]) => ({ picture, name: '', answer })) },
    look: ['word', 'word', 'word', 'word'],
    sentences: MELT_ROWS.map(([, s]) => s),
  };
}

function waveOps(cx: number, cy: number, w: number): DrawOp {
  const p: Pt[] = [];
  for (let i = 0; i <= 24; i++) p.push({ x: cx - w / 2 + (w * i) / 24, y: cy + (w / 7) * Math.sin((i / 24) * Math.PI * 4) });
  return { t: 'path', subpaths: [line(p)], stroke: '#6D4C41', strokeWidth: 1.2, cap: 'round' };
}

export interface ChoiceBox { x: number; y: number; w: number; h: number }

/** Where the picture and the choices of each row go (`top`: the top of the activity area). */
export function choiceLayout(item: string, top: number): { rows: { cy: number; pic: number; boxes: ChoiceBox[]; textY?: number }[]; picX: number } {
  const { set, sentences } = choiceRows(item);
  const rowH = (BOTTOM - top) / set.rows.length;
  const pic = Math.min(24, rowH - 7);
  const picX = M + 9 + pic / 2 + 2;
  const x0 = picX + pic / 2 + 8;
  const k = set.choices.length;
  const cw = (W - M - x0) / k;
  return {
    picX,
    rows: set.rows.map((_, i) => {
      const y = top + i * rowH;
      const textH = sentences ? 8 : 0;
      const h = rowH - 4 - textH;
      const bw = k === 2 ? Math.min(cw - 6, 52) : cw - 3;
      return { cy: y + rowH / 2, pic, textY: sentences ? y + 6.5 : undefined, boxes: set.choices.map((_, c) => ({ x: x0 + c * cw + (cw - bw) / 2, y: y + 2 + textH, w: bw, h })) };
    }),
  };
}

function choicePage(config: WorksheetConfig, item: string, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const { set, look, sentences } = choiceRows(item);
  const help = sentences ? 'Un adult citește propozițiile, dacă este nevoie. Primul rând este exemplul.' : 'Un adult citește cuvintele, dacă este nevoie. Primul rând este exemplul.';
  const top = frame(ops, config, set.title, set.instruction, help);
  const lay = choiceLayout(item, top + 1);
  const labelSize = Math.min(...set.choices.map((c) => fitSize(c.label, look[0] !== 'word' ? 3.4 : set.choices.length === 2 ? 6 : 4.6, lay.rows[0].boxes[0].w - 6)));
  set.rows.forEach((r, i) => {
    const row = lay.rows[i];
    ops.push({ t: 'circle', cx: M + 4.5, cy: row.cy, r: 4, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.5 });
    ops.push({ t: 'text', x: M + 4.5, y: row.cy + 1.5, text: String(i + 1), size: 4.2, fill: INK, weight: 'bold', align: 'center' });
    ops.push({ t: 'rect', x: lay.picX - row.pic / 2 - 2, y: row.cy - row.pic / 2 - 2, w: row.pic + 4, h: row.pic + 4, rx: 4, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.5 });
    ops.push(...iconOps(r.picture, lay.picX, row.cy, row.pic));
    if (sentences && row.textY !== undefined) {
      const s = sentences[i];
      ops.push({ t: 'text', x: row.boxes[0].x, y: row.textY, text: s, size: fitSize(s, 4.2, W - M - row.boxes[0].x), fill: INK, weight: 'bold' });
    }
    set.choices.forEach((c, k) => {
      const b = row.boxes[k];
      ops.push({ t: 'rect', x: b.x, y: b.y, w: b.w, h: b.h, rx: 3, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.5 });
      const symbol = Math.min(16, b.h - labelSize - 6);
      const scy = b.y + 2 + symbol / 2;
      if (look[k] === 'icon') ops.push(...iconOps(c.symbol, b.x + b.w / 2, scy, symbol));
      else if (look[k] === 'tree') ops.push(...treeOps(SEASONS[k], b.x + b.w / 2, b.y + 2 + symbol, symbol));
      else if (look[k] === 'wave') ops.push(waveOps(b.x + b.w / 2, scy, symbol * 1.2));
      const ty = look[k] === 'word' ? b.y + b.h / 2 + labelSize * 0.36 : b.y + b.h - 2.2;
      ops.push({ t: 'text', x: b.x + b.w / 2, y: ty, text: c.label, size: labelSize, fill: INK, weight: 'bold', align: 'center' });
    });
    if (i === 0) {
      const b = row.boxes[r.answer];
      ops.push(exampleRing(b.x - 1.2, b.y - 1.2, b.w + 2.4, b.h + 2.4));
    }
  });
  if (!sentences) adultNote(ops, `Imaginile, de sus în jos: ${set.rows.map((r) => r.name).join(', ')}.`);
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── „Mediile de viață”: the table ─────────────────────────

export interface TableLayout { x: number; y: number; firstW: number; colW: number; headH: number; rowH: number }

export function habitatLayout(top: number): TableLayout {
  const firstW = 52;
  const colW = (W - 2 * M - firstW) / HABITAT_SET.choices.length;
  const headH = 26;
  const rowH = Math.min(26, (BOTTOM - top - headH - 2) / HABITAT_SET.rows.length);
  return { x: M, y: top + 1, firstW, colW, headH, rowH };
}

function habitatPage(config: WorksheetConfig, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const set = HABITAT_SET;
  const top = frame(ops, config, set.title, set.instruction, 'Fiecare animal are un singur mediu de viață în tabel. Primul rând este exemplul.');
  const t = habitatLayout(top);
  const w = t.firstW + t.colW * set.choices.length;
  const h = t.headH + t.rowH * set.rows.length;
  ops.push({ t: 'rect', x: t.x, y: t.y, w, h, rx: 2, fill: PAPER });
  ops.push({ t: 'rect', x: t.x, y: t.y, w, h: t.headH, rx: 2, fill: SOFT });
  ops.push({ t: 'text', x: t.x + t.firstW / 2, y: t.y + t.headH / 2 + 1.5, text: 'Animalul', size: 4, fill: INK, weight: 'bold', align: 'center' });
  set.choices.forEach((c, k) => {
    const x = t.x + t.firstW + k * t.colW;
    ops.push({ t: 'line', x1: x, y1: t.y, x2: x, y2: t.y + h, stroke: INK, strokeWidth: 0.4 });
    ops.push(...iconOps(c.symbol, x + t.colW / 2, t.y + 8, 11));
    const lines = c.label.split(' ');
    const size = Math.min(...lines.map((l) => fitSize(l, 3.3, t.colW - 3)));
    lines.forEach((l, j) => ops.push({ t: 'text', x: x + t.colW / 2, y: t.y + 18 + j * 4 - (lines.length - 1) * 1.2, text: l, size, fill: INK, weight: 'bold', align: 'center' }));
  });
  set.rows.forEach((r, i) => {
    const y = t.y + t.headH + i * t.rowH;
    ops.push({ t: 'line', x1: t.x, y1: y, x2: t.x + w, y2: y, stroke: INK, strokeWidth: i === 0 ? 0.6 : 0.4 });
    const pic = t.rowH - 6;
    ops.push(...iconOps(r.picture, t.x + 3 + pic / 2, y + t.rowH / 2, pic));
    ops.push({ t: 'text', x: t.x + pic + 6, y: y + t.rowH / 2 + 1.4, text: r.name, size: fitSize(r.name, 3.8, t.firstW - pic - 8), fill: INK, weight: 'bold' });
    if (i === 0) {
      // the example: an X in the right column
      const cx = t.x + t.firstW + (r.answer + 0.5) * t.colW;
      const cy = y + t.rowH / 2;
      const d = Math.min(t.colW, t.rowH) * 0.25;
      ops.push(exampleLine(cx - d, cy - d, cx + d, cy + d), exampleLine(cx - d, cy + d, cx + d, cy - d));
    }
  });
  ops.push({ t: 'rect', x: t.x, y: t.y, w, h, rx: 2, stroke: INK, strokeWidth: 0.6 });
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── „Ce se întâmplă …?”: circle in a grid ─────────────────────────

export interface GridPicture { picture: string; name: string; season: Season; cx: number; cy: number; size: number }

const GRID_COLS = 4;
const GRID_ROWS = 3;

/** Twelve pictures: the five of the season and seven of the other seasons, shuffled. */
export function seasonGrid(n: number, top: number): GridPicture[] {
  const season = gridSeason(n);
  const rand = rng(seedOf(`season:${n}`));
  const others = SEASONS.filter((s) => s !== season);
  const mine = SEASON_THINGS[season].map(([picture, name]) => ({ picture, name, season }));
  const rest = shuffle(others.flatMap((s) => SEASON_THINGS[s].map(([picture, name]) => ({ picture, name, season: s }))), rand);
  // at least two of each other season, then any
  const picked = others.flatMap((s) => rest.filter((r) => r.season === s).slice(0, 2));
  for (const r of rest) if (picked.length < 7 && !picked.includes(r)) picked.push(r);
  const all = shuffle([...mine, ...picked], rand);
  const cw = (W - 2 * M) / GRID_COLS;
  const ch = (BOTTOM - top) / GRID_ROWS;
  const size = Math.min(34, cw - 14, ch - 14);
  return all.map((p, i) => ({ ...p, cx: M + (i % GRID_COLS + 0.5) * cw, cy: top + (Math.floor(i / GRID_COLS) + 0.5) * ch, size }));
}

function gridPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const season = gridSeason(n);
  const top = frame(ops, config, exploreTitle(`season:${n}`), `Încercuiește tot ce se potrivește cu ${SEASON_WORDS[season]}.`, 'Spune ce vezi în fiecare imagine. Prima imagine încercuită este exemplul.');
  const grid = seasonGrid(n, top + 2);
  const cw = (W - 2 * M) / GRID_COLS;
  const ch = (BOTTOM - top - 2) / GRID_ROWS;
  grid.forEach((p) => {
    ops.push({ t: 'rect', x: p.cx - cw / 2 + 2, y: p.cy - ch / 2 + 2, w: cw - 4, h: ch - 4, rx: 4, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.5 });
    ops.push(...iconOps(p.picture, p.cx, p.cy, p.size));
  });
  const first = grid.find((p) => p.season === season)!;
  const r = first.size / 2 + 4;
  ops.push({ t: 'circle', cx: first.cx, cy: first.cy, r, stroke: '#E8913A', strokeWidth: 0.8 });
  exampleTag(ops, first.cx, first.cy + r + 3.5, 'center');
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── answers and entry point ─────────────────────────

/** The answers of an „Explorarea mediului” item. */
export function exploreKeySection(item: string): KeySection | null {
  if (!isExploreItem(item)) return null;
  const [kind, arg] = item.split(':') as [ExploreKind, string];
  const n = Number(arg);
  const title = exploreLabel(item);
  if (kind === 'plant' || kind === 'body') {
    const boxes = labelLayout(kind, 0).boxes;
    return { title, entries: boxes.map((b) => b.word), perLine: 5, numbered: true };
  }
  if (kind === 'senses' || kind === 'baby' || kind === 'weather' || kind === 'wear') {
    return { title, entries: matchSet(item).set.names, perLine: 2, numbered: true };
  }
  if (kind === 'habitat') return { title, entries: HABITAT_SET.rows.map((r) => `${r.name} – ${lower(HABITAT_SET.choices[r.answer].label)}`), perLine: 2, numbered: true };
  if (kind === 'season' && n > 1) {
    const grid = seasonGrid(n, 0);
    const yes = grid.filter((p) => p.season === gridSeason(n)).map((p) => p.name);
    return { title, entries: [`Se încercuiesc (${yes.length}): ${yes.join(', ')}.`], perLine: 1 };
  }
  const { set, sentences } = choiceRows(item);
  return { title, entries: set.rows.map((r, i) => `${sentences ? sentences[i].replace(/\.$/, '') : r.name} – ${lower(set.choices[r.answer].label)}`), perLine: sentences ? 1 : 2, numbered: true };
}

/** The page of one „Explorarea mediului” item, or null when the item is not one. */
export function buildExplorePage(config: WorksheetConfig, item: string, tier: Tier): PageOps | null {
  if (!isExploreItem(item)) return null;
  const [kind, arg] = item.split(':') as [ExploreKind, string];
  if (kind === 'plant' || kind === 'body') return labelPage(config, kind, tier);
  if (kind === 'senses' || kind === 'baby' || kind === 'weather' || kind === 'wear') return matchPage(config, item, tier);
  if (kind === 'habitat') return habitatPage(config, tier);
  if (kind === 'season' && arg !== '1') return gridPage(config, Number(arg), tier);
  return choicePage(config, item, tier);
}

