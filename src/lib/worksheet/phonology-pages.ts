import type { DrawOp, PageOps } from '@/lib/glyphs/types';
import type { Tier, WorksheetConfig } from '@/types';
import { getGlyph } from '@/lib/glyphs/data';
import { glyphBounds } from '@/lib/glyphs/render';
import { iconOps } from '@/lib/hints/icons';
import { madeWith } from '@/lib/brand';
import { textWidthMm } from '@/lib/book/text';
import { INK, ACCENT, PAPER, MUTED, itemOps, itemWidth } from './rows';
import { PHONO_WORDS, type PhonoWord } from './phonology';

/**
 * „Sunete și silabe”: full-page phonological-awareness activities, one page per item, in the
 * „Jocuri” category next to find:X / count:N / dots:shape (see activities.ts):
 *
 * - "sound:A"  Sunetul de la început — circle the pictures whose word starts with the sound;
 * - "first:1"  Primul sunet — write under each picture the letter its word starts with;
 * - "syl:1"    Câte silabe? — colour one dot per syllable of the pictured word;
 * - "split:1"  Desparte în silabe — trace the syllables in their boxes, then write them alone.
 *
 * Set 1 of each kind (and the sounds A–E) uses only words starting with the free letters A–E.
 * Layouts are seeded by the item, so the preview and the PDF are the same sheet every time.
 */

/** Sounds with enough pictures (at least four) for a page. */
export const SOUND_LETTERS = ['A', 'B', 'C', 'D', 'F', 'L', 'M', 'P', 'R', 'S', 'T', 'U', 'V'] as const;
export const PHONO_SETS = 6;
const SET_NUMBERS = Array.from({ length: PHONO_SETS }, (_, i) => String(i + 1));

export type PhonoKind = 'sound' | 'first' | 'syl' | 'split';
export const PHONO_KIND_TITLES: Record<PhonoKind, string> = {
  sound: 'Sunetul de la început',
  first: 'Primul sunet',
  syl: 'Câte silabe?',
  split: 'Desparte în silabe',
};

const PHONO_ITEM = /^(sound:(A|B|C|D|F|L|M|P|R|S|T|U|V)|(first|syl|split):[1-6])$/;

export function isPhonologyItem(item: string): boolean {
  return PHONO_ITEM.test(item);
}

/** Every phonology item, in picker order. */
export function phonologyItems(): string[] {
  return [
    ...SOUND_LETTERS.map((l) => `sound:${l}`),
    ...(['first', 'syl', 'split'] as const).flatMap((k) => SET_NUMBERS.map((n) => `${k}:${n}`)),
  ];
}

export function phonologyLabel(item: string): string {
  const [kind, arg] = item.split(':') as [PhonoKind, string];
  if (kind === 'sound') return `Sunetul ${arg}`;
  return `${PHONO_KIND_TITLES[kind] ?? kind} (${arg})`;
}

// ───────────────────────── word sets ─────────────────────────

const FREE_INITIALS = new Set(['A', 'B', 'C', 'D', 'E']);
const isFreeWord = (w: PhonoWord) => FREE_INITIALS.has(w.initial);

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

