import type { DrawOp, PageOps } from '@/lib/glyphs/types';
import type { Tier, WorksheetConfig } from '@/types';
import { iconOps } from '@/lib/hints/icons';
import { madeWith, BRAND_NAME } from '@/lib/brand';
import { textWidthMm } from '@/lib/book/text';
import { SLANT, cursiveWord } from '@/lib/glyphs/cursive';
import { INK, ACCENT, PAPER, MUTED, guideOps, itemOps } from './rows';
import { caseOf, glyphText, glyphTextWidth, inkExtent } from './phonology-pages';
import { onePart, rowParts, type EvalArea, type EvalBlock } from './eval-block';
import {
  COPY_SETS, DRAW_SETS, FILL_SETS, GAP_SETS, MATCH_SETS, ORDER_SETS, READING_LEVELS, READ_KINDS, READ_PICTURES, TEXT_SETS,
  isReadingItem, readingParts, type FillSentence, type GapWord, type ReadKind, type ReadLevel, type ReadingText,
} from './reading';

/**
 * „Citire și scriere”: reading and writing sheets, one page per item, in the „Jocuri” category next
 * to the sounds-and-syllables sheets (see activities.ts). Items are "read:<kind>:<set>":
 *
 * - match  Unește cuvântul cu imaginea — six words, six pictures in another order, lines between;
 * - gap    Ce literă lipsește? — the word under its picture with a letter missing, three to choose from;
 * - draw   Citește și desenează — a short phrase over each of six boxes („doi nori”);
 * - fill   Completează propoziția — a sentence with a gap and three words to choose from;
 * - order  Ordonează cuvintele — the words of a sentence shuffled, a writing row to write it on;
 * - copy   Copiază — words (clasa pregătitoare, print letters on the three-line ruling) or sentences
 *          (clasa I on ruling like the tip I notebook, clasa a II-a without the slanted lines), the model
 *          in print or, with „de mână” (config.script), in joined handwriting;
 * - text   Citește și răspunde — a short original text and three or four questions (circle the answer, Da / Nu).
 *
 * The class of a set (reading.ts READING_LEVELS) sets the letters: capitals or small letters as the
 * letter mode says in clasa pregătitoare, small letters and sentences from clasa I. Shuffles are seeded
 * by the item, so the preview and the PDF are the same sheet every time; the layout functions are
 * exported for the tests and for the answers page (game-keys.ts), which read the very same order.
 */

export const READ_KIND_TITLES: Record<ReadKind, string> = {
  match: 'Unește cuvântul cu imaginea',
  gap: 'Ce literă lipsește?',
  draw: 'Citește și desenează',
  fill: 'Completează propoziția',
  order: 'Ordonează cuvintele',
  copy: 'Copiază',
  text: 'Citește și răspunde',
};

const LEVEL_SHORT: Record<ReadLevel, string> = { CP: 'CP', I: 'I', II: 'II' };
const LEVEL_LONG: Record<ReadLevel, string> = { CP: 'clasa pregătitoare', I: 'clasa I', II: 'clasa a II-a' };

const LEVEL_ORDER: ReadLevel[] = ['CP', 'I', 'II'];

/** Every reading item, in picker order: kind by kind, the sets of clasa pregătitoare, then of clasa I, then of clasa a II-a. */
export function readingItems(): string[] {
  return READ_KINDS.flatMap((k) => LEVEL_ORDER.flatMap((level) => READING_LEVELS[k].flatMap((l, i) => (l === level ? [`read:${k}:${i + 1}`] : []))));
}

/** The class of a set and its number among the sets of that class: "read:gap:4" → I, 2. */
function setOfLevel(kind: ReadKind, n: number): { level: ReadLevel; k: number } {
  const levels = READING_LEVELS[kind];
  const level = levels[n - 1];
  return { level, k: levels.slice(0, n).filter((l) => l === level).length };
}

/** The button of a set in the picker: „CP 1”, „I 2”, „II 1”. */
export function readingShortLabel(item: string): string {
  const [kind, n] = readingParts(item);
  const { level, k } = setOfLevel(kind, n);
  return `${LEVEL_SHORT[level]} ${k}`;
}

