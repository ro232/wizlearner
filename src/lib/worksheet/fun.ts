import type { Pt } from '@/lib/glyphs/types';
import { themeById } from '@/lib/themes';

/**
 * Data of the fun preschool sheets (see fun-pages.ts): „Colorează după cod”, „Labirint”,
 * „Găsește diferențele”, „Urmărește linia”, „Umbre”.
 *
 * Every picture of a maze, a scene, a path or a shadow sheet is a Twemoji picture (quoted here, so
 * scripts/build-hint-icons.mjs draws it into icons.json). The pictures to colour are drawn here as
 * polygons: each region is one closed shape with its code, so the regions are clean when printed.
 *
 * The sentences on the sheets are written out whole for every set („Ajută iepurașul să ajungă la
 * morcov.”): no form is derived.
 */

export const FUN_SETS = 6;
export type FunKind = 'color' | 'colsum' | 'maze' | 'diff' | 'trace' | 'shadow';
export const FUN_KINDS: FunKind[] = ['color', 'colsum', 'maze', 'diff', 'trace', 'shadow'];

const FUN_ITEM = /^(color|colsum|maze|diff|trace|shadow):[1-6]$/;

export function isFunItem(item: string): boolean {
  return FUN_ITEM.test(item);
}

// ───────────────────────── geometry helpers (100-unit picture boxes) ─────────────────────────

const r2 = (v: number) => Math.round(v * 100) / 100;

/** An ellipse as a polygon, rotated by `rot` degrees around its centre. */
export function ellipse(cx: number, cy: number, rx: number, ry: number, rot = 0, n = 40): Pt[] {
  const a = (rot * Math.PI) / 180;
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    const x = rx * Math.cos(t);
    const y = ry * Math.sin(t);
    return { x: r2(cx + x * Math.cos(a) - y * Math.sin(a)), y: r2(cy + x * Math.sin(a) + y * Math.cos(a)) };
  });
}

export function rectPts(x: number, y: number, w: number, h: number): Pt[] {
  return [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];
}

const P = (...xy: number[]): Pt[] => Array.from({ length: xy.length / 2 }, (_, i) => ({ x: xy[2 * i], y: xy[2 * i + 1] }));

/** A five-pointed star (point up). */
export function starPts(cx: number, cy: number, R: number, r: number): Pt[] {
  return Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const d = i % 2 ? r : R;
    return { x: r2(cx + d * Math.cos(a)), y: r2(cy + d * Math.sin(a)) };
  });
}

/** A band whose top edge is a wave, from `top` (± amp) down to `bottom`, across 0–width. */
function waveBand(width: number, top: number, bottom: number, amp: number, period: number): Pt[] {
  const pts: Pt[] = [];
  for (let x = 0; x <= width; x += 2) pts.push({ x, y: r2(top + amp * Math.sin((x / period) * Math.PI * 2)) });
  return [...pts, { x: width, y: bottom }, { x: 0, y: bottom }];
}

/** A strand of seaweed: a wavy band, wide at its base (`y0`), narrow at its tip (`y1`). */
function seaweed(cx: number, y0: number, y1: number): Pt[] {
  const left: Pt[] = [];
  const right: Pt[] = [];
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const y = y0 + (y1 - y0) * t;
    const x = cx + 3 * Math.sin(t * Math.PI * 2.2);
    const half = 4 - 2.6 * t;
    left.push({ x: r2(x - half), y: r2(y) });
    right.push({ x: r2(x + half), y: r2(y) });
  }
  return [...left, ...right.reverse()];
}

// ───────────────────────── „Colorează după cod” ─────────────────────────

