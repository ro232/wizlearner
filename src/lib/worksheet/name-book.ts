import type { DrawOp, PageOps } from '@/lib/glyphs/types';
import { DEFAULT_CONFIG, type WorksheetConfig } from '@/types';
import { lettersOfWord, normalizeKey } from '@/lib/glyphs/data';
import { buildWorksheetPages, glyphsForWord, wordInCase } from './layout';
import { INK, ACCENT, PAPER, MUTED, itemOps, itemWidth, starPoints } from './rows';

/**
 * "Caietul cu numele lui": a small personalised workbook for one child.
 *   1. a title page with the name
 *   2. one page per letter of the name (capital, small, then the name)
 *   3. the name three ways: capitals, first letter capital, small letters
 *   4. "find the letter" for the first letter of the name
 *   5. a diploma
 */

const W = 210;
const H = 297;

export const MAX_NAME_LETTERS = 8;

function sheet(name: string, patch: Partial<WorksheetConfig>): WorksheetConfig {
  return {
    ...DEFAULT_CONFIG,
    alphabet: 'ro',
    childName: name,
    customWords: [name],
    fillPage: true,
    showLetterIcons: true,
    ...patch,
  };
}

function bigWord(ops: DrawOp[], text: string, cx: number, top: number, maxW: number, maxCap: number, variant: 'solid' | 'outline' | 'dashed'): number {
  const glyphs = glyphsForWord(text);
  if (!glyphs.length) return top;
  const units = itemWidth(glyphs);
  const s = Math.min(maxCap / 100, maxW / units);
  ops.push({
    t: 'group',
    tx: cx - (units * s) / 2,
    ty: top,
    scale: s,
    ops: itemOps(glyphs, { color: INK, strokeWidth: 10, variant, startDots: false, arrows: false, accent: ACCENT, dotText: PAPER, paper: PAPER }),
  });
  return top + 135 * s;
}

function titlePage(name: string): PageOps {
  const ops: DrawOp[] = [];
  ops.push({ t: 'rect', x: 14, y: 14, w: W - 28, h: H - 28, rx: 6, stroke: INK, strokeWidth: 1.2 });
  ops.push({ t: 'rect', x: 18, y: 18, w: W - 36, h: H - 36, rx: 4, stroke: ACCENT, strokeWidth: 0.4 });
  ops.push({ t: 'text', x: W / 2, y: 70, text: 'Caietul meu de scris', size: 9, fill: INK, weight: 'bold', align: 'center' });
  ops.push({ t: 'text', x: W / 2, y: 82, text: 'Acest caiet este al lui / al ei:', size: 4.4, fill: MUTED, align: 'center' });
  bigWord(ops, wordInCase(name, 'paired'), W / 2, 100, W - 60, 42, 'outline');
  for (let i = 0; i < 5; i++) ops.push({ t: 'polygon', points: starPoints(W / 2 - 40 + i * 20, 200, i === 2 ? 7 : 5), stroke: '#D97706', strokeWidth: 0.6, fill: '#FDE68A' });
  ops.push({ t: 'text', x: W / 2, y: 230, text: 'Colorează literele numelui tău!', size: 4.6, fill: INK, weight: 'bold', align: 'center' });
  ops.push({ t: 'text', x: W / 2, y: H - 26, text: 'WorksheetWiz', size: 3.2, fill: MUTED, weight: 'bold', align: 'center' });
  return { width: W, height: H, ops };
}

function diplomaPage(name: string): PageOps {
  const ops: DrawOp[] = [];
  ops.push({ t: 'rect', x: 14, y: 14, w: W - 28, h: H - 28, rx: 6, stroke: ACCENT, strokeWidth: 1.4 });
  ops.push({ t: 'rect', x: 19, y: 19, w: W - 38, h: H - 38, rx: 4, stroke: '#FBBF24', strokeWidth: 0.5 });
  for (let i = 0; i < 5; i++) ops.push({ t: 'polygon', points: starPoints(W / 2 - 28 + i * 14, 50, i === 2 ? 6.5 : 5), stroke: '#D97706', strokeWidth: 0.5, fill: '#FDE68A' });
  ops.push({ t: 'text', x: W / 2, y: 85, text: 'DIPLOMĂ', size: 16, fill: INK, weight: 'bold', align: 'center' });
  ops.push({ t: 'text', x: W / 2, y: 105, text: 'Se acordă lui / ei', size: 5, fill: MUTED, align: 'center' });
  bigWord(ops, wordInCase(name, 'paired'), W / 2, 115, W - 70, 24, 'solid');
  ops.push({ t: 'text', x: W / 2, y: 170, text: 'pentru că a învățat să-și scrie singur numele.', size: 5, fill: '#334155', align: 'center' });
  ops.push({ t: 'text', x: 34, y: H - 50, text: 'Data: _______________', size: 4, fill: '#334155' });
  ops.push({ t: 'text', x: W - 34, y: H - 50, text: 'Semnătura: _______________', size: 4, fill: '#334155', align: 'right' });
  return { width: W, height: H, ops };
}

export function buildNameBookPages(rawName: string): PageOps[] {
  const name = normalizeKey(rawName).replace(/\s+/g, ' ').trim();
  if (!name) return [];
  const pages: PageOps[] = [titlePage(name)];

  // one page per distinct letter of the name: capital and small letter, then the name
  for (const pair of lettersOfWord(name, 'paired').slice(0, MAX_NAME_LETTERS)) {
    const upper = pair[0];
    pages.push(
      ...buildWorksheetPages(
        sheet(name, { letterMode: 'uppercase', selectedItems: [upper, pair[1]], customTitle: `Litera ${upper} din numele meu`, repetitionsPerItem: 2, rowsPerPage: 6, fillPage: false }),
        'full',
      ).slice(0, 1),
    );
  }

  // the name three ways
  const ways: { mode: WorksheetConfig['letterMode']; style: WorksheetConfig['fontStyle']; title: string }[] = [
    { mode: 'uppercase', style: 'dashed', title: 'Numele meu, cu litere mari' },
    { mode: 'paired', style: 'dotted', title: 'Numele meu, cu prima literă mare' },
    { mode: 'lowercase', style: 'outline', title: 'Numele meu, cu litere mici' },
  ];
  for (const w of ways) {
    pages.push(...buildWorksheetPages(sheet(name, { letterMode: w.mode, fontStyle: w.style, customTitle: w.title, rowsPerPage: 7, showLetterIcons: false }), 'full').slice(0, 1));
  }

  // find the first letter of the name
  const first = lettersOfWord(name, 'uppercase')[0];
  if (first) pages.push(...buildWorksheetPages(sheet(name, { category: 'games', selectedItems: [`find:${first}`] }), 'full'));

  pages.push(diplomaPage(name));
  return pages;
}
