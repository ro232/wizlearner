import type { jsPDF } from 'jspdf';
import type { PageOps, Subpath } from '../types';
import { flattenOps, type FlatOp } from '../geometry';

const PT_PER_MM = 72 / 25.4;

export interface PdfFontSet {
  /** Font family name registered with jsPDF (e.g. "Nunito" or "helvetica"). */
  family: string;
  /** True when the font covers Romanian diacritics (Ș, Ț, Ă …). */
  unicode: boolean;
}

type PathLeg = { op: 'm' | 'l' | 'c' | 'h'; c?: number[] };

function subpathsToLegs(subpaths: Subpath[], closed?: boolean): PathLeg[] {
  const legs: PathLeg[] = [];
  for (const sp of subpaths) {
    legs.push({ op: 'm', c: [sp.start.x, sp.start.y] });
    for (const s of sp.segs) {
      if (s.kind === 'L') legs.push({ op: 'l', c: [s.p.x, s.p.y] });
      else legs.push({ op: 'c', c: [s.c1.x, s.c1.y, s.c2.x, s.c2.y, s.p.x, s.p.y] });
    }
    if (closed) legs.push({ op: 'h', c: [] });
  }
  return legs;
}

/** Standard-14 fonts only know Latin-1: fold the Romanian letters they lack. */
export function foldDiacritics(text: string): string {
  return text
    .replace(/Ș/g, 'S')
    .replace(/ș/g, 's')
    .replace(/Ț/g, 'T')
    .replace(/ț/g, 't')
    .replace(/Ă/g, 'A')
    .replace(/ă/g, 'a');
}

/** Draw one page (mm) into a jsPDF document whose unit is mm. The caller adds pages. */
export function drawPageToPdf(doc: jsPDF, page: PageOps, font: PdfFontSet): void {
  doc.setLineJoin(1);
  for (const op of flattenOps(page.ops)) drawOp(doc, op, font);
}

function paint(doc: jsPDF, fill?: string, stroke?: string): void {
  if (fill && stroke) doc.fillStroke();
  else if (fill) doc.fill();
  else if (stroke) doc.stroke();
  else doc.discardPath();
}

function drawOp(doc: jsPDF, op: FlatOp, font: PdfFontSet): void {
  switch (op.t) {
    case 'path': {
      if (op.fill) doc.setFillColor(op.fill);
      if (op.stroke) {
        doc.setDrawColor(op.stroke);
        doc.setLineWidth(op.strokeWidth ?? 0.3);
        doc.setLineCap(op.cap === 'butt' ? 0 : 1);
        doc.setLineDashPattern(op.dash ?? [], 0);
      }
      doc.path(subpathsToLegs(op.subpaths, op.closed));
      paint(doc, op.fill, op.stroke);
      doc.setLineDashPattern([], 0);
      break;
    }
    case 'circle': {
      if (op.fill) doc.setFillColor(op.fill);
      if (op.stroke) {
        doc.setDrawColor(op.stroke);
        doc.setLineWidth(op.strokeWidth ?? 0.3);
      }
      doc.circle(op.cx, op.cy, op.r, op.fill && op.stroke ? 'FD' : op.fill ? 'F' : 'S');
      break;
    }
    case 'rect': {
      if (op.fill) doc.setFillColor(op.fill);
      if (op.stroke) {
        doc.setDrawColor(op.stroke);
        doc.setLineWidth(op.strokeWidth ?? 0.3);
        doc.setLineDashPattern(op.dash ?? [], 0);
      }
      const style = op.fill && op.stroke ? 'FD' : op.fill ? 'F' : 'S';
      if (op.rx) doc.roundedRect(op.x, op.y, op.w, op.h, op.rx, op.rx, style);
      else doc.rect(op.x, op.y, op.w, op.h, style);
      doc.setLineDashPattern([], 0);
      break;
    }
    case 'line': {
      doc.setDrawColor(op.stroke);
      doc.setLineWidth(op.strokeWidth);
      doc.setLineCap(1);
      doc.setLineDashPattern(op.dash ?? [], 0);
      doc.line(op.x1, op.y1, op.x2, op.y2);
      doc.setLineDashPattern([], 0);
      break;
    }
    case 'polygon': {
      if (op.fill) doc.setFillColor(op.fill);
      if (op.stroke) {
        doc.setDrawColor(op.stroke);
        doc.setLineWidth(op.strokeWidth ?? 0.3);
        doc.setLineCap(1);
      }
      const legs: PathLeg[] = op.points.map((p, i) => ({ op: i === 0 ? 'm' : 'l', c: [p.x, p.y] }));
      legs.push({ op: 'h', c: [] });
      doc.path(legs);
      paint(doc, op.fill, op.stroke);
      break;
    }
    case 'text': {
      if (op.emoji) return; // no colour-emoji fonts in PDF
      doc.setFont(font.family, op.weight === 'bold' ? 'bold' : 'normal');
      doc.setFontSize(op.size * PT_PER_MM);
      doc.setTextColor(op.fill);
      const text = font.unicode ? op.text : foldDiacritics(op.text);
      doc.text(text, op.x, op.y, {
        align: op.align ?? 'left',
        baseline: op.baseline === 'middle' ? 'middle' : op.baseline === 'top' ? 'top' : 'alphabetic',
      });
      break;
    }
  }
}