/** „Ce literă lipsește? (clasa I, 2)”. */
export function readingLabel(item: string): string {
  const [kind, n] = readingParts(item);
  const { level, k } = setOfLevel(kind, n);
  return `${READ_KIND_TITLES[kind]} (${LEVEL_LONG[level]}, ${k})`;
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

/** A shuffle where nothing stays in its place (the indices of `xs`, in their new order). */
function derangement(count: number, rand: () => number): number[] {
  const ids = Array.from({ length: count }, (_, i) => i);
  for (let tries = 0; tries < 200; tries++) {
    const s = shuffle(ids, rand);
    if (s.every((v, i) => v !== i)) return s;
  }
  return ids.map((i) => (i + 1) % count);
}

// ───────────────────────── text widths ─────────────────────────

/** Advance widths of Nunito Bold, per 1 mm of font size (measured with the embedded font). */
const NUNITO_BOLD: Record<string, number> = {
  a: 0.547, b: 0.6, c: 0.472, d: 0.6, e: 0.542, f: 0.364, g: 0.604, h: 0.585, i: 0.255, j: 0.259, k: 0.536, l: 0.319, m: 0.877,
  n: 0.585, o: 0.576, p: 0.6, q: 0.6, r: 0.392, s: 0.488, t: 0.384, u: 0.579, v: 0.527, w: 0.853, x: 0.546, y: 0.526, z: 0.474,
  ă: 0.547, â: 0.547, î: 0.255, ș: 0.488, ț: 0.384,
  A: 0.744, B: 0.688, C: 0.68, D: 0.762, E: 0.597, F: 0.562, G: 0.736, H: 0.773, I: 0.282, J: 0.354, K: 0.665, L: 0.562, M: 0.868,
  N: 0.748, O: 0.785, P: 0.652, Q: 0.785, R: 0.686, S: 0.631, T: 0.621, U: 0.738, V: 0.713, W: 1.113, X: 0.672, Y: 0.618, Z: 0.605,
  Ă: 0.744, Â: 0.744, Î: 0.282, Ș: 0.631, Ț: 0.621,
  ' ': 0.271, '.': 0.248, ',': 0.248, '?': 0.459, '!': 0.248, '-': 0.434, '–': 0.5, '„': 0.443, '”': 0.443, ':': 0.248, '(': 0.358, ')': 0.358, '/': 0.313,
  // the square brackets of the order of operations (clasa a IV-a), as wide as the round ones
  '[': 0.358, ']': 0.358,
};

/** The width of a text in mm (bold; the regular weight is a little narrower). */
export function textW(text: string, size: number): number {
  let w = 0;
  for (const ch of text) w += NUNITO_BOLD[ch] ?? 0.6;
  return w * size;
}

/**
 * The width to keep room for: the measured one, or the rough estimate of the rest of the app
 * (book/text.ts) when that is larger, so the sheets also pass the app's own layout checks.
 */
function roomW(text: string, size: number): number {
  return Math.max(textW(text, size), textWidthMm(text, size));
}

/** The size that keeps a text within `room` mm: `size`, or smaller. */
function fitSize(text: string, size: number, room: number): number {
  return Math.min(size, (size * room) / Math.max(0.01, roomW(text, size) * 1.02));
}

/** Lines of at most `width` mm (the first line `first` mm, for an indented paragraph). */
function wrapLines(text: string, size: number, width: number, first = width, measure: (t: string, sz: number) => number = roomW): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = line ? `${line} ${word}` : word;
    const room = lines.length ? width : first;
    if (!line || measure(candidate, size) <= room) line = candidate;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// ───────────────────────── page frame ─────────────────────────

const W = 210;
const H = 297;
const M = 12;
/** Bottom of the activity area: the line under it holds the note for the adult, then the footer. */
const BOTTOM = H - M - 20;
const CELL_STROKE = '#E6DECD';
const SOFT = '#FBF7EE';
const TRACE = '#8AA0BC';
const RULING = '#8DA0B8';
const RULING_LIGHT = '#C3CEDC';

/** The same header as the other games (activities.ts, phonology-pages.ts). */
function frame(ops: DrawOp[], config: WorksheetConfig, title: string, instruction: string, help?: string): number {
  ops.push({ t: 'text', x: M, y: M + 6.5, text: title, size: 6.5, fill: INK, weight: 'bold' });
  ops.push({ t: 'text', x: M, y: M + 14.5, text: `Nume: ${config.childName?.trim() || '______________'}     Data: ____________`, size: 3.6, fill: '#334155' });
  ops.push({ t: 'text', x: W - M, y: M + 6, text: BRAND_NAME, size: 3.2, fill: MUTED, weight: 'bold', align: 'right' });
  ops.push({ t: 'line', x1: M, y1: M + 18.5, x2: W - M, y2: M + 18.5, stroke: ACCENT, strokeWidth: 0.6 });
  ops.push({ t: 'text', x: M, y: M + 28, text: instruction, size: 4.6, fill: INK, weight: 'bold' });
  if (!help) return M + 34;
  ops.push({ t: 'text', x: M, y: M + 34.5, text: help, size: fitSize(help, 3.6, W - 2 * M), fill: '#334155' });
  return M + 39;
}

/** One line for the adult under the activity, shrunk to the width of the page. */
function adultNote(ops: DrawOp[], text: string): void {
  ops.push({ t: 'text', x: M, y: BOTTOM + 7, text, size: fitSize(text, 2.8, W - 2 * M), fill: MUTED });
}

function footer(ops: DrawOp[], tier: Tier): void {
  if (tier === 'free') ops.push({ t: 'text', x: W - M, y: H - M + 2, text: madeWith('ro'), size: 2.6, fill: '#94a3b8', align: 'right' });
}

function exampleTag(ops: DrawOp[], x: number, y: number, align: 'left' | 'right' | 'center' = 'left'): void {
  ops.push({ t: 'text', x, y, text: 'exemplu', size: 2.8, fill: MUTED, align });
}

function numberDisc(ops: DrawOp[], cx: number, cy: number, n: number): void {
  ops.push({ t: 'circle', cx, cy, r: 3.6, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.5 });
  ops.push({ t: 'text', x: cx, y: cy + 1.35, text: String(n), size: 3.8, fill: INK, weight: 'bold', align: 'center' });
}

/** The words of a set as the class reads them: capitals or small letters in CP (letter mode), small letters later. */
export function readCase(config: WorksheetConfig, level: ReadLevel, text: string): string {
  return level === 'CP' ? caseOf(config, text) : text;
}

// ───────────────────────── writing rows ─────────────────────────

/** mm per glyph unit of the writing rows: the body of the small letters is 50 units. */
const RULE_S: Record<ReadLevel, number> = { CP: 0.1, I: 0.11, II: 0.1 };

/**
 * One writing row, `baseline` its baseline: three lines for print letters (clasa pregătitoare, as on the
 * letters sheets); for handwriting the four lines of the school notebook — the body of the small
 * letters between the two strong lines, a light line for the tall letters and one for the tails — with
 * the slanted lines of the tip I notebook in clasa I, without them in clasa a II-a.
 * Its ink goes from 100 units above the baseline to 50 below (handwriting) or to the baseline (print).
 */
export function rulingOps(level: ReadLevel, x: number, width: number, baseline: number, s: number): DrawOp[] {
  if (level === 'CP') return guideOps({ x, width, baseline }, s, RULING, false);
  const line = (y: number, stroke: string, strokeWidth: number): DrawOp => ({ t: 'line', x1: x, y1: y, x2: x + width, y2: y, stroke, strokeWidth });
  const ops: DrawOp[] = [
    line(baseline - 100 * s, RULING_LIGHT, 0.22),
    line(baseline - 50 * s, RULING, 0.35),
    line(baseline, RULING, 0.45),
    line(baseline + 50 * s, RULING_LIGHT, 0.22),
  ];
  if (level === 'I') {
    const lean = 150 * SLANT * s; // from the bottom line to the top one, at the slope of the letters
    for (let px = x; px + lean <= x + width + 0.01; px += 34 * s) ops.push({ t: 'line', x1: px, y1: baseline + 50 * s, x2: px + lean, y2: baseline - 100 * s, stroke: RULING_LIGHT, strokeWidth: 0.14 });
  }
  return ops;
}

const glyphStyle = (color: string, dashed: boolean) => ({
  color, strokeWidth: 6, variant: dashed ? ('dashed' as const) : ('solid' as const), startDots: false, arrows: false,
  accent: ACCENT, dotText: PAPER, paper: PAPER, ...(dashed ? { dash: [1.6, 1.4] as [number, number] } : {}),
});

/**
 * A sentence in joined handwriting on a writing row, word by word (each word joined, the capitals on
 * their own as in the book), with the full stops and commas the glyphs do not have.
 * Returns the ops and the width in mm.
 */
export function cursiveLine(text: string, x: number, baseline: number, s: number, color = INK, dashed = false): { ops: DrawOp[]; width: number } {
  const ops: DrawOp[] = [];
  let cx = x;
  const words = text.split(' ');
  words.forEach((token, i) => {
    const m = token.match(/^(.*?)([.,!?]*)$/)!;
    const word = m[1];
    const g = word ? cursiveWord(word) : undefined;
    if (g) {
      ops.push({ t: 'group', tx: cx - g.bbox.minX * s, ty: baseline - 100 * s, scale: s, ops: itemOps([g], glyphStyle(color, dashed)) });
      cx += (g.bbox.maxX - g.bbox.minX) * s;
    }
    for (const p of m[2]) {
      if (p === '.') ops.push({ t: 'circle', cx: cx + 7 * s, cy: baseline - 3.5 * s, r: 4 * s, fill: color });
      if (p === ',') ops.push({ t: 'line', x1: cx + 9 * s, y1: baseline - 4 * s, x2: cx + 4 * s, y2: baseline + 14 * s, stroke: color, strokeWidth: 7 * s });
      cx += 14 * s;
    }
    if (i < words.length - 1) cx += 42 * s;
  });
  return { ops, width: cx - x };
}

// ───────────────────────── „Unește cuvântul cu imaginea” ─────────────────────────

export interface MatchLayout {
  /** The words, top to bottom. */
  words: string[];
  /** The pictures' words, top to bottom (never next to their word). */
  pictures: string[];
}

export function matchLayout(n: number): MatchLayout {
  const words = shuffle(MATCH_SETS[n - 1], rng(seedOf(`read:match:${n}`)));
  const order = derangement(words.length, rng(seedOf(`read:match:${n}:pictures`)));
  return { words, pictures: order.map((i) => words[i]) };
}

function matchPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const level = READING_LEVELS.match[n - 1];
  const top = frame(ops, config, READ_KIND_TITLES.match, 'Citește cuvântul și unește-l cu imaginea potrivită.', 'Trage o linie de la punctul cuvântului la punctul imaginii. Primul cuvânt este exemplul.');
  const { words, pictures } = matchLayout(n);
  const gy = top + 2;
  const rowH = (BOTTOM - gy) / words.length;
  const cardW = 66;
  const cardH = Math.min(17, rowH - 10);
  const pic = Math.min(26, rowH - 7);
  const picX = W - M - pic - 8;
  const shown = words.map((w) => readCase(config, level, w));
  const size = Math.min(...shown.map((w) => fitSize(w, level === 'CP' ? 7.5 : 7, cardW - 12)));
  const dotOf = (side: 'word' | 'picture', i: number) => ({ x: side === 'word' ? M + cardW + 5 : picX - 5, y: gy + (i + 0.5) * rowH });
  words.forEach((w, i) => {
    const cy = gy + (i + 0.5) * rowH;
    ops.push({ t: 'rect', x: M, y: cy - cardH / 2, w: cardW, h: cardH, rx: 3, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.5 });
    ops.push({ t: 'text', x: M + cardW / 2, y: cy + size * 0.36, text: shown[i], size, fill: INK, weight: 'bold', align: 'center' });
    const d = dotOf('word', i);
    ops.push({ t: 'circle', cx: d.x, cy: d.y, r: 1.4, fill: INK });
  });
  pictures.forEach((w, i) => {
    const cy = gy + (i + 0.5) * rowH;
    ops.push({ t: 'rect', x: picX, y: cy - pic / 2 - 2, w: pic + 8, h: pic + 4, rx: 3, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.5 });
    ops.push(...iconOps(READ_PICTURES[w], picX + 4 + pic / 2, cy, pic));
    const d = dotOf('picture', i);
    ops.push({ t: 'circle', cx: d.x, cy: d.y, r: 1.4, fill: INK });
  });
  // the example: the first word joined to its picture
  const a = dotOf('word', 0);
  const b = dotOf('picture', pictures.indexOf(words[0]));
  ops.push({ t: 'line', x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: ACCENT, strokeWidth: 0.7, dash: [1.6, 1.2] });
  exampleTag(ops, a.x + 3, a.y - 2.5);
  adultNote(ops, `Imaginile, de sus în jos: ${pictures.join(', ')}.`);
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── „Ce literă lipsește?” ─────────────────────────

export interface GapItem extends GapWord {
  /** The three letters as printed, left to right (one is the answer). */
  options: string[];
}

export function gapLayout(n: number): GapItem[] {
  const rand = rng(seedOf(`read:gap:${n}`));
  return shuffle(GAP_SETS[n - 1], rand).map((g) => ({ ...g, options: shuffle([g.answer, ...g.others], rand) }));
}

/** The width of the box for the missing letter: the widest of the three letters, and some room. */
function gapBox(g: GapItem, config: WorksheetConfig, level: ReadLevel, size: number): number {
  return Math.max(...g.options.map((o) => textW(readCase(config, level, o), size))) + size * 0.55;
}

/**
 * A word with its missing letter as a box: the letters before and after it as written (one text each,
 * so the word reads as a word), the box between them. `draw` takes the left edge and the middle line;
 * with `example`, the missing letter is printed in the box, light, to trace.
 */
function gapWord(text: string, at: number, box: number, size: number): { width: number; draw: (x: number, cy: number, example?: boolean) => DrawOp[] } {
  const letters = [...text];
  const before = letters.slice(0, at).join('');
  const after = letters.slice(at + 1).join('');
  const pad = size * 0.08;
  const bw = before ? textW(before, size) + pad : 0;
  const aw = after ? textW(after, size) + pad : 0;
  return {
    width: bw + box + aw,
    draw(x, cy, example = false) {
      const base = cy + size * 0.36;
      const ops: DrawOp[] = [];
      if (before) ops.push({ t: 'text', x, y: base, text: before, size, fill: INK, weight: 'bold' });
      ops.push({ t: 'rect', x: x + bw, y: cy - size * 0.78, w: box, h: size * 1.56, rx: 1.2, fill: PAPER, stroke: INK, strokeWidth: 0.55 });
      if (example) ops.push({ t: 'text', x: x + bw + box / 2, y: base, text: letters[at], size, fill: TRACE, weight: 'bold', align: 'center' });
      if (after) ops.push({ t: 'text', x: x + bw + box + pad, y: base, text: after, size, fill: INK, weight: 'bold' });
      return ops;
    },
  };
}

function gapPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const level = READING_LEVELS.gap[n - 1];
  const top = frame(ops, config, READ_KIND_TITLES.gap, 'Scrie în căsuță litera care lipsește.', 'Spune numele imaginii și alege litera potrivită dintre cele trei. Primul cuvânt este exemplul.');
  const items = gapLayout(n);
  const gy = top + 2;
  const rowH = (BOTTOM - gy) / items.length;
  const pic = Math.min(21, rowH - 5);
  const x0 = M + pic + 12;
  const optX = W - M - 44;
  // the word as it is written, the gap a box as wide as the widest of the three letters; one size
  // for the page, set by the longest word
  const size = Math.min(9, ...items.map((g) => (9 * (optX - 10 - x0)) / gapWord(readCase(config, level, g.word), g.at, gapBox(g, config, level, 9), 9).width));
  items.forEach((g, i) => {
    const y = gy + i * rowH;
    const cy = y + rowH / 2;
    if (i) ops.push({ t: 'line', x1: M, y1: y, x2: W - M, y2: y, stroke: CELL_STROKE, strokeWidth: 0.4 });
    ops.push(...iconOps(READ_PICTURES[g.word], M + 4 + pic / 2, cy, pic));
    const word = gapWord(readCase(config, level, g.word), g.at, gapBox(g, config, level, size), size);
    ops.push(...word.draw(x0, cy, i === 0));
    g.options.forEach((o, k) => {
      const ox = optX + 7 + k * 15;
      const right = o === g.answer && i === 0;
      ops.push({ t: 'circle', cx: ox, cy, r: 5.4, fill: SOFT, stroke: right ? ACCENT : CELL_STROKE, strokeWidth: right ? 0.9 : 0.5 });
      ops.push({ t: 'text', x: ox, y: cy + 2.2, text: readCase(config, level, o), size: 6, fill: INK, weight: 'bold', align: 'center' });
    });
    if (i === 0) exampleTag(ops, W - M, y + rowH - 2, 'right');
  });
  adultNote(ops, `Imaginile, în ordine: ${items.map((g) => g.word).join(', ')}.`);
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── „Citește și desenează” ─────────────────────────

function drawPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const level = READING_LEVELS.draw[n - 1];
  const top = frame(ops, config, READ_KIND_TITLES.draw, 'Citește ce scrie deasupra căsuței și desenează în ea.', 'Desenează exact ce scrie: câte lucruri sunt și unde stau.');
  const phrases = DRAW_SETS[n - 1].map((p) => readCase(config, level, p));
  const cols = 2;
  const rows = 3;
  const gy = top + 2;
  const cw = (W - 2 * M) / cols;
  // no note for the adult under the boxes: they go down to the footer
  const ch = (BOTTOM + 10 - gy) / rows;
  const size = Math.min(...phrases.map((p) => fitSize(p, level === 'CP' ? 6.5 : 5.6, cw - 10)));
  phrases.forEach((p, i) => {
    const x = M + (i % cols) * cw;
    const y = gy + Math.floor(i / cols) * ch;
    ops.push({ t: 'text', x: x + cw / 2, y: y + 8, text: p, size, fill: INK, weight: 'bold', align: 'center' });
    ops.push({ t: 'rect', x: x + 2, y: y + 12, w: cw - 4, h: ch - 16, rx: 4, fill: PAPER, stroke: INK, strokeWidth: 0.5 });
  });
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── „Completează propoziția” ─────────────────────────

export interface FillItem extends FillSentence {
  /** The three words as printed, left to right. */
  options: string[];
}

export function fillLayout(n: number): FillItem[] {
  const rand = rng(seedOf(`read:fill:${n}`));
  return FILL_SETS[n - 1].map((f) => ({ ...f, options: shuffle([f.answer, ...f.others], rand) }));
}

const GAP_MARK = '___';

interface Placed { text: string; x: number; line: number; gap?: boolean }

/** Words and the gap of a sentence on lines of `width` mm; the gap is `gapW` mm wide. */
function placeSentence(text: string, size: number, width: number, gapW: number): Placed[] {
  const out: Placed[] = [];
  const space = textW(' ', size);
  let x = 0;
  let line = 0;
  for (const raw of text.split(' ')) {
    const isGap = raw.startsWith(GAP_MARK);
    const tail = isGap ? raw.slice(GAP_MARK.length) : '';
    const w = isGap ? gapW + textW(tail, size) : textW(raw, size);
    if (x > 0 && x + w > width) {
      line++;
      x = 0;
    }
    if (isGap) {
      out.push({ text: '', x, line, gap: true });
      if (tail) out.push({ text: tail, x: x + gapW, line });
    } else {
      // a word after a word on the same line joins its text (one text per run of words)
      const prev = out[out.length - 1];
      if (prev && !prev.gap && prev.line === line) prev.text += ` ${raw}`;
      else out.push({ text: raw, x, line });
    }
    x += w + space;
  }
  return out;
}

function fillPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const level = READING_LEVELS.fill[n - 1];
  const top = frame(ops, config, READ_KIND_TITLES.fill, 'Completează propoziția cu cuvântul potrivit.', 'Încercuiește cuvântul potrivit și scrie-l pe linie. Prima propoziție este exemplul.');
  const items = fillLayout(n);
  const gy = top + 3;
  const blockH = (BOTTOM - gy) / items.length;
  const size = level === 'I' ? 5.6 : 5;
  const left = M + 11;
  const width = W - M - left;
  const lineH = size * 1.75;
  items.forEach((f, i) => {
    const y = gy + i * blockH;
    if (i) ops.push({ t: 'line', x1: M, y1: y - 1.5, x2: W - M, y2: y - 1.5, stroke: CELL_STROKE, strokeWidth: 0.4 });
    const gapW = Math.max(30, textW(f.answer, size) + 10);
    const placed = placeSentence(f.text, size, width, gapW);
    const base = y + 7;
    numberDisc(ops, M + 4, base - 1.8, i + 1);
    for (const p of placed) {
      const py = base + p.line * lineH;
      if (p.gap) {
        ops.push({ t: 'line', x1: left + p.x, y1: py + 1, x2: left + p.x + gapW, y2: py + 1, stroke: INK, strokeWidth: 0.45 });
        if (i === 0) ops.push({ t: 'text', x: left + p.x + gapW / 2, y: py - 0.2, text: f.answer, size, fill: TRACE, weight: 'bold', align: 'center' });
      } else ops.push({ t: 'text', x: left + p.x, y: py, text: p.text, size, fill: INK, weight: 'bold' });
    }
    const lines = Math.max(...placed.map((p) => p.line)) + 1;
    const oy = base + (lines - 1) * lineH + 5;
    const optSize = size * 0.92;
    let ox = left;
    f.options.forEach((o) => {
      const w = textW(o, optSize) + 9;
      const right = i === 0 && o === f.answer;
      ops.push({ t: 'rect', x: ox, y: oy, w, h: optSize * 1.75, rx: optSize * 0.87, fill: SOFT, stroke: right ? ACCENT : CELL_STROKE, strokeWidth: right ? 0.9 : 0.5 });
      ops.push({ t: 'text', x: ox + w / 2, y: oy + optSize * 1.22, text: o, size: optSize, fill: INK, weight: 'bold', align: 'center' });
      ox += w + 8;
    });
    if (i === 0) exampleTag(ops, ox + 2, oy + optSize * 1.15);
  });
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── „Ordonează cuvintele” ─────────────────────────

/** The words of each sentence of a set, in the order printed on the cards (never the right one). */
export function orderLayout(n: number): { sentence: string; cards: string[] }[] {
  return ORDER_SETS[n - 1].map((sentence, i) => {
    const words = sentence.split(' ');
    const order = derangement(words.length, rng(seedOf(`read:order:${n}:${i}`)));
    return { sentence, cards: order.map((k) => words[k]) };
  });
}

function orderPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const level = READING_LEVELS.order[n - 1];
  const top = frame(ops, config, READ_KIND_TITLES.order, 'Așază cuvintele în ordine și scrie propoziția.', 'Începe cu cuvântul scris cu literă mare; la sfârșit pune punct. Prima propoziție este exemplul.');
  const items = orderLayout(n);
  const gy = top + 3;
  const blockH = (BOTTOM - gy) / items.length;
  const left = M + 11;
  const room = W - M - left;
  // the usual ruling of the class, a little smaller when the example would not fit on the row
  const s = Math.min(RULE_S[level], (room - 6) / cursiveLine(items[0].sentence, 0, 0, 1).width);
  const gap = 4;
  items.forEach(({ sentence, cards }, i) => {
    const y = gy + i * blockH;
    if (i) ops.push({ t: 'line', x1: M, y1: y - 1.5, x2: W - M, y2: y - 1.5, stroke: CELL_STROKE, strokeWidth: 0.4 });
    // the cards, smaller when the sentence is long, so they fit on one line
    const pad = 6;
    const natural = (sz: number) => cards.reduce((a, c) => a + textW(c, sz) + pad, 0) + gap * (cards.length - 1);
    const size = Math.min(level === 'I' ? 5.6 : 5, (5.6 * room) / natural(5.6));
    const h = size * 1.8;
    numberDisc(ops, M + 4, y + h / 2 + 1, i + 1);
    let x = left;
    for (const c of cards) {
      const w = textW(c, size) + pad;
      ops.push({ t: 'rect', x, y: y + 1, w, h, rx: 1.8, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.6 });
      ops.push({ t: 'text', x: x + w / 2, y: y + 1 + h / 2 + size * 0.36, text: c, size, fill: INK, weight: 'bold', align: 'center' });
      x += w + gap;
    }
    // the writing row under the cards
    const baseline = y + h + 4 + 100 * s;
    ops.push(...rulingOps(level, left, room, baseline, s));
    if (i === 0) {
      const line = cursiveLine(sentence, left + 3, baseline, s, TRACE, true);
      ops.push(...line.ops);
      exampleTag(ops, W - M, baseline + 50 * s + 3.5, 'right');
    }
  });
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── „Copiază” ─────────────────────────

function copyWordsPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const top = frame(ops, config, `${READ_KIND_TITLES.copy} cuvintele`, 'Citește cuvântul și copiază-l pe rând.', 'Scrie cuvântul de două ori, cu litere de tipar, între liniile rândului.');
  const words = COPY_SETS[n - 1];
  const gy = top + 2;
  const rowH = (BOTTOM - gy) / words.length;
  const s = RULE_S.CP;
  const pic = Math.min(18, rowH - 8);
  const x0 = M + pic + 8;
  const shown = words.map((w) => caseOf(config, w));
  const ext = inkExtent(shown.join(''));
  words.forEach((w, i) => {
    const y = gy + i * rowH;
    // the cap line of the row in the middle of its height, room left for Ă Â Î above and Ș Ț below
    const capY = y + (rowH - (ext.bottom - ext.top) * s) / 2 - ext.top * s;
    const baseline = capY + 100 * s;
    ops.push(...iconOps(READ_PICTURES[w], M + 2 + pic / 2, capY + 50 * s, pic));
    ops.push(...rulingOps('CP', x0, W - M - x0, baseline, s));
    ops.push(glyphText(shown[i], x0 + 3, capY, s, { color: INK, strokeWidth: 9 }));
    // a thin mark after the model: from here on the child writes
    const end = x0 + 3 + glyphTextWidth(shown[i], s) + 5;
    ops.push({ t: 'line', x1: end, y1: capY - 1, x2: end, y2: baseline + 1, stroke: CELL_STROKE, strokeWidth: 0.5 });
  });
  footer(ops, tier);
  return { width: W, height: H, ops };
}

