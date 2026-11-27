import type { DrawOp } from '@/lib/glyphs/types';
import type { Tier, WorksheetConfig } from '@/types';
import { madeWith, BRAND_NAME } from '@/lib/brand';
import { textWidthMm } from '@/lib/book/text';
import { ACCENT, INK, MUTED } from './rows';
import { textW } from './reading-pages';

/**
 * The page frame shared by the fun preschool sheets (fun-pages.ts) and „Explorarea mediului”
 * (explore-pages.ts): the same header, note and footer as the other games (sorting-pages.ts).
 */

export const W = 210;
export const H = 297;
export const M = 12;
/** Bottom of the activity area: the line under it holds the note for the adult, then the footer. */
export const BOTTOM = H - M - 20;
export const CELL_STROKE = '#E6DECD';
export const SOFT = '#FBF7EE';

export function seedOf(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619);
  return h >>> 0;
}

export function rng(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle<T>(xs: readonly T[], rand: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** A shuffled order of 0…n−1 in which no index stays in its place (n ≥ 2): no line is a straight row. */
export function derangement(n: number, rand: () => number): number[] {
  for (;;) {
    const p = shuffle(Array.from({ length: n }, (_, i) => i), rand);
    if (p.every((v, i) => v !== i)) return p;
  }
}

/** The same header as the other games: title, name and date, the instruction, an optional help line. */
export function frame(ops: DrawOp[], config: WorksheetConfig, title: string, instruction: string, help?: string): number {
  const room = W - 2 * M - 30;
  const size = Math.min(6.5, (6.5 * room) / Math.max(1, textWidthMm(title, 6.5) * 1.06));
  ops.push({ t: 'text', x: M, y: M + 6.5, text: title, size, fill: INK, weight: 'bold' });
  ops.push({ t: 'text', x: M, y: M + 14.5, text: `Nume: ${config.childName?.trim() || '______________'}     Data: ____________`, size: 3.6, fill: '#334155' });
  ops.push({ t: 'text', x: W - M, y: M + 6, text: BRAND_NAME, size: 3.2, fill: MUTED, weight: 'bold', align: 'right' });
  ops.push({ t: 'line', x1: M, y1: M + 18.5, x2: W - M, y2: M + 18.5, stroke: ACCENT, strokeWidth: 0.6 });
  ops.push({ t: 'text', x: M, y: M + 28, text: instruction, size: fitSize(instruction, 4.6, W - 2 * M), fill: INK, weight: 'bold' });
  if (!help) return M + 34;
  ops.push({ t: 'text', x: M, y: M + 34.5, text: help, size: fitSize(help, 3.6, W - 2 * M), fill: '#334155' });
  return M + 39;
}

/** One line for the adult under the activity, shrunk to the width of the page. */
export function adultNote(ops: DrawOp[], text: string): void {
  const size = Math.min(2.8, (2.8 * (W - 2 * M)) / Math.max(1, textWidthMm(text, 2.8) * 1.04));
  ops.push({ t: 'text', x: M, y: BOTTOM + 7, text, size, fill: MUTED });
}

export function footer(ops: DrawOp[], tier: Tier): void {
  if (tier === 'free') ops.push({ t: 'text', x: W - M, y: H - M + 2, text: madeWith('ro'), size: 2.6, fill: '#94a3b8', align: 'right' });
}

/** The width a text takes, mm: measured with Nunito Bold (reading-pages.ts), or the app's estimate when larger. */
export function textRoom(text: string, size: number): number {
  return Math.max(textW(text, size), textWidthMm(text, size));
}

/** A text no wider than `room` mm: the given size, or smaller. */
export function fitSize(text: string, size: number, room: number): number {
  return Math.min(size, (size * room) / Math.max(1, textRoom(text, size) * 1.06));
}

export function exampleTag(ops: DrawOp[], x: number, y: number, align: 'left' | 'right' | 'center' = 'left'): void {
  ops.push({ t: 'text', x, y, text: 'exemplu', size: 2.8, fill: MUTED, align });
}

/** The dashed orange line of an example answer. */
export function exampleLine(x1: number, y1: number, x2: number, y2: number): DrawOp {
  return { t: 'line', x1, y1, x2, y2, stroke: ACCENT, strokeWidth: 0.7, dash: [1.6, 1.2] };
}

/** The dashed orange ring of an example answer, around a box. */
export function exampleRing(x: number, y: number, w: number, h: number): DrawOp {
  return { t: 'rect', x, y, w, h, rx: Math.min(w, h) / 2, stroke: ACCENT, strokeWidth: 0.8, dash: [1.8, 1.2] };
}