export type ColourKey = 'rosu' | 'albastru' | 'galben' | 'verde' | 'maro' | 'portocaliu';
/** The colour names as printed next to the swatch (the print may be black and white). */
export const COLOUR_NAMES: Record<ColourKey, string> = { rosu: 'roșu', albastru: 'albastru', galben: 'galben', verde: 'verde', maro: 'maro', portocaliu: 'portocaliu' };
export const COLOUR_FILLS: Record<ColourKey, string> = { rosu: '#E53935', albastru: '#42A5F5', galben: '#FDD835', verde: '#66BB6A', maro: '#8D6E63', portocaliu: '#FB8C00' };

export interface ColourRegion {
  /** What the region is, for the answers page („acoperișul”). */
  name: string;
  /** 1–5: the colour of the legend. */
  code: number;
  pts: Pt[];
}

/** Lines and dots drawn over the regions (an eye, the rays of the sun): never closed, never coloured. */
export type Decor = { t: 'line'; pts: Pt[]; w?: number } | { t: 'dot'; x: number; y: number; r: number };

export interface ColourPicture {
  /** After „Colorează după cod: ” („peștele”), and on the picker. */
  title: string;
  short: string;
  /** The box of the drawing, in picture units. */
  w: number;
  h: number;
  /** Colour of each code: palette[code − 1]. */
  palette: ColourKey[];
  /** In drawing order: a later region covers an earlier one. */
  regions: ColourRegion[];
  decor: Decor[];
}

function sunRays(cx: number, cy: number, r0: number, r1: number): Decor[] {
  return Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    return { t: 'line' as const, pts: [{ x: r2(cx + r0 * Math.cos(a)), y: r2(cy + r0 * Math.sin(a)) }, { x: r2(cx + r1 * Math.cos(a)), y: r2(cy + r1 * Math.sin(a)) }] };
  });
}

const PETALS = Array.from({ length: 6 }, (_, k) => {
  const a = (k * 60 - 90) * (Math.PI / 180);
  return ellipse(r2(50 + 12.5 * Math.cos(a)), r2(26 + 12.5 * Math.sin(a)), 9.5, 6.8, k * 60 - 90);
});