/** The writing rows of each sentence (the model has a row of its own in handwriting). */
const COPY_ROWS: Record<'I' | 'II', number> = { I: 1, II: 2 };

function copySentencesPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const level = READING_LEVELS.copy[n - 1] as 'I' | 'II';
  const cursive = config.script === 'cursive';
  const top = frame(
    ops, config, `${READ_KIND_TITLES.copy} propozițiile`,
    cursive ? 'Copiază propozițiile cu litere de mână.' : 'Transcrie propozițiile cu litere de mână.',
    'Începe cu literă mare, lasă loc între cuvinte și pune punct la sfârșit.',
  );
  const sentences = COPY_SETS[n - 1];
  const gy = top + 3;
  const blockH = (BOTTOM - gy) / sentences.length;
  const rows = COPY_ROWS[level] + (cursive ? 1 : 0);
  const modelH = cursive ? 0 : 9;
  const rowGap = 4;
  // the rows as large as the block allows, never larger than the usual ruling of the class
  const left = M + 11;
  const room = W - M - left;
  const widest = cursive ? Math.max(...sentences.map((t) => cursiveLine(t, 0, 0, 1).width)) : 0;
  const s = Math.min(RULE_S[level], (blockH - modelH - 6 - (rows - 1) * rowGap) / (rows * 150), cursive ? (room - 6) / widest : Infinity);
  const size = level === 'I' ? 6 : 5.3;
  sentences.forEach((text, i) => {
    const y = gy + i * blockH;
    if (i) ops.push({ t: 'line', x1: M, y1: y - 1.5, x2: W - M, y2: y - 1.5, stroke: CELL_STROKE, strokeWidth: 0.4 });
    let rowTop = y + 1;
    if (!cursive) {
      numberDisc(ops, M + 4, y + 4.5, i + 1);
      ops.push({ t: 'text', x: left, y: y + 6.5, text, size: fitSize(text, size, room), fill: INK });
      rowTop = y + modelH + 1;
    } else numberDisc(ops, M + 4, y + 1 + 75 * s, i + 1);
    for (let r = 0; r < rows; r++) {
      const baseline = rowTop + 100 * s + r * (150 * s + rowGap);
      ops.push(...rulingOps(level, left, room, baseline, s));
      if (cursive && r === 0) ops.push(...cursiveLine(text, left + 3, baseline, s).ops);
    }
  });
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── „Citește și răspunde” ─────────────────────────

