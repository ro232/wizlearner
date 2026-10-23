import type { WorksheetConfig, Tier } from '@/types';
import type { DrawOp, Glyph, PageOps } from '@/lib/glyphs/types';
import { getGlyph, hintFor, normalizeKey, type Alphabet } from '@/lib/glyphs/data';
import type { TraceVariant } from '@/lib/glyphs/render';
import { isPatternId, type PatternId } from '@/lib/glyphs/patterns';
import { isItemAllowed } from '@/lib/access';
import { buildActivityPages } from './activities';
import {
  INK,
  ACCENT,
  PAPER,
  MUTED,
  buildTraceRow,
  buildPatternRow,
  rowHeightMm,
  rowExtents,
  itemWidth,
  cellPad,
  starPoints,
  backgroundOps,
  type RowStyle,
} from './rows';

/**
 * Turns a WorksheetConfig into page descriptions (millimetres). The same pages
 * feed the on-screen preview, the PDF and the SVG export, so what you see is
 * exactly what prints.
 */

export const PAGE_SIZES_MM: Record<string, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  a5: { width: 148, height: 210 },
  letter: { width: 215.9, height: 279.4 },
  b5: { width: 176, height: 250 },
};

export const GUIDE_COLORS: Record<string, string> = {
  gray: '#cbd5e1',
  green: '#86efac',
  orange: '#fdba74',
  purple: '#c4b5fd',
};

const CAP_HEIGHT_MM: Record<string, number> = { small: 10, medium: 14, large: 19 };
const ROW_GAP_MM: Record<string, number> = { tight: 4, normal: 7, wide: 11 };

const LABELS: Record<Alphabet, Record<string, string>> = {
  ro: {
    title: 'Fișă de lucru',
    name: 'Nume',
    date: 'Data',
    school: 'Grădinița',
    page: 'Pagina',
    of: 'din',
    reward: 'Bravo!',
    rewardSub: 'Colorează o stea pentru fiecare rând terminat.',
    madeWith: 'Creat cu WorksheetWiz.com',
  },
  en: {
    title: 'Practice Sheet',
    name: 'Name',
    date: 'Date',
    school: 'School',
    page: 'Page',
    of: 'of',
    reward: 'Great job!',
    rewardSub: 'Color a star for every finished row.',
    madeWith: 'Made with WorksheetWiz.com',
  },
};

export interface RowItem {
  /** The item as selected in the UI ("A", "Aa", "12", "circle", "zigzag"). */
  item: string;
  glyphs: Glyph[];
  pattern?: PatternId;
  /** A whole word or name traced as one row. */
  word?: boolean;
  /** Picture drawn next to a word row (theme words). */
  picture?: string;
}

/** A word-space: no strokes, just room between the words of a name ("Ana Maria"). */
const SPACE_GLYPH: Glyph = { key: ' ', strokes: [], width: 34, bbox: { minX: 0, minY: 50, maxX: 34, maxY: 100 } };