export const COLOUR_PICTURES: ColourPicture[] = [
  {
    title: 'peștele', short: 'pește', w: 100, h: 80,
    palette: ['portocaliu', 'albastru', 'galben', 'verde'],
    regions: [
      { name: 'apa', code: 2, pts: rectPts(0, 0, 100, 66) },
      { name: 'nisipul', code: 3, pts: waveBand(100, 64, 80, 1.8, 26) },
      { name: 'algele', code: 4, pts: seaweed(9, 72, 32) },
      { name: 'algele', code: 4, pts: seaweed(90, 72, 38) },
      { name: 'coada', code: 3, pts: P(36, 33, 16, 18, 17, 48) },
      { name: 'aripioarele', code: 3, pts: P(47, 21, 57, 8, 68, 21) },
      { name: 'aripioarele', code: 3, pts: P(52, 45, 60, 55, 65, 45) },
      { name: 'corpul peștelui', code: 1, pts: ellipse(57, 33, 23, 14) },
    ],
    decor: [{ t: 'dot', x: 70, y: 29, r: 2.2 }, { t: 'line', pts: P(76.5, 37.5, 79, 36.5) }],
  },
  {
    title: 'căsuța', short: 'casă', w: 100, h: 80,
    palette: ['rosu', 'albastru', 'galben', 'verde', 'maro'],
    regions: [
      { name: 'cerul', code: 2, pts: rectPts(0, 0, 100, 58) },
      { name: 'iarba', code: 4, pts: rectPts(0, 56, 100, 24) },
      { name: 'soarele', code: 3, pts: ellipse(84, 15, 7.5, 7.5) },
      { name: 'hornul', code: 5, pts: rectPts(61, 17, 8, 18) },
      { name: 'acoperișul', code: 1, pts: P(23, 40, 50, 14, 77, 40) },
      { name: 'peretele', code: 3, pts: rectPts(29, 40, 42, 32) },
      { name: 'fereastra', code: 2, pts: rectPts(35, 47, 13, 12) },
      { name: 'ușa', code: 5, pts: rectPts(55, 51, 11, 21) },
    ],
    decor: [...sunRays(84, 15, 9.8, 13), { t: 'dot', x: 63.2, y: 62, r: 0.9 }],
  },
  {
    title: 'fluturele', short: 'fluture', w: 100, h: 80,
    palette: ['rosu', 'albastru', 'galben', 'verde', 'maro'],
    regions: [
      { name: 'aripile de jos', code: 3, pts: ellipse(34, 56, 15, 11, 25) },
      { name: 'aripile de jos', code: 3, pts: ellipse(66, 56, 15, 11, -25) },
      { name: 'aripile de sus', code: 1, pts: ellipse(30, 31, 21, 15, -20) },
      { name: 'aripile de sus', code: 1, pts: ellipse(70, 31, 21, 15, 20) },
      { name: 'bulinele mari', code: 2, pts: ellipse(26, 29, 6.5, 6.5) },
      { name: 'bulinele mari', code: 2, pts: ellipse(74, 29, 6.5, 6.5) },
      { name: 'bulinele mici', code: 4, pts: ellipse(31, 60, 5, 5) },
      { name: 'bulinele mici', code: 4, pts: ellipse(69, 60, 5, 5) },
      { name: 'corpul fluturelui', code: 5, pts: ellipse(50, 45, 5, 21) },
      { name: 'capul fluturelui', code: 5, pts: ellipse(50, 19, 6, 6) },
    ],
    decor: [
      { t: 'line', pts: P(48, 13.5, 41, 4) }, { t: 'dot', x: 41, y: 4, r: 1.6 },
      { t: 'line', pts: P(52, 13.5, 59, 4) }, { t: 'dot', x: 59, y: 4, r: 1.6 },
    ],
  },
  {
    title: 'floarea', short: 'floare', w: 100, h: 92,
    palette: ['rosu', 'albastru', 'galben', 'verde', 'maro'],
    regions: [
      { name: 'frunzele', code: 4, pts: ellipse(36, 53, 12, 5.5, -25) },
      { name: 'frunzele', code: 4, pts: ellipse(64, 47, 12, 5.5, 25) },
      { name: 'tulpina', code: 4, pts: rectPts(46.5, 34, 7, 30) },
      ...PETALS.map((pts) => ({ name: 'petalele', code: 1, pts })),
      { name: 'mijlocul florii', code: 3, pts: ellipse(50, 26, 7.5, 7.5) },
      { name: 'ghiveciul', code: 5, pts: P(33, 69, 67, 69, 62, 91, 38, 91) },
      { name: 'marginea ghiveciului', code: 2, pts: rectPts(29, 62, 42, 7.5) },
    ],
    decor: [],
  },
  {
    title: 'barca', short: 'barcă', w: 100, h: 80,
    palette: ['rosu', 'albastru', 'galben', 'verde', 'maro'],
    regions: [
      { name: 'soarele', code: 3, pts: ellipse(15, 14, 8, 8) },
      { name: 'marea', code: 2, pts: waveBand(100, 59, 80, 2, 24) },
      { name: 'barca', code: 5, pts: P(16, 53, 84, 53, 72, 69, 28, 69) },
      { name: 'pânza mare', code: 1, pts: P(53, 12, 53, 50, 81, 50) },
      { name: 'pânza mică', code: 3, pts: P(47, 19, 47, 50, 24, 50) },
      { name: 'steagul', code: 4, pts: P(50.6, 2, 50.6, 11, 63, 6.5) },
    ],
    decor: [
      ...sunRays(15, 14, 10.5, 14.5),
      { t: 'line', pts: P(50, 2, 50, 53), w: 1.6 },
      { t: 'line', pts: P(70, 22, 73, 19, 76, 22) }, { t: 'line', pts: P(80, 14, 83, 11, 86, 14) },
    ],
  },
  {
    title: 'bradul de Crăciun', short: 'brad (iarna)', w: 100, h: 88,
    palette: ['rosu', 'albastru', 'galben', 'verde', 'maro'],
    regions: [
      { name: 'trunchiul', code: 5, pts: rectPts(44, 70, 12, 12) },
      { name: 'bradul', code: 4, pts: P(50, 42, 15, 72, 85, 72) },
      { name: 'bradul', code: 4, pts: P(50, 26, 21, 56, 79, 56) },
      { name: 'bradul', code: 4, pts: P(50, 11, 27, 40, 73, 40) },
      { name: 'globurile roșii', code: 1, pts: ellipse(37, 64, 4.5, 4.5) },
      { name: 'globurile roșii', code: 1, pts: ellipse(61, 48, 4.5, 4.5) },
      { name: 'globurile albastre', code: 2, pts: ellipse(61, 65, 4.5, 4.5) },
      { name: 'globurile albastre', code: 2, pts: ellipse(41, 46, 4.5, 4.5) },
      { name: 'globurile albastre', code: 2, pts: ellipse(53, 31, 4.5, 4.5) },
      { name: 'steaua', code: 3, pts: starPts(50, 10, 8.5, 3.8) },
      { name: 'cadoul roșu', code: 1, pts: rectPts(17, 73, 18, 14) },
      { name: 'cadoul albastru', code: 2, pts: rectPts(65, 75, 16, 12) },
    ],
    decor: [],
  },
];

