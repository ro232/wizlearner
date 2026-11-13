import type { jsPDF } from 'jspdf';
import type { PageOps } from '@/lib/glyphs/types';
import { drawPageToPdf } from '@/lib/glyphs/backends/pdf';
import { buildBookPages, type BookConfig } from '@/lib/book/interior';
import { buildCoverPage } from '@/lib/book/cover';
import { loadEmbeddedFonts, newPdfDocument, safeFilename, type EmbeddedFonts } from './generate-pdf';
import { FontLoadError } from './errors';

/**
 * A book for print: KDP rejects files whose fonts are not embedded, so there is no stand-in
 * font here. Without the embedded fonts no document is made at all.
 */
function pagesToDoc(pages: PageOps[], fonts: EmbeddedFonts | null): jsPDF {
  if (!fonts || !fonts.regular || !fonts.bold) throw new FontLoadError();
  const { doc, font } = newPdfDocument(pages[0], fonts);
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
  createBookInteriorPdf(config, fonts).save(safeFilename(`${slug(config.title)}-interior.pdf`));
}

export async function downloadBookCover(config: BookConfig, pageCount: number): Promise<void> {
  const fonts = await loadEmbeddedFonts();
  createBookCoverPdf(config, pageCount, fonts).save(safeFilename(`${slug(config.title)}-coperta.pdf`));
}
