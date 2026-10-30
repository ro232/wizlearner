import type { WorksheetConfig, Tier } from '@/types';
import type { PageOps } from '@/lib/glyphs/types';
import type { BookConfig } from '@/lib/book/interior';

/**
 * The PDF actions the pages call. The PDF library (jsPDF) is loaded only when someone actually
 * downloads or prints, so it is not part of the first load of every page.
 */
const sheet = () => import('./generate-pdf');
const book = () => import('./generate-book');

export const generateWorksheetPDF = async (config: WorksheetConfig, tier: Tier) => (await sheet()).generateWorksheetPDF(config, tier);
export const printWorksheetPDF = async (config: WorksheetConfig, tier: Tier) => (await sheet()).printWorksheetPDF(config, tier);
export const downloadPagesPdf = async (pages: PageOps[], filename: string) => (await sheet()).downloadPagesPdf(pages, filename);
export const downloadBookInterior = async (config: BookConfig) => (await book()).downloadBookInterior(config);
export const downloadBookCover = async (config: BookConfig, pageCount: number) => (await book()).downloadBookCover(config, pageCount);
