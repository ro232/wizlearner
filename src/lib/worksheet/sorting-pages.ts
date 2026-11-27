import type { DrawOp, PageOps, Pt } from '@/lib/glyphs/types';
import type { Tier, WorksheetConfig } from '@/types';
import { iconOps } from '@/lib/hints/icons';
import { madeWith, BRAND_NAME } from '@/lib/brand';
import { textWidthMm, wrapText } from '@/lib/book/text';
import { INK, ACCENT, PAPER, MUTED } from './rows';
import { CATEGORY_FAMILY, CATEGORY_NAMES, GROUP_SYMBOLS, obj, objectsOf, type SortCategory, type SortObject } from './sorting';
import { currentVariant, vkey } from './variant';

/**
 * Sorting, grouping and spatial orientation: full-page picture activities, one page per item,
 * in the „Jocuri” category next to the phonology sheets (see activities.ts):
 *
 * - "sort:1–6"  Sortează — join each picture to its group box (fruit / vegetables, pets / wild
 *               animals, water / land / air, big / small, circle / square / triangle, clothes / toys);
 * - "odd:1–6"   Ce nu se potrivește? — six rows of four pictures, cross out the one from another group
 *               (sets 1–3: a picture of another kind of thing; 4–6: of the neighbouring group);
 * - "group:1–6" Grupează și numără — mixed pictures, count each kind, write the number in the table;
 * - "pos:1–6"   Orientare în spațiu — 1–2: a table and a box (pe, sub, deasupra, în, stânga, dreapta),
 *               3–4: a 3 × 3 grid (corners, above, under, left, right, between, middle), with three
 *               pictures to circle for each question; 5–6: „Desenează … deasupra casei” in six boxes.
 *
 * Everything is seeded by the item and the variant of the sheet („Altă variantă”, variant.ts), so the
 * preview and the PDF are the same sheet every time. The layouts are computed by the exported functions
 * (sortLayout, oddRows, groupSet, sceneLayout, gridLayout, drawPanels), which the tests read to check
 * the answers against the drawing. Every variant is drawn from the same pools under the same rules.
 */

export const SORTING_SETS = 6;
const SET_NUMBERS = Array.from({ length: SORTING_SETS }, (_, i) => String(i + 1));

export type SortingKind = 'sort' | 'odd' | 'group' | 'pos';
export const SORTING_KINDS: SortingKind[] = ['sort', 'odd', 'group', 'pos'];
export const SORTING_KIND_TITLES: Record<SortingKind, string> = {
  sort: 'Sortează',
  odd: 'Ce nu se potrivește?',
  group: 'Grupează și numără',
  pos: 'Orientare în spațiu',
};

const SORTING_ITEM = /^(sort|odd|group|pos):[1-6]$/;

export function isSortingItem(item: string): boolean {
  return SORTING_ITEM.test(item);
}

/** Every item, in picker order. */
export function sortingItems(): string[] {
  return SORTING_KINDS.flatMap((k) => SET_NUMBERS.map((n) => `${k}:${n}`));
}

/** The short name of a set, for its button in the picker. */
export function sortingShortLabel(item: string): string {
  const [kind, arg] = item.split(':') as [SortingKind, string];
  const n = Number(arg);
  if (kind === 'sort') return SORT_SETS[n - 1]?.short ?? arg;
  if (kind === 'pos') return POS_SHORT[n - 1] ?? arg;
  if (kind === 'group') return GROUP_SETS[n - 1]?.short ?? arg;
  return arg;
}

export function sortingLabel(item: string): string {
  const [kind, arg] = item.split(':') as [SortingKind, string];
  const title = SORTING_KIND_TITLES[kind] ?? kind;
  if (kind === 'odd') return `${title} (${arg})`;
  return `${title}: ${sortingShortLabel(item)}`;
}

// ───────────────────────── seeded randomness ─────────────────────────

function seedOf(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619);
  return h >>> 0;
}