/** How a typed word is written for the chosen letter mode: MAMA, mama, or Mama. */
export function wordInCase(word: string, mode: WorksheetConfig['letterMode'], kind: 'name' | 'theme' | 'typed' = 'name'): string {
  const w = normalizeKey(word);
  if (mode === 'uppercase') return w.toUpperCase();
  if (mode === 'lowercase') return w.toLowerCase();
  // Theme words: only the first letter ("Om de zăpadă"). Typed words: first letter, the rest as typed.
  if (kind === 'theme') return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  if (kind === 'typed') return w.charAt(0).toUpperCase() + w.slice(1);
  // Names: every part capitalised ("Ana-Maria Popescu").
  return w.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

/** Glyphs for a word; characters we cannot draw are skipped, spaces keep their room. */
export function glyphsForWord(text: string): Glyph[] {
  const out: Glyph[] = [];
  for (const ch of text) {
    if (ch === ' ') {
      if (out.length && out[out.length - 1] !== SPACE_GLYPH) out.push(SPACE_GLYPH);
      continue;
    }
    const g = getGlyph(ch);
    if (g) out.push(g);
  }
  while (out[out.length - 1] === SPACE_GLYPH) out.pop();
  return out;
}

/** A word is usable on a tier when every letter in it is. */
export function isWordAllowed(word: string, tier: Tier): boolean {
  return [...normalizeKey(word)].every((ch) => !/\p{L}/u.test(ch) || isItemAllowed(ch, 'letters', tier));
}

/** Older saved worksheets have no `alphabet`; they were made with English letters. */
export function alphabetOf(config: WorksheetConfig): Alphabet {
  return config.alphabet === 'ro' ? 'ro' : 'en';
}

/** Glyphs that make up one selected item. */
export function glyphsForItem(item: string, category: WorksheetConfig['category']): Glyph[] {
  if (category === 'shapes') {
    const g = getGlyph(`shape:${item}`);
    return g ? [g] : [];
  }
  if (category === 'prewrite') return [];
  const out: Glyph[] = [];
  for (const ch of normalizeKey(item)) {
    const g = getGlyph(ch);
    if (g) out.push(g);
  }
  return out;
}

export function rowItems(config: WorksheetConfig, tier: Tier = 'full'): RowItem[] {
  if (config.category === 'games') return [];
  const reps = Math.max(1, config.repetitionsPerItem || 1);
  const rows: RowItem[] = [];
  for (const item of config.selectedItems) {
    if (!isItemAllowed(item, config.category, tier)) continue;
    if (config.category === 'prewrite') {
      if (!isPatternId(item)) continue;
      for (let r = 0; r < reps; r++) rows.push({ item, glyphs: [], pattern: item });
      continue;
    }
    const glyphs = glyphsForItem(item, config.category);
    if (glyphs.length === 0) continue;
    for (let r = 0; r < reps; r++) rows.push({ item, glyphs });
  }
  if (config.category === 'letters') {
    // The child's own name is free on every tier (it is what parents look for first);
    // other words follow the letter limits of the tier.
    const name = normalizeKey(config.childName ?? '').trim();
    for (const raw of config.customWords ?? []) {
      if (!isWordAllowed(raw, tier) && normalizeKey(raw).trim() !== name) continue;
      const kind = normalizeKey(raw).trim() === name ? 'name' : config.wordPictures?.[raw] ? 'theme' : 'typed';
      const text = wordInCase(raw, config.letterMode, kind);
      const glyphs = glyphsForWord(text);
      if (glyphs.length === 0) continue;
      const picture = config.wordPictures?.[raw];
      for (let r = 0; r < reps; r++) rows.push({ item: text, glyphs, word: true, ...(picture ? { picture } : {}) });
    }
  }
  return rows;
}

export function buildWorksheetPages(config: WorksheetConfig, tier: Tier): PageOps[] {
  if (config.category === 'games') {
    const pages = buildActivityPages(config, tier, (item) => isItemAllowed(item, 'games', tier));
    if (pages.length) return pages;
  }
  const size = PAGE_SIZES_MM[config.pageSize] ?? PAGE_SIZES_MM.a4;
  const landscape = config.orientation === 'landscape';
  const W = landscape ? size.height : size.width;
  const H = landscape ? size.width : size.height;
  const alphabet = alphabetOf(config);
  const L = LABELS[alphabet];
  const s = (CAP_HEIGHT_MM[config.letterSize] ?? 14) / 100;
  const stroke = 10;
  const rowGap = ROW_GAP_MM[config.rowSpacing] ?? 7;
  const guide = GUIDE_COLORS[config.guideColor] ?? GUIDE_COLORS.gray;

  const margin = 12;
  const headerH = config.fullPageMode ? 0 : 22;
  const rewardH = config.showRewardSection && !config.fullPageMode ? 18 : 0;
  const footerH = 8;
  const contentX = margin;
  const contentW = W - margin * 2;
  const contentTop = margin + headerH;
  const contentBottom = H - margin - rewardH - footerH;

  const rows = rowItems(config, tier);
  const maxRows = Math.max(1, config.rowsPerPage || 6);
  const variant: TraceVariant = config.fontStyle === 'cursive' ? 'dashed' : (config.fontStyle as TraceVariant);
  const vis = Math.max(1, Math.min(10, config.tracingVisibility || 7)) / 10;
  const showHint = config.showLetterIcons && config.category === 'letters';

  const rowStyle: RowStyle = {
    s,
    stroke,
    variant,
    vis,
    fadeTo: 0.5,
    showModel: true,
    modelDots: config.showStartDots !== false,
    modelArrows: config.showDirectionalArrows,
    // Empty cells at the end of each row for writing without help.
    blankCells: config.difficulty === 'advanced' ? 4 : config.difficulty === 'intermediate' ? 3 : 2,
    maxCopies: 0,
    leftHanded: config.leftHandedMode,
    guideColor: config.showGuideLines ? guide : null,
  };

  // ── split rows into pages ──
  const pages: RowItem[][] = [];
  let current: RowItem[] = [];
  let y = contentTop;
  // A long word or full name must fit across the page as one model: shrink that row only.
  const scaleOf = (row: RowItem) => {
    if (!row.word) return s;
    const pictureW = row.picture ? 19 : 0;
    const modelW = (itemWidth(row.glyphs) + cellPad(row.glyphs) * 2) * s;
    return Math.min(s, s * ((contentW - pictureW) / modelW));
  };
  const heightOf = (row: RowItem) => rowHeightMm(row.glyphs, scaleOf(row), stroke);
  for (const row of rows) {
    const h = heightOf(row);
    const fits = y + h <= contentBottom && current.length < maxRows;
    if (!fits && current.length > 0) {
      pages.push(current);
      current = [];
      y = contentTop;
    }
    current.push(row);
    y += h + rowGap;
  }
  if (current.length > 0 || pages.length === 0) pages.push(current);

  // One short page: repeat the chosen rows (in order) until the page is full.
  if (config.fillPage !== false && pages.length === 1 && rows.length > 0) {
    const page = pages[0];
    let i = 0;
    while (page.length < maxRows) {
      const row = rows[i % rows.length];
      const h = heightOf(row);
      if (y + h > contentBottom) break;
      page.push(row);
      y += h + rowGap;
      i++;
    }
  }

  // ── render pages ──
  return pages.map((pageRows, pageIndex) => {
    const ops: DrawOp[] = [];

    // header
    if (!config.fullPageMode) {
      const title = config.customTitle?.trim() || L.title;
      ops.push({ t: 'text', x: margin, y: margin + 6.5, text: title, size: 6.5, fill: INK, weight: 'bold' });
      const fields: string[] = [];
      fields.push(`${L.name}: ${config.childName?.trim() || '______________'}`);
      if (config.dateField) fields.push(`${L.date}: ____________`);
      if (config.schoolName?.trim()) fields.push(`${L.school}: ${config.schoolName.trim()}`);
      ops.push({ t: 'text', x: margin, y: margin + 14.5, text: fields.join('     '), size: 3.6, fill: '#334155' });
      ops.push({ t: 'text', x: W - margin, y: margin + 6, text: 'WorksheetWiz', size: 3.2, fill: MUTED, weight: 'bold', align: 'right' });
      ops.push({ t: 'line', x1: margin, y1: margin + 18.5, x2: W - margin, y2: margin + 18.5, stroke: ACCENT, strokeWidth: 0.6 });
    }

    // background pattern (under everything)
    ops.push(...backgroundOps(config.backgroundPattern, contentX, contentTop - 2, contentW, contentBottom - contentTop + 2));

    // rows: spread leftover space evenly (capped) so the page does not look top-heavy
    const usedHeight = pageRows.reduce((acc, r) => acc + heightOf(r), 0) + rowGap * Math.max(0, pageRows.length - 1);
    const leftover = Math.max(0, contentBottom - contentTop - usedHeight);
    const avgRowH = pageRows.length ? usedHeight / pageRows.length : 0;
    const extraGap = pageRows.length > 1 ? Math.min(leftover / (pageRows.length - 1), avgRowH * 0.8) : 0;
    let ry = contentTop;
    for (const row of pageRows) {
      const e = rowExtents(row.glyphs, stroke);
      const rs = scaleOf(row);
      const baseline = ry + (e.ascent + 100) * rs;
      const geom = { x: contentX, width: contentW, baseline };
      if (row.pattern) {
        buildPatternRow(ops, row.pattern, geom, rowStyle);
      } else {
        buildTraceRow(ops, row.glyphs, geom, {
          ...rowStyle,
          s: rs,
          hint: row.word ? (row.picture ? { word: '', emoji: row.picture } : null) : showHint ? hintFor(row.item, alphabet) : null,
          // A whole word with a numbered dot on every letter is too busy to read; letters rows teach the order.
          ...(row.word ? { modelDots: false, modelArrows: false } : {}),
        });
      }
      ry += heightOf(row) + rowGap + extraGap;
    }

    // reward box
    if (rewardH) {
      const by = H - margin - footerH - rewardH + 2;
      ops.push({ t: 'rect', x: margin, y: by, w: contentW, h: rewardH - 2, rx: 2.5, fill: '#FFFBEB', stroke: '#FBBF24', strokeWidth: 0.4 });
      ops.push({ t: 'text', x: margin + 5, y: by + 7, text: L.reward, size: 4.4, fill: '#92400E', weight: 'bold' });
      ops.push({ t: 'text', x: margin + 5, y: by + 12.5, text: L.rewardSub, size: 3, fill: '#B45309' });
      for (let i = 0; i < 5; i++) {
        const cx = W - margin - 8 - i * 13;
        ops.push({ t: 'polygon', points: starPoints(cx, by + (rewardH - 2) / 2, 5), stroke: '#D97706', strokeWidth: 0.5, fill: PAPER });
      }
    }

    // footer: page number + free watermark
    if (pages.length > 1) {
      ops.push({ t: 'text', x: W / 2, y: H - margin + 2, text: `${L.page} ${pageIndex + 1} ${L.of} ${pages.length}`, size: 3, fill: MUTED, align: 'center' });
    }
    if (tier === 'free') {
      ops.push({ t: 'text', x: W - margin, y: H - margin + 2, text: L.madeWith, size: 2.6, fill: '#94a3b8', align: 'right' });
    }

    return { width: W, height: H, ops };
  });
}

export function countWorksheetPages(config: WorksheetConfig, tier: Tier): number {
  return buildWorksheetPages(config, tier).length;
}

/** True when the sheet has something to print (rows, words or activity pages). */
export function hasContent(config: WorksheetConfig, tier: Tier): boolean {
  if (config.category === 'games') return buildActivityPages(config, tier, (item) => isItemAllowed(item, 'games', tier)).length > 0;
  return rowItems(config, tier).length > 0;
}