const LETTERS = ['a', 'b', 'c'];

/** A question's answer as the key gives it: „b) pe pernă”, „Nu”. */
export function textAnswer(q: ReadingText['questions'][number]): string {
  return q.options ? `${LETTERS[q.answer]}) ${q.options[q.answer]}` : q.answer === 0 ? 'Da' : 'Nu';
}

function textPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const level = READING_LEVELS.text[n - 1];
  const t = TEXT_SETS[n - 1];
  const top = frame(ops, config, READ_KIND_TITLES.text, 'Citește textul, apoi răspunde la întrebări.', 'Încercuiește răspunsul corect: litera din fața lui sau DA / NU.');
  const size = level === 'I' ? 5.6 : 4.9;
  const lh = size * 1.6;
  const boxX = M;
  const boxW = W - 2 * M;
  const inner = boxW - 16;
  const indent = 8;
  // the measured widths: the paragraph fills its box (the evaluation keeps the app's rough estimate)
  const lines = wrapLines(t.sentences.join(' '), size, inner, inner - indent, textW);
  const titleSize = level === 'I' ? 6.6 : 6;
  const boxTop = top + 2;
  const boxH = 12 + titleSize + lines.length * lh + 4;
  ops.push({ t: 'rect', x: boxX, y: boxTop, w: boxW, h: boxH, rx: 4, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.6 });
  const titleY = boxTop + 6 + titleSize;
  ops.push({ t: 'text', x: W / 2, y: titleY, text: t.title, size: titleSize, fill: INK, weight: 'bold', align: 'center' });
  if (t.picture) ops.push(...iconOps(t.picture, W / 2 + textW(t.title, titleSize) / 2 + 10, titleY - titleSize * 0.36, 11));
  lines.forEach((line, k) => ops.push({ t: 'text', x: boxX + 8 + (k === 0 ? indent : 0), y: titleY + 4 + (k + 1) * lh, text: line, size, fill: INK }));

  let y = boxTop + boxH + 9;
  const qSize = level === 'I' ? 5.2 : 4.8;
  t.questions.forEach((q, i) => {
    const label = `${i + 1}. ${q.q}`;
    ops.push({ t: 'text', x: M, y, text: label, size: fitSize(label, qSize, W - 2 * M), fill: INK, weight: 'bold' });
    const oy = y + 9;
    if (q.options) {
      const colW = (W - 2 * M - 8) / 3;
      q.options.forEach((o, k) => {
        const ox = M + 8 + k * colW;
        ops.push({ t: 'circle', cx: ox + 2.6, cy: oy - qSize * 0.34, r: 3.4, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.5 });
        ops.push({ t: 'text', x: ox + 2.6, y: oy, text: LETTERS[k], size: qSize, fill: INK, weight: 'bold', align: 'center' });
        ops.push({ t: 'text', x: ox + 8, y: oy, text: o, size: Math.min(qSize, (qSize * (colW - 12)) / textW(o, qSize)), fill: INK });
      });
    } else {
      ['DA', 'NU'].forEach((o, k) => {
        const ox = M + 8 + k * 26;
        ops.push({ t: 'rect', x: ox, y: oy - qSize - 0.6, w: 18, h: qSize * 1.6, rx: qSize * 0.8, fill: PAPER, stroke: INK, strokeWidth: 0.5 });
        ops.push({ t: 'text', x: ox + 9, y: oy, text: o, size: qSize, fill: INK, weight: 'bold', align: 'center' });
      });
    }
    y = oy + 12;
  });
  // the room left: a box to draw what the child liked
  const drawTop = y - 2;
  if (BOTTOM - drawTop > 36) {
    const label = 'Desenează ce ți-a plăcut cel mai mult din text.';
    ops.push({ t: 'text', x: M, y: drawTop + 4, text: label, size: 4.2, fill: INK, weight: 'bold' });
    ops.push({ t: 'rect', x: M, y: drawTop + 8, w: W - 2 * M, h: BOTTOM - drawTop - 8, rx: 4, fill: PAPER, stroke: INK, strokeWidth: 0.45 });
  }
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── entry point ─────────────────────────