function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(xs: readonly T[], rand: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const pickOne = <T>(xs: readonly T[], rand: () => number): T => xs[Math.floor(rand() * xs.length)];

// ───────────────────────── page frame ─────────────────────────

const W = 210;
const H = 297;
const M = 12;
/** Bottom of the activity area: the line under it holds the note for the adult, then the footer. */
const BOTTOM = H - M - 20;
const CELL_STROKE = '#E6DECD';
const SOFT = '#FBF7EE';

/** The same header as the other games (activities.ts, phonology-pages.ts). */
function frame(ops: DrawOp[], config: WorksheetConfig, title: string, instruction: string, help?: string): number {
  ops.push({ t: 'text', x: M, y: M + 6.5, text: title, size: 6.5, fill: INK, weight: 'bold' });
  ops.push({ t: 'text', x: M, y: M + 14.5, text: `Nume: ${config.childName?.trim() || '______________'}     Data: ____________`, size: 3.6, fill: '#334155' });
  ops.push({ t: 'text', x: W - M, y: M + 6, text: BRAND_NAME, size: 3.2, fill: MUTED, weight: 'bold', align: 'right' });
  ops.push({ t: 'line', x1: M, y1: M + 18.5, x2: W - M, y2: M + 18.5, stroke: ACCENT, strokeWidth: 0.6 });
  ops.push({ t: 'text', x: M, y: M + 28, text: instruction, size: 4.6, fill: INK, weight: 'bold' });
  if (!help) return M + 34;
  ops.push({ t: 'text', x: M, y: M + 34.5, text: help, size: 3.6, fill: '#334155' });
  return M + 39;
}

/** One line for the adult under the activity, shrunk to the width of the page. */
function adultNote(ops: DrawOp[], text: string): void {
  const size = Math.min(2.8, (2.8 * (W - 2 * M)) / Math.max(1, textWidthMm(text, 2.8) * 1.04));
  ops.push({ t: 'text', x: M, y: BOTTOM + 7, text, size, fill: MUTED });
}

function footer(ops: DrawOp[], tier: Tier): void {
  if (tier === 'free') ops.push({ t: 'text', x: W - M, y: H - M + 2, text: madeWith('ro'), size: 2.6, fill: '#94a3b8', align: 'right' });
}

/** A text no wider than `room` mm: the given size, or smaller. */
function fitSize(text: string, size: number, room: number): number {
  return Math.min(size, (size * room) / Math.max(1, textWidthMm(text, size) * 1.06));
}

function exampleTag(ops: DrawOp[], x: number, y: number, align: 'left' | 'right' | 'center' = 'left'): void {
  ops.push({ t: 'text', x, y, text: 'exemplu', size: 2.8, fill: MUTED, align });
}

// ───────────────────────── drawn shapes ─────────────────────────

export type ShapeKind = 'circle' | 'square' | 'triangle';
const SHAPE_COLOURS = ['#DD2E44', '#3B88C3', '#FDCB58', '#78B159'];

export function shapeOps(kind: ShapeKind, cx: number, cy: number, size: number, fill: string | undefined, stroke = INK, strokeWidth = 0.6): DrawOp {
  const r = size / 2;
  if (kind === 'circle') return { t: 'circle', cx, cy, r, fill, stroke, strokeWidth };
  if (kind === 'square') return { t: 'rect', x: cx - r * 0.9, y: cy - r * 0.9, w: r * 1.8, h: r * 1.8, fill, stroke, strokeWidth };
  const pts: Pt[] = [{ x: cx, y: cy - r }, { x: cx + r * 1.05, y: cy + r * 0.8 }, { x: cx - r * 1.05, y: cy + r * 0.8 }];
  return { t: 'polygon', points: pts, fill, stroke, strokeWidth };
}

// ───────────────────────── „Sortează” ─────────────────────────

interface SortGroupDef {
  /** The label in the box, one string per line (capitals: children start reading with them). */
  label: string[];
  /** A picture on the box (a symbol, never one of the pictures to sort). */
  symbol?: string;
  /** The outline of the shape, for the shape sheet. */
  shape?: ShapeKind;
  cat?: SortCategory;
}

interface SortSetDef {
  /** After „Sortează: ” in the title. */
  title: string;
  /** On the picker button. */
  short: string;
  by: 'category' | 'size' | 'shape';
  groups: SortGroupDef[];
}

export const SORT_SETS: SortSetDef[] = [
  { title: 'fructe și legume', short: 'fructe, legume', by: 'category', groups: [{ label: ['FRUCTE'], cat: 'fructe' }, { label: ['LEGUME'], cat: 'legume' }] },
  {
    title: 'animale domestice și sălbatice', short: 'animale', by: 'category',
    groups: [{ label: ['ANIMALE', 'DOMESTICE'], cat: 'domestice', symbol: GROUP_SYMBOLS.domestice }, { label: ['ANIMALE', 'SĂLBATICE'], cat: 'salbatice', symbol: GROUP_SYMBOLS.salbatice }],
  },
  {
    title: 'pe apă, pe uscat sau în aer', short: 'apă, uscat, aer', by: 'category',
    groups: [{ label: ['ÎN AER'], cat: 'aer', symbol: GROUP_SYMBOLS.aer }, { label: ['PE USCAT'], cat: 'uscat', symbol: GROUP_SYMBOLS.uscat }, { label: ['PE APĂ'], cat: 'apa', symbol: GROUP_SYMBOLS.apa }],
  },
  { title: 'mari și mici', short: 'mari, mici', by: 'size', groups: [{ label: ['MARI'] }, { label: ['MICI'] }] },
  { title: 'după formă', short: 'forme', by: 'shape', groups: [{ label: ['CERCURI'], shape: 'circle' }, { label: ['PĂTRATE'], shape: 'square' }, { label: ['TRIUNGHIURI'], shape: 'triangle' }] },
  { title: 'haine și jucării', short: 'haine, jucării', by: 'category', groups: [{ label: ['HAINE'], cat: 'haine' }, { label: ['JUCĂRII'], cat: 'jucarii' }] },
];

export interface SortPicture {
  /** The picture to draw (emoji), or a shape for the shape sheet. */
  picture?: string;
  shape?: ShapeKind;
  colour?: string;
  /** Its name, for the adult. */
  word: string;
  /** The index of its group in the set's groups. */
  group: number;
  /** Drawn size as a share of the full picture size (the size sheet: 1 or 0.45). */
  scale: number;
}

const SIZE_OBJECTS = ['minge', 'măr', 'stea', 'floare', 'pește', 'balon', 'inimă', 'pară'];

/** The pictures of a sorting page, top to bottom: four per group (three with three groups). */
export function sortPictures(n: number, variant = currentVariant()): SortPicture[] {
  const def = SORT_SETS[n - 1];
  const rand = rng(seedOf(vkey(`sort:${n}`, variant)));
  const per = def.groups.length === 2 ? 4 : 3;
  let pics: SortPicture[] = [];
  if (def.by === 'category') {
    def.groups.forEach((g, gi) => {
      for (const o of shuffle(objectsOf(g.cat!), rand).slice(0, per)) pics.push({ picture: o.picture, word: o.word, group: gi, scale: 1 });
    });
  } else if (def.by === 'size') {
    // the same four pictures, once big and once small: only the drawn size tells them apart
    for (const w of shuffle(SIZE_OBJECTS, rand).slice(0, per)) {
      const o = obj(w);
      pics.push({ picture: o.picture, word: o.word, group: 0, scale: 1 });
      pics.push({ picture: o.picture, word: o.word, group: 1, scale: 0.45 });
    }
  } else {
    // shapes in every colour and two sizes, so neither the colour nor the size gives the answer
    const colours = shuffle(SHAPE_COLOURS, rand);
    def.groups.forEach((g, gi) => {
      for (let k = 0; k < per; k++) pics.push({ shape: g.shape, colour: colours[(gi + k) % colours.length], word: g.label[0].toLocaleLowerCase('ro'), group: gi, scale: k === 1 ? 0.7 : 0.95 });
    });
  }
  // shuffled, but never three of one group in a row (no pattern to follow instead of thinking)
  for (let tries = 0; tries < 50; tries++) {
    pics = shuffle(pics, rand);
    if (!pics.some((p, i) => i >= 2 && pics[i - 1].group === p.group && pics[i - 2].group === p.group)) break;
  }
  return pics;
}

interface Box { x: number; y: number; w: number; h: number }

export interface SortLayout {
  pictures: (SortPicture & { cx: number; cy: number; size: number; dot: Pt })[];
  boxes: (Box & { group: number })[];
}

/** Where everything goes on a sorting page (`top`: the top of the activity area). */
export function sortLayout(n: number, top: number, variant = currentVariant()): SortLayout {
  const def = SORT_SETS[n - 1];
  const pics = sortPictures(n, variant);
  const rowH = (BOTTOM - top) / pics.length;
  const size = Math.min(21, rowH - 5);
  if (def.groups.length === 2) {
    // the pictures in a column in the middle, a group box on each side: a line never crosses a picture
    const bw = 52;
    const cx = W / 2;
    return {
      pictures: pics.map((p, i) => {
        const cy = top + (i + 0.5) * rowH;
        return { ...p, cx, cy, size, dot: { x: cx + (p.group === 0 ? -1 : 1) * (size / 2 + 5), y: cy } };
      }),
      boxes: [
        { group: 0, x: M, y: top + 1, w: bw, h: BOTTOM - top - 2 },
        { group: 1, x: W - M - bw, y: top + 1, w: bw, h: BOTTOM - top - 2 },
      ],
    };
  }
  // three groups: the pictures in a column on the left, the boxes stacked on the right
  const cx = M + 8 + size / 2;
  const bw = 78;
  const gap = 4;
  const bh = (BOTTOM - top - 2 - 2 * gap) / 3;
  return {
    pictures: pics.map((p, i) => {
      const cy = top + (i + 0.5) * rowH;
      return { ...p, cx, cy, size, dot: { x: cx + size / 2 + 5, y: cy } };
    }),
    boxes: def.groups.map((_, gi) => ({ group: gi, x: W - M - bw, y: top + 1 + gi * (bh + gap), w: bw, h: bh })),
  };
}

const SORT_HELP: Record<SortSetDef['by'], string> = {
  category: 'Spune numele imaginii, apoi trage linia până la grupa ei.',
  size: 'Privește cât de mare este imaginea, apoi trage linia.',
  shape: 'Spune numele formei, apoi trage linia până la grupa ei.',
};
const BOX_FILLS = ['#EFF6FF', '#F0FDF4', '#FFF7ED'];
const BOX_STROKES = ['#3B82F6', '#22C55E', '#F97316'];

function sortPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const def = SORT_SETS[n - 1];
  const top = frame(ops, config, def.by === 'shape' ? `Sortează ${def.title}` : `Sortează: ${def.title}`, 'Unește fiecare imagine cu grupa ei.', `${SORT_HELP[def.by]} Prima linie este exemplul.`);
  const layout = sortLayout(n, top + 2);
  const two = def.groups.length === 2;

  for (const b of layout.boxes) {
    const g = def.groups[b.group];
    ops.push({ t: 'rect', x: b.x, y: b.y, w: b.w, h: b.h, rx: 4, fill: BOX_FILLS[b.group], stroke: BOX_STROKES[b.group], strokeWidth: 0.8 });
    const lines = g.label;
    const fs = Math.min(5.6, ...lines.map((l) => fitSize(l, 5.6, b.w - 8)));
    // label and symbol together, in the middle of the box (two groups) or at its top (three groups)
    const symbolSize = two ? 26 : Math.min(24, b.h - lines.length * (fs + 1.5) - 12);
    const hasSymbol = Boolean(g.symbol || g.shape);
    const blockH = lines.length * (fs + 1.5) + (hasSymbol ? symbolSize + 5 : 0);
    let y = two ? b.y + b.h / 2 - blockH / 2 : b.y + b.h / 2 - blockH / 2;
    for (const l of lines) {
      y += fs + 1.5;
      ops.push({ t: 'text', x: b.x + b.w / 2, y: y - 1.5, text: l, size: fs, fill: INK, weight: 'bold', align: 'center' });
    }
    if (g.symbol) ops.push(...iconOps(g.symbol, b.x + b.w / 2, y + 4 + symbolSize / 2, symbolSize));
    if (g.shape) ops.push(shapeOps(g.shape, b.x + b.w / 2, y + 4 + symbolSize / 2, symbolSize * 0.8, PAPER, INK, 0.9));
  }

  layout.pictures.forEach((p, i) => {
    ops.push({ t: 'rect', x: p.cx - p.size / 2 - 2.5, y: p.cy - p.size / 2 - 1.5, w: p.size + 5, h: p.size + 3, rx: 3, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.4 });
    const s = p.size * p.scale;
    if (p.picture) ops.push(...iconOps(p.picture, p.cx, p.cy, s));
    else if (p.shape) ops.push(shapeOps(p.shape, p.cx, p.cy, s * 0.85, p.colour));
    // a dot on each side the child can start the line from (one side with three groups)
    const dots = two ? [-1, 1] : [1];
    for (const side of dots) ops.push({ t: 'circle', cx: p.cx + side * (p.size / 2 + 5), cy: p.cy, r: 1.2, fill: INK });
    if (i === 0) {
      // the example line: from the dot to the edge of its group box
      const b = layout.boxes[p.group];
      const toX = two ? (p.group === 0 ? b.x + b.w : b.x) : b.x;
      const toY = two ? p.cy : b.y + b.h / 2;
      ops.push({ t: 'line', x1: p.dot.x, y1: p.dot.y, x2: toX, y2: toY, stroke: ACCENT, strokeWidth: 0.7, dash: [1.6, 1.2] });
      if (two) exampleTag(ops, (p.dot.x + toX) / 2, p.cy - 2, 'center');
      else exampleTag(ops, p.dot.x + 3, p.cy - 2.5);
    }
  });
  if (def.by === 'category') adultNote(ops, `Imaginile, de sus în jos: ${layout.pictures.map((p) => p.word).join(', ')}.`);
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── „Ce nu se potrivește?” ─────────────────────────

export interface OddRow {
  /** Four pictures; exactly one (at `intruder`) is from another category than the other three. */
  objects: SortObject[];
  intruder: number;
  /** The category of the three. */
  cat: SortCategory;
}

const ODD_CATEGORIES: SortCategory[] = ['fructe', 'legume', 'domestice', 'salbatice', 'apa', 'uscat', 'aer', 'haine', 'jucarii', 'instrumente'];
/** Categories with a neighbour in their family (the „close” rows, sets 4–6). */
const CLOSE_CATEGORIES: SortCategory[] = ['fructe', 'legume', 'domestice', 'salbatice', 'apa', 'uscat', 'aer'];

/**
 * True when the colours point at another picture than the intruder: three pictures of one colour
 * and a fourth, not the intruder, of another. A child could then cross out by colour.
 */
export function colourMisleads(objects: SortObject[], intruder: number): boolean {
  for (let k = 0; k < objects.length; k++) {
    if (k === intruder) continue;
    const rest = objects.filter((_, i) => i !== k);
    if (rest.every((o) => o.color === rest[0].color) && objects[k].color !== rest[0].color) return true;
  }
  return false;
}

/** True when a picture of the row also fits the group of another one (a kite among things that fly). */
export function secondGroupLink(objects: SortObject[]): boolean {
  return objects.some((a) => objects.some((b) => a !== b && (a.alsoLike ?? []).includes(b.cat)));
}

/** Six rows: sets 1–3 put a picture of another kind of thing among three of a kind; 4–6 a neighbour. */
export function oddRows(n: number, variant = currentVariant()): OddRow[] {
  const rand = rng(seedOf(vkey(`odd:${n}`, variant)));
  const close = n >= 4;
  const mains = shuffle(close ? CLOSE_CATEGORIES : ODD_CATEGORIES, rand);
  const used = new Set<string>();
  const pool = (c: SortCategory) => objectsOf(c).filter((o) => !used.has(o.word));
  const rows: OddRow[] = [];
  for (let r = 0; r < 6; r++) {
    // the next category that still has three unused pictures (each category once, then again)
    let row: OddRow | null = null;
    for (let m = 0; m < mains.length && !row; m++) {
      const cat = mains[(r + m) % mains.length];
      if (pool(cat).length < 3) continue;
      const others = ODD_CATEGORIES.filter((c) => c !== cat && pool(c).length > 0 && (close ? CATEGORY_FAMILY[c] === CATEGORY_FAMILY[cat] : CATEGORY_FAMILY[c] !== CATEGORY_FAMILY[cat]));
      for (let tries = 0; tries < 40 && others.length && !row; tries++) {
        const three = shuffle(pool(cat), rand).slice(0, 3);
        const odd = pickOne(pool(pickOne(others, rand)), rand);
        const at = Math.floor(rand() * 4);
        const objects = [...three];
        objects.splice(at, 0, odd);
        if (!colourMisleads(objects, at) && !secondGroupLink(objects)) row = { objects, intruder: at, cat };
      }
    }
    if (!row) throw new Error(`odd:${n} row ${r + 1}: no row without a colour trap`);
    row.objects.forEach((o) => used.add(o.word));
    rows.push(row);
  }
  return rows;
}

function oddPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const top = frame(ops, config, 'Ce nu se potrivește?', 'Taie cu un X imaginea care nu se potrivește.', 'Pe fiecare rând, trei imagini sunt din aceeași grupă. Primul rând este exemplul.');
  const rows = oddRows(n);
  const gy = top + 2;
  const rowH = (BOTTOM - gy) / rows.length;
  const left = M + 11;
  const cw = (W - M - left) / 4;
  const size = Math.min(26, rowH - 8, cw - 10);
  rows.forEach((row, r) => {
    const y = gy + r * rowH;
    ops.push({ t: 'circle', cx: M + 4.5, cy: y + rowH / 2, r: 4, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.5 });
    ops.push({ t: 'text', x: M + 4.5, y: y + rowH / 2 + 1.5, text: String(r + 1), size: 4.2, fill: INK, weight: 'bold', align: 'center' });
    row.objects.forEach((o, k) => {
      const x = left + k * cw;
      ops.push({ t: 'rect', x: x + 1.5, y: y + 2, w: cw - 3, h: rowH - 4, rx: 4, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.5 });
      ops.push(...iconOps(o.picture, x + cw / 2, y + rowH / 2, size));
      if (r === 0 && k === row.intruder) {
        // the example: the intruder crossed out
        const d = size * 0.4;
        const cx = x + cw / 2;
        const cy = y + rowH / 2;
        ops.push({ t: 'line', x1: cx - d, y1: cy - d, x2: cx + d, y2: cy + d, stroke: ACCENT, strokeWidth: 0.9, dash: [1.8, 1.2] });
        ops.push({ t: 'line', x1: cx - d, y1: cy + d, x2: cx + d, y2: cy - d, stroke: ACCENT, strokeWidth: 0.9, dash: [1.8, 1.2] });
        exampleTag(ops, x + cw - 3.5, y + rowH - 4, 'right');
      }
    });
  });
  adultNote(ops, `Grupa celor trei imagini: ${rows.map((r, i) => `${i + 1}. ${CATEGORY_NAMES[r.cat]}`).join('; ')}.`);
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── „Grupează și numără” ─────────────────────────

interface GroupSetDef { cat: SortCategory; name: string; /** On the picker button (short enough for a phone). */ short: string; kinds: number; min: number; max: number }

/** Sets 1–3: three kinds, up to 7 of a kind; 4–6: four kinds, up to 8. Never more than 10 (preschool counting). */
const GROUP_SETS: GroupSetDef[] = [
  { cat: 'fructe', name: 'fructe', short: 'fructe', kinds: 3, min: 2, max: 6 },
  { cat: 'domestice', name: 'animale domestice', short: 'domestice', kinds: 3, min: 2, max: 7 },
  { cat: 'uscat', name: 'mijloace de transport', short: 'transport', kinds: 3, min: 2, max: 7 },
  { cat: 'legume', name: 'legume', short: 'legume', kinds: 4, min: 2, max: 8 },
  { cat: 'jucarii', name: 'jucării', short: 'jucării', kinds: 4, min: 2, max: 8 },
  { cat: 'salbatice', name: 'animale sălbatice', short: 'sălbatice', kinds: 4, min: 3, max: 8 },
];

const GROUP_COLS = 6;
const GROUP_ROWS = 5;
const TABLE_H = 48;

export interface GroupSet {
  cat: SortCategory;
  /** The kinds of picture with how many of each (all different counts). */
  kinds: { object: SortObject; count: number }[];
  /** Every picture placed on the page (centre, size). */
  placed: { object: SortObject; cx: number; cy: number; size: number }[];
}

/** The kinds, their counts and the place of every picture (`top`: the top of the activity area). */
export function groupSet(n: number, top: number, variant = currentVariant()): GroupSet {
  const def = GROUP_SETS[n - 1];
  const rand = rng(seedOf(vkey(`group:${n}`, variant)));
  const objects = shuffle(objectsOf(def.cat), rand).slice(0, def.kinds);
  const counts = shuffle(Array.from({ length: def.max - def.min + 1 }, (_, i) => def.min + i), rand).slice(0, def.kinds);
  const kinds = objects.map((object, i) => ({ object, count: counts[i] }));
  // one picture per cell of a 6 × 5 grid, nudged inside its cell so the page does not look like a table
  const areaH = BOTTOM - TABLE_H - 4 - top;
  const cw = (W - 2 * M) / GROUP_COLS;
  const ch = areaH / GROUP_ROWS;
  const size = Math.min(22, ch - 7, cw - 8);
  const cells = shuffle(Array.from({ length: GROUP_COLS * GROUP_ROWS }, (_, i) => i), rand);
  const pictures = shuffle(kinds.flatMap((k) => Array.from({ length: k.count }, () => k.object)), rand);
  const placed = pictures.map((object, i) => {
    const c = cells[i] % GROUP_COLS;
    const r = Math.floor(cells[i] / GROUP_COLS);
    // at least 5 mm between two pictures, so each one can be crossed out on its own
    const jx = (cw - size - 5) * (rand() - 0.5);
    const jy = (ch - size - 5) * (rand() - 0.5);
    return { object, cx: M + (c + 0.5) * cw + jx, cy: top + (r + 0.5) * ch + jy, size };
  });
  return { cat: def.cat, kinds, placed };
}

function groupPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const def = GROUP_SETS[n - 1];
  const top = frame(ops, config, `Grupează și numără: ${def.name}`, 'Numără fiecare fel de imagine și scrie numărul în tabel.', 'Taie cu o linie fiecare imagine după ce ai numărat-o.');
  const set = groupSet(n, top + 2);
  const areaBottom = BOTTOM - TABLE_H - 2;
  ops.push({ t: 'rect', x: M, y: top + 1, w: W - 2 * M, h: areaBottom - top - 1, rx: 4, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.4 });
  for (const p of set.placed) ops.push(...iconOps(p.object.picture, p.cx, p.cy, p.size));

  // the table: one column per kind, the picture on top, the box for the number under it
  const k = set.kinds.length;
  const colW = Math.min(40, (W - 2 * M - 30) / k);
  const tableW = 30 + colW * k;
  const tx = (W - tableW) / 2;
  const ty = BOTTOM - TABLE_H + 2;
  const headH = 20;
  const rowH = TABLE_H - 4 - headH;
  ops.push({ t: 'rect', x: tx, y: ty, w: tableW, h: headH + rowH, rx: 2, fill: PAPER, stroke: INK, strokeWidth: 0.6 });
  ops.push({ t: 'line', x1: tx, y1: ty + headH, x2: tx + tableW, y2: ty + headH, stroke: INK, strokeWidth: 0.5 });
  ops.push({ t: 'text', x: tx + 15, y: ty + headH / 2 + 1.4, text: 'Ce?', size: 4, fill: INK, weight: 'bold', align: 'center' });
  ops.push({ t: 'text', x: tx + 15, y: ty + headH + rowH / 2 + 1.4, text: 'Câte?', size: 4, fill: INK, weight: 'bold', align: 'center' });
  set.kinds.forEach((kind, i) => {
    const x = tx + 30 + i * colW;
    ops.push({ t: 'line', x1: x, y1: ty, x2: x, y2: ty + headH + rowH, stroke: INK, strokeWidth: 0.5 });
    ops.push(...iconOps(kind.object.picture, x + colW / 2, ty + headH / 2, headH - 5));
    // the writing line of the other sheets: dashed middle
    ops.push({ t: 'line', x1: x + 4, y1: ty + headH + rowH / 2, x2: x + colW - 4, y2: ty + headH + rowH / 2, stroke: '#DCE6F2', strokeWidth: 0.3, dash: [1, 1] });
  });
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── „Orientare în spațiu” ─────────────────────────

const POS_SHORT = ['scenă (1)', 'scenă (2)', 'grilă (1)', 'grilă (2)', 'desenează (1)', 'desenează (2)'];

export interface PlacedObject { object: SortObject; cx: number; cy: number; size: number }
export interface Question {
  text: string;
  /** What the question asks for (for the tests: which relation the answer must satisfy). */
  relation: string;
  answer: SortObject;
  /** Three pictures to circle, the answer among them. */
  options: SortObject[];
}

/** Two distractors from `pool` (none of which satisfies the question), shuffled with the answer. */
function options(answer: SortObject, pool: SortObject[], rand: () => number): SortObject[] {
  return shuffle([answer, ...shuffle(pool.filter((o) => o !== answer), rand).slice(0, 2)], rand);
}

// — the table and the box —

export type SceneSlot = 'above' | 'on' | 'under' | 'in' | 'left' | 'right';
const SLOT_POOLS: Record<SceneSlot, string[]> = {
  above: ['balon', 'fluture', 'albină', 'bec'],
  on: ['măr', 'pară', 'banană', 'tort', 'carte', 'portocală'],
  under: ['pisică', 'câine', 'minge', 'coș'],
  in: ['pisică', 'câine', 'minge', 'ursuleț'],
  left: ['coș', 'tobă', 'câine', 'ursuleț', 'minge'],
  right: ['minge', 'zar', 'ursuleț', 'tobă', 'pisică'],
};
const SCENE_H = 90;

export interface SceneLayout {
  floor: number;
  table: { x0: number; x1: number; top: number };
  box: { x0: number; x1: number; top: number };
  objects: (PlacedObject & { slot: SceneSlot })[];
  questions: Question[];
}

/** The scene of pos:1 / pos:2 and its five questions (`top`: the top of the scene). */
export function sceneLayout(n: number, top: number, variant = currentVariant()): SceneLayout {
  const rand = rng(seedOf(vkey(`pos:${n}`, variant)));
  const floor = top + SCENE_H - 6;
  const table = { x0: 64, x1: 124, top: floor - 36 };
  const box = { x0: 138, x1: 172, top: floor - 14 };
  const used = new Set<string>();
  const take = (slot: SceneSlot) => {
    const w = shuffle(SLOT_POOLS[slot], rand).find((x) => !used.has(x))!;
    used.add(w);
    return obj(w);
  };
  const tcx = (table.x0 + table.x1) / 2;
  const objects: SceneLayout['objects'] = [];
  const put = (slot: SceneSlot, object: SortObject, cx: number, bottom: number, size: number) => objects.push({ slot, object, cx, cy: bottom - size / 2, size });
  put('above', take('above'), tcx, table.top - 27, 16);
  put('on', take('on'), tcx, table.top, 18);
  put('under', take('under'), tcx, floor - 0.5, 18);
  put('in', take('in'), (box.x0 + box.x1) / 2, floor - 7, 20);
  put('left', take('left'), M + 22, floor - 0.5, 20);
  put('right', take('right'), W - M - 12, floor - 0.5, 18);
  const at = (s: SceneSlot) => objects.find((o) => o.slot === s)!.object;
  const pool = (...s: SceneSlot[]) => s.map(at);

  // each question offers only pictures that clearly do not answer it: nothing on the table for
  // „deasupra mesei”, nothing at the table for „în stânga mesei”, the picture beside the box for „în cutie”
  const q = (relation: SceneSlot, text: string, distractors: SceneSlot[]): Question => ({ text, relation, answer: at(relation), options: options(at(relation), pool(...distractors), rand) });
  const questions = [
    q('above', 'Ce se află deasupra mesei?', ['under', 'left', 'in', 'right']),
    q('on', 'Ce se află pe masă?', ['under', 'left', 'in', 'right']),
    q('under', 'Ce se află sub masă?', ['on', 'above', 'in', 'right', 'left']),
    q('in', 'Ce se află în cutie?', ['right', 'on', 'under', 'left']),
    rand() < 0.5 ? q('left', 'Ce se află în stânga mesei?', ['right', 'in']) : q('right', 'Ce se află în dreapta cutiei?', ['left', 'on', 'under', 'above']),
  ];
  return { floor, table, box, objects, questions };
}

const WOOD = '#B7794B';
const WOOD_DARK = '#7C4A24';
const CARD = '#E8C690';
const CARD_DARK = '#A8773E';

function tableOps(x0: number, x1: number, top: number, floor: number): DrawOp[] {
  return [
    { t: 'rect', x: x0 + 4, y: top + 3.5, w: 4, h: floor - top - 3.5, fill: WOOD, stroke: WOOD_DARK, strokeWidth: 0.4 },
    { t: 'rect', x: x1 - 8, y: top + 3.5, w: 4, h: floor - top - 3.5, fill: WOOD, stroke: WOOD_DARK, strokeWidth: 0.4 },
    { t: 'rect', x: x0, y: top, w: x1 - x0, h: 4, rx: 1, fill: WOOD, stroke: WOOD_DARK, strokeWidth: 0.5 },
  ];
}

/** An open cardboard box: the back of the opening, then (after the contents) the front and the flaps. */
function boxBack(x0: number, x1: number, top: number): DrawOp[] {
  return [{ t: 'polygon', points: [{ x: x0, y: top }, { x: x0 + 4, y: top - 4 }, { x: x1 - 4, y: top - 4 }, { x: x1, y: top }], fill: CARD_DARK, stroke: WOOD_DARK, strokeWidth: 0.4 }];
}
function boxFront(x0: number, x1: number, top: number, bottom: number, fill = CARD): DrawOp[] {
  return [
    { t: 'polygon', points: [{ x: x0, y: top }, { x: x0 - 6, y: top - 7 }, { x: x0 + 3, y: top - 8 }, { x: x0 + 4, y: top - 4 }], fill, stroke: WOOD_DARK, strokeWidth: 0.4 },
    { t: 'polygon', points: [{ x: x1, y: top }, { x: x1 + 6, y: top - 7 }, { x: x1 - 3, y: top - 8 }, { x: x1 - 4, y: top - 4 }], fill, stroke: WOOD_DARK, strokeWidth: 0.4 },
    { t: 'rect', x: x0, y: top, w: x1 - x0, h: bottom - top, fill, stroke: WOOD_DARK, strokeWidth: 0.5 },
  ];
}

/** The question rows under the picture: question on the left, three pictures to circle on the right. */
function questionRows(ops: DrawOp[], questions: Question[], top: number): void {
  const rowH = Math.min(24, (BOTTOM - top) / questions.length);
  const cellW = 25;
  const ox = W - M - 3 * cellW;
  questions.forEach((q, i) => {
    const y = top + i * rowH;
    if (i) ops.push({ t: 'line', x1: M, y1: y, x2: W - M, y2: y, stroke: CELL_STROKE, strokeWidth: 0.4 });
    const label = `${i + 1}. ${q.text}`;
    ops.push({ t: 'text', x: M + 1, y: y + rowH / 2 + 1.5, text: label, size: fitSize(label, 4.3, ox - M - 4), fill: INK, weight: 'bold' });
    const size = Math.min(15, rowH - 7);
    q.options.forEach((o, k) => {
      const cx = ox + (k + 0.5) * cellW;
      const cy = y + rowH / 2;
      ops.push(...iconOps(o.picture, cx, cy, size));
      if (i === 0 && o === q.answer) {
        ops.push({ t: 'circle', cx, cy, r: size / 2 + 2.6, stroke: ACCENT, strokeWidth: 0.8, fill: undefined });
        exampleTag(ops, ox - 2, y + 5, 'right');
      }
    });
  });
}

function scenePage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const top = frame(ops, config, 'Unde se află? (pe, sub, deasupra, în)', 'Privește desenul și încercuiește răspunsul corect.', 'Un adult citește întrebarea. Primul răspuns este exemplul.');
  const sy = top + 2;
  const scene = sceneLayout(n, sy);
  ops.push({ t: 'rect', x: M, y: sy, w: W - 2 * M, h: SCENE_H, rx: 4, fill: '#F8FBFF' });
  // the floor, inside the rounded frame
  ops.push({ t: 'rect', x: M, y: scene.floor, w: W - 2 * M, h: sy + SCENE_H - scene.floor, rx: 4, fill: '#EFE3CF' });
  ops.push({ t: 'rect', x: M, y: scene.floor, w: W - 2 * M, h: 3, fill: '#EFE3CF' });
  ops.push({ t: 'line', x1: M, y1: scene.floor, x2: W - M, y2: scene.floor, stroke: CARD_DARK, strokeWidth: 0.5 });
  const draw = (o: PlacedObject) => ops.push(...iconOps(o.object.picture, o.cx, o.cy, o.size));
  const bySlot = (s: SceneSlot) => scene.objects.find((o) => o.slot === s)!;
  ops.push(...tableOps(scene.table.x0, scene.table.x1, scene.table.top, scene.floor));
  const above = bySlot('above');
  // a lamp hangs from a cord; the others fly
  if (above.object.word === 'bec') ops.push({ t: 'line', x1: above.cx, y1: sy, x2: above.cx, y2: above.cy - above.size / 2 + 1, stroke: '#475569', strokeWidth: 0.5 });
  for (const s of ['above', 'on', 'under', 'left', 'right'] as SceneSlot[]) draw(bySlot(s));
  ops.push(...boxBack(scene.box.x0, scene.box.x1, scene.box.top));
  draw(bySlot('in'));
  ops.push(...boxFront(scene.box.x0, scene.box.x1, scene.box.top, scene.floor));
  ops.push({ t: 'rect', x: M, y: sy, w: W - 2 * M, h: SCENE_H, rx: 4, stroke: CELL_STROKE, strokeWidth: 0.5 });
  questionRows(ops, scene.questions, sy + SCENE_H + 3);
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// — the 3 × 3 grid —

const GRID_POOL = ['măr', 'pară', 'banană', 'căpșună', 'morcov', 'minge', 'mașină', 'pisică', 'câine', 'casă', 'floare', 'stea', 'lună', 'soare', 'carte', 'tort', 'balon', 'pește', 'fluture', 'urs', 'umbrelă', 'bicicletă', 'avion', 'tobă'];
const GRID_CELL = 29;

export interface GridLayout {
  /** cells[row][col], row 0 at the top, col 0 on the left. */
  cells: SortObject[][];
  x: number;
  y: number;
  cell: number;
  questions: Question[];
}

const CORNERS: { r: number; c: number; text: string }[] = [
  { r: 0, c: 0, text: 'în colțul de sus, din stânga' },
  { r: 0, c: 2, text: 'în colțul de sus, din dreapta' },
  { r: 2, c: 0, text: 'în colțul de jos, din stânga' },
  { r: 2, c: 2, text: 'în colțul de jos, din dreapta' },
];

/** Five questions on a grid; the caller draws again until their answers are five different pictures. */
function gridQuestions(cells: SortObject[][], rand: () => number): Question[] {
  const all = (pred: (r: number, c: number) => boolean) => cells.flatMap((row, r) => row.filter((_, c) => pred(r, c)));
  const questions: Question[] = [];
  const corners = shuffle(CORNERS, rand);

  // 1. a corner
  const k1 = corners[0];
  questions.push({ text: `Ce se află ${k1.text}?`, relation: `cell ${k1.r} ${k1.c}`, answer: cells[k1.r][k1.c], options: options(cells[k1.r][k1.c], all((r, c) => r !== k1.r || c !== k1.c), rand) });

  // 2. above or under a picture: the answer is the next one in its column; the other two are not higher (lower) at all
  if (rand() < 0.5) {
    const r = 1 + Math.floor(rand() * 2);
    const c = Math.floor(rand() * 3);
    const x = cells[r][c];
    questions.push({ text: `Ce se află deasupra ${x.gen}?`, relation: `above ${r} ${c}`, answer: cells[r - 1][c], options: options(cells[r - 1][c], all((rr, cc) => rr >= r && !(rr === r && cc === c)), rand) });
  } else {
    const r = Math.floor(rand() * 2);
    const c = Math.floor(rand() * 3);
    const x = cells[r][c];
    questions.push({ text: `Ce se află sub ${x.word}?`, relation: `under ${r} ${c}`, answer: cells[r + 1][c], options: options(cells[r + 1][c], all((rr, cc) => rr <= r && !(rr === r && cc === c)), rand) });
  }

  // 3. left or right of a picture: the next one in its row; the other two are not further left (right) at all
  if (rand() < 0.5) {
    const r = Math.floor(rand() * 3);
    const c = 1 + Math.floor(rand() * 2);
    const x = cells[r][c];
    questions.push({ text: `Ce se află în stânga ${x.gen}?`, relation: `left ${r} ${c}`, answer: cells[r][c - 1], options: options(cells[r][c - 1], all((rr, cc) => cc >= c && !(rr === r && cc === c)), rand) });
  } else {
    const r = Math.floor(rand() * 3);
    const c = Math.floor(rand() * 2);
    const x = cells[r][c];
    questions.push({ text: `Ce se află în dreapta ${x.gen}?`, relation: `right ${r} ${c}`, answer: cells[r][c + 1], options: options(cells[r][c + 1], all((rr, cc) => cc <= c && !(rr === r && cc === c)), rand) });
  }

  // 4. between the two ends of a row or a column
  // an outer row or column: its middle is never the centre, which question 5 may ask for
  const line = rand() < 0.5 ? 0 : 2;
  if (rand() < 0.5) {
    const a = cells[line][0];
    const b = cells[line][2];
    questions.push({ text: `Ce se află între ${a.word} și ${b.word}?`, relation: `between row ${line}`, answer: cells[line][1], options: options(cells[line][1], all((r) => r !== line), rand) });
  } else {
    const a = cells[0][line];
    const b = cells[2][line];
    questions.push({ text: `Ce se află între ${a.word} și ${b.word}?`, relation: `between col ${line}`, answer: cells[1][line], options: options(cells[1][line], all((_, c) => c !== line), rand) });
  }

  // 5. the middle, or another corner
  if (rand() < 0.5) {
    questions.push({ text: 'Ce se află în mijloc?', relation: 'cell 1 1', answer: cells[1][1], options: options(cells[1][1], all((r, c) => r !== 1 || c !== 1), rand) });
  } else {
    const k5 = corners[1];
    questions.push({ text: `Ce se află ${k5.text}?`, relation: `cell ${k5.r} ${k5.c}`, answer: cells[k5.r][k5.c], options: options(cells[k5.r][k5.c], all((r, c) => r !== k5.r || c !== k5.c), rand) });
  }
  return questions;
}

/** The grid of pos:3 / pos:4 and its five questions (`top`: the top of the grid). */
export function gridLayout(n: number, top: number, variant = currentVariant()): GridLayout {
  const rand = rng(seedOf(vkey(`pos:${n}`, variant)));
  const nine = shuffle(GRID_POOL, rand).slice(0, 9).map(obj);
  const cells = [0, 1, 2].map((r) => nine.slice(r * 3, r * 3 + 3));
  let questions = gridQuestions(cells, rand);
  for (let tries = 0; tries < 50 && new Set(questions.map((q) => q.answer)).size < questions.length; tries++) questions = gridQuestions(cells, rand);
  const size = 3 * GRID_CELL;
  return { cells, x: (W - size) / 2, y: top, cell: GRID_CELL, questions };
}

function gridPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const top = frame(ops, config, 'Unde se află? (sus, jos, stânga, dreapta)', 'Privește grila și încercuiește răspunsul corect.', 'Un adult citește întrebarea. Primul răspuns este exemplul.');
  const g = gridLayout(n, top + 8);
  const size = 3 * g.cell;
  // the directions, as a help for the youngest
  ops.push({ t: 'text', x: W / 2, y: g.y - 2, text: 'sus', size: 3.4, fill: MUTED, weight: 'bold', align: 'center' });
  ops.push({ t: 'text', x: W / 2, y: g.y + size + 5, text: 'jos', size: 3.4, fill: MUTED, weight: 'bold', align: 'center' });
  ops.push({ t: 'text', x: g.x - 3, y: g.y + size / 2 + 1.2, text: 'stânga', size: 3.4, fill: MUTED, weight: 'bold', align: 'right' });
  ops.push({ t: 'text', x: g.x + size + 3, y: g.y + size / 2 + 1.2, text: 'dreapta', size: 3.4, fill: MUTED, weight: 'bold', align: 'left' });
  ops.push({ t: 'rect', x: g.x, y: g.y, w: size, h: size, rx: 2, fill: PAPER, stroke: INK, strokeWidth: 0.7 });
  for (let i = 1; i < 3; i++) {
    ops.push({ t: 'line', x1: g.x + i * g.cell, y1: g.y, x2: g.x + i * g.cell, y2: g.y + size, stroke: INK, strokeWidth: 0.5 });
    ops.push({ t: 'line', x1: g.x, y1: g.y + i * g.cell, x2: g.x + size, y2: g.y + i * g.cell, stroke: INK, strokeWidth: 0.5 });
  }
  g.cells.forEach((row, r) => row.forEach((o, c) => ops.push(...iconOps(o.picture, g.x + (c + 0.5) * g.cell, g.y + (r + 0.5) * g.cell, g.cell - 8))));
  questionRows(ops, g.questions, g.y + size + 9);
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// — draw where you are told —

export type DrawRelation = 'deasupra' | 'sub' | 'stanga' | 'dreapta' | 'in' | 'pe' | 'langa';
const DRAW_RELATIONS: DrawRelation[] = ['deasupra', 'sub', 'stanga', 'dreapta', 'in', 'pe', 'langa'];
const SKY = ['soare', 'nor', 'stea'];
const GROUND = ['minge', 'floare', 'măr', 'inimă', 'cerc', 'pătrat'];
const REFS = ['casă', 'copac', 'mașină', 'câine', 'pisică', 'urs'];

export interface DrawPanel {
  relation: DrawRelation;
  text: string;
  /** What the child draws. */
  thing: SortObject;
  /** The picture (or the drawn table / box) it is placed against. */
  ref: SortObject;
  /** The panel and its drawing area (below the sentence). */
  panel: Box;
  area: Box;
  /** Where the reference is drawn. */
  refBox: Box;
}

function sentence(rel: DrawRelation, thing: SortObject, ref: SortObject): string {
  switch (rel) {
    case 'deasupra': return `Desenează ${thing.indef} deasupra ${ref.gen}.`;
    case 'sub': return `Desenează ${thing.indef} sub ${ref.word}.`;
    case 'stanga': return `Desenează ${thing.indef} în stânga ${ref.gen}.`;
    case 'dreapta': return `Desenează ${thing.indef} în dreapta ${ref.gen}.`;
    case 'in': return `Desenează ${thing.indef} în ${ref.word}.`;
    case 'pe': return `Desenează ${thing.indef} pe ${ref.word}.`;
    case 'langa': return `Desenează ${thing.indef} lângă ${ref.word}.`;
  }
}

const PANEL_TEXT = 3.9;
const PANEL_TEXT_H = 13;
const REF_SIZE = 22;

/** The six boxes of pos:5 / pos:6 (`top`: the top of the activity area). */
export function drawPanels(n: number, top: number, variant = currentVariant()): DrawPanel[] {
  const rand = rng(seedOf(vkey(`pos:${n}`, variant)));
  // six of the seven relations, a different one left out on each sheet
  const rels = shuffle(DRAW_RELATIONS.filter((r) => r !== (n === 5 ? 'langa' : 'pe')), rand);
  const refs = shuffle(REFS, rand);
  const ground = shuffle(GROUND, rand);
  const gap = 4;
  const pw = (W - 2 * M - gap) / 2;
  const ph = (BOTTOM - top - 2 * gap) / 3;
  let ri = 0;
  let gi = 0;
  return rels.map((relation, i) => {
    const panel = { x: M + (i % 2) * (pw + gap), y: top + Math.floor(i / 2) * (ph + gap), w: pw, h: ph };
    const area = { x: panel.x + 3, y: panel.y + PANEL_TEXT_H + 2, w: pw - 6, h: ph - PANEL_TEXT_H - 5 };
    let ref: SortObject;
    let thing: SortObject;
    let refBox: Box;
    const s = REF_SIZE;
    if (relation === 'sub' || relation === 'pe') {
      ref = obj('masă');
      thing = obj(ground[gi++ % ground.length]);
      // the table high up for „sub” (room under it), low for „pe” (room on it)
      const tw = 52;
      const th = relation === 'sub' ? area.h - 4 : 20;
      refBox = { x: area.x + (area.w - tw) / 2, y: area.y + area.h - th, w: tw, h: th };
    } else if (relation === 'in') {
      ref = obj('cutie');
      thing = obj(ground[gi++ % ground.length]);
      const bw = 44;
      const bh = Math.min(30, area.h - 12);
      refBox = { x: area.x + (area.w - bw) / 2, y: area.y + area.h - bh - 2, w: bw, h: bh };
    } else {
      ref = obj(refs[ri++ % refs.length]);
      // a sky picture only above a house or a tree („un soare deasupra casei”, never „sub”)
      const sky = relation === 'deasupra' && (ref.word === 'casă' || ref.word === 'copac');
      thing = obj(sky ? pickOne(SKY, rand) : ground[gi++ % ground.length]);
      const cx = relation === 'stanga' ? area.x + area.w - s / 2 - 6 : relation === 'dreapta' ? area.x + s / 2 + 6 : area.x + area.w / 2;
      const cy = relation === 'deasupra' ? area.y + area.h - s / 2 - 2 : area.y + area.h / 2 + 2;
      refBox = { x: cx - s / 2, y: cy - s / 2, w: s, h: s };
    }
    return { relation, text: sentence(relation, thing, ref), thing, ref, panel, area, refBox };
  });
}

function drawPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const top = frame(ops, config, 'Desenează unde ți se cere', 'Desenează în fiecare căsuță ce ți se cere.', 'Un adult citește propoziția, dacă este nevoie.');
  for (const [i, p] of drawPanels(n, top + 2).entries()) {
    ops.push({ t: 'rect', x: p.panel.x, y: p.panel.y, w: p.panel.w, h: p.panel.h, rx: 4, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.6 });
    const lines = wrapText(`${i + 1}. ${p.text}`, p.panel.w - 8, PANEL_TEXT).slice(0, 2);
    lines.forEach((l, k) => ops.push({ t: 'text', x: p.panel.x + 4, y: p.panel.y + 6 + k * 5, text: l, size: PANEL_TEXT, fill: INK, weight: 'bold' }));
    const b = p.refBox;
    if (p.ref.word === 'masă') ops.push(...tableOps(b.x, b.x + b.w, b.y, b.y + b.h));
    else if (p.ref.word === 'cutie') ops.push(...boxBack(b.x, b.x + b.w, b.y), ...boxFront(b.x, b.x + b.w, b.y, b.y + b.h, '#FFF8EC'));
    else ops.push(...iconOps(p.ref.picture, b.x + b.w / 2, b.y + b.h / 2, b.w));
  }
  footer(ops, tier);
  return { width: W, height: H, ops };
}

function posPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  if (n <= 2) return scenePage(config, n, tier);
  if (n <= 4) return gridPage(config, n, tier);
  return drawPage(config, n, tier);
}

// ───────────────────────── entry point ─────────────────────────

/** The page of one sorting / orientation item, or null when the item is not one. */
export function buildSortingPage(config: WorksheetConfig, item: string, tier: Tier): PageOps | null {
  if (!isSortingItem(item)) return null;
  const [kind, arg] = item.split(':') as [SortingKind, string];
  const n = Number(arg);
  if (kind === 'sort') return sortPage(config, n, tier);
  if (kind === 'odd') return oddPage(config, n, tier);
  if (kind === 'group') return groupPage(config, n, tier);
  return posPage(config, n, tier);
}