function shuffle<T>(xs: T[], rand: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Words taken in turn from each initial, so a set mixes many sounds. */
function roundRobin(words: PhonoWord[], seed: string): PhonoWord[] {
  const rand = rng(seedOf(seed));
  const groups = new Map<string, PhonoWord[]>();
  for (const w of shuffle(words, rand)) groups.set(w.initial, [...(groups.get(w.initial) ?? []), w]);
  const lists = shuffle([...groups.values()], rand);
  const out: PhonoWord[] = [];
  for (let i = 0; out.length < words.length; i++) for (const l of lists) if (l[i]) out.push(l[i]);
  return out;
}

/** The pictures of a sound page: up to five that start with the sound, the rest with other sounds. */
export function soundSet(letter: string): { words: PhonoWord[]; targets: number } {
  const rand = rng(seedOf(`sound:${letter}`));
  const targets = shuffle(PHONO_WORDS.filter((w) => w.initial === letter), rand).slice(0, 5);
  const others = shuffle(PHONO_WORDS.filter((w) => w.initial !== letter), rand).slice(0, 12 - targets.length);
  return { words: shuffle([...targets, ...others], rand), targets: targets.length };
}

/** Twelve pictures for „Primul sunet”: set 1 from A–E, the others from the other sounds. */
export function firstSet(n: number): PhonoWord[] {
  if (n === 1) return roundRobin(PHONO_WORDS.filter(isFreeWord), 'first').slice(0, 12);
  const pool = roundRobin(PHONO_WORDS.filter((w) => !isFreeWord(w)), 'first');
  return Array.from({ length: 12 }, (_, i) => pool[((n - 2) * 12 + i) % pool.length]);
}

/** Pick `per` words of the given pool for set n (set 1 = A–E words, later sets the rest, cycling). */
function pick(pool: PhonoWord[], n: number, per: number, seed: string): PhonoWord[] {
  const free = shuffle(pool.filter(isFreeWord), rng(seedOf(`${seed}:free`)));
  const rest = shuffle(pool.filter((w) => !isFreeWord(w)), rng(seedOf(`${seed}:rest`)));
  if (n === 1) return free.slice(0, per);
  return Array.from({ length: per }, (_, i) => rest[((n - 2) * per + i) % rest.length]);
}

/** Eight words for „Câte silabe?”: two each of 1, 2, 3 and 4 syllables. */
export function sylSet(n: number): PhonoWord[] {
  const words = [1, 2, 3, 4].flatMap((c) => pick(PHONO_WORDS.filter((w) => w.syllables.length === c), n, 2, `syl${c}`));
  return shuffle(words, rng(seedOf(`syl:${n}`)));
}

/** Five words for „Desparte în silabe”: three of two syllables, two of three (room to write them large). */
export function splitSet(n: number): PhonoWord[] {
  const words = [2, 3].flatMap((c) => pick(PHONO_WORDS.filter((w) => w.syllables.length === c), n, c === 2 ? 3 : 2, `split${c}`));
  return shuffle(words, rng(seedOf(`split:${n}`)));
}

// ───────────────────────── page frame ─────────────────────────

const W = 210;
const H = 297;
const M = 12;
/** Bottom of the activity area: the line under it holds the words for the adult, then the footer. */
const BOTTOM = H - M - 20;

/** The same header as the other games (activities.ts), plus an optional second line of help. */
function frame(ops: DrawOp[], config: WorksheetConfig, title: string, instruction: string, help?: string): number {
  ops.push({ t: 'text', x: M, y: M + 6.5, text: title, size: 6.5, fill: INK, weight: 'bold' });
  ops.push({ t: 'text', x: M, y: M + 14.5, text: `Nume: ${config.childName?.trim() || '______________'}     Data: ____________`, size: 3.6, fill: '#334155' });
  ops.push({ t: 'text', x: W - M, y: M + 6, text: 'WorksheetWiz', size: 3.2, fill: MUTED, weight: 'bold', align: 'right' });
  ops.push({ t: 'line', x1: M, y1: M + 18.5, x2: W - M, y2: M + 18.5, stroke: ACCENT, strokeWidth: 0.6 });
  ops.push({ t: 'text', x: M, y: M + 28, text: instruction, size: 4.6, fill: INK, weight: 'bold' });
  if (!help) return M + 34;
  ops.push({ t: 'text', x: M, y: M + 34.5, text: help, size: 3.6, fill: '#334155' });
  return M + 39;
}

/** For the adult: the names of the pictures, in reading order, so nobody guesses another name. */
function wordKey(ops: DrawOp[], words: PhonoWord[]): void {
  const text = `Imaginile, în ordine: ${words.map((w) => w.word).join(', ')}.`;
  const size = Math.min(2.8, (2.8 * (W - 2 * M)) / Math.max(1, textWidthMm(text, 2.8) * 1.04));
  ops.push({ t: 'text', x: M, y: BOTTOM + 7, text, size, fill: MUTED });
}

function footer(ops: DrawOp[], tier: Tier): void {
  if (tier === 'free') ops.push({ t: 'text', x: W - M, y: H - M + 2, text: madeWith('ro'), size: 2.6, fill: '#94a3b8', align: 'right' });
}

const caseOf = (config: WorksheetConfig, text: string) => (config.letterMode === 'uppercase' ? text.toLocaleUpperCase('ro') : text.toLocaleLowerCase('ro'));

/** Glyphs of a text, placed with its left edge at x and its cap line at `capY` (s = mm per glyph unit). */
function glyphText(text: string, x: number, capY: number, s: number, style: Partial<Parameters<typeof itemOps>[1]> = {}): DrawOp {
  const glyphs = [...text].map((c) => getGlyph(c)).filter((g) => !!g);
  return {
    t: 'group',
    tx: x,
    ty: capY,
    scale: s,
    ops: itemOps(glyphs, { color: INK, strokeWidth: 10, variant: 'solid', startDots: false, arrows: false, accent: ACCENT, dotText: PAPER, paper: PAPER, ...style }),
  };
}

function glyphTextWidth(text: string, s: number): number {
  return itemWidth([...text].map((c) => getGlyph(c)).filter((g) => !!g)) * s;
}

/** Vertical ink extent of a text in glyph units (accents above 0, tails and commas below 100). */
function inkExtent(text: string): { top: number; bottom: number } {
  const b = [...text].map((c) => getGlyph(c)).filter((g) => !!g).map((g) => glyphBounds(g, 10));
  return { top: Math.min(0, ...b.map((x) => x.minY)), bottom: Math.max(100, ...b.map((x) => x.maxY)) };
}

const CELL_STROKE = '#E6DECD';
const TRACE = '#8AA0BC';

// ───────────────────────── Sunetul de la început ─────────────────────────

function soundPage(config: WorksheetConfig, letter: string, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const top = frame(ops, config, `Sunetul de la început: ${letter}`, `Încercuiește imaginile care încep cu sunetul ${letter}.`, 'Spune cu voce tare numele fiecărei imagini și ascultă primul sunet.');
  const { words } = soundSet(letter);

  // the letter, capital and small, in a band above the grid, with the „how many?” box
  const band = 30;
  const pair = `${letter}${letter.toLocaleLowerCase('ro')}`;
  const ext = inkExtent(pair);
  const s = Math.min(0.2, (band - 6) / (ext.bottom - ext.top));
  ops.push({ t: 'rect', x: M, y: top + 2, w: glyphTextWidth(pair, s) + 14, h: band - 2, rx: 3, fill: '#FFF7ED', stroke: ACCENT, strokeWidth: 0.5 });
  ops.push(glyphText(pair, M + 7, top + 2 + (band - 2) / 2 - ((ext.top + ext.bottom) / 2) * s, s, { color: INK }));
  ops.push({ t: 'text', x: W - M - 32, y: top + band / 2 + 3.5, text: 'Am încercuit:', size: 4, fill: INK, weight: 'bold', align: 'right' });
  ops.push({ t: 'rect', x: W - M - 28, y: top + band / 2 - 7, w: 28, h: 16, rx: 2, stroke: INK, strokeWidth: 0.6, dash: [1.4, 1.2] });

  const gy = top + band + 4;
  const cols = 3;
  const rows = 4;
  const cw = (W - 2 * M) / cols;
  const ch = (BOTTOM - gy) / rows;
  const size = Math.min(cw, ch) - 9;
  words.forEach((w, i) => {
    const x = M + (i % cols) * cw;
    const y = gy + Math.floor(i / cols) * ch;
    ops.push({ t: 'rect', x: x + 1.5, y: y + 1.5, w: cw - 3, h: ch - 3, rx: 4, stroke: CELL_STROKE, strokeWidth: 0.5 });
    ops.push(...iconOps(w.picture, x + cw / 2, y + ch / 2, size));
  });
  wordKey(ops, words);
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── Primul sunet ─────────────────────────

function firstPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const top = frame(ops, config, 'Primul sunet', 'Scrie în căsuță litera cu care începe cuvântul.', 'Spune numele imaginii, ascultă primul sunet și scrie litera lui. Prima căsuță este exemplul.');
  const words = firstSet(n);
  const cols = 3;
  const rows = 4;
  const gy = top + 3;
  const cw = (W - 2 * M) / cols;
  const ch = (BOTTOM - gy) / rows;
  const box = 16;
  const size = ch - box - 9;
  words.forEach((w, i) => {
    const x = M + (i % cols) * cw;
    const y = gy + Math.floor(i / cols) * ch;
    ops.push({ t: 'rect', x: x + 1.5, y: y + 1.5, w: cw - 3, h: ch - 3, rx: 4, stroke: CELL_STROKE, strokeWidth: 0.5 });
    ops.push(...iconOps(w.picture, x + cw / 2, y + 3 + size / 2, size));
    // the box to write in: the three writing lines of the other sheets
    const bx = x + cw / 2 - box / 2;
    const by = y + ch - box - 3.5;
    ops.push({ t: 'rect', x: bx, y: by, w: box, h: box, rx: 2, fill: PAPER, stroke: INK, strokeWidth: 0.6 });
    ops.push({ t: 'line', x1: bx + 2, y1: by + box / 2, x2: bx + box - 2, y2: by + box / 2, stroke: '#DCE6F2', strokeWidth: 0.3, dash: [1, 1] });
    if (i === 0) {
      // the example: the letter to trace, in the case the sheet uses
      const l = caseOf(config, w.initial);
      const ext = inkExtent(l);
      const s = (box - 5) / (ext.bottom - ext.top);
      ops.push(glyphText(l, bx + box / 2 - glyphTextWidth(l, s) / 2, by + box / 2 - ((ext.top + ext.bottom) / 2) * s, s, { color: TRACE, variant: 'dashed', dash: [1.2, 1.3] }));
      ops.push({ t: 'text', x: bx + box + 2, y: by + box / 2 + 1, text: 'exemplu', size: 2.8, fill: MUTED });
    }
  });
  wordKey(ops, words);
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── Câte silabe? ─────────────────────────

function sylPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const top = frame(ops, config, 'Câte silabe are cuvântul?', 'Colorează câte o bulină pentru fiecare silabă.', 'Spune cuvântul rar și bate din palme la fiecare silabă. Primul cuvânt este exemplul.');
  const words = sylSet(n);
  const cols = 2;
  const rows = 4;
  const gy = top + 3;
  const cw = (W - 2 * M) / cols;
  const ch = (BOTTOM - gy) / rows;
  const size = Math.min(34, ch - 12);
  words.forEach((w, i) => {
    const x = M + (i % cols) * cw;
    const y = gy + Math.floor(i / cols) * ch;
    ops.push({ t: 'rect', x: x + 1.5, y: y + 1.5, w: cw - 3, h: ch - 3, rx: 4, stroke: CELL_STROKE, strokeWidth: 0.5 });
    ops.push(...iconOps(w.picture, x + 6 + size / 2, y + ch / 2, size));
    const tx = x + 12 + size;
    const room = x + cw - 6 - tx;
    const word = caseOf(config, w.word);
    const fs = Math.min(6, (6 * room) / Math.max(1, textWidthMm(word, 6) * 1.1));
    ops.push({ t: 'text', x: tx, y: y + ch / 2 - 5, text: word, size: fs, fill: INK, weight: 'bold' });
    // four dots: the child colours as many as the word has syllables
    const gap = 3;
    const r = Math.min(4.6, (room - 3 * gap) / 8);
    for (let k = 0; k < 4; k++) {
      const filled = i === 0 && k < w.syllables.length;
      ops.push({ t: 'circle', cx: tx + r + k * (2 * r + gap), cy: y + ch / 2 + 8, r, fill: filled ? ACCENT : PAPER, stroke: INK, strokeWidth: 0.55 });
    }
    if (i === 0) ops.push({ t: 'text', x: x + cw - 5, y: y + 7, text: 'exemplu', size: 2.8, fill: MUTED, align: 'right' });
  });
  wordKey(ops, words);
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── Desparte în silabe ─────────────────────────

function splitPage(config: WorksheetConfig, n: number, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const top = frame(ops, config, 'Desparte în silabe', 'Urmărește silabele, apoi scrie-le singur în căsuțele goale.', 'Spune cuvântul rar și bate din palme la fiecare silabă.');
  const words = splitSet(n);
  const gy = top + 3;
  const rowH = (BOTTOM - gy) / words.length;
  const pic = Math.min(24, rowH - 9);
  const left = M + pic + 10;
  const right = W - M - 2;
  const sep = 7; // room for the hyphen between two boxes
  // one letter size for the whole page, set by the tallest ink of all its syllables
  const all = words.flatMap((w) => w.syllables.map((x) => caseOf(config, x)));
  const ext = inkExtent(all.join(''));
  const lineH = (rowH - 5) / 2;
  const s = Math.min(0.12, (lineH - 3) / (ext.bottom - ext.top));
  words.forEach((w, i) => {
    const y = gy + i * rowH;
    if (i) ops.push({ t: 'line', x1: M, y1: y, x2: W - M, y2: y, stroke: CELL_STROKE, strokeWidth: 0.4 });
    ops.push(...iconOps(w.picture, M + 2 + pic / 2, y + 2 + pic / 2, pic));
    ops.push({ t: 'text', x: M + 2 + pic / 2, y: y + pic + 5.5, text: caseOf(config, w.word), size: 3.4, fill: INK, weight: 'bold', align: 'center' });
    const syl = w.syllables.map((x) => caseOf(config, x));
    const boxW = Math.min((right - left - (syl.length - 1) * sep) / syl.length, Math.max(...syl.map((x) => glyphTextWidth(x, s))) + 10);
    for (const line of [0, 1]) {
      const by = y + 2 + line * (lineH + 1);
      syl.forEach((x, k) => {
        const bx = left + k * (boxW + sep);
        ops.push({ t: 'rect', x: bx, y: by, w: boxW, h: lineH, rx: 2, fill: PAPER, stroke: line ? INK : '#94A3B8', strokeWidth: line ? 0.5 : 0.35 });
        // writing lines inside the box: cap line, middle (dashed), baseline
        const capY = by + lineH / 2 - ((ext.top + ext.bottom) / 2) * s;
        ops.push({ t: 'line', x1: bx + 1.5, y1: capY, x2: bx + boxW - 1.5, y2: capY, stroke: '#DCE6F2', strokeWidth: 0.3 });
        ops.push({ t: 'line', x1: bx + 1.5, y1: capY + 50 * s, x2: bx + boxW - 1.5, y2: capY + 50 * s, stroke: '#DCE6F2', strokeWidth: 0.3, dash: [1, 1] });
        ops.push({ t: 'line', x1: bx + 1.5, y1: capY + 100 * s, x2: bx + boxW - 1.5, y2: capY + 100 * s, stroke: '#CBD5E1', strokeWidth: 0.35 });
        if (!line) ops.push(glyphText(x, bx + boxW / 2 - glyphTextWidth(x, s) / 2, capY, s, { color: TRACE, variant: 'dashed', dash: [1.2, 1.3] }));
        if (k < syl.length - 1) {
          const hx = bx + boxW + sep / 2;
          ops.push({ t: 'line', x1: hx - 1.6, y1: by + lineH / 2, x2: hx + 1.6, y2: by + lineH / 2, stroke: INK, strokeWidth: 0.6 });
        }
      });
    }
  });
  wordKey(ops, words);
  footer(ops, tier);
  return { width: W, height: H, ops };
}

// ───────────────────────── entry point ─────────────────────────

/** The page of one phonology item, or null when the item is not one. */
export function buildPhonologyPage(config: WorksheetConfig, item: string, tier: Tier): PageOps | null {
  if (!isPhonologyItem(item)) return null;
  const [kind, arg] = item.split(':') as [PhonoKind, string];
  if (kind === 'sound') return soundPage(config, arg, tier);
  if (kind === 'first') return firstPage(config, Number(arg), tier);
  if (kind === 'syl') return sylPage(config, Number(arg), tier);
  return splitPage(config, Number(arg), tier);
}