/** The page of one reading item, or null when the item is not one. */
export function buildReadingPage(config: WorksheetConfig, item: string, tier: Tier): PageOps | null {
  if (!isReadingItem(item)) return null;
  const [kind, n] = readingParts(item);
  switch (kind) {
    case 'match':
      return matchPage(config, n, tier);
    case 'gap':
      return gapPage(config, n, tier);
    case 'draw':
      return drawPage(config, n, tier);
    case 'fill':
      return fillPage(config, n, tier);
    case 'order':
      return orderPage(config, n, tier);
    case 'copy':
      return READING_LEVELS.copy[n - 1] === 'CP' ? copyWordsPage(config, n, tier) : copySentencesPage(config, n, tier);
    case 'text':
      return textPage(config, n, tier);
  }
}

// ───────────────────────── answers page ─────────────────────────

/** The answers of a reading item for the answers page (game-keys.ts); null for „Citește și desenează” and „Copiază”. */
export function readingKeySection(config: WorksheetConfig, item: string): { title: string; entries: string[]; perLine: number; numbered?: boolean } | null {
  if (!isReadingItem(item)) return null;
  const [kind, n] = readingParts(item);
  const level = READING_LEVELS[kind][n - 1];
  const title = readingLabel(item);
  switch (kind) {
    case 'match': {
      const { words, pictures } = matchLayout(n);
      // the pictures have no numbers on the page: counted from the top, as the adult reads them
      return { title: `${title}: imaginile numărate de sus în jos`, entries: words.map((w) => `${readCase(config, level, w)} – imaginea ${pictures.indexOf(w) + 1}`), perLine: 3 };
    }
    case 'gap':
      return { title, entries: gapLayout(n).map((g) => `${readCase(config, level, g.word)} – ${readCase(config, level, g.answer)}`), perLine: 4, numbered: true };
    case 'fill':
      return { title, entries: fillLayout(n).map((f) => f.text.replace(GAP_MARK, f.answer)), perLine: 1, numbered: true };
    case 'order':
      return { title, entries: orderLayout(n).map((o) => o.sentence), perLine: 1, numbered: true };
    case 'text':
      return { title: `${title}: „${TEXT_SETS[n - 1].title}”`, entries: TEXT_SETS[n - 1].questions.map(textAnswer), perLine: 3, numbered: true };
    default:
      return null;
  }
}

