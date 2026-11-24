import type { DrawOp, Glyph, PageOps } from '@/lib/glyphs/types';
import type { Script, Tier } from '@/types';
import { ALPHABETS, LETTER_HINTS, getGlyph, normalizeKey } from '@/lib/glyphs/data';
import { cursiveGlyph, cursiveWord } from '@/lib/glyphs/cursive';
import { glyphsForWord } from '@/lib/worksheet/layout';
import { A4, INK, colorAt, drawRun, fitScale, freeMark, page, pageBorder, pictureOps, runExtent, type BorderStyle, type InkMode } from './common';

/**
 * „Alfabetul pe perete”: one A4 poster per letter, to put up in the classroom. The capital and the
 * small letter (print, or the handwriting of the first-grade book), the picture of a word with that
 * letter and the word under it, the letter picked out in colour. Every poster of a set uses the same
 * scale and baseline, so a row of them on the wall lines up.
 *
 * The word and its picture are the letter hints of the tracing sheets (LETTER_HINTS): „avion” for A,
 * and for Ă and Â, which no Romanian word starts with, a word that has them inside („pălărie”, „pâine”).
 */

export interface AlphabetOptions {
  /** Capitals, in alphabet order; empty means the whole Romanian alphabet. */
  letters: string[];
  script: Script;
  ink: InkMode;
  border: BorderStyle;
  /** Numbered start dots and arrows on the print letters. */
  strokeOrder: boolean;
}

export const POSTER_LETTERS = ALPHABETS.ro;

/** The selected letters in alphabet order (all of them when none is selected). */
export function posterLetters(letters: string[]): string[] {
  const set = new Set(letters.map((l) => normalizeKey(l).toUpperCase()));
  return set.size ? POSTER_LETTERS.filter((l) => set.has(l)) : [...POSTER_LETTERS];
}

const PAIR_GAP = 34; // glyph units between the capital and the small letter
const LETTER_BOX = { top: 22, bottom: 156, width: 168 };
const RULE_Y = 166;
const PICTURE = { cy: 205, size: 62 };
const WORD = { baseline: 267, width: 160, maxScale: 0.2, gap: 24 };

function pairGlyphs(letter: string, script: Script): Glyph[] {
  const pick = script === 'cursive' ? cursiveGlyph : getGlyph;
  return [pick(letter), pick(letter.toLowerCase())].filter((g): g is Glyph => !!g);
}

const stroke = (script: Script) => (script === 'cursive' ? 9 : 12);

/** One scale for the whole alphabet, so every poster has letters of the same size. */
const SCALE = new Map<string, number>();
/** With the order of the strokes the arrows stand out of the letters: more room between and around them. */
const pairLayout = (order: boolean) => (order ? { gap: PAIR_GAP * 1.8, width: LETTER_BOX.width - 24 } : { gap: PAIR_GAP, width: LETTER_BOX.width });

function letterScale(script: Script, order: boolean): number {
  const key = `${script}:${order}`;
  const hit = SCALE.get(key);
  if (hit) return hit;
  const { gap, width } = pairLayout(order);
  const runs = POSTER_LETTERS.map((l) => pairGlyphs(l, script));
  const s = fitScale(runs, stroke(script), width, LETTER_BOX.bottom - LETTER_BOX.top, 0.75, gap);
  SCALE.set(key, s);
  return s;
}

/** The baseline of the big letters: the highest accent of the alphabet still clears the top. */
function letterBaseline(script: Script, order: boolean): number {
  const s = letterScale(script, order);
  const top = Math.min(...POSTER_LETTERS.map((l) => runExtent(pairGlyphs(l, script), stroke(script)).top));
  return LETTER_BOX.top - top * s + 100 * s;
}

export function posterWord(letter: string): { word: string; emoji: string } {
  return LETTER_HINTS.ro[letter];
}

/** Indexes of the letters of `word` that are `letter` (ă in „pălărie”, both a's in „balon” for A). */
export function letterPositions(word: string, letter: string): number[] {
  const target = normalizeKey(letter).toLowerCase();
  return [...normalizeKey(word).toLowerCase()].map((ch, i) => (ch === target ? i : -1)).filter((i) => i >= 0);
}

function wordOps(ops: DrawOp[], word: string, letter: string, color: string, o: AlphabetOptions): void {
  if (o.script === 'cursive') {
    const g = cursiveWord(word);
    if (!g) return;
    const s = Math.min(WORD.maxScale, fitScale([[g]], 8, WORD.width, 60));
    drawRun(ops, [g], 105, WORD.baseline, s, { variant: 'solid', stroke: 8, colors: INK });
    return;
  }
  // Print: the word in small letters, the poster's letter in its colour (outline to colour in, in ink-saving mode).
  const glyphs = glyphsForWord(word);
  const at = new Set(letterPositions(word, letter));
  // glyphsForWord drops what it cannot draw (the hyphen of „yo-yo” stays): map the glyphs back to the letters
  const chars = [...normalizeKey(word).toLowerCase()].filter((ch) => getGlyph(ch));
  const s = Math.min(WORD.maxScale, fitScale([glyphs], 10, WORD.width, 60, Infinity, WORD.gap));
  const colors = chars.map((_, i) => (at.has(i) ? color : INK));
  if (o.ink === 'outline') {
    const plain: Glyph[] = glyphs.map((g, i) => (at.has(i) ? { ...g, strokes: [] } : g));
    drawRun(ops, plain, 105, WORD.baseline, s, { variant: 'solid', stroke: 10, colors: INK }, WORD.gap);
    const marked: Glyph[] = glyphs.map((g, i) => (at.has(i) ? g : { ...g, strokes: [] }));
    drawRun(ops, marked, 105, WORD.baseline, s, { variant: 'outline', stroke: 10, colors: INK }, WORD.gap);
  } else {
    drawRun(ops, glyphs, 105, WORD.baseline, s, { variant: 'solid', stroke: 10, colors }, WORD.gap);
  }
}

export function alphabetPoster(letter: string, o: AlphabetOptions, tier: Tier): PageOps {
  const ops: DrawOp[] = [];
  const color = colorAt(POSTER_LETTERS.indexOf(letter));
  pageBorder(ops, o.border, A4, color, o.ink);

  const order = o.strokeOrder && o.script === 'print';
  const s = letterScale(o.script, order);
  const glyphs = pairGlyphs(letter, o.script);
  drawRun(ops, glyphs, A4.w / 2, letterBaseline(o.script, order), s, {
    variant: o.ink === 'outline' ? 'outline' : 'solid',
    stroke: stroke(o.script),
    colors: o.ink === 'outline' ? INK : color,
    strokeOrder: order,
  }, pairLayout(order).gap);

  // a thin rule between the letters and the picture
  ops.push({ t: 'line', x1: 60, y1: RULE_Y, x2: 150, y2: RULE_Y, stroke: o.ink === 'outline' ? '#CBD5E1' : color, strokeWidth: 0.6, dash: [0.01, 2.2] });

  const hint = posterWord(letter);
  if (hint) {
    ops.push(...pictureOps(hint.emoji, A4.w / 2, PICTURE.cy, PICTURE.size, o.ink));
    wordOps(ops, hint.word, letter, color, o);
  }
  freeMark(ops, tier, A4, A4.w - 14, A4.h - 14);
  return page(A4, ops);
}

export function buildAlphabetPages(o: AlphabetOptions, tier: Tier): PageOps[] {
  return posterLetters(o.letters).map((l) => alphabetPoster(l, o, tier));
}
