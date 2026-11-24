/**
 * The plan as landscape A4 pages (PageOps, millimetres), drawn by the PDF pipeline of the sheets
 * (src/lib/pdf/generate-pdf.ts, Nunito embedded so ș/ț print with the comma below).
 *
 * Text is wrapped with a `measure` function: in the browser it is jsPDF's own width of the text in
 * Nunito (planning/pdf.ts), so lines never run out of their cell; without it, an average glyph
 * width with a safety margin. A row too tall for the rest of a page goes to the next one, and a row
 * taller than a whole page is split, with the table header repeated on each page.
 */
import type { DrawOp, PageOps } from '@/lib/glyphs/types';
import { textWidthMm } from '@/lib/book/text';
import type { DocCell, PlanDocument } from './document';

export type Measure = (text: string, sizeMm: number, bold?: boolean) => number;

/** Average-width estimate, 12 % wider than the book helper so it errs on the safe side. */
export const approxMeasure: Measure = (text, size, bold) => textWidthMm(text, size) * (bold ? 1.18 : 1.12);

export const PAGE = { width: 297, height: 210, margin: 12 } as const;

const INK = '#1F2A44';
const MUTED = '#475569';
const LINE = '#94A3B8';
const HEAD_FILL = '#E8EDF5';
const MODULE_FILL = '#F3F5F9';

const S = {
  title: 4.6,
  sub: 3.2,
  field: 3.1,
  head: 2.7,
  cell: 2.75,
  footer: 2.2,
};
const LH = 1.32; // line height, × size
const PAD = 1.4; // cell padding (mm)

/** Words into lines no wider than `width`; a word longer than the line is cut. */
export function wrap(text: string, width: number, size: number, measure: Measure, bold = false): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = '';
    for (let w of words) {
      const candidate = line ? `${line} ${w}` : w;
      if (measure(candidate, size, bold) <= width) {
        line = candidate;
        continue;
      }
      if (line) out.push(line);
      // a single word wider than the cell
      while (measure(w, size, bold) > width && w.length > 1) {
        let k = w.length - 1;
        while (k > 1 && measure(w.slice(0, k), size, bold) > width) k--;
        out.push(w.slice(0, k));
        w = w.slice(k);
      }
      line = w;
    }
    out.push(line);
  }
  return out;
}

interface Laid {
  lines: string[][];
  height: number;
}

