import type { DrawOp } from '@/lib/glyphs/types';

/**
 * Tiny text helpers for the book composer. We have no font metrics on the
 * layout side, so wrapping uses an average glyph width for Nunito (≈0.53 em),
 * which is accurate enough for ragged-right paragraphs.
 */

export const AVG_CHAR_EM = 0.53;

export function textWidthMm(text: string, sizeMm: number): number {
  return text.length * sizeMm * AVG_CHAR_EM;
}

export function wrapText(text: string, maxWidthMm: number, sizeMm: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const candidate = line ? `${line} ${w}` : w;
    if (textWidthMm(candidate, sizeMm) <= maxWidthMm || !line) line = candidate;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export interface ParagraphOptions {
  x: number;
  y: number; // baseline of the first line
  width: number;
  size: number;
  fill: string;
  weight?: 'normal' | 'bold';
  align?: 'left' | 'center' | 'right';
  lineHeight?: number; // multiple of size
}

/** Push a wrapped paragraph; returns the y just below the last line. */
export function paragraph(ops: DrawOp[], text: string, o: ParagraphOptions): number {
  const lh = o.size * (o.lineHeight ?? 1.45);
  const lines = wrapText(text, o.width, o.size);
  const ax = o.align === 'center' ? o.x + o.width / 2 : o.align === 'right' ? o.x + o.width : o.x;
  lines.forEach((line, i) => {
    ops.push({ t: 'text', x: ax, y: o.y + i * lh, text: line, size: o.size, fill: o.fill, weight: o.weight, align: o.align ?? 'left' });
  });
  return o.y + lines.length * lh;
}

/** Bulleted paragraphs with a hanging indent. */
export function bulletList(ops: DrawOp[], items: string[], o: ParagraphOptions & { gap?: number; bullet?: string }): number {
  let y = o.y;
  const indent = o.size * 1.6;
  for (const item of items) {
    ops.push({ t: 'text', x: o.x, y, text: o.bullet ?? '•', size: o.size, fill: o.fill, weight: 'bold' });
    y = paragraph(ops, item, { ...o, x: o.x + indent, width: o.width - indent, y }) + (o.gap ?? o.size * 0.6);
  }
  return y;
}
