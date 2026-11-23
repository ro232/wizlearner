import type { DrawOp, PageOps } from '@/lib/glyphs/types';
import type { WorksheetConfig } from '@/types';
import { textWidthMm, wrapText } from '@/lib/book/text';
import { ACCENT, INK, MUTED } from './rows';

/**
 * „Pagină cu răspunsuri”: the answers of the sheets, on one or more pages at the end of the PDF,
 * for the parent or the teacher. Every kind of sheet hands over its answers as sections (a title
 * and its numbered answers), built from the very data its page was drawn from, so the key always
 * matches the sheet. The math sheets had this page first; its look is kept exactly.
 */

/** A page of a sheet, with what `buildWorksheetPages` needs to know about it. */
export interface SheetPage extends PageOps {
  /** The answers page: no curriculum line at the bottom. */
  answerKey?: boolean;
  /** An evaluation page: the curriculum line names the competences of these items only. */
  competenceItems?: string[];
}

export interface KeySection {
  title: string;
  /** The answers, each one a short text („7”, „a) ac – A”, „FRUCTE: măr, pară”). */
  entries: string[];
  /** How many answers on one line (1: a long answer per line, wrapped when it is too long). */
  perLine: number;
  /** Put „1. ” before every answer (the math sheets number their exercises the same way). */
  numbered?: boolean;
}

/** Something drawn under the answers (the evaluation's table of calificative), `height` mm tall. */
export interface KeyExtra {
  height: number;
  draw: (ops: DrawOp[], top: number) => void;
}

const W = 210;
const H = 297;
const M = 12;
const SIZE = 3.4;
const STEP = 5.5;

/** The header of the answers page: the same as on the math sheets. */
function frame(ops: DrawOp[], config: WorksheetConfig, title: string, instruction: string): number {
  const room = W - 2 * M - 26;
  const size = Math.max(4, Math.min(6.5, (6.5 * room) / Math.max(1, textWidthMm(title, 6.5) * 1.08)));
  ops.push({ t: 'text', x: M, y: M + 6.5, text: title, size, fill: INK, weight: 'bold' });
  ops.push({ t: 'text', x: M, y: M + 14.5, text: `Nume: ${config.childName?.trim() || '______________'}     Data: ____________`, size: 3.6, fill: '#334155' });
  ops.push({ t: 'text', x: W - M, y: M + 6, text: 'WorksheetWiz', size: 3.2, fill: MUTED, weight: 'bold', align: 'right' });
  ops.push({ t: 'line', x1: M, y1: M + 18.5, x2: W - M, y2: M + 18.5, stroke: ACCENT, strokeWidth: 0.6 });
  ops.push({ t: 'text', x: M, y: M + 28, text: instruction, size: 4.6, fill: INK, weight: 'bold' });
  return M + 34;
}

/** The lines one answer takes in its column (only a one-per-line answer is wrapped). */
function entryLines(text: string, perLine: number): string[] {
  const colW = (W - 2 * M) / perLine;
  if (perLine > 1 || textWidthMm(text, SIZE) <= colW) return [text];
  return wrapText(text, colW, SIZE);
}

export const ANSWERS_INSTRUCTION = 'Pentru părinte sau educatoare: rezultatele fișelor de mai sus.';

/**
 * The answers pages: each section with its title and its answers in columns; a section that does
 * not fit under the previous one starts a new page. `extras` follow the answers.
 */
export function answerKeyPages(config: WorksheetConfig, sections: KeySection[], extras: KeyExtra[] = [], instruction = ANSWERS_INSTRUCTION): DrawOp[][] {
  const pages: DrawOp[][] = [];
  let ops: DrawOp[] = [];
  const start = () => {
    ops = [];
    pages.push(ops);
    return frame(ops, config, 'Răspunsuri', instruction);
  };
  let y = start();
  const bottom = H - M - 8;
  for (const s of sections) {
    const texts = s.entries.map((e, i) => (s.numbered ? `${i + 1}. ${e}` : e));
    const rows: string[][] = [];
    for (let i = 0; i < texts.length; i += s.perLine) rows.push(texts.slice(i, i + s.perLine));
    const lines = rows.reduce((n, row) => n + Math.max(...row.map((t) => entryLines(t, s.perLine).length)), 0);
    if (y + 7 + lines * STEP > bottom && y > M + 34) y = start();
    ops.push({ t: 'text', x: M, y: y + 2, text: s.title, size: 4, fill: INK, weight: 'bold' });
    y += 7.5;
    const colW = (W - 2 * M) / s.perLine;
    rows.forEach((row, r) => {
      if (r > 0) y += STEP;
      let tallest = 1;
      row.forEach((text, c) => {
        const parts = entryLines(text, s.perLine);
        tallest = Math.max(tallest, parts.length);
        // a long answer in a narrow column gets smaller rather than run into the next one
        const w = textWidthMm(parts[0], SIZE);
        const size = parts.length === 1 && w > colW - 2 && s.perLine > 1 ? (SIZE * (colW - 2)) / w : SIZE;
        parts.forEach((part, k) => ops.push({ t: 'text', x: M + c * colW, y: y + k * STEP, text: part, size, fill: '#334155' }));
      });
      y += (tallest - 1) * STEP;
    });
    y += 9;
  }
  for (const e of extras) {
    if (y + e.height > bottom && y > M + 34) y = start();
    e.draw(ops, y);
    y += e.height;
  }
  return pages;
}