export function buildPlanPages(doc: PlanDocument, measure: Measure = approxMeasure): PageOps[] {
  const { width: W, height: H, margin: M } = PAGE;
  const tableW = W - 2 * M;
  const totalShare = doc.columns.reduce((s, c) => s + c.width, 0);
  const colW = doc.columns.map((c) => (c.width / totalShare) * tableW);
  const colX = colW.map((_, i) => M + colW.slice(0, i).reduce((s, w) => s + w, 0));
  const footerTop = H - M - 4;
  const lineH = (size: number) => size * LH;

  const pages: PageOps[] = [];
  let ops: DrawOp[] = [];
  let y: number = M;

  const text = (t: string, x: number, yy: number, size: number, o: Partial<Extract<DrawOp, { t: 'text' }>> = {}) =>
    ops.push({ t: 'text', x, y: yy, text: t, size, fill: INK, ...o });

  const cellLines = (cell: DocCell, i: number, size: number) =>
    cell.lines.flatMap((l) => wrap(l, colW[i] - 2 * PAD, size, measure, cell.bold));

  const layRow = (cells: DocCell[], size: number): Laid => {
    const lines = cells.map((c, i) => cellLines(c, i, size));
    const n = Math.max(1, ...lines.map((l) => l.length));
    return { lines, height: n * lineH(size) + 2 * PAD };
  };

  const drawRow = (cells: DocCell[], lines: string[][], height: number, size: number, opts: { fill?: string; bold?: boolean } = {}) => {
    if (opts.fill) ops.push({ t: 'rect', x: M, y, w: tableW, h: height, fill: opts.fill });
    lines.forEach((ls, i) => {
      const cell = cells[i];
      const center = (cell.align ?? doc.columns[i].align) === 'center';
      ls.forEach((l, k) => {
        if (!l) return;
        text(l, center ? colX[i] + colW[i] / 2 : colX[i] + PAD, y + PAD + k * lineH(size) + size * 0.8, size, {
          weight: opts.bold || cell.bold ? 'bold' : 'normal',
          align: center ? 'center' : 'left',
        });
      });
    });
    // borders
    ops.push({ t: 'rect', x: M, y, w: tableW, h: height, stroke: LINE, strokeWidth: 0.25 });
    for (let i = 1; i < colX.length; i++) ops.push({ t: 'line', x1: colX[i], y1: y, x2: colX[i], y2: y + height, stroke: LINE, strokeWidth: 0.25 });
    y += height;
  };

  const headCells: DocCell[] = doc.columns.map((c) => ({ lines: [c.title], bold: true, align: 'center' }));
  const head = layRow(headCells, S.head);
  const drawHead = () => drawRow(headCells, head.lines, head.height, S.head, { fill: HEAD_FILL, bold: true });

  const newPage = () => {
    if (ops.length) pages.push({ width: W, height: H, ops });
    ops = [];
    y = M;
  };

  /** a full-width band (module title, vacation) */
  const band = (label: string, fill: string, bold: boolean) => {
    const lines = wrap(label, tableW - 2 * PAD, S.cell, measure, bold);
    const h = lines.length * lineH(S.cell) + 2 * PAD;
    if (y + h > footerTop) {
      newPage();
      drawHead();
    }
    ops.push({ t: 'rect', x: M, y, w: tableW, h, fill, stroke: LINE, strokeWidth: 0.25 });
    lines.forEach((l, k) => text(l, M + PAD, y + PAD + k * lineH(S.cell) + S.cell * 0.8, S.cell, { weight: bold ? 'bold' : 'normal', fill: bold ? INK : MUTED }));
    y += h;
  };

  // ── first page header ──
  const halfW = tableW * 0.56;
  const fieldLine = (label: string, value: string, x: number, maxW: number) => {
    const l = `${label}: `;
    text(l, x, y, S.field, { weight: 'bold' });
    const lw = measure(l, S.field, true);
    if (value) {
      const v = wrap(value, maxW - lw, S.field, measure)[0];
      text(v, x + lw, y, S.field);
    } else {
      ops.push({ t: 'line', x1: x + lw, y1: y + 0.6, x2: x + maxW, y2: y + 0.6, stroke: MUTED, strokeWidth: 0.2, dash: [0.6, 0.8] });
    }
  };
  y = M + S.field;
  const top = y;
  for (const f of doc.fields) {
    fieldLine(f.label, f.value, M, halfW - 8);
    y += lineH(S.field) * 1.25;
  }
  const leftEnd = y;
  y = top;
  const rightX = M + halfW + 6;
  for (const a of doc.approvals) {
    fieldLine(a, '', rightX, W - M - rightX);
    y += lineH(S.field) * 2.2;
  }
  y = Math.max(leftEnd, y) + 3;
  text(doc.title, W / 2, y + S.title * 0.8, S.title, { weight: 'bold', align: 'center' });
  y += S.title * 1.5;
  const subject = doc.fields.find((f) => f.label === 'Disciplina')?.value ?? '';
  const cls = doc.fields.find((f) => f.label === 'Clasa')?.value ?? '';
  text(`${subject} · clasa ${cls} · an școlar ${doc.fields.find((f) => f.label === 'An școlar')?.value ?? ''}`, W / 2, y + S.sub * 0.8, S.sub, { align: 'center', fill: MUTED });
  y += S.sub * 1.8;
  if (doc.partial) {
    for (const l of wrap(doc.partial, tableW, S.field, measure, true)) {
      text(l, W / 2, y + S.field * 0.8, S.field, { weight: 'bold', align: 'center', fill: '#B45309' });
      y += lineH(S.field);
    }
    y += 1.5;
  }

  // ── the table ──
  drawHead();
  for (const section of doc.sections) {
    // keep the module title with the first row
    const first = section.rows[0] ? layRow(section.rows[0], S.cell) : null;
    const titleH = lineH(S.cell) + 2 * PAD;
    if (first && y + titleH + Math.min(first.height, 40) > footerTop) {
      newPage();
      drawHead();
    }
    band(section.title, MODULE_FILL, true);
    for (const cells of section.rows) {
      const laid = layRow(cells, S.cell);
      if (y + laid.height > footerTop) {
        const fresh = footerTop - (M + head.height);
        if (laid.height <= fresh) {
          newPage();
          drawHead();
        } else {
          // taller than a page: split the lines
          let rest = laid.lines;
          while (rest.some((l) => l.length)) {
            const room = Math.floor((footerTop - y - 2 * PAD) / lineH(S.cell));
            if (room < 2) {
              newPage();
              drawHead();
              continue;
            }
            const now = rest.map((l) => l.slice(0, room));
            rest = rest.map((l) => l.slice(room));
            const n = Math.max(1, ...now.map((l) => l.length));
            drawRow(cells, now, n * lineH(S.cell) + 2 * PAD, S.cell);
            if (rest.some((l) => l.length)) {
              newPage();
              drawHead();
            }
          }
          continue;
        }
      }
      drawRow(cells, laid.lines, laid.height, S.cell);
    }
    if (section.after) band(section.after, '#FFFFFF', false);
  }

  // ── the note ──
  const noteSize = S.field * 0.92;
  const noteLines = doc.note.flatMap((n) => wrap(n, tableW, noteSize, measure));
  if (y + 3 + noteLines.length * lineH(noteSize) > footerTop) newPage();
  y += 3;
  noteLines.forEach((l) => {
    y += lineH(noteSize);
    text(l, M, y, noteSize, { fill: MUTED });
  });
  newPage();

  // ── footers ──
  pages.forEach((p, i) => {
    const num = `Pagina ${i + 1} din ${pages.length}`;
    const numW = measure(num, S.footer);
    const foot = wrap(doc.footer, tableW - numW - 6, S.footer, measure)[0];
    p.ops.push({ t: 'text', x: M, y: H - M, text: foot, size: S.footer, fill: MUTED });
    p.ops.push({ t: 'text', x: W - M, y: H - M, text: num, size: S.footer, fill: MUTED, align: 'right' });
  });
  return pages;
}
