import type { DrawOp, PageOps, Pt, Subpath } from '@/lib/glyphs/types';
import type { Tier, WorksheetConfig } from '@/types';
import { iconOps } from '@/lib/hints/icons';
import { INK, PAPER } from './rows';
import type { KeySection } from './answer-key';
import { BOTTOM, CELL_STROKE, H, M, SOFT, W, adultNote, derangement, exampleLine, exampleRing, exampleTag, fitSize, footer, frame, rng, seedOf, shuffle } from './page-kit';
import {
  ALIVE_GRID, ALIVE_SETS, BABY_SETS, COVER_SETS, CYCLE_SETS, DAY_SAY, DAY_SET, DRAWN_STAGES, EAT_SETS, EXPLORE_KINDS, EXPLORE_SETS, FOOD_SETS, HABITAT_SET, HABITAT_SETS,
  HOME_SETS, MAT_SETS, MELT_OPTIONS, MELT_ROWS, MELT_ROWS_MORE, MOVE_SETS, PLANT_LOG, RECYCLE_SAY, RECYCLE_SETS, SEASONS, SEASON_LABELS, SEASON_THINGS, SEASON_WORDS,
  SENSES, SENSE_SETS, SPACE_DESCRIBE, SPACE_NAMES, SPACE_WHO, TAME_SETS, WARM_COLD, WATER_ROWS, WATER_ROWS_2, WATER_STATES, WATER_WHERE, WEAR_SETS, WEATHER, WEATHER_SAY,
  WEEK_DAYS, isExploreItem,
  type Choice, type ChoiceSet, type CircleSet, type Cycle, type ExploreKind, type Season, type SentenceSet,
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
 *
 * The sets and kinds added later use the same pages: a drawing to label (the tree, the tulip, the face, the organs,
 * the water cycle, the planets), two columns to join („Cine ce mănâncă?”), an answer to circle on each row (body
 * covering, domestic or wild, materials, recycling, day and night …; a sentence on the row where a picture alone would
 * not have one answer), a grid to circle in („Unde este apă?”, „Ce este viu?”), and two pages of their own:
 * "cycle:1–3" the stages of a life in order, "obs:1–3" the weather calendar and the plant diary (nothing to check).
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
  cycle: 'Cum cresc?',
  cover: 'Cu ce este acoperit corpul?',
  eat: 'Cine ce mănâncă?',
  tame: 'Domestic sau sălbatic?',
  alive: 'Ce este viu?',
  food: 'Mănânc sănătos',
  mat: 'Din ce este făcut?',
  recycle: 'Reciclăm',
  day: 'Ziua și noaptea',
  space: 'Pământul, Soarele și Luna',
  obs: 'Calendarul vremii',
};

const SHORT: Partial<Record<string, string>> = {
  'home:1': 'Unde trăiește? (1)', 'home:2': 'Unde trăiește? (2)', 'home:3': 'Unde trăiește? (3)', 'baby:1': 'Puiul cui este? (1)', 'baby:2': 'Puiul cui este? (2)',
  'season:1': 'anotimpurile', 'season:2': 'primăvara', 'season:3': 'vara', 'season:4': 'toamna', 'season:5': 'iarna', 'season:6': 'anotimpurile (2)', 'season:7': 'anotimpurile (3)',
  // short enough to leave room for the lock in the corner of the button
  'eat:2': 'Ce mănâncă? (2)', 'eat:3': 'Ce mănâncă? (3)', 'cover:2': 'Blană, pene, solzi (2)', 'cover:3': 'Blană, pene, solzi (3)',
};

/** Every item, in picker order. */
export function exploreItems(): string[] {
  return EXPLORE_KINDS.flatMap((k) => Array.from({ length: EXPLORE_SETS[k] }, (_, i) => `${k}:${i + 1}`));
}

export function exploreShortLabel(item: string): string {
  return SHORT[item] ?? exploreLabel(item);
}

/** The season of a „Ce se întâmplă …?” set (season:2–5). */
const gridSeason = (n: number): Season => SEASONS[n - 2];
/** season:2–5 are the grids of one season; season:1, 6 and 7 the pictures to match with a season. */
const isSeasonGrid = (n: number) => n >= 2 && n <= 5;

/** The titles of the sets of a kind that have their own (set 1 first). */
const SET_TITLES: Partial<Record<ExploreKind, string[]>> = {
  plant: ['Părțile plantei', 'Părțile copacului', 'Părțile lalelei'],
  body: ['Părțile corpului', 'Părțile feței', 'Organele corpului'],
  senses: ['Simțurile', SENSE_SETS[0].title, SENSE_SETS[1].title],
  weather: ['Vremea', 'Cald sau frig?', WEATHER_SAY.title],
  wear: WEAR_SETS.map((w) => w.title),
  water: ['Apa: solidă sau lichidă?', WATER_WHERE.title, 'Apa: solidă sau lichidă?', 'Circuitul apei în natură'],
  cycle: ['Cum cresc?', 'Cum cresc?', 'Ce urmează?'],
  alive: [ALIVE_GRID.title, ALIVE_SETS[0].title, ALIVE_SETS[1].title],
  food: FOOD_SETS.map((f) => f.title),
  recycle: ['Reciclăm', 'Reciclăm', RECYCLE_SAY.title],
  day: [DAY_SET.title, DAY_SAY[0].title, DAY_SAY[1].title],
  space: [SPACE_DESCRIBE.title, 'Pământul, Soarele și Luna', SPACE_WHO.title, 'Planetele sistemului solar'],
  obs: ['Calendarul vremii: o săptămână', 'Calendarul vremii: o lună', 'Jurnalul plantei mele'],
};

/** The title on the page (and in the answers). */
export function exploreTitle(item: string): string {
  const [kind, arg] = item.split(':') as [ExploreKind, string];
  const n = Number(arg);
  if (kind === 'season') return isSeasonGrid(n) ? `Ce se întâmplă ${SEASON_WORDS[gridSeason(n)]}?` : EXPLORE_KIND_TITLES.season;
  return SET_TITLES[kind]?.[n - 1] ?? EXPLORE_KIND_TITLES[kind] ?? item;
}

/** The name of the item in the lists and on the answers page („Cine unde trăiește? (2)”): no two items share one. */
export function exploreLabel(item: string): string {
  const [kind, arg] = item.split(':') as [ExploreKind, string];
  const title = exploreTitle(item);
  // the sets of a kind that share a title are numbered: all of them („Cine unde trăiește? (1)”), or, where set 1
  // was the only one for a long time, from the second on („Mediile de viață”, „Mediile de viață (2)”)
  const same = Array.from({ length: EXPLORE_SETS[kind] ?? 0 }, (_, i) => i + 1).filter((k) => exploreTitle(`${kind}:${k}`) === title);
  if (same.length < 2) return title;
  const k = same.indexOf(Number(arg)) + 1;
  return k === 1 && kind !== 'home' && kind !== 'baby' ? title : `${title} (${k})`;
}

const lower = (s: string) => s.toLocaleLowerCase('ro');
/** The names of places and of the bodies in the sky keep their capitals in the answers („Marea Neagră”, „Soarele”). */
const PROPER: [RegExp, string][] = [
  [/marea neagră/, 'Marea Neagră'], [/delta dunării/, 'Delta Dunării'], [/polul nord/, 'Polul Nord'], [/polul sud/, 'Polul Sud'],
  [/^soarele$/, 'Soarele'], [/^pământ(ul)?$/, 'Pământ$1'], [/^luna$/, 'Luna'], [/^lună$/, 'Lună'],
];
const proper = (s: string) => PROPER.reduce((t, [re, to]) => t.replace(re, to), lower(s));

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
  /** A wide drawing: where the box is drawn on it (its top left corner, picture units), not at its side. */
  box?: Pt;
}

