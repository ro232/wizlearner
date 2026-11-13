import { jsPDF } from 'jspdf';
import type { WorksheetConfig, Tier } from '@/types';
import { buildWorksheetPages } from '@/lib/worksheet/layout';
import { drawPageToPdf, type PdfFontSet } from '@/lib/glyphs/backends/pdf';
import type { PageOps } from '@/lib/glyphs/types';
import { FontLoadError } from './errors';

/**
 * PDF export. Pages come from the shared layout (same as the live preview), so
 * the PDF is exactly what the user saw. Letters are true vector paths; header
 * text uses Nunito (embedded) so Romanian diacritics print correctly.
 */

export interface EmbeddedFonts {
  regular: string; // base64 TTF
  bold: string; // base64 TTF
}

let fontCache: Promise<EmbeddedFonts> | null = null;

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
  const buf = await res.arrayBuffer();
  // a captive portal or a filter can answer 200 with a web page instead of the font
  if (buf.byteLength < 10_000) throw new Error(`Font ${url}: only ${buf.byteLength} bytes`);
  return bufferToBase64(buf);
}

const loadBoth = async (): Promise<EmbeddedFonts> => {
  const [regular, bold] = await Promise.all([fetchFont('/fonts/Nunito-Regular.ttf'), fetchFont('/fonts/Nunito-Bold.ttf')]);
  return { regular, bold };
};

/**
 * Load (once) the fonts served from /public/fonts. One hiccup is forgiven: a failed load is
 * tried again after a moment. If that fails too, a FontLoadError is thrown — a PDF is never
 * made in a stand-in font (it would print „4 " 2 =” for a subtraction and drop the diacritics).
 * A later call starts over, so the next click can succeed once the connection is back.
 */
export function loadEmbeddedFonts(retryDelayMs = 600): Promise<EmbeddedFonts> {
  if (!fontCache) {
    const attempt = loadBoth()
      .catch(async () => {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        return loadBoth();
      })
      .catch((err) => {
        fontCache = null;
        throw new FontLoadError(err);
      });
    fontCache = attempt;
  }
  return fontCache;
}

/** Build the document in memory (used by the download button and by tests). */
export function createWorksheetPdf(config: WorksheetConfig, tier: Tier, fonts: EmbeddedFonts | null): jsPDF {
  return createPagesPdf(buildWorksheetPages(config, tier), fonts);
}

/** A new document sized for the first page, with Nunito registered when the fonts are given. */
export function newPdfDocument(first: PageOps, fonts: EmbeddedFonts | null): { doc: jsPDF; font: PdfFontSet } {
  const doc = new jsPDF({
    orientation: first.width > first.height ? 'landscape' : 'portrait',
    unit: 'mm',
    format: [first.width, first.height],
    compress: true,
    // Only list fonts that are drawn: KDP rejects PDFs that reference non-embedded fonts.
    putOnlyUsedFonts: true,
  });

  // Without the fonts (only in tests and scripts; the browser paths insist on them) the text is
  // drawn in Helvetica, folded to the characters that font has.
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

/** Any list of pages (e.g. the sheets of a whole group) as one PDF. */
export function createPagesPdf(pages: PageOps[], fonts: EmbeddedFonts | null): jsPDF {
  if (!pages.length) throw new Error('No pages to put in the PDF');
  const { doc, font } = newPdfDocument(pages[0], fonts);

  pages.forEach((page, i) => {
    if (i > 0) doc.addPage([page.width, page.height], page.width > page.height ? 'landscape' : 'portrait');
    drawPageToPdf(doc, page, font);
  });
  return doc;
}

/**
 * A file name every browser accepts: no diacritics or odd characters. Chrome saves a file
 * called „download” (without .pdf) when the name has letters like Ș.
 */
export function safeFilename(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-(?=\.pdf$)/g, '');
  return /\.pdf$/i.test(base) ? base : `${base || 'fisa'}.pdf`;
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
  doc.save(safeFilename(worksheetFilename(config)));
}

/**
 * Print exactly the PDF (not the web page around the preview): load it in a hidden
 * frame and open the browser's print dialog on it. Falls back to opening the PDF in a
 * new tab where frames cannot print PDFs (some mobile browsers).
 */
export async function printWorksheetPDF(config: WorksheetConfig, tier: Tier): Promise<void> {
  const fonts = await loadEmbeddedFonts();
  const doc = createWorksheetPdf(config, tier, fonts);
  const url = URL.createObjectURL(doc.output('blob'));
  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.src = url;
  frame.onload = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch {
      window.open(url, '_blank');
    }
    setTimeout(() => {
      frame.remove();
      URL.revokeObjectURL(url);
    }, 60_000);
  };
  document.body.appendChild(frame);
}

/** Download a list of pages as one PDF. */
export async function downloadPagesPdf(pages: PageOps[], filename: string): Promise<void> {
  const fonts = await loadEmbeddedFonts();
  createPagesPdf(pages, fonts).save(safeFilename(filename));
}