// ───────────────────────── „Labirint” ─────────────────────────

export interface MazeSet {
  short: string;
  /** Cells across and down. */
  size: number;
  from: string;
  to: string;
  /** The instruction, written out whole. */
  sentence: string;
}

export const MAZE_SETS: MazeSet[] = [
  { short: 'iepuraș · ușor', size: 6, from: '🐰', to: '🥕', sentence: 'Ajută iepurașul să ajungă la morcov.' },
  { short: 'albină · mediu', size: 9, from: '🐝', to: '🌼', sentence: 'Ajută albina să ajungă la floare.' },
  { short: 'cățel · greu', size: 12, from: '🐕', to: '🦴', sentence: 'Ajută cățelul să ajungă la os.' },
  { short: 'Moș Crăciun · ușor', size: 6, from: '🎅', to: '🛷', sentence: 'Ajută-l pe Moș Crăciun să ajungă la sanie.' },
  { short: 'pinguin · mediu', size: 9, from: '🐧', to: '🐟', sentence: 'Ajută pinguinul să ajungă la pește.' },
  { short: 'maimuță · greu', size: 12, from: '🐒', to: '🍌', sentence: 'Ajută maimuța să ajungă la banană.' },
];

// ───────────────────────── „Găsește diferențele” ─────────────────────────

export interface SceneObject {
  e: string;
  /** Its name with the definite article, for the answers („norul”). */
  name: string;
  x: number;
  y: number;
  s: number;
}

/** What is different in the second picture; `desc` is the line of the answers page, written out whole. */
export type SceneDiff =
  | { t: 'missing'; i: number; desc: string }
  | { t: 'changed'; i: number; e: string; desc: string }
  | { t: 'moved'; i: number; x: number; y: number; desc: string };

export interface Scene {
  short: string;
  /** After „Găsește diferențele: ”. */
  title: string;
  ground: 'meadow' | 'sea' | 'snow';
  objects: SceneObject[];
  /** What is different in the second picture (3–5). */
  diffs: SceneDiff[];
}

const o = (e: string, name: string, x: number, y: number, s: number): SceneObject => ({ e, name, x, y, s });

