/**
 * The plan as a PDF, through the sheets' pipeline (Nunito embedded, so Romanian diacritics print).
 * Loaded only when someone downloads (see actions.ts).
 */
import { jsPDF } from 'jspdf';
import { createPagesPdf, loadEmbeddedFonts, safeFilename, type EmbeddedFonts } from '@/lib/pdf/generate-pdf';
import type { PageOps } from '@/lib/glyphs/types';
import { planDocument, planFilename, type PlanMeta } from './document';
import { buildPlanPages, type Measure } from './pdf-layout';
import type { Plan } from './plan';

const PT_PER_MM = 72 / 25.4;

/** The real width of a text in Nunito, as jsPDF will draw it. */
export function nunitoMeasure(fonts: EmbeddedFonts): Measure {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  doc.addFileToVFS('Nunito-Regular.ttf', fonts.regular);
  doc.addFont('Nunito-Regular.ttf', 'Nunito', 'normal');
  doc.addFileToVFS('Nunito-Bold.ttf', fonts.bold);
  doc.addFont('Nunito-Bold.ttf', 'Nunito', 'bold');
  return (text, size, bold) => {
    doc.setFont('Nunito', bold ? 'bold' : 'normal');
    doc.setFontSize(size * PT_PER_MM);
    return doc.getTextWidth(text);
  };
}

export function planPdfPages(plan: Plan, meta: PlanMeta, fonts: EmbeddedFonts): PageOps[] {
  return buildPlanPages(planDocument(plan, meta), nunitoMeasure(fonts));
}

export function createPlanPdf(plan: Plan, meta: PlanMeta, fonts: EmbeddedFonts): jsPDF {
  return createPagesPdf(planPdfPages(plan, meta, fonts), fonts);
}

/** Download the plan as PDF; returns the number of pages. */
export async function downloadPlanPdf(plan: Plan, meta: PlanMeta): Promise<number> {
  const fonts = await loadEmbeddedFonts();
  const pages = planPdfPages(plan, meta, fonts);
  createPagesPdf(pages, fonts).save(safeFilename(planFilename(plan, 'pdf', !!meta.modules)));
  return pages.length;
}
