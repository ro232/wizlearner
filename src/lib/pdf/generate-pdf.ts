import { jsPDF } from 'jspdf';
import type { WorksheetConfig, Tier } from '@/types';
import { buildWorksheetPages } from '@/lib/worksheet/layout';
import { drawPageToPdf, type PdfFontSet } from '@/lib/glyphs/backends/pdf';

/**
 * PDF export. Pages come from the shared layout (same as the live preview), so
 * the PDF is exactly what the user saw. Letters are true vector paths; header
 * text uses Nunito (embedded) so Romanian diacritics print correctly.
 */

export interface EmbeddedFonts {
  regular: string; // base64 TTF
  bold: string; // base64 TTF
}

let fontCache: Promise<EmbeddedFonts | null> | null = null;

function bufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(binary);
}

async function fetchFont(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Font ${url}: ${res.status}`);
  return bufferToBase64(await res.arrayBuffer());
}

/** Load (once) the fonts served from /public/fonts. Falls back to Helvetica when unavailable. */
export function loadEmbeddedFonts(): Promise<EmbeddedFonts | null> {
  if (!fontCache) {
    fontCache = Promise.all([fetchFont('/fonts/Nunito-Regular.ttf'), fetchFont('/fonts/Nunito-Bold.ttf')])
      .then(([regular, bold]) => ({ regular, bold }))
      .catch(() => {
        fontCache = null;
        return null;
      });
  }
  return fontCache;
}

/** Build the document in memory (used by the download button and by tests). */
export function createWorksheetPdf(config: WorksheetConfig, tier: Tier, fonts: EmbeddedFonts | null): jsPDF {
  const pages = buildWorksheetPages(config, tier);
  const first = pages[0];
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

  pages.forEach((page, i) => {
    if (i > 0) doc.addPage([page.width, page.height], page.width > page.height ? 'landscape' : 'portrait');
    drawPageToPdf(doc, page, font);
  });
  return doc;
}

export function worksheetFilename(config: WorksheetConfig): string {
  const dateStr = new Date().toISOString().split('T')[0];
  const childNamePart = config.childName ? `-${config.childName.trim().replace(/\s+/g, '-')}` : '';
  return `WorksheetWiz${childNamePart}-${dateStr}.pdf`;
}

/** Generate and download the worksheet PDF in the browser. */
export async function generateWorksheetPDF(config: WorksheetConfig, tier: Tier): Promise<void> {
  const fonts = await loadEmbeddedFonts();
  const doc = createWorksheetPdf(config, tier, fonts);
  doc.save(worksheetFilename(config));
}