/** Scenes in a 100 × 56 box: sky above y = 34, the ground under it. */
export const SCENES: Scene[] = [
  {
    short: 'curte · 3', title: 'în curte', ground: 'meadow',
    objects: [o('☀️', 'soarele', 10, 9, 12), o('☁️', 'norul', 40, 9, 13), o('🏠', 'casa', 26, 30, 24), o('🌳', 'copacul', 84, 26, 26), o('🐶', 'cățelul', 54, 44, 13), o('🌷', 'laleaua', 8, 47, 9), o('⚽', 'mingea', 72, 48, 9), o('🦋', 'fluturele', 60, 18, 9)],
    diffs: [
      { t: 'missing', i: 1, desc: 'Lipsește norul.' },
      { t: 'changed', i: 4, e: '🐱', desc: 'O pisică în loc de cățel.' },
      { t: 'moved', i: 7, x: 60, y: 29, desc: 'Fluturele s-a mutat mai jos.' },
    ],
  },
  {
    short: 'mare · 3', title: 'la mare', ground: 'sea',
    objects: [o('☀️', 'soarele', 88, 9, 12), o('🐟', 'peștele', 30, 30, 12), o('🐬', 'delfinul', 66, 30, 13), o('🦀', 'crabul', 16, 49, 10), o('🏖️', 'umbrela de plajă', 52, 46, 14), o('🐚', 'scoica', 84, 50, 8), o('☁️', 'norul', 54, 8, 12)],
    diffs: [
      { t: 'changed', i: 1, e: '🐙', desc: 'O caracatiță în loc de pește.' },
      { t: 'missing', i: 5, desc: 'Lipsește scoica.' },
      { t: 'moved', i: 0, x: 74, y: 10, desc: 'Soarele s-a mutat spre stânga.' },
    ],
  },
  {
    short: 'parc · 4', title: 'în parc', ground: 'meadow',
    objects: [o('🌳', 'copacul', 14, 24, 26), o('🪁', 'zmeul', 44, 10, 11), o('☁️', 'norul', 78, 8, 13), o('🚲', 'bicicleta', 38, 45, 15), o('🐦', 'pasărea', 62, 22, 9), o('🛝', 'toboganul', 78, 40, 18), o('🎈', 'balonul', 58, 42, 10), o('🌷', 'laleaua', 93, 50, 8)],
    diffs: [
      { t: 'missing', i: 1, desc: 'Lipsește zmeul.' },
      { t: 'changed', i: 3, e: '🛴', desc: 'O trotinetă în loc de bicicletă.' },
      { t: 'moved', i: 4, x: 52, y: 24, desc: 'Pasărea s-a mutat spre stânga.' },
      { t: 'missing', i: 7, desc: 'Lipsește laleaua.' },
    ],
  },
  {
    short: 'fermă · 4', title: 'la fermă', ground: 'meadow',
    objects: [o('🏡', 'casa', 17, 26, 22), o('🐄', 'vaca', 50, 40, 16), o('🐑', 'oaia', 76, 46, 13), o('🐔', 'găina', 31, 48, 10), o('🚜', 'tractorul', 84, 25, 16), o('☀️', 'soarele', 52, 9, 12), o('🌻', 'floarea-soarelui', 6, 48, 9), o('🐖', 'porcul', 60, 51, 9)],
    diffs: [
      { t: 'changed', i: 2, e: '🐐', desc: 'O capră în loc de oaie.' },
      { t: 'missing', i: 3, desc: 'Lipsește găina.' },
      { t: 'moved', i: 5, x: 66, y: 9, desc: 'Soarele s-a mutat spre dreapta.' },
      { t: 'missing', i: 6, desc: 'Lipsește floarea-soarelui.' },
    ],
  },
  {
    short: 'pădure · 5', title: 'în pădure', ground: 'meadow',
    objects: [o('🌲', 'bradul', 13, 24, 22), o('🌳', 'copacul', 87, 24, 22), o('🦊', 'vulpea', 32, 43, 13), o('🦔', 'ariciul', 60, 49, 10), o('🍄', 'ciuperca', 76, 49, 9), o('🐿️', 'veverița', 50, 31, 11), o('🦉', 'bufnița', 67, 12, 10), o('🐝', 'albina', 29, 14, 8), o('🌙', 'luna', 45, 8, 9)],
    diffs: [
      { t: 'missing', i: 4, desc: 'Lipsește ciuperca.' },
      { t: 'changed', i: 2, e: '🐻', desc: 'Un urs în loc de vulpe.' },
      { t: 'moved', i: 6, x: 57, y: 14, desc: 'Bufnița s-a mutat spre stânga.' },
      { t: 'missing', i: 8, desc: 'Lipsește luna.' },
      { t: 'changed', i: 7, e: '🦋', desc: 'Un fluture în loc de albină.' },
    ],
  },
  {
    short: 'iarna · 5', title: 'iarna', ground: 'snow',
    objects: [o('⛄', 'omul de zăpadă', 32, 38, 20), o('🎄', 'bradul', 76, 30, 26), o('🛷', 'sania', 54, 48, 12), o('🏠', 'casa', 12, 22, 18), o('❄️', 'fulgul', 46, 12, 9), o('🎁', 'cadoul', 93, 50, 9), o('🐧', 'pinguinul', 10, 46, 11), o('⭐', 'steaua', 60, 8, 8)],
    diffs: [
      { t: 'missing', i: 5, desc: 'Lipsește cadoul.' },
      { t: 'changed', i: 6, e: '🦌', desc: 'Un ren în loc de pinguin.' },
      { t: 'moved', i: 4, x: 33, y: 11, desc: 'Fulgul s-a mutat spre stânga.' },
      { t: 'missing', i: 7, desc: 'Lipsește steaua.' },
      { t: 'changed', i: 2, e: '⛸️', desc: 'O patină în loc de sanie.' },
    ],
  },
];

