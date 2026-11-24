import type { DrawOp, Glyph, PageOps } from '@/lib/glyphs/types';
import type { Script, Tier } from '@/types';
import { getGlyph, normalizeKey } from '@/lib/glyphs/data';
import { cursiveGlyph, cursiveWord } from '@/lib/glyphs/cursive';
import { glyphsForWord } from '@/lib/worksheet/layout';
import { PHONO_WORDS } from '@/lib/worksheet/phonology';
import { PICTURES } from '@/lib/worksheet/math';
import { iconOps } from '@/lib/hints/icons';
import {
  A4, INK, MUTED, GOLD_LIGHT, colorAt, cellAt, mirroredCell, cutLines, drawRun, fitScale, fitText, freeMark, page, runExtent, star, numberWord,
  type Grid,
} from './common';
import { POSTER_LETTERS, posterLetters, posterWord } from './alphabet';

/**
 * „Cartonașe”: cards to cut out, 8 or 12 on an A4 sheet, with one dashed cut line between two
 * cards. Letters (capital and small), syllables, a picture with its word, the numbers 0–20 with
 * dots or pictures in ten-frames, and numbers 0–100 for math games.
 *
 * With „spatele cartonașelor” every sheet is followed by its back: what is on each card, written
 * small (for the adult holding the card up), placed so that it lands behind its card when the two
 * sides are printed on one sheet, flipped on the long edge: same row, column mirrored.
 */

export type CardSet = 'letters' | 'syllables' | 'pictures' | 'digits' | 'numbers';
export type LetterCase = 'upper' | 'lower';

export interface CardOptions {
  set: CardSet;
  /** Letters of the letter, syllable and picture cards (capitals); empty = all. */
  letters: string[];
  perPage: 8 | 12;
  backs: boolean;
  script: Script;
  letterCase: LetterCase;
  /** Highest number (digit cards stop at 20). */
  numberMax: 10 | 20 | 100;
  /** Digit cards: pictures in the ten-frames instead of dots. */
  objects: boolean;
}

export const CARD_SET_TITLES: Record<CardSet, string> = {
  letters: 'Litere',
  syllables: 'Silabe',
  pictures: 'Imagine și cuvânt',
  digits: 'Numere cu buline',
  numbers: 'Numere pentru jocuri',
};

/** The sheet: 10 mm side margins, a line of text on top, room for the small footer at the bottom. */
export function cardGrid(perPage: 8 | 12): Grid {
  const cols = perPage === 8 ? 2 : 3;
  return { x: 10, y: 14, cols, rows: 4, cw: 190 / cols, ch: 67.5 };
}

const VOWELS = ['A', 'E', 'I', 'O', 'U', 'Ă'];
const ALL_VOWELS = new Set(['A', 'Ă', 'Â', 'E', 'I', 'Î', 'O', 'U']);
/** Consonants paired with the chosen vowels when only vowels are picked (the first ones a primer teaches). */
const FIRST_CONSONANTS = ['M', 'N', 'P', 'R', 'S', 'T', 'L', 'C'];