// ───────────────────────── evaluation blocks ─────────────────────────

type Area = EvalArea;

/** An item of an „Evaluare” (evaluation.ts reads it as one of its blocks). */
export type ReadingEvalBlock = EvalBlock;

const evalLetter = (i: number) => `${String.fromCharCode(97 + i)})`;

/** The first `k` of `xs` whose word is not in `used` yet (then the others), in their order; marks them used. */
function freshWords<T>(xs: T[], k: number, word: (x: T) => string, used: Set<string>): T[] {
  const keep = new Set([...xs.filter((x) => !used.has(word(x))), ...xs.filter((x) => used.has(word(x)))].slice(0, k));
  const out = xs.filter((x) => keep.has(x));
  for (const x of out) used.add(word(x));
  return out;
}

/** Every word with a picture an item shows (so an evaluation can leave them to it). */
export function readingPictureWords(item: string): string[] {
  if (!isReadingItem(item)) return [];
  const [kind, n] = readingParts(item);
  if (kind === 'match') return MATCH_SETS[n - 1];
  if (kind === 'gap') return GAP_SETS[n - 1].map((g) => g.word);
  return [];
}

/** The short form of a reading item in an evaluation; null for the kinds without one (draw, copy). */
export function readingEvalBlock(config: WorksheetConfig, item: string, used: Set<string>): ReadingEvalBlock | null {
  if (!isReadingItem(item)) return null;
  const [kind, n] = readingParts(item);
  const level = READING_LEVELS[kind][n - 1];
  const rc = (t: string) => readCase(config, level, t);
  const cell = (ops: DrawOp[], x: number, y: number, w: number, h: number) => ops.push({ t: 'rect', x, y, w, h, rx: 3.5, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.5 });
  switch (kind) {
    case 'match': {
      // four words over four pictures in another order: the child joins each word to its picture
      const words = freshWords(matchLayout(n).words, 4, (w) => w, used);
      const order = derangement(words.length, rng(seedOf(`eval:${item}`)));
      const pictures = order.map((i) => words[i]);
      return {
        item, title: READ_KIND_TITLES.match, prompt: 'Unește fiecare cuvânt cu imaginea potrivită.', perLine: 4, score: words.length,
        answers: words.map((w, i) => `${evalLetter(i)} ${rc(w)} – ${pictures.indexOf(w) + 1}`),
        parts: onePart(62, 8, (ops: DrawOp[], a: Area) => {
          const cw = a.w / words.length;
          const cardH = 13;
          const size = Math.min(...words.map((w) => fitSize(rc(w), 6, cw - 12)));
          // between the words and the pictures: the room to draw the lines in (a tighter block gives up some of it first)
          const between = Math.max(10, Math.min(16, a.h - 46));
          const pic = Math.min(cw - 14, a.h - cardH - 6 - between);
          words.forEach((w, i) => {
            const x = a.x + i * cw;
            ops.push({ t: 'rect', x: x + 3, y: a.y, w: cw - 6, h: cardH, rx: 3, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.5 });
            ops.push({ t: 'text', x: x + 5.5, y: a.y + 4.6, text: evalLetter(i), size: 3, fill: MUTED, weight: 'bold' });
            ops.push({ t: 'text', x: x + cw / 2, y: a.y + cardH / 2 + size * 0.36, text: rc(w), size, fill: INK, weight: 'bold', align: 'center' });
            ops.push({ t: 'circle', cx: x + cw / 2, cy: a.y + cardH + 3, r: 1.2, fill: INK });
          });
          pictures.forEach((w, i) => {
            const x = a.x + i * cw;
            const top = a.y + a.h - pic - 6;
            ops.push({ t: 'circle', cx: x + cw / 2, cy: top - 3, r: 1.2, fill: INK });
            cell(ops, x + 3, top, cw - 6, pic + 6);
            ops.push({ t: 'text', x: x + 5.5, y: top + 4.6, text: String(i + 1), size: 3, fill: MUTED, weight: 'bold' });
            ops.push(...iconOps(READ_PICTURES[w], x + cw / 2, top + 3 + pic / 2, pic));
          });
        }, 54),
      };
    }
    case 'gap': {
      const items = freshWords(gapLayout(n), 4, (g) => g.word, used);
      return {
        item, title: READ_KIND_TITLES.gap, prompt: 'Scrie în căsuță litera care lipsește.', perLine: 4, score: items.length,
        answers: items.map((g, i) => `${evalLetter(i)} ${rc(g.word)} – ${rc(g.answer)}`),
        parts: onePart(52, 6, (ops: DrawOp[], a: Area) => {
          const cw = a.w / items.length;
          const pic = Math.min(cw - 14, a.h - 30);
          const longest = Math.max(...items.map((g) => textW(rc(g.word), 1) + 1));
          const size = Math.min(6.2, (cw - 8) / longest);
          items.forEach((g, i) => {
            const x = a.x + i * cw;
            cell(ops, x + 1.2, a.y, cw - 2.4, a.h);
            ops.push({ t: 'text', x: x + 3.5, y: a.y + 4.8, text: evalLetter(i), size: 3, fill: MUTED, weight: 'bold' });
            ops.push(...iconOps(READ_PICTURES[g.word], x + cw / 2, a.y + 3 + pic / 2, pic));
            // the word with its gap, centred
            const word = gapWord(rc(g.word), g.at, gapBox(g, config, level, size), size);
            ops.push(...word.draw(x + cw / 2 - word.width / 2, a.y + pic + 9));
            g.options.forEach((o, k) => {
              const ox = x + cw / 2 + (k - 1) * 10;
              ops.push({ t: 'circle', cx: ox, cy: a.y + a.h - 7, r: 4, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.5 });
              ops.push({ t: 'text', x: ox, y: a.y + a.h - 5.4, text: rc(o), size: 4.4, fill: INK, weight: 'bold', align: 'center' });
            });
          });
        }, 47),
      };
    }
    case 'fill': {
      const items = fillLayout(n).slice(0, 3);
      const size = level === 'I' ? 5 : 4.6;
      return {
        item, title: READ_KIND_TITLES.fill, prompt: 'Încercuiește cuvântul potrivit și scrie-l pe linie.', perLine: 1, score: items.length,
        answers: items.map((f, i) => `${evalLetter(i)} ${f.text.replace(GAP_MARK, f.answer)}`),
        // a sentence a row: a page break may fall between two of them
        parts: rowParts(items.length, 21, 19, 3, (ops, a, i) => {
          const f = items[i];
          {
            const y = a.y;
            const gapW = Math.max(28, textW(f.answer, size) + 9);
            const placed = placeSentence(f.text, size, a.w - 10, gapW);
            const base = y + size + 1;
            ops.push({ t: 'text', x: a.x, y: base, text: evalLetter(i), size: 3.4, fill: MUTED, weight: 'bold' });
            for (const p of placed) {
              const py = base + p.line * size * 1.6;
              if (p.gap) ops.push({ t: 'line', x1: a.x + 8 + p.x, y1: py + 1, x2: a.x + 8 + p.x + gapW, y2: py + 1, stroke: INK, strokeWidth: 0.45 });
              else ops.push({ t: 'text', x: a.x + 8 + p.x, y: py, text: p.text, size, fill: INK, weight: 'bold' });
            }
            const lines = Math.max(...placed.map((p) => p.line)) + 1;
            const oy = base + (lines - 1) * size * 1.6 + 3.5;
            let ox = a.x + 8;
            const os = size * 0.9;
            for (const o of f.options) {
              const w = textW(o, os) + 8;
              ops.push({ t: 'rect', x: ox, y: oy, w, h: os * 1.7, rx: os * 0.85, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.5 });
              ops.push({ t: 'text', x: ox + w / 2, y: oy + os * 1.2, text: o, size: os, fill: INK, weight: 'bold', align: 'center' });
              ox += w + 6;
            }
          }
        }),
      };
    }
    case 'order': {
      const items = orderLayout(n).slice(1, 3);
      const s = level === 'I' ? 0.1 : 0.085;
      return {
        item, title: READ_KIND_TITLES.order, prompt: 'Așază cuvintele în ordine și scrie propoziția.', perLine: 1, score: items.length,
        answers: items.map((o, i) => `${evalLetter(i)} ${o.sentence}`),
        parts: rowParts(items.length, 34, 34, 3, (ops, a, i) => {
          const { cards } = items[i];
          {
            const y = a.y;
            const pad = 5;
            const room = a.w - 8;
            const natural = (sz: number) => cards.reduce((t, c) => t + textW(c, sz) + pad, 0) + 3.5 * (cards.length - 1);
            const size = Math.min(5, (5 * room) / natural(5));
            const h = size * 1.8;
            ops.push({ t: 'text', x: a.x, y: y + h / 2 + 2.2, text: evalLetter(i), size: 3.4, fill: MUTED, weight: 'bold' });
            let x = a.x + 8;
            for (const c of cards) {
              const w = textW(c, size) + pad;
              ops.push({ t: 'rect', x, y: y + 1, w, h, rx: 1.6, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.5 });
              ops.push({ t: 'text', x: x + w / 2, y: y + 1 + h / 2 + size * 0.36, text: c, size, fill: INK, weight: 'bold', align: 'center' });
              x += w + 3.5;
            }
            ops.push(...rulingOps(level, a.x + 8, a.w - 8, y + h + 4 + 100 * s, s));
          }
        }),
      };
    }
    case 'text': {
      const t = TEXT_SETS[n - 1];
      const size = level === 'I' ? 4.8 : 4.4;
      const lh = size * 1.55;
      const measure = (w: number) => wrapLines(t.sentences.join(' '), size, w - 12, w - 18);
      const qH = 15;
      const textH = (w: number) => 10 + size + measure(w).length * lh + 3;
      return {
        item, title: `${READ_KIND_TITLES.text}: „${t.title}”`, prompt: 'Citește textul și încercuiește răspunsul corect.', perLine: 3, score: t.questions.length,
        // the questions are numbered „1)”, their options lettered a, b, c
        answers: t.questions.map((q, i) => `${i + 1}) ${q.options ? `${LETTERS[q.answer]} – ${q.options[q.answer]}` : textAnswer(q)}`),
        // in one piece: at this age the text stays on the same page as its questions
        parts: onePart(textH(W - 2 * M) + 4 + t.questions.length * qH, 6, (ops: DrawOp[], a: Area) => {
          const lines = measure(a.w);
          const boxH = textH(a.w);
          ops.push({ t: 'rect', x: a.x, y: a.y, w: a.w, h: boxH, rx: 3.5, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.5 });
          ops.push({ t: 'text', x: a.x + a.w / 2, y: a.y + 5 + size, text: t.title, size: size * 1.1, fill: INK, weight: 'bold', align: 'center' });
          lines.forEach((line, k) => ops.push({ t: 'text', x: a.x + 6 + (k === 0 ? 6 : 0), y: a.y + 7 + size + (k + 1) * lh, text: line, size, fill: INK }));
          const step = (a.h - boxH - 4) / t.questions.length;
          t.questions.forEach((q, i) => {
            const y = a.y + boxH + 4 + i * step + 5;
            const label = `${i + 1}) ${q.q}`;
            ops.push({ t: 'text', x: a.x, y, text: label, size: fitSize(label, 4.2, a.w), fill: INK, weight: 'bold' });
            const oy = y + 7;
            if (q.options) {
              const colW = (a.w - 8) / 3;
              q.options.forEach((o, k) => {
                const ox = a.x + 8 + k * colW;
                ops.push({ t: 'circle', cx: ox + 2.2, cy: oy - 1.4, r: 2.9, fill: PAPER, stroke: CELL_STROKE, strokeWidth: 0.5 });
                ops.push({ t: 'text', x: ox + 2.2, y: oy, text: LETTERS[k], size: 4, fill: INK, weight: 'bold', align: 'center' });
                ops.push({ t: 'text', x: ox + 7, y: oy, text: o, size: fitSize(o, 4, colW - 10), fill: INK });
              });
            } else
              ['DA', 'NU'].forEach((o, k) => {
                const ox = a.x + 8 + k * 22;
                ops.push({ t: 'rect', x: ox, y: oy - 4.6, w: 15, h: 6.4, rx: 3.2, fill: PAPER, stroke: INK, strokeWidth: 0.45 });
                ops.push({ t: 'text', x: ox + 7.5, y: oy, text: o, size: 4, fill: INK, weight: 'bold', align: 'center' });
              });
          });
        }, textH(W - 2 * M) + 4 + t.questions.length * (qH - 1.2)),
      };
    }
    default:
      return null;
  }
}