/**
 * „Altă variantă”: the other pictures a picture of a scene can be swapped for, by scene and by the index
 * of the picture, each with its line of the answers page written out whole (no form is derived). A swap
 * is never a picture the scene already has (see fun.test.ts).
 */
export const SCENE_SWAPS: Record<number, [string, string][]>[] = [
  // în curte
  {
    0: [['🌙', 'Luna în loc de soare.']],
    3: [['🌲', 'Un brad în loc de copac.']],
    4: [['🐱', 'O pisică în loc de cățel.'], ['🐇', 'Un iepure în loc de cățel.']],
    5: [['🌼', 'O floare galbenă în loc de lalea.']],
    6: [['🎈', 'Un balon în loc de minge.']],
    7: [['🐝', 'O albină în loc de fluture.'], ['🐦', 'O pasăre în loc de fluture.']],
  },
  // la mare
  {
    1: [['🐙', 'O caracatiță în loc de pește.'], ['🐢', 'O broască țestoasă în loc de pește.']],
    2: [['🦈', 'Un rechin în loc de delfin.'], ['🐳', 'O balenă în loc de delfin.']],
    3: [['🐌', 'Un melc în loc de crab.']],
    5: [['⭐', 'O stea în loc de scoică.']],
  },
  // în parc
  {
    0: [['🌲', 'Un brad în loc de copac.']],
    1: [['✈️', 'Un avion în loc de zmeu.']],
    3: [['🛴', 'O trotinetă în loc de bicicletă.']],
    4: [['🦋', 'Un fluture în loc de pasăre.'], ['🐝', 'O albină în loc de pasăre.']],
    6: [['⚽', 'O minge în loc de balon.']],
    7: [['🌼', 'O floare galbenă în loc de lalea.']],
  },
  // la fermă
  {
    1: [['🐎', 'Un cal în loc de vacă.']],
    2: [['🐐', 'O capră în loc de oaie.']],
    3: [['🦆', 'O rață în loc de găină.']],
    4: [['🚗', 'O mașină în loc de tractor.']],
    7: [['🐕', 'Un câine în loc de porc.']],
  },
  // în pădure
  {
    2: [['🐻', 'Un urs în loc de vulpe.'], ['🐺', 'Un lup în loc de vulpe.']],
    3: [['🐌', 'Un melc în loc de arici.']],
    4: [['🌷', 'O lalea în loc de ciupercă.']],
    5: [['🐇', 'Un iepure în loc de veveriță.']],
    6: [['🐦', 'O pasăre în loc de bufniță.']],
    7: [['🦋', 'Un fluture în loc de albină.']],
  },
  // iarna
  {
    0: [['🎅', 'Moș Crăciun în loc de omul de zăpadă.']],
    2: [['⛸️', 'O patină în loc de sanie.']],
    4: [['☁️', 'Un nor în loc de fulg.']],
    5: [['🔔', 'Un clopoțel în loc de cadou.']],
    6: [['🦌', 'Un ren în loc de pinguin.']],
    7: [['🌙', 'Luna în loc de stea.']],
  },
];

