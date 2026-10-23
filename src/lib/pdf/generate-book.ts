import { jsPDF } from 'jspdf';
import type { PageOps } from '@/lib/glyphs/types';
import { drawPageToPdf, type PdfFontSet } from '@/lib/glyphs/backends/pdf';
import { buildBookPages, type BookConfig } from '@/lib/book/interior';
import { buildCoverPage } from '@/lib/book/cover';
import { loadEmbeddedFonts, type EmbeddedFonts } from './generate-pdf';

function newDoc(first: PageOps, fonts: EmbeddedFonts | null): { doc: jsPDF; font: PdfFontSet } {
  const doc = new jsPDF({
    orientation: first.width > first.height ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [first.width, first.height],
    compress: true,
    // Only list fonts that are drawn: KDP rejects PDFs that reference non-embedded fonts.
    putOnlyUsedFonts: true,
  });
  let font: PdfFontSet = { family: 'helvetica', unicode: false };
  if (fonts) {
    doc.addFileToVFS('Nunito-Regular.ttf', fonts.regular);
    doc.addFont('Nunito-Regular.ttf', 'Nunito', 'normal');
    doc.addFileToVFS('Nunito-Bold.ttf', fonts.bold);
    doc.addFont('Nunito-Bold.ttf', 'Nunito', 'bold');
    font = { family: 'Nunito', unicode: true };
  }
  return { doc, font };
}

function pagesToDoc(pages: PageOps[], fonts: EmbeddedFonts | null): jsPDF {
  const { doc, font } = newDoc(pages[0], fonts);
  pages.forEach((page, i) => {
    if (i > 0) doc.addPage([page.width, page.height], page.width > page.height ? 'landscape' : 'portrait');
    drawPageToPdf(doc, page, font);
  });
  return doc;
}

/** Interior PDF (one page per sheet side, KDP margins, mirrored gutters). */
export function createBookInteriorPdf(config: BookConfig, fonts: EmbeddedFonts | null): jsPDF {
  return pagesToDoc(buildBookPages(config), fonts);
}

/** Full-wrap cover PDF (back + spine + front, with bleed). */
export function createBookCoverPdf(config: BookConfig, pageCount: number, fonts: EmbeddedFonts | null): jsPDF {
  return pagesToDoc([buildCoverPage(config, pageCount)], fonts);
}

function slug(title: string): string {
  return (
    title
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase() || 'carte'
  );
}

export async function downloadBookInterior(config: BookConfig): Promise<void> {
  const fonts = await loadEmbeddedFonts();
  createBookInteriorPdf(config, fonts).save(`${slug(config.title)}-interior.pdf`);
}

export async function downloadBookCover(config: BookConfig, pageCount: number): Promise<void> {
  const fonts = await loadEmbeddedFonts();
  createBookCoverPdf(config, pageCount, fonts).save(`${slug(config.title)}-coperta.pdf`);
}