/** The open syllables (consonant + vowel) of the phonology words, the most frequent first. */
export function commonSyllables(limit = 24): string[] {
  const count = new Map<string, number>();
  for (const w of PHONO_WORDS)
    for (const syl of w.syllables) {
      const up = normalizeKey(syl).toUpperCase();
      const chars = [...up];
      if (chars.length === 2 && !ALL_VOWELS.has(chars[0]) && VOWELS.includes(chars[1])) count.set(up, (count.get(up) ?? 0) + 1);
    }
  return [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ro')).slice(0, limit).map(([s]) => s);
}

/**
 * The syllables for the chosen letters, as a primer builds them: each chosen consonant with each
 * chosen vowel (MA, ME, MU for M, A, E, U); a consonant alone goes with every vowel, vowels alone go
 * with the first consonants of the primer. Nothing chosen: the most frequent syllables of the words.
 */
export function syllableList(letters: string[]): string[] {
  if (!letters.length) return commonSyllables();
  const chosen = posterLetters(letters);
  const consonants = chosen.filter((l) => !ALL_VOWELS.has(l));
  const vowels = chosen.filter((l) => VOWELS.includes(l) || l === 'Â');
  const cs = consonants.length ? consonants : FIRST_CONSONANTS;
  const vs = vowels.length ? vowels : VOWELS;
  return cs.flatMap((c) => vs.map((v) => c + v));
}

/** The picture cards: words of the phonology data (one usual name per picture) that start with the chosen letters. */
export function pictureWords(letters: string[]) {
  const set = new Set(posterLetters(letters));
  return letters.length ? PHONO_WORDS.filter((w) => set.has(w.initial)) : PHONO_WORDS;
}

export interface Card {
  /** What the card shows, written out (on its back, and in the tests). */
  label: string;
  /** A second, smaller line on the back. */
  sub?: string;
  draw: (ops: DrawOp[], x: number, y: number, w: number, h: number) => void;
}

const inCase = (text: string, c: LetterCase) => (c === 'upper' ? normalizeKey(text).toUpperCase() : normalizeKey(text).toLowerCase());

/** One scale and baseline for all the runs of a set, so the cards of a set match. */
function runFrame(runs: Glyph[][], stroke: number, w: number, h: number, max: number, gap?: number) {
  const s = fitScale(runs, stroke, w, h, max, gap);
  let top = 0, bottom = 100;
  for (const r of runs) {
    const e = runExtent(r, stroke);
    top = Math.min(top, e.top);
    bottom = Math.max(bottom, e.bottom);
  }
  // baseline from the top of the box, the ink of the whole set centred in it
  const offset = (h - (bottom - top) * s) / 2 - top * s + 100 * s;
  return { s, offset };
}

function letterCards(o: CardOptions, g: Grid): Card[] {
  const pick = o.script === 'cursive' ? cursiveGlyph : getGlyph;
  const stroke = o.script === 'cursive' ? 8 : 11;
  const letters = posterLetters(o.letters);
  const runs = letters.map((l) => [pick(l), pick(l.toLowerCase())].filter((x): x is Glyph => !!x));
  const f = runFrame(runs, stroke, g.cw - 16, g.ch - 18, 0.32, 26);
  return letters.map((l, i) => ({
    label: `${l}${l.toLowerCase()}`,
    sub: posterWord(l)?.word,
    draw: (ops, x, y, w) => {
      drawRun(ops, runs[i], x + w / 2, y + 9 + f.offset, f.s, { variant: 'solid', stroke, colors: colorAt(POSTER_LETTERS.indexOf(l)) }, 26);
    },
  }));
}

function syllableCards(o: CardOptions, g: Grid): Card[] {
  const list = syllableList(o.letters).map((s) => inCase(s, o.letterCase));
  const runs = list.map((s) => glyphsForWord(s));
  const f = runFrame(runs, 11, g.cw - 18, g.ch - 22, 0.3, 20);
  return list.map((syl, i) => ({
    label: syl,
    sub: inCase(syl, o.letterCase === 'upper' ? 'lower' : 'upper'),
    draw: (ops, x, y, w) => {
      drawRun(ops, runs[i], x + w / 2, y + 11 + f.offset, f.s, { variant: 'solid', stroke: 11, colors: INK }, 20);
    },
  }));
}

function pictureCards(o: CardOptions): Card[] {
  const cursive = o.script === 'cursive';
  return pictureWords(o.letters).map((w) => {
    const text = cursive ? normalizeKey(w.word).toLowerCase() : inCase(w.word, o.letterCase);
    return {
      label: text,
      draw: (ops, x, y, cw, ch) => {
        const size = Math.min(cw * 0.6, ch * 0.5);
        ops.push(...iconOps(w.picture, x + cw / 2, y + 6 + size / 2, size));
        const room = { w: cw - 12, h: ch - size - 14 };
        const baseline = y + ch - 9;
        if (cursive) {
          const glyph = cursiveWord(text);
          if (!glyph) return;
          const s = Math.min(0.11, fitScale([[glyph]], 8, room.w, 60));
          // the tails of g, p, f hang well under the line: the word sits higher than print
          drawRun(ops, [glyph], x + cw / 2, baseline - 50 * s, s, { variant: 'solid', stroke: 8, colors: INK });
          return;
        }
        const glyphs = glyphsForWord(text);
        const max = o.letterCase === 'upper' ? 0.1 : 0.12;
        const s = Math.min(max, fitScale([glyphs], 10, room.w, 60, Infinity, 18));
        drawRun(ops, glyphs, x + cw / 2, baseline - (o.letterCase === 'upper' ? 0 : 3 * s), s, { variant: 'solid', stroke: 10, colors: INK }, 18);
      },
    };
  });
}

/** Ten-frames (two rows of five) holding n dots or pictures; two frames from 11 up. */
function tenFrames(ops: DrawOp[], n: number, cx: number, top: number, w: number, h: number, color: string, picture: string | null): void {
  const frames = n > 10 ? 2 : 1;
  const side = frames === 2 ? Math.min(w / 10.6, h / 2) : 0;
  const stacked = frames === 2 ? Math.min(w / 5, h / 4.4) : 0;
  const c = Math.min(11, frames === 1 ? Math.min(w / 5, h / 2) : Math.max(side, stacked));
  const sideBySide = frames === 2 && side >= stacked;
  const fw = 5 * c, fh = 2 * c, gap = 0.6 * c;
  for (let f = 0; f < frames; f++) {
    const fx = sideBySide ? cx - fw - gap / 2 + f * (fw + gap) : cx - fw / 2;
    const fy = sideBySide || frames === 1 ? top + (h - fh) / 2 : top + (h - 2 * fh - 0.4 * c) / 2 + f * (fh + 0.4 * c);
    ops.push({ t: 'rect', x: fx, y: fy, w: fw, h: fh, stroke: '#94A3B8', strokeWidth: 0.35, rx: 0.8 });
    for (let k = 1; k < 5; k++) ops.push({ t: 'line', x1: fx + k * c, y1: fy, x2: fx + k * c, y2: fy + fh, stroke: '#CBD5E1', strokeWidth: 0.25 });
    ops.push({ t: 'line', x1: fx, y1: fy + c, x2: fx + fw, y2: fy + c, stroke: '#CBD5E1', strokeWidth: 0.25 });
    for (let k = 0; k < 10; k++) {
      if (f * 10 + k >= n) break;
      const px = fx + (k % 5) * c + c / 2, py = fy + Math.floor(k / 5) * c + c / 2;
      if (picture) ops.push(...iconOps(picture, px, py, c * 0.8));
      else ops.push({ t: 'circle', cx: px, cy: py, r: c * 0.33, fill: color });
    }
  }
}

function digitCards(o: CardOptions, g: Grid): Card[] {
  const max = Math.min(20, o.numberMax);
  const nums = Array.from({ length: max + 1 }, (_, i) => i);
  const runs = nums.map((n) => glyphsForWord(String(n)));
  const numberBox = { w: g.cw - 20, h: g.ch * 0.36 };
  const f = runFrame(runs, 11, numberBox.w, numberBox.h, 0.26, 14);
  return nums.map((n, i) => ({
    label: String(n),
    sub: numberWord(n),
    draw: (ops, x, y, w, h) => {
      const color = colorAt(n);
      drawRun(ops, runs[i], x + w / 2, y + 5 + f.offset, f.s, { variant: 'solid', stroke: 11, colors: color }, 14);
      tenFrames(ops, n, x + w / 2, y + 7 + numberBox.h, w - 12, h - numberBox.h - 13, color, o.objects ? PICTURES[n % PICTURES.length] : null);
    },
  }));
}

function numberCards(o: CardOptions, g: Grid): Card[] {
  const nums = Array.from({ length: o.numberMax + 1 }, (_, i) => i);
  const runs = nums.map((n) => glyphsForWord(String(n)));
  const f = runFrame(runs, 11, g.cw - 18, g.ch - 24, 0.34, 14);
  return nums.map((n, i) => ({
    label: String(n),
    sub: numberWord(n),
    draw: (ops, x, y, w) => {
      drawRun(ops, runs[i], x + w / 2, y + 12 + f.offset, f.s, { variant: 'solid', stroke: 11, colors: INK }, 14);
    },
  }));
}

export function cardsFor(o: CardOptions): Card[] {
  const g = cardGrid(o.perPage);
  switch (o.set) {
    case 'letters': return letterCards(o, g);
    case 'syllables': return syllableCards(o, g);
    case 'pictures': return pictureCards(o);
    case 'digits': return digitCards(o, g);
    case 'numbers': return numberCards(o, g);
  }
}

/** The thin coloured frame inside each card (it stays clear of the cut line). */
function cardFrame(ops: DrawOp[], x: number, y: number, w: number, h: number, color: string): void {
  ops.push({ t: 'rect', x: x + 3, y: y + 3, w: w - 6, h: h - 6, rx: 3, stroke: color, strokeWidth: 0.5 });
}

function cardBack(ops: DrawOp[], card: Card, x: number, y: number, w: number, h: number): void {
  // Kept 4 mm inside the card: a sheet that shifts a little in the printer still has its back behind its card.
  ops.push({ t: 'rect', x: x + 4, y: y + 4, w: w - 8, h: h - 8, rx: 3, stroke: '#D9C27A', strokeWidth: 0.5 });
  for (const [sx, sy] of [[x + 9, y + 9], [x + w - 9, y + 9], [x + 9, y + h - 9], [x + w - 9, y + h - 9]]) ops.push(star(sx, sy, 2.4, GOLD_LIGHT, '#D9C27A', 0.3));
  const size = fitText(card.label, 10, w - 20);
  ops.push({ t: 'text', x: x + w / 2, y: y + h / 2 + (card.sub ? 0 : size * 0.35), text: card.label, size, fill: INK, weight: 'bold', align: 'center' });
  if (card.sub) ops.push({ t: 'text', x: x + w / 2, y: y + h / 2 + 8.5, text: card.sub, size: fitText(card.sub, 4.6, w - 20), fill: MUTED, align: 'center' });
  ops.push({ t: 'text', x: x + w / 2, y: y + h - 7, text: 'WorksheetWiz', size: 2.4, fill: '#B8A770', weight: 'bold', align: 'center' });
}

export function buildCardPages(o: CardOptions, tier: Tier): PageOps[] {
  const g = cardGrid(o.perPage);
  const cards = cardsFor(o);
  const per = g.cols * g.rows;
  const pages: PageOps[] = [];
  for (let start = 0; start < cards.length; start += per) {
    const chunk = cards.slice(start, start + per);
    const front: DrawOp[] = [];
    front.push({ t: 'text', x: g.x, y: 9.5, text: `Cartonașe · ${CARD_SET_TITLES[o.set]}`, size: 3.4, fill: INK, weight: 'bold' });
    const note = o.backs ? 'Față-verso, întoarce pe latura lungă · decupează pe linia punctată' : 'Decupează pe linia punctată';
    front.push({ t: 'text', x: g.x + g.cols * g.cw, y: 9.5, text: note, size: 2.8, fill: MUTED, align: 'right' });
    chunk.forEach((card, i) => {
      const c = cellAt(g, i);
      cardFrame(front, c.x, c.y, g.cw, g.ch, colorAt(start + i));
      card.draw(front, c.x, c.y, g.cw, g.ch);
    });
    cutLines(front, g, chunk.length);
    freeMark(front, tier, A4, A4.w - 10, A4.h - 8);
    pages.push(page(A4, front));
    if (o.backs) {
      const back: DrawOp[] = [];
      chunk.forEach((card, i) => {
        const c = mirroredCell(g, i);
        cardBack(back, card, c.x, c.y, g.cw, g.ch);
      });
      pages.push(page(A4, back));
    }
  }
  return pages;
}