// ───────────────────────── „Urmărește linia” ─────────────────────────

export type TracePattern = 'horizontal' | 'waves' | 'zigzag' | 'cups' | 'castle' | 'loops';

export interface TraceSet {
  short: string;
  patterns: TracePattern[];
  /** From → to, one per row. */
  pairs: [string, string][];
}

export const TRACE_SETS: TraceSet[] = [
  { short: 'linii drepte', patterns: ['horizontal'], pairs: [['🐰', '🥕'], ['🐝', '🌼'], ['🐕', '🦴'], ['🐒', '🍌'], ['🐦', '🌳']] },
  { short: 'valuri', patterns: ['waves'], pairs: [['🦋', '🌷'], ['🐟', '🐚'], ['🚗', '🏠'], ['🐿️', '🌰'], ['🐧', '🐟']] },
  { short: 'zigzag', patterns: ['zigzag'], pairs: [['🚀', '⭐'], ['🐸', '🍃'], ['🐔', '🌽'], ['🐭', '🧀'], ['🐱', '🥛']] },
  { short: 'cupe, castel', patterns: ['cups', 'castle'], pairs: [['🐌', '🍃'], ['🚂', '🏠'], ['🐻', '🍯'], ['🐄', '🌾'], ['🐞', '🌷']] },
  { short: 'bucle', patterns: ['loops'], pairs: [['🐝', '🌻'], ['🪁', '☁️'], ['🐦', '🪺'], ['🐿️', '🌳'], ['🦋', '🌼']] },
  { short: 'iarna', patterns: ['horizontal', 'waves', 'zigzag', 'cups', 'loops'], pairs: [['🎅', '🎄'], ['🦌', '🛷'], ['⛄', '🥕'], ['🐧', '🐟'], ['🐻‍❄️', '🧊']] },
];

/**
 * „Altă variantă”: the pairs the rows of a variant are drawn from. Sets 1–5 share the pairs of all five
 * (each still a story: the rabbit goes to the carrot); the winter set has its own.
 */
export const TRACE_PAIRS: [string, string][] = TRACE_SETS.slice(0, 5).flatMap((t) => t.pairs).filter((p, i, all) => all.findIndex((q) => q[0] === p[0] && q[1] === p[1]) === i);
export const TRACE_WINTER_PAIRS: [string, string][] = [...TRACE_SETS[5].pairs, ['🎅', '🎁'], ['⛄', '🧣'], ['🐧', '🧊'], ['🦌', '🎄']];

// ───────────────────────── „Umbre” ─────────────────────────

export interface ShadowSet {
  short: string;
  title: string;
  /** Picture and its name (for the answers). */
  pictures: [string, string][];
}

const CRACIUN = themeById('craciun');

/** „BRAD” → „brad”; a proper name keeps a capital on each word („MOȘ CRĂCIUN” → „Moș Crăciun”). */
function themeName(word: string, proper?: boolean): string {
  const lower = word.toLocaleLowerCase('ro');
  return proper ? lower.replace(/(^|\s)(\p{L})/gu, (_, sp: string, ch: string) => sp + ch.toLocaleUpperCase('ro')) : lower;
}

