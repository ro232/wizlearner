import type { DrawOp } from '@/lib/glyphs/types';

/**
 * An item of an „Evaluare” (evaluation.ts), as its builders hand it over: the heading, the answers and the body as
 * one or more rows. A page break may fall between two rows (never inside one), so an item with several rows — three
 * words to split into syllables, the questions under a text — can start on one page and go on on the next.
 */

export interface EvalArea { x: number; y: number; w: number; h: number }

/** One row of an item: drawn whole, at any height from `min` to `height + grow`. */
export interface EvalPart {
  /** Its comfortable height, mm. */
  height: number;
  /** The least it can be drawn in and still be easy to read and write in (a full page is packed tighter). */
  min: number;
  /** How much taller than `height` it can usefully be when the page has room. */
  grow: number;
  /** `first`: the first row of its item on this page (right under the heading). */
  draw: (ops: DrawOp[], a: EvalArea, first: boolean) => void;
}

export interface EvalBlock {
  item: string;
  /** Short name, for the answers page („Compară numerele”). */
  title: string;
  /** The instruction after the item's number. */
  prompt: string;
  /** The body, without the heading: one part, or the rows a page break may fall between. */
  parts: EvalPart[];
  answers: string[];
  perLine: number;
  /** How many answers the child gives (the count the calificative go by). */
  score: number;
  /** Small picture rows that stay readable in half the page width: two such items may stand side by side. */
  narrow?: boolean;
  /** The item starts with a text to read: when its questions go on on another page, a note says where the text is. */
  hasText?: boolean;
}

/** A body in one piece. */
export const onePart = (height: number, grow: number, draw: (ops: DrawOp[], a: EvalArea) => void, min = height): EvalPart[] => [{ height, min, grow, draw: (ops, a) => draw(ops, a) }];

/** `n` rows of the same size; `draw` gets the row's index. */
export function rowParts(n: number, height: number, min: number, grow: number, draw: (ops: DrawOp[], a: EvalArea, i: number, first: boolean) => void): EvalPart[] {
  return Array.from({ length: n }, (_, i) => ({ height, min, grow, draw: (ops: DrawOp[], a: EvalArea, first: boolean) => draw(ops, a, i, first) }));
}

/** The comfortable height of a whole body. */
export const partsHeight = (parts: EvalPart[]) => parts.reduce((s, p) => s + p.height, 0);

/** Draws `parts` one under the other in `a`, each with its share of the height (by their comfortable heights). */
export function drawParts(ops: DrawOp[], parts: EvalPart[], a: EvalArea): void {
  const total = partsHeight(parts) || 1;
  let y = a.y;
  parts.forEach((p, k) => {
    const h = (a.h * p.height) / total;
    p.draw(ops, { x: a.x, y, w: a.w, h }, k === 0);
    y += h;
  });
}