export interface Labelling {
  /** The left edge and the width of the drawing, in picture units. */
  x0: number;
  w: number;
  h: number;
  shapes: (Shape | Stroke)[];
  targets: LabelTarget[];
  /** A drawing as wide as the page, with the boxes on it (the water cycle, the planets). */
  wide?: boolean;
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

const circlePts = (cx: number, cy: number, r: number) => ell(cx, cy, r, r);

/** plant:2 — a fruit tree: roots, trunk, branches, leaves, fruit. */
export const TREE: Labelling = {
  x0: 8, w: 84, h: 132,
  shapes: [
    { pts: [...Array.from({ length: 22 }, (_, i) => ({ x: 8 + i * 4, y: 100 + 1.2 * Math.sin(i * 1.3) })), ...pts(92, 132, 8, 132)], fill: '#D9B58C' },
    // roots
    { pts: pts(50, 100, 50, 114, 48, 126), w: 2.6, color: BROWN },
    { pts: pts(48, 102, 38, 112, 30, 122), w: 2.2, color: BROWN },
    { pts: pts(52, 100, 60, 112, 66, 122), w: 2.2, color: BROWN },
    { pts: pts(44, 106, 36, 106, 26, 110), w: 1.6, color: BROWN },
    { pts: pts(56, 106, 66, 106, 76, 111), w: 1.6, color: BROWN },
    // the crown, then the trunk and the branches over it
    { pts: ell(30, 40, 21, 19), fill: LEAF },
    { pts: ell(70, 40, 21, 19), fill: LEAF },
    { pts: ell(50, 24, 24, 19), fill: LEAF },
    { pts: ell(50, 48, 22, 14), fill: LEAF },
    { pts: pts(43, 101, 57, 101, 55, 64, 45, 64), fill: '#8D6E63' },
    { pts: pts(50, 66, 38, 52, 28, 44), w: 2.8, color: BROWN },
    { pts: pts(50, 66, 62, 52, 72, 42), w: 2.8, color: BROWN },
    { pts: pts(50, 66, 50, 46, 52, 30), w: 2.8, color: BROWN },
    // the fruit
    ...[[34, 28], [64, 22], [44, 44], [78, 48], [20, 44], [58, 40]].map(([x, y]) => ({ pts: circlePts(x, y, 4.2), fill: '#E53935' })),
  ],
  targets: [
    { word: 'FRUNZE', at: [{ x: 22, y: 30 }], side: 'left' },
    { word: 'FRUCTE', at: [{ x: 78, y: 48 }], side: 'right' },
    { word: 'RAMURI', at: [{ x: 66, y: 48 }], side: 'right' },
    { word: 'TRUNCHI', at: [{ x: 47, y: 86 }], side: 'left' },
    { word: 'RĂDĂCINI', at: [{ x: 60, y: 112 }], side: 'right' },
  ],
};

/** plant:3 — a tulip with its bulb. */
export const TULIP: Labelling = {
  x0: 20, w: 60, h: 132,
  shapes: [
    { pts: [...Array.from({ length: 16 }, (_, i) => ({ x: 20 + i * 4, y: 86 + 1.2 * Math.sin(i * 1.3) })), ...pts(80, 132, 20, 132)], fill: '#D9B58C' },
    // roots under the bulb
    { pts: pts(47, 108, 42, 120), w: 1.4, color: BROWN },
    { pts: pts(50, 109, 50, 124), w: 1.4, color: BROWN },
    { pts: pts(53, 108, 58, 122), w: 1.4, color: BROWN },
    { pts: pts(44, 106, 36, 116), w: 1.2, color: BROWN },
    { pts: pts(56, 106, 64, 115), w: 1.2, color: BROWN },
    // stem, bulb, leaves
    { pts: pts(50, 92, 50, 60, 50, 32), w: 3.4, color: GREEN },
    { pts: [...pts(50, 86), ...Array.from({ length: 25 }, (_, i) => { const t = -0.85 + (i / 24) * (Math.PI + 1.7); return { x: 50 + 9.5 * Math.cos(t), y: 98 + 10.5 * Math.sin(t) }; })], fill: '#C8A165' },
    { pts: ell(39, 66, 5, 23, -14), fill: LEAF },
    { pts: ell(62, 62, 5, 23, 16), fill: LEAF },
    // the flower: three petals
    { pts: pts(39, 32, 37, 12, 44, 19, 50, 8, 56, 19, 63, 12, 61, 32, 50, 38), fill: '#E53935' },
    { pts: pts(44, 19, 46, 34), w: 0.6, color: '#B71C1C' },
    { pts: pts(56, 19, 54, 34), w: 0.6, color: '#B71C1C' },
  ],
  targets: [
    { word: 'PETALE', at: [{ x: 58, y: 22 }], side: 'right' },
    { word: 'TULPINĂ', at: [{ x: 50, y: 46 }], side: 'left' },
    { word: 'FRUNZĂ', at: [{ x: 63, y: 62 }], side: 'right' },
    { word: 'BULB', at: [{ x: 45, y: 99 }], side: 'left' },
    { word: 'RĂDĂCINI', at: [{ x: 56, y: 116 }], side: 'right' },
  ],
};

/** body:2 — the face. */
export const FACE: Labelling = {
  x0: 10, w: 80, h: 104,
  shapes: [
    // ears behind the head, the head, the hair
    { pts: ell(19, 56, 6, 9), fill: SKIN },
    { pts: ell(81, 56, 6, 9), fill: SKIN },
    { pts: ell(50, 54, 31, 38), fill: SKIN },
    { pts: [...Array.from({ length: 19 }, (_, i) => { const a = ((186 + i * (168 / 18)) * Math.PI) / 180; return { x: 50 + 32.5 * Math.cos(a), y: 50 + 37 * Math.sin(a) }; }), ...pts(74, 38, 62, 30, 50, 34, 38, 29, 26, 39)], fill: '#8D5524' },
    // eyebrows, eyes
    { pts: pts(31, 41, 38, 39, 45, 41), w: 1.3, color: '#5D3A1A' },
    { pts: pts(55, 41, 62, 39, 69, 41), w: 1.3, color: '#5D3A1A' },
    { pts: ell(38, 50, 6.5, 4.4), fill: '#FFFFFF' },
    { pts: ell(62, 50, 6.5, 4.4), fill: '#FFFFFF' },
    { pts: ell(38, 50, 2.6, 2.6), fill: INK },
    { pts: ell(62, 50, 2.6, 2.6), fill: INK },
    // nose, mouth
    { pts: pts(50, 54, 46.5, 65, 52, 66), w: 1.3, color: '#C98E63' },
    { pts: pts(39, 75, 45, 77.5, 50, 76.5, 55, 77.5, 61, 75, 57, 82, 50, 84.5, 43, 82), fill: '#E57373' },
  ],
  targets: [
    { word: 'PĂR', at: [{ x: 60, y: 22 }], side: 'right' },
    { word: 'OCHI', at: [{ x: 34, y: 50 }], side: 'left' },
    { word: 'URECHE', at: [{ x: 84, y: 56 }], side: 'right' },
    { word: 'NAS', at: [{ x: 47, y: 64 }], side: 'left' },
    { word: 'GURĂ', at: [{ x: 56, y: 79 }], side: 'right' },
  ],
};

const BODY_TINT = '#FBE3CC';

/** body:3 — the organs the programme of clasa I names, where they are in the body. */
export const ORGANS_PIC: Labelling = {
  x0: 10, w: 80, h: 150,
  shapes: [
    // the outline of the body, in one light colour
    { pts: pts(31, 90, 49, 90, 48, 139, 34, 139), fill: BODY_TINT },
    { pts: pts(51, 90, 69, 90, 66, 139, 52, 139), fill: BODY_TINT },
    { pts: ell(39, 142, 9, 4.2), fill: BODY_TINT },
    { pts: ell(61, 142, 9, 4.2), fill: BODY_TINT },
    { pts: pts(33, 44, 25, 48, 17, 82, 24, 84, 32, 58), fill: BODY_TINT },
    { pts: pts(67, 44, 75, 48, 83, 82, 76, 84, 68, 58), fill: BODY_TINT },
    { pts: ell(20, 87, 5.2, 5.6), fill: BODY_TINT },
    { pts: ell(80, 87, 5.2, 5.6), fill: BODY_TINT },
    { pts: pts(45, 33, 55, 33, 55, 44, 45, 44), fill: BODY_TINT },
    { pts: pts(33, 42, 67, 42, 70, 93, 30, 93), fill: BODY_TINT },
    { pts: ell(50, 22, 14, 14), fill: BODY_TINT },
    // the brain, with a fold
    { pts: ell(50, 17, 10, 7.5), fill: '#F48FB1' },
    { pts: pts(42, 17, 46, 14, 50, 17, 54, 14, 58, 17), w: 0.6, color: '#AD1457' },
    // the lungs, the heart between them (a little to its side of the chest), the stomach, the kidneys
    { pts: ell(42.5, 58, 6, 11, 6), fill: '#F8BBD0' },
    { pts: ell(57.5, 58, 6, 11, -6), fill: '#F8BBD0' },
    { pts: pts(49, 59, 52, 57, 55, 58, 56, 62, 52.5, 68, 49, 63), fill: '#E53935' },
    { pts: ell(54, 78, 7.5, 5, -20), fill: '#FFB74D' },
    { pts: ell(41, 84, 3.2, 5.2, 12), fill: '#A1665A' },
    { pts: ell(63, 88, 3.2, 5.2, -12), fill: '#A1665A' },
  ],
  targets: [
    { word: 'CREIER', at: [{ x: 56, y: 17 }], side: 'right' },
    { word: 'PLĂMÂNI', at: [{ x: 41, y: 55 }], side: 'left' },
    { word: 'INIMĂ', at: [{ x: 53, y: 62 }], side: 'right' },
    { word: 'STOMAC', at: [{ x: 57, y: 78 }], side: 'right' },
    { word: 'RINICHI', at: [{ x: 41, y: 85 }], side: 'left' },
  ],
};

const WATER_BLUE = '#64B5F6';
const arrowHead = (x: number, y: number, dx: number, dy: number, s = 3.2): Shape => {
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len, uy = dy / len;
  return { pts: [{ x: x + ux * s, y: y + uy * s }, { x: x - uy * s * 0.7, y: y + ux * s * 0.7 }, { x: x + uy * s * 0.7, y: y - ux * s * 0.7 }], fill: '#1E88E5' };
};

/** water:4 — the water cycle: the sea, the sun, the cloud over the mountain, the rain, the river back to the sea. */
export const WATER_CYCLE_PIC: Labelling = {
  x0: 0, w: 186, h: 150, wide: true,
  shapes: [
    // the land with the mountain, its snow, the sea
    { pts: pts(64, 150, 74, 122, 96, 104, 126, 46, 150, 92, 186, 78, 186, 150), fill: '#A5D6A7' },
    { pts: pts(126, 46, 133, 60, 127, 57, 122, 62, 118.5, 60.5), fill: '#FFFFFF' },
    { pts: [...Array.from({ length: 21 }, (_, i) => ({ x: i * 4, y: 118 + 1.4 * Math.sin(i * 1.1) })), ...pts(80, 150, 0, 150)], fill: '#90CAF9' },
    // the river from the mountain to the sea
    { pts: pts(129, 66, 124, 82, 112, 96, 100, 108, 88, 118, 78, 124), w: 3.2, color: '#42A5F5' },
    // the sun
    { pts: circlePts(22, 24, 11), fill: '#FDD835' },
    ...Array.from({ length: 8 }, (_, k) => { const a = (k * Math.PI) / 4; return { pts: pts(22 + 14 * Math.cos(a), 24 + 14 * Math.sin(a), 22 + 19 * Math.cos(a), 24 + 19 * Math.sin(a)), w: 1.4, color: '#F9A825' }; }),
    // the vapour rising from the sea: wavy lines with arrowheads
    ...[22, 40, 58].flatMap((x) => [
      { pts: Array.from({ length: 13 }, (_, i) => ({ x: x + 2.4 * Math.sin(i * 1.05), y: 112 - i * 3.6 })), w: 1.1, color: '#1E88E5' } as Stroke,
      arrowHead(x + 2.4 * Math.sin(12 * 1.05), 112 - 12 * 3.6, 0, -1),
    ]),
    // up to the cloud
    { pts: pts(62, 56, 76, 40, 92, 30), w: 1.1, color: '#1E88E5' },
    arrowHead(92, 30, 16, -10),
    // the cloud and the rain over the mountain
    { pts: ell(108, 26, 14, 9), fill: '#ECEFF1' },
    { pts: ell(124, 20, 15, 11), fill: '#ECEFF1' },
    { pts: ell(140, 27, 14, 9), fill: '#ECEFF1' },
    { pts: ell(124, 30, 22, 7), fill: '#ECEFF1' },
    ...[[104, 40], [112, 44], [120, 40], [128, 44], [136, 40], [144, 44]].map(([x, y]) => ({ pts: pts(x, y, x - 2, y + 7), w: 1.2, color: WATER_BLUE })),
  ],
  targets: [
    { word: 'SE EVAPORĂ', at: [{ x: 58 + 2.4 * Math.sin(6 * 1.05), y: 112 - 6 * 3.6 }], side: 'right', box: { x: 68, y: 72 } },
    { word: 'SE FAC NORI', at: [{ x: 140, y: 22 }], side: 'right', box: { x: 144, y: 2 } },
    { word: 'PLOUĂ', at: [{ x: 143, y: 47 }], side: 'right', box: { x: 144, y: 54 } },
    { word: 'CURGE SPRE MARE', at: [{ x: 106, y: 102 }], side: 'right', box: { x: 112, y: 116 } },
  ],
};

const PLANET_Y = 57;
/** Name, centre x, radius, colour: from the Sun outwards, the sizes only hinted at. */
const PLANET_DISCS: [string, number, number, string][] = [
  ['MERCUR', 31, 3.4, '#9E9E9E'], ['VENUS', 45, 5.2, '#E6C27A'], ['PĂMÂNT', 61, 5.6, '#42A5F5'], ['MARTE', 76, 4.3, '#D4533B'],
  ['JUPITER', 100, 12.5, '#D9A066'], ['SATURN', 131, 10, '#E3C07B'], ['URANUS', 157, 7.4, '#80DEEA'], ['NEPTUN', 177, 7, '#3F51B5'],
];

/** space:4 — the eight planets in a row, the Sun at the left; the boxes above and under them, in turn. */
export const PLANETS_PIC: Labelling = {
  x0: 0, w: 186, h: 112, wide: true,
  shapes: [
    { pts: ell(-8, PLANET_Y, 26, 34).filter((q) => q.x >= 0), fill: '#FDD835' },
    ...PLANET_DISCS.map(([, x, r, fill]) => ({ pts: circlePts(x, PLANET_Y, r), fill })),
    // the continents of the Earth, the bands of Jupiter, the ring of Saturn
    { pts: ell(59.5, PLANET_Y - 1.5, 2.2, 3), fill: '#66BB6A' },
    { pts: ell(63.5, PLANET_Y + 2, 1.5, 1.8), fill: '#66BB6A' },
    { pts: pts(88.6, PLANET_Y - 4.5, 111.4, PLANET_Y - 4.5), w: 1.6, color: '#A1662F' },
    { pts: pts(88, PLANET_Y + 2.5, 112, PLANET_Y + 2.5), w: 1.6, color: '#A1662F' },
    { pts: [...ell(131, PLANET_Y, 16, 3.6, -14), ell(131, PLANET_Y, 16, 3.6, -14)[0]], w: 1.3, color: '#8D6E63' },
  ],
  targets: PLANET_DISCS.map(([word, x, r], i) => {
    const above = i % 2 === 0;
    return { word, at: [{ x, y: above ? PLANET_Y - r + 1 : PLANET_Y + r - 1 }], side: 'right' as const, box: { x: 3 + Math.floor(i / 2) * 46, y: above ? 3 : 97 } };
  }),
};

/** The drawings to label, by item: the instruction under the title; a wide drawing may have its own help line and a box to draw in under it. */
export const LABEL_SHEETS: Record<string, { pic: Labelling; instruction: string; help?: string; draw?: string }> = {
  'plant:1': { pic: PLANT, instruction: 'Scrie în fiecare căsuță numele părții plantei.' },
  'plant:2': { pic: TREE, instruction: 'Scrie în fiecare căsuță numele părții copacului.' },
  'plant:3': { pic: TULIP, instruction: 'Scrie în fiecare căsuță numele părții plantei.' },
  'body:1': { pic: BODY, instruction: 'Scrie în fiecare căsuță numele părții corpului.' },
  'body:2': { pic: FACE, instruction: 'Scrie în fiecare căsuță numele părții feței.' },
  'body:3': { pic: ORGANS_PIC, instruction: 'Scrie în fiecare căsuță numele organului.' },
  'water:4': { pic: WATER_CYCLE_PIC, instruction: 'Scrie în fiecare căsuță ce se întâmplă cu apa.', help: 'Soarele încălzește apa mării. Sus, unde este frig, vaporii se adună în nori. Poți decupa și lipi cuvintele.' },
  'space:4': { pic: PLANETS_PIC, instruction: 'Scrie numele fiecărei planete în căsuța ei.', help: 'De la Soare spre margine: Mercur, Venus, Pământ, Marte, Jupiter, Saturn, Uranus, Neptun.', draw: 'Desenează o rachetă care zboară spre planeta pe care ai vrea să o vezi de aproape.' },
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
  /** The top of the box to draw in under a wide drawing (the planets). */
  drawTop?: number;
  boxes: { word: string; x: number; y: number; w: number; h: number; to: Pt[]; from: Pt }[];
  bank: { word: string; x: number; y: number; w: number; h: number }[];
}

const BOX_W = 42;
const BOX_H = 13;

/** "plant" and "body" name the first sets, as before the others were added. */
const labelItem = (key: string) => (key === 'plant' || key === 'body' ? `${key}:1` : key);

/**
 * The drawing in the middle, the boxes on its sides at the height of their part, the word bank above; for a wide
 * drawing (the water cycle, the planets) the boxes are on the drawing, where the data puts them.
 */
export function labelLayout(key: string, top: number): LabelLayout {
  const item = labelItem(key);
  const pic = LABEL_SHEETS[item].pic;
  const bankH = 20;
  const areaTop = top + bankH + 6;
  const roomW = pic.wide ? W - 2 * M : W - 2 * M - 2 * BOX_W - 16;
  const roomH = BOTTOM - areaTop - 2;
  const scale = Math.min(roomW / pic.w, roomH / pic.h);
  const ox = (W - pic.w * scale) / 2 - pic.x0 * scale;
  // a drawing with a box to draw in under it starts at the top; the others are in the middle of the room
  const below = LABEL_SHEETS[item].draw;
  const oy = below ? areaTop : areaTop + (roomH - pic.h * scale) / 2;
  const at = (p: Pt) => ({ x: ox + p.x * scale, y: oy + p.y * scale });
  const boxes: LabelLayout['boxes'] = [];
  if (pic.wide) {
    // in the order of the data (the steps of the cycle, the planets from the Sun outwards)
    for (const t of pic.targets) {
      const to = t.at.map(at);
      const b = at(t.box!);
      // the line leaves the box from the middle of the side that faces its part
      const cx = b.x + BOX_W / 2;
      const cy = b.y + BOX_H / 2;
      const from = Math.abs(to[0].y - cy) > BOX_H / 2 ? { x: cx, y: to[0].y < cy ? b.y : b.y + BOX_H } : { x: to[0].x < cx ? b.x : b.x + BOX_W, y: cy };
      boxes.push({ word: t.word, x: b.x, y: b.y, w: BOX_W, h: BOX_H, to, from });
    }
  } else {
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
  }
  // the word bank: the words shuffled so that no word sits above its own box's place in the list
  const words = pic.targets.map((t) => t.word);
  const order = derangement(words.length, rng(seedOf(item === 'plant:1' || item === 'body:1' ? `label:${item.split(':')[0]}` : `label:${item}`)));
  const cardW = (W - 2 * M - 4 * (words.length - 1)) / words.length;
  const bank = order.map((k, i) => ({ word: words[k], x: M + i * (cardW + 4), y: top + 2, w: cardW, h: bankH - 4 }));
  return { ox, oy, scale, boxes, bank, ...(below ? { drawTop: oy + pic.h * scale + 8 } : {}) };
}

function labelPage(config: WorksheetConfig, item: string, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const sheet = LABEL_SHEETS[item];
  const pic = sheet.pic;
  const top = frame(ops, config, exploreTitle(item), sheet.instruction, sheet.help ?? 'Poți și să decupezi cuvintele de sus și să le lipești în căsuțe.');
  const lay = labelLayout(item, top);
  // one size for all the words of the bank
  const bankSize = Math.min(...lay.bank.map((b) => fitSize(b.word, 4.6, b.w - 4)));
  for (const b of lay.bank) {
    ops.push({ t: 'rect', x: b.x, y: b.y, w: b.w, h: b.h, rx: 2, fill: SOFT, stroke: '#94A3B8', strokeWidth: 0.4, dash: [1.4, 1] });
    ops.push({ t: 'text', x: b.x + b.w / 2, y: b.y + b.h / 2 + 1.6, text: b.word, size: bankSize, fill: INK, weight: 'bold', align: 'center' });
  }
  ops.push(...drawn(pic.shapes, lay.ox, lay.oy, lay.scale));
  if (sheet.draw && lay.drawTop !== undefined) {
    ops.push({ t: 'text', x: M, y: lay.drawTop + 4, text: sheet.draw, size: fitSize(sheet.draw, 4.4, W - 2 * M), fill: INK, weight: 'bold' });
    ops.push({ t: 'rect', x: M, y: lay.drawTop + 8, w: W - 2 * M, h: BOTTOM - lay.drawTop - 8, rx: 4, fill: PAPER, stroke: INK, strokeWidth: 0.45 });
  }
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
  const read = 'Un adult citește cuvintele, dacă este nevoie. Prima linie este exemplul.';
  if (kind === 'senses') {
    set = { title: EXPLORE_KIND_TITLES.senses, instruction: 'Unește fiecare organ de simț cu simțul lui.', help: read, left: SENSES.map(([p, c]) => ({ picture: p, caption: c })), right: SENSES.map(([, , w]) => ({ word: w })), names: SENSES.map(([, c, w]) => `${c} – ${lower(w)}`) };
  } else if (kind === 'baby') {
    const pairs = BABY_SETS[n - 1];
    set = { title: EXPLORE_KIND_TITLES.baby, instruction: 'Unește fiecare animal cu numele puiului său.', help: read, left: pairs.map(([p, c]) => ({ picture: p, caption: c })), right: pairs.map(([, , w]) => ({ word: w })), names: pairs.map(([, c, w]) => `${c} – ${lower(w)}`) };
  } else if (kind === 'weather') {
    set = { title: EXPLORE_KIND_TITLES.weather, instruction: 'Unește fiecare semn al vremii cu numele lui.', help: read, left: WEATHER.map(([p]) => ({ picture: p })), right: WEATHER.map(([, w]) => ({ word: w })), names: WEATHER.map(([, w]) => lower(w)) };
  } else if (kind === 'eat') {
    const pairs = EAT_SETS[n - 1];
    set = { title: EXPLORE_KIND_TITLES.eat, instruction: 'Unește fiecare animal cu hrana lui.', help: 'Spune ce mănâncă fiecare animal. Prima linie este exemplul.', left: pairs.map(([p, c]) => ({ picture: p, caption: c })), right: pairs.map(([, , q]) => ({ picture: q })), names: pairs.map(([, a, , b]) => `${a} – ${b}`) };
  } else if (kind === 'space') {
    set = { title: exploreTitle(item), instruction: 'Unește fiecare imagine cu numele ei.', help: read, left: SPACE_NAMES.map(([p]) => ({ picture: p })), right: SPACE_NAMES.map(([, w]) => ({ word: w })), names: SPACE_NAMES.map(([, w]) => `${w.charAt(0)}${lower(w.slice(1))}`) };
  } else {
    const wear = WEAR_SETS[n - 1];
    set = { title: wear.title, instruction: wear.instruction, help: wear.help, left: wear.pairs.map(([p]) => ({ picture: p })), right: wear.pairs.map(([, , q]) => ({ picture: q })), names: wear.pairs.map(([, a, , b]) => `${a} – ${b}`) };
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
  /** The sentence of each row („Cubul de gheață stă la soare.”), for „Ce se întâmplă cu apa?” and the like. */
  sentences?: string[];
  /** The two words of each row, where every row has its own („FIERBINTE” / „RECE”). */
  rowChoices?: Choice[][];
  /** The help line of the set, when it has its own. */
  help?: string;
}

const words = (labels: readonly string[]): Choice[] => labels.map((label) => ({ label, symbol: '' }));
const wordLook = (set: ChoiceSet): Rows => ({ set, look: set.choices.map(() => 'word' as const) });

/** A set of sentences as rows: the choices are words, or pictures when they have a symbol. */
function sentenceRows(s: SentenceSet): Rows {
  const rowChoices = s.rows.some((r) => r.options) ? s.rows.map((r) => words(r.options ?? [])) : undefined;
  const choices = rowChoices ? rowChoices[0] : s.choices;
  return {
    set: { title: s.title, instruction: s.instruction, choices, rows: s.rows.map((r) => ({ picture: r.picture, name: '', answer: r.answer })) },
    look: choices.map((c) => (c.symbol ? ('icon' as const) : ('word' as const))),
    sentences: s.rows.map((r) => r.text),
    ...(rowChoices ? { rowChoices } : {}),
    ...(s.help ? { help: s.help } : {}),
  };
}

const stateRows = (title: string, rows: readonly (readonly [string, string, number])[]): Rows => ({
  set: { title, instruction: 'Încercuiește cum este apa din fiecare imagine.', choices: words(WATER_STATES), rows: rows.map(([picture, name, answer]) => ({ picture, name, answer })) },
  look: ['word', 'word'],
});
const meltRows = (rows: [string, string, number][]): Rows => ({
  set: { title: EXPLORE_KIND_TITLES.melt, instruction: 'Citește și încercuiește ce se întâmplă cu apa.', choices: words(MELT_OPTIONS), rows: rows.map(([picture, , answer]) => ({ picture, name: '', answer })) },
  look: ['word', 'word', 'word', 'word'],
  sentences: rows.map(([, s]) => s),
});

/** The rows of a „circle the answer” sheet. */
export function choiceRows(item: string): Rows {
  const [kind, arg] = item.split(':') as [ExploreKind, string];
  const n = Number(arg);
  if (kind === 'home') return { set: HOME_SETS[n - 1], look: ['icon', 'icon', 'icon'] };
  if (kind === 'move') return { set: MOVE_SETS[n - 1], look: ['icon', 'icon', 'icon', 'wave'] };
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
  if (kind === 'water') return n === 1 ? stateRows(EXPLORE_KIND_TITLES.water, WATER_ROWS) : stateRows(EXPLORE_KIND_TITLES.water, WATER_ROWS_2);
  if (kind === 'melt') return meltRows(n === 1 ? MELT_ROWS : MELT_ROWS_MORE[n - 2]);
  if (kind === 'senses') return sentenceRows(SENSE_SETS[n - 2]);
  if (kind === 'weather') {
    if (n === 3) return sentenceRows(WEATHER_SAY);
    return wordLook({ title: exploreTitle(item), instruction: 'Încercuiește cum este vremea când ai nevoie de lucrul din imagine.', choices: words(['CALD', 'FRIG']), rows: WARM_COLD.map(([picture, name, answer]) => ({ picture, name, answer })) });
  }
  if (kind === 'cover') return wordLook(COVER_SETS[n - 1]);
  if (kind === 'tame') return wordLook(TAME_SETS[n - 1]);
  if (kind === 'alive') return wordLook(ALIVE_SETS[n - 2]);
  if (kind === 'food') return wordLook(FOOD_SETS[n - 1]);
  if (kind === 'mat') return wordLook(MAT_SETS[n - 1]);
  if (kind === 'recycle') return n === 3 ? sentenceRows(RECYCLE_SAY) : wordLook(RECYCLE_SETS[n - 1]);
  if (kind === 'day') return n === 1 ? wordLook(DAY_SET) : sentenceRows(DAY_SAY[n - 2]);
  return sentenceRows(n === 1 ? SPACE_DESCRIBE : SPACE_WHO);
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
  const { set, look, sentences, rowChoices, help: own } = choiceRows(item);
  const help = own ?? (sentences ? 'Un adult citește propozițiile, dacă este nevoie. Primul rând este exemplul.' : 'Un adult citește cuvintele, dacă este nevoie. Primul rând este exemplul.');
  const top = frame(ops, config, set.title, set.instruction, help);
  const lay = choiceLayout(item, top + 1);
  const labels = rowChoices ? rowChoices.flat() : set.choices;
  const labelSize = Math.min(...labels.map((c) => fitSize(c.label, look[0] !== 'word' ? 3.4 : set.choices.length === 2 ? 6 : 4.6, lay.rows[0].boxes[0].w - 6)));
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
    (rowChoices ? rowChoices[i] : set.choices).forEach((c, k) => {
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

/** (Every table of „Mediile de viață” has the five columns and eight rows of the first.) */
export function habitatLayout(top: number): TableLayout {
  const firstW = 52;
  const colW = (W - 2 * M - firstW) / HABITAT_SET.choices.length;
  const headH = 26;
  const rowH = Math.min(26, (BOTTOM - top - headH - 2) / HABITAT_SET.rows.length);
  return { x: M, y: top + 1, firstW, colW, headH, rowH };
}

function habitatPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const set = HABITAT_SETS[n - 1];
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

// ───────────────────────── a grid to circle in: „Unde este apă?”, „Ce este viu?” ─────────────────────────

const CIRCLE_SETS: Record<string, CircleSet> = { 'water:2': WATER_WHERE, 'alive:1': ALIVE_GRID };

export interface CirclePicture { picture: string; name: string; yes: boolean; cx: number; cy: number; size: number }

/** The twelve pictures of a grid, shuffled, with their places. */
export function circleGrid(item: string, top: number): CirclePicture[] {
  const all = shuffle(CIRCLE_SETS[item].pictures, rng(seedOf(item)));
  const cw = (W - 2 * M) / GRID_COLS;
  const ch = (BOTTOM - top) / GRID_ROWS;
  const size = Math.min(34, cw - 14, ch - 14);
  return all.map(([picture, name, yes], i) => ({ picture, name, yes, cx: M + (i % GRID_COLS + 0.5) * cw, cy: top + (Math.floor(i / GRID_COLS) + 0.5) * ch, size }));
}

function circlePage(config: WorksheetConfig, item: string, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const set = CIRCLE_SETS[item];
  const top = frame(ops, config, set.title, set.instruction, set.help);
  const grid = circleGrid(item, top + 2);
  const cw = (W - 2 * M) / GRID_COLS;
  const ch = (BOTTOM - top - 2) / GRID_ROWS;
  for (const p of grid) {
    ops.push({ t: 'rect', x: p.cx - cw / 2 + 2, y: p.cy - ch / 2 + 2, w: cw - 4, h: ch - 4, rx: 4, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.5 });
    ops.push(...iconOps(p.picture, p.cx, p.cy, p.size));
  }
  const first = grid.find((p) => p.yes)!;
  const r = first.size / 2 + 4;
  ops.push({ t: 'circle', cx: first.cx, cy: first.cy, r, stroke: '#E8913A', strokeWidth: 0.8 });
  exampleTag(ops, first.cx, first.cy + r + 3.5, 'center');
  adultNote(ops, `Imaginile, pe rânduri: ${grid.map((p) => p.name).join(', ')}.`);
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── „Cum cresc?”: the stages in order ─────────────────────────

/** A stage of a life: a Twemoji picture, or one of the drawn stages (DRAWN_STAGES), `size` mm across, centred on (cx, cy). */
export function stageOps(pic: string, cx: number, cy: number, size: number): DrawOp[] {
  if (!(DRAWN_STAGES as readonly string[]).includes(pic)) return iconOps(pic, cx, cy, size);
  const u = size / 36;
  const at = (x: number, y: number) => ({ x: cx + (x - 18) * u, y: cy + (y - 18) * u });
  const poly = (points: Pt[], fill: string, stroke = INK, strokeWidth = 0.35): DrawOp => ({ t: 'polygon', points, fill, stroke, strokeWidth });
  const oval = (x: number, y: number, rx: number, ry: number, rot = 0) => ell(at(x, y).x, at(x, y).y, rx * u, ry * u, rot);
  const stroke = (points: number[], color: string, w: number): DrawOp => ({ t: 'path', subpaths: [line(pts(...points).map((p) => at(p.x, p.y)))], stroke: color, strokeWidth: w * u, cap: 'round' });
  if (pic.startsWith('tree-')) return treeOps(pic.slice(5) as Season, cx, cy + size / 2, size);
  switch (pic) {
    case 'leaf-eggs':
      return [
        poly(oval(18, 18, 16, 9, -18), '#7CC35A', '#4E8F35'),
        stroke([3, 23, 33, 13], '#4E8F35', 0.9),
        ...[[11, 17], [15, 20], [18, 15], [22, 18], [25, 13], [20, 22], [13, 13]].map(([x, y]) => ({ t: 'circle', cx: at(x, y).x, cy: at(x, y).y, r: 1.5 * u, fill: '#FFF9C4', stroke: '#B8A13A', strokeWidth: 0.25 }) as DrawOp),
      ];
    case 'chrysalis':
      return [
        stroke([2, 7, 34, 4], '#7A5230', 1.8),
        poly(oval(9, 4.5, 5, 2.2, -8), '#7CC35A', '#4E8F35'),
        stroke([19, 5.6, 19, 10], '#5D4037', 0.5),
        poly(oval(19, 21, 5.5, 11.5), '#9CCC65', '#558B2F'),
        stroke([14.6, 16, 23.4, 17.5], '#558B2F', 0.5), stroke([14, 21, 24, 22.5], '#558B2F', 0.5), stroke([14.6, 26, 23.4, 27.5], '#558B2F', 0.5),
      ];
    case 'frog-eggs':
      return [
        poly(oval(18, 20, 17, 12), '#BBDEFB', '#64B5F6'),
        ...[[10, 18], [16, 14], [23, 15], [28, 20], [21, 22], [14, 24], [24, 27], [9, 24]].flatMap(([x, y]) => [
          { t: 'circle', cx: at(x, y).x, cy: at(x, y).y, r: 3 * u, fill: '#FFFFFF', stroke: '#90A4AE', strokeWidth: 0.25 } as DrawOp,
          { t: 'circle', cx: at(x, y).x, cy: at(x, y).y, r: 1.1 * u, fill: INK } as DrawOp,
        ]),
      ];
    case 'tadpole':
    case 'tadpole-legs': {
      const legs = pic === 'tadpole-legs';
      const tail: number[] = [];
      for (let i = 0; i <= 10; i++) tail.push(20 + i * 1.5, 19 + 2.4 * Math.sin(i * 0.9));
      return [
        poly(oval(18, 20, 17, 12), '#BBDEFB', '#64B5F6'),
        stroke(tail, '#4E5D3A', legs ? 2.2 : 2.8),
        ...(legs ? [stroke([15, 23, 12, 28, 9, 27], '#4E5D3A', 1.5), stroke([19, 23.5, 21, 28.5, 24, 28], '#4E5D3A', 1.5)] : []),
        poly(oval(13, 19, legs ? 8 : 7, legs ? 6 : 5.4), legs ? '#7CB342' : '#5D6D3F'),
        { t: 'circle', cx: at(9.5, 17).x, cy: at(9.5, 17).y, r: 1.3 * u, fill: '#FFFFFF', stroke: INK, strokeWidth: 0.2 },
        { t: 'circle', cx: at(9.3, 17).x, cy: at(9.3, 17).y, r: 0.6 * u, fill: INK },
      ];
    }
    default:
      // a pumpkin seed on the soil
      return [
        poly([at(2, 27), at(8, 25), at(18, 24), at(28, 25), at(34, 27), at(34, 32), at(2, 32)], '#D9B58C', '#A1887F'),
        poly(oval(18, 17, 5.5, 9, 28), '#F5E6C4', '#A1887F'),
        stroke([15.5, 12, 20.5, 22], '#C9B58A', 0.6),
      ];
  }
}

export interface CycleRow { cycle: Cycle; /** `order[i]`: the stage drawn at place i, left to right. */ order: number[]; cells: { x: number; y: number; w: number; h: number; box: { x: number; y: number; s: number } }[] }

/** Three rows of four pictures, each row in another order than its own. */
export function cycleLayout(n: number, top: number): CycleRow[] {
  const set = CYCLE_SETS[n - 1];
  const rowH = (BOTTOM - top - 2) / set.length;
  const gap = 5;
  const x0 = M + 12;
  const w = (W - M - x0 - 3 * gap) / 4;
  return set.map((cycle, r) => {
    const y = top + 2 + r * rowH;
    const order = derangement(4, rng(seedOf(`cycle:${n}:${r}`)));
    return { cycle, order, cells: order.map((_, i) => ({ x: x0 + i * (w + gap), y: y + 3, w, h: rowH - 6, box: { x: x0 + i * (w + gap) + w / 2 - 6, y: y + rowH - 3 - 15, s: 12 } })) };
  });
}

function cyclePage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const top = frame(ops, config, exploreTitle(`cycle:${n}`), 'Scrie 1, 2, 3, 4 în căsuțe: ce este întâi, ce urmează, ce este la sfârșit.', 'Spune ce vezi în fiecare imagine. În fiecare rând, căsuța cu 1 este completată: de acolo începi.');
  cycleLayout(n, top).forEach((row, r) => {
    const cy = row.cells[0].y + row.cells[0].h / 2;
    ops.push({ t: 'circle', cx: M + 4.5, cy, r: 4, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.5 });
    ops.push({ t: 'text', x: M + 4.5, y: cy + 1.5, text: String(r + 1), size: 4.2, fill: INK, weight: 'bold', align: 'center' });
    row.cells.forEach((c, i) => {
      const stage = row.cycle.stages[row.order[i]];
      ops.push({ t: 'rect', x: c.x, y: c.y, w: c.w, h: c.h, rx: 4, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.6 });
      const size = Math.min(c.w - 10, c.h - c.box.s - 12);
      ops.push(...stageOps(stage[0], c.x + c.w / 2, c.y + 4 + size / 2, size));
      ops.push({ t: 'rect', x: c.box.x, y: c.box.y, w: c.box.s, h: c.box.s, rx: 2, fill: PAPER, stroke: INK, strokeWidth: 0.6 });
      if (row.order[i] === 0) ops.push({ t: 'text', x: c.box.x + c.box.s / 2, y: c.box.y + c.box.s / 2 + 2.6, text: '1', size: 7.2, fill: '#E8913A', weight: 'bold', align: 'center' });
    });
  });
  adultNote(ops, 'Copilul spune, în ordine, cum crește sau cum se schimbă ce vede în fiecare rând.');
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── observation sheets: the weather calendar, the plant diary ─────────────────────────

const WRITE_LINE = '#8DA0B8';

/** The signs of the weather with their names, in a row: what the child draws in the calendar. */
function weatherLegend(ops: DrawOp[], y: number, h: number): void {
  const cw = (W - 2 * M) / WEATHER.length;
  ops.push({ t: 'rect', x: M, y, w: W - 2 * M, h, rx: 3, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.5 });
  WEATHER.forEach(([picture, word], i) => {
    const cx = M + (i + 0.5) * cw;
    ops.push(...iconOps(picture, cx, y + 2 + (h - 9) / 2, h - 10));
    ops.push({ t: 'text', x: cx, y: y + h - 2.4, text: word, size: 3.2, fill: INK, weight: 'bold', align: 'center' });
  });
}

/** A line to write on after its words: „Zile cu soare: ____”. Returns the x after the line. */
function countLine(ops: DrawOp[], x: number, y: number, label: string, width: number): number {
  ops.push({ t: 'text', x, y, text: label, size: 4.2, fill: INK, weight: 'bold' });
  const lx = x + (label.length * 4.2 * 0.56) + 2;
  ops.push({ t: 'line', x1: lx, y1: y + 1, x2: lx + width, y2: y + 1, stroke: WRITE_LINE, strokeWidth: 0.4 });
  return lx + width;
}

export interface ObsGrid { x: number; y: number; cols: number; rows: number; cw: number; ch: number; head: number }

/** The table of an observation sheet: the days of a school week, the days of a month, or the four drawings of the plant. */
export function obsGrid(n: number, top: number): ObsGrid {
  if (n === 1) return { x: M, y: top + 3, cols: 5, rows: 1, cw: (W - 2 * M) / 5, ch: 62, head: 10 };
  if (n === 2) return { x: M, y: top + 12, cols: 7, rows: 5, cw: (W - 2 * M) / 7, ch: 27.5, head: 8 };
  return { x: M, y: top + 14, cols: 2, rows: 2, cw: (W - 2 * M) / 2, ch: 97, head: 0 };
}

function obsPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const title = exploreTitle(`obs:${n}`);
  if (n === 3) {
    const top = frame(ops, config, title, 'Pune o sămânță în pământ, ud-o și desenează ce vezi în zilele scrise.', 'Numără de fiecare dată frunzele. Planta are nevoie de apă, de lumină și de căldură.');
    ops.push({ t: 'text', x: M, y: top + 7, text: 'Am pus în pământ o sămânță de', size: 4.4, fill: INK, weight: 'bold' });
    ops.push({ t: 'line', x1: M + 72, y1: top + 8, x2: W - M, y2: top + 8, stroke: WRITE_LINE, strokeWidth: 0.4 });
    const g = obsGrid(n, top);
    PLANT_LOG.forEach((label, i) => {
      const x = g.x + (i % 2) * g.cw + (i % 2 ? 3 : 0);
      const y = g.y + Math.floor(i / 2) * g.ch;
      const w = g.cw - 3;
      ops.push({ t: 'text', x, y: y + 4.6, text: label, size: 4.2, fill: INK, weight: 'bold' });
      ops.push({ t: 'rect', x, y: y + 7, w, h: g.ch - 24, rx: 4, fill: PAPER, stroke: INK, strokeWidth: 0.5 });
      // the soil at the bottom of the box
      ops.push({ t: 'line', x1: x + 4, y1: y + g.ch - 24, x2: x + w - 4, y2: y + g.ch - 24, stroke: '#A1887F', strokeWidth: 0.8, dash: [2, 1.4] });
      countLine(ops, x, y + g.ch - 9.5, 'Câte frunze are?', 22);
    });
    adultNote(ops, 'Zilele sunt orientative: desenați când se vede o schimbare. La sfârșit, copilul povestește cum a crescut planta.');
    footer(ops, tier);
    return { width: W, height: H, ops };
  }
  const top = frame(
    ops, config, title,
    n === 1 ? 'În fiecare zi, privește pe fereastră și desenează semnul vremii.' : 'În fiecare zi, desenează în căsuță semnul vremii.',
    n === 1 ? 'Semnele vremii sunt sub tabel. Vineri, numără zilele și completează.' : 'Scrie mai întâi data în colțul fiecărei căsuțe. La sfârșitul lunii, numără zilele și completează.',
  );
  const g = obsGrid(n, top);
  if (n === 2) {
    ops.push({ t: 'text', x: M, y: top + 6.5, text: 'Luna:', size: 4.4, fill: INK, weight: 'bold' });
    ops.push({ t: 'line', x1: M + 14, y1: top + 7.5, x2: M + 80, y2: top + 7.5, stroke: WRITE_LINE, strokeWidth: 0.4 });
  }
  const days = n === 1 ? [...WEEK_DAYS] : ['L', 'Ma', 'Mi', 'J', 'V', 'S', 'D'];
  const w = g.cols * g.cw;
  const h = g.head + g.rows * g.ch;
  ops.push({ t: 'rect', x: g.x, y: g.y, w, h, rx: 2, fill: PAPER });
  ops.push({ t: 'rect', x: g.x, y: g.y, w, h: g.head, rx: 2, fill: SOFT });
  days.forEach((d, c) => {
    const x = g.x + c * g.cw;
    if (c) ops.push({ t: 'line', x1: x, y1: g.y, x2: x, y2: g.y + h, stroke: INK, strokeWidth: 0.4 });
    ops.push({ t: 'text', x: x + g.cw / 2, y: g.y + g.head / 2 + 1.6, text: d, size: n === 1 ? 4.2 : 4, fill: INK, weight: 'bold', align: 'center' });
    // the month: a small box for the date in the corner of every cell
    if (n === 2) for (let r = 0; r < g.rows; r++) ops.push({ t: 'rect', x: x + 1.2, y: g.y + g.head + r * g.ch + 1.2, w: 6.5, h: 5.5, rx: 1, stroke: '#94A3B8', strokeWidth: 0.3 });
  });
  for (let r = 0; r < g.rows; r++) ops.push({ t: 'line', x1: g.x, y1: g.y + g.head + r * g.ch, x2: g.x + w, y2: g.y + g.head + r * g.ch, stroke: INK, strokeWidth: r ? 0.4 : 0.6 });
  ops.push({ t: 'rect', x: g.x, y: g.y, w, h, rx: 2, stroke: INK, strokeWidth: 0.6 });
  let y = g.y + h + 6;
  const legendH = n === 1 ? 30 : 24;
  ops.push({ t: 'text', x: M, y: y + 3, text: 'Semnele vremii', size: 4.2, fill: INK, weight: 'bold' });
  weatherLegend(ops, y + 6, legendH);
  y += 6 + legendH + 12;
  let x = countLine(ops, M, y, 'Zile cu soare:', 16) + 8;
  x = countLine(ops, x, y, 'Zile cu ploaie:', 16) + 8;
  countLine(ops, x, y, 'Zile cu vânt:', 16);
  if (n === 1) {
    countLine(ops, M, y + 13, 'Cum a fost vremea cel mai des?', 80);
    ops.push({ t: 'text', x: M, y: y + 27, text: 'Desenează cum te-ai îmbrăcat într-o zi din această săptămână.', size: 4.2, fill: INK, weight: 'bold' });
    ops.push({ t: 'rect', x: M, y: y + 31, w: W - 2 * M, h: BOTTOM - y - 31, rx: 4, fill: PAPER, stroke: INK, strokeWidth: 0.45 });
  }
  adultNote(ops, 'Vorbiți în fiecare zi despre vreme: ce se vede pe cer, dacă este cald sau frig, cum ne îmbrăcăm.');
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── answers and entry point ─────────────────────────

const LABEL_KINDS: Partial<Record<ExploreKind, number[]>> = { plant: [1, 2, 3], body: [1, 2, 3], water: [4], space: [4] };
const isLabelItem = (kind: ExploreKind, n: number) => !!LABEL_KINDS[kind]?.includes(n);
const isMatchItem = (kind: ExploreKind, n: number) => (kind === 'senses' && n === 1) || kind === 'baby' || (kind === 'weather' && n === 1) || kind === 'wear' || kind === 'eat' || (kind === 'space' && n === 2);

/** The answers of an „Explorarea mediului” item; null for the observation sheets, which have nothing to check. */
export function exploreKeySection(item: string): KeySection | null {
  if (!isExploreItem(item)) return null;
  const [kind, arg] = item.split(':') as [ExploreKind, string];
  const n = Number(arg);
  const title = exploreLabel(item);
  if (kind === 'obs') return null;
  if (isLabelItem(kind, n)) {
    const boxes = labelLayout(item, 0).boxes;
    return { title, entries: boxes.map((b) => b.word), perLine: boxes.length > 5 ? 4 : 5, numbered: true };
  }
  if (isMatchItem(kind, n)) return { title, entries: matchSet(item).set.names, perLine: 2, numbered: true };
  if (kind === 'habitat') {
    const set = HABITAT_SETS[n - 1];
    // the first table keeps the answers as it has always printed them
    const word = n === 1 ? lower : proper;
    return { title, entries: set.rows.map((r) => `${r.name} – ${word(set.choices[r.answer].label)}`), perLine: 2, numbered: true };
  }
  if (kind === 'season' && isSeasonGrid(n)) {
    const grid = seasonGrid(n, 0);
    const yes = grid.filter((p) => p.season === gridSeason(n)).map((p) => p.name);
    return { title, entries: [`Se încercuiesc (${yes.length}): ${yes.join(', ')}.`], perLine: 1 };
  }
  if (item in CIRCLE_SETS) {
    const grid = circleGrid(item, 0);
    const yes = grid.filter((p) => p.yes).map((p) => p.name);
    return { title, entries: [`Se încercuiesc (${yes.length}): ${yes.join(', ')}.`, `Nu se încercuiesc: ${grid.filter((p) => !p.yes).map((p) => p.name).join(', ')}.`], perLine: 1 };
  }
  if (kind === 'cycle') {
    // the numbers as they are written in the boxes, left to right, and the stages in their order
    return { title, entries: cycleLayout(n, 0).map((row) => `${row.cycle.name}: ${row.order.map((k) => k + 1).join(', ')} (${row.cycle.stages.map((s) => s[1]).join(', ')})`), perLine: 1, numbered: true };
  }
  const { set, sentences, rowChoices } = choiceRows(item);
  const answer = (i: number) => (kind === 'space' ? proper : lower)((rowChoices ? rowChoices[i] : set.choices)[set.rows[i].answer].label);
  // a sentence with „…” is given whole („Soarele este fierbinte”), another one with its answer after a dash
  const entry = (i: number) => (!sentences ? `${set.rows[i].name} – ${answer(i)}` : sentences[i].includes('…') ? sentences[i].replace('…', answer(i)).replace(/\.$/, '') : `${sentences[i].replace(/\.$/, '')} – ${answer(i)}`);
  return { title, entries: set.rows.map((_, i) => entry(i)), perLine: sentences ? 1 : 2, numbered: true };
}

/** The page of one „Explorarea mediului” item, or null when the item is not one. */
export function buildExplorePage(config: WorksheetConfig, item: string, tier: Tier): PageOps | null {
  if (!isExploreItem(item)) return null;
  const [kind, arg] = item.split(':') as [ExploreKind, string];
  const n = Number(arg);
  if (isLabelItem(kind, n)) return labelPage(config, item, tier);
  if (isMatchItem(kind, n)) return matchPage(config, item, tier);
  if (kind === 'habitat') return habitatPage(config, n, tier);
  if (kind === 'season' && isSeasonGrid(n)) return gridPage(config, n, tier);
  if (item in CIRCLE_SETS) return circlePage(config, item, tier);
  if (kind === 'cycle') return cyclePage(config, n, tier);
  if (kind === 'obs') return obsPage(config, n, tier);
  return choicePage(config, item, tier);
}