export const SHADOW_SETS: ShadowSet[] = [
  { short: 'animale', title: 'animale', pictures: [['🐘', 'elefant'], ['🦒', 'girafă'], ['🐌', 'melc'], ['🐇', 'iepure'], ['🐓', 'cocoș'], ['🐄', 'vacă']] },
  { short: 'fructe, legume', title: 'fructe și legume', pictures: [['🍌', 'banană'], ['🍐', 'pară'], ['🥕', 'morcov'], ['🍇', 'struguri'], ['🌽', 'porumb'], ['🍉', 'pepene']] },
  { short: 'transport', title: 'mijloace de transport', pictures: [['🚲', 'bicicletă'], ['✈️', 'avion'], ['🚁', 'elicopter'], ['⛵', 'barcă'], ['🚂', 'tren'], ['🚀', 'rachetă']] },
  { short: 'jucării', title: 'jucării și obiecte', pictures: [['🪁', 'zmeu'], ['🎈', 'balon'], ['🧸', 'ursuleț'], ['☂️', 'umbrelă'], ['🎸', 'chitară'], ['🛴', 'trotinetă']] },
  { short: 'sălbatice', title: 'animale sălbatice', pictures: [['🦋', 'fluture'], ['🐢', 'țestoasă'], ['🐿️', 'veveriță'], ['🐊', 'crocodil'], ['🦘', 'cangur'], ['🦀', 'crab']] },
  // the „Crăciun” theme of the group sheets (themes.ts): the same six pictures
  { short: 'Crăciun', title: 'de Crăciun', pictures: (CRACIUN?.words ?? []).map((w) => [w.emoji, themeName(w.word, w.proper)] as [string, string]) },
];

/**
 * „Altă variantă”: more pictures of each set's kind, to draw six from. Only pictures whose shadow is
 * a shape of its own (a whole animal, not a face; no boat on a band of water). `alike` lists the pictures
 * whose shadows resemble each other: a page takes at most one of each list.
 */
export const SHADOW_POOLS: { more: [string, string][]; alike: string[][] }[] = [
  { more: [['🐎', 'cal'], ['🐈', 'pisică'], ['🐕', 'câine'], ['🐖', 'porc'], ['🦆', 'rață'], ['🐐', 'capră'], ['🐒', 'maimuță']], alike: [['🐄', '🐖'], ['🐕', '🐐']] },
  { more: [['🍓', 'căpșună'], ['🍍', 'ananas'], ['🍒', 'cireșe'], ['🍆', 'vânătă'], ['🫑', 'ardei'], ['🍎', 'măr'], ['🧄', 'usturoi']], alike: [['🍆', '🍌', '🥕'], ['🍎', '🍓', '🫑', '🧄', '🍐']] },
  { more: [['🚗', 'mașină'], ['🚌', 'autobuz'], ['🚜', 'tractor'], ['🚢', 'vapor'], ['🚑', 'ambulanță'], ['🪂', 'parașută']], alike: [['🚗', '🚌', '🚑'], ['⛵', '🚢']] },
  { more: [['🥁', 'tobă'], ['🎺', 'trompetă'], ['🔔', 'clopoțel'], ['🧹', 'mătură'], ['✂️', 'foarfecă'], ['🪣', 'găleată'], ['🎩', 'pălărie'], ['🪜', 'scară']], alike: [['🥁', '🪣', '🎩']] },
  { more: [['🦔', 'arici'], ['🦉', 'bufniță'], ['🐍', 'șarpe'], ['🦈', 'rechin'], ['🐙', 'caracatiță'], ['🦢', 'lebădă'], ['🐧', 'pinguin'], ['🦏', 'rinocer']], alike: [['🦉', '🐧']] },
  { more: [['⛄', 'om de zăpadă'], ['❄️', 'fulg de zăpadă'], ['🕯️', 'lumânare'], ['🍬', 'bomboană'], ['🧣', 'fular'], ['⛸️', 'patină']], alike: [['⭐', '❄️']] },
];
