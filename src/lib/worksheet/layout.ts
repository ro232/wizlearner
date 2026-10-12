import type { WorksheetConfig, Tier } from '@/types';
import type { DrawOp, Glyph, PageOps } from '@/lib/glyphs/types';
import { getGlyph, hintFor, normalizeKey, type Alphabet } from '@/lib/glyphs/data';
import { renderGlyph, glyphBounds, type TraceVariant } from '@/lib/glyphs/render';
import { mixColor } from '@/lib/glyphs/geometry';

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

const INK = '#1e3a5f';
const ACCENT = '#E8913A';
const PAPER = '#ffffff';
const MUTED = '#64748B';

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
  /** The item as selected in the UI ("A", "Aa", "12", "circle"). */
  item: string;
  glyphs: Glyph[];
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
  const out: Glyph[] = [];
  for (const ch of normalizeKey(item)) {
    const g = getGlyph(ch);
    if (g) out.push(g);
  }
  return out;
}

export function rowItems(config: WorksheetConfig): RowItem[] {
  const reps = Math.max(1, config.repetitionsPerItem || 1);
  const rows: RowItem[] = [];
  for (const item of config.selectedItems) {
    const glyphs = glyphsForItem(item, config.category);
    if (glyphs.length === 0) continue;
    for (let r = 0; r < reps; r++) rows.push({ item, glyphs });
  }
  return rows;
}

interface Metrics {
  s: number; // mm per glyph unit
  rowGap: number;
  stroke: number; // glyph units
}

function metrics(config: WorksheetConfig): Metrics {
  const cap = CAP_HEIGHT_MM[config.letterSize] ?? 14;
  return { s: cap / 100, rowGap: ROW_GAP_MM[config.rowSpacing] ?? 7, stroke: 10 };
}

const MIN_GLYPH_WIDTH = 30; // I, l, i, 1 … still get a sensible cell
const CELL_PAD = 16;
const INNER_GAP = 18; // between the glyphs of a pair / two-digit number

function itemWidth(glyphs: Glyph[]): number {
  return glyphs.reduce((acc, g, i) => acc + Math.max(g.bbox.maxX - g.bbox.minX, MIN_GLYPH_WIDTH) + (i ? INNER_GAP : 0), 0);
}

function rowExtents(glyphs: Glyph[], stroke: number): { ascent: number; descent: number } {
  let minY = 0, maxY = 100;
  for (const g of glyphs) {
    const b = glyphBounds(g, stroke);
    minY = Math.min(minY, b.minY);
    maxY = Math.max(maxY, b.maxY);
  }
  return { ascent: Math.max(8, -minY + 4), descent: Math.max(8, maxY - 100 + 4) };
}

/** Draw the glyphs of one item side by side; origin = baseline-left of the item box. */
function itemOps(glyphs: Glyph[], style: Parameters<typeof renderGlyph>[1]): DrawOp[] {
  const ops: DrawOp[] = [];
  let x = 0;
  glyphs.forEach((g, i) => {
    const w = Math.max(g.bbox.maxX - g.bbox.minX, MIN_GLYPH_WIDTH);
    const shift = (w - (g.bbox.maxX - g.bbox.minX)) / 2 - g.bbox.minX; // centre narrow glyphs in their slot
    ops.push({ t: 'group', tx: x + shift, ty: 0, scale: 1, ops: renderGlyph(g, style) });
    x += w + (i < glyphs.length - 1 ? INNER_GAP : 0);
  });
  return ops;
}

function star(cx: number, cy: number, r: number): { x: number; y: number }[] {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.42;
    const a = (-90 + i * 36) * (Math.PI / 180);
    pts.push({ x: cx + rad * Math.cos(a), y: cy + rad * Math.sin(a) });
  }
  return pts;
}

/** Page-wide background behind the rows: school-notebook rulings or a light grid. */
function backgroundOps(pattern: string, x: number, y: number, w: number, h: number): DrawOp[] {
  const ops: DrawOp[] = [];
  switch (pattern) {
    case 'grid': {
      for (let px = x; px <= x + w + 0.01; px += 5) ops.push({ t: 'line', x1: px, y1: y, x2: px, y2: y + h, stroke: '#e2e8f0', strokeWidth: 0.12 });
      for (let py = y; py <= y + h + 0.01; py += 5) ops.push({ t: 'line', x1: x, y1: py, x2: x + w, y2: py, stroke: '#e2e8f0', strokeWidth: 0.12 });
      break;
    }
    case 'patratele': {
      // caiet de matematică: 5 mm squares
      for (let px = x; px <= x + w + 0.01; px += 5) ops.push({ t: 'line', x1: px, y1: y, x2: px, y2: y + h, stroke: '#cbd5e1', strokeWidth: 0.15 });
      for (let py = y; py <= y + h + 0.01; py += 5) ops.push({ t: 'line', x1: x, y1: py, x2: x + w, y2: py, stroke: '#cbd5e1', strokeWidth: 0.15 });
      break;
    }
    case 'dictando': {
      // caiet dictando: blue lines every 5 mm, red margin on the left
      ops.push({ t: 'line', x1: x + 6, y1: y, x2: x + 6, y2: y + h, stroke: '#f87171', strokeWidth: 0.3 });
      for (let py = y + 5; py < y + h; py += 5) ops.push({ t: 'line', x1: x, y1: py, x2: x + w, y2: py, stroke: '#bfdbfe', strokeWidth: 0.2 });
      break;
    }
    case 'lines': {
      for (let py = y + 6; py < y + h; py += 6) ops.push({ t: 'line', x1: x, y1: py, x2: x + w, y2: py, stroke: '#e2e8f0', strokeWidth: 0.18 });
      break;
    }
    default:
      break; // 'blank' and 'guides' (row guides are drawn with each row)
  }
  return ops;
}

export function buildWorksheetPages(config: WorksheetConfig, tier: Tier): PageOps[] {
  const size = PAGE_SIZES_MM[config.pageSize] ?? PAGE_SIZES_MM.a4;
  const landscape = config.orientation === 'landscape';
  const W = landscape ? size.height : size.width;
  const H = landscape ? size.width : size.height;
  const alphabet = alphabetOf(config);
  const L = LABELS[alphabet];
  const m = metrics(config);
  const guide = GUIDE_COLORS[config.guideColor] ?? GUIDE_COLORS.gray;

  const margin = 12;
  const headerH = config.fullPageMode ? 0 : 22;
  const rewardH = config.showRewardSection && !config.fullPageMode ? 18 : 0;
  const footerH = 8;
  const contentX = margin;
  const contentW = W - margin * 2;
  const contentTop = margin + headerH;
  const contentBottom = H - margin - rewardH - footerH;

  const rows = rowItems(config);
  const maxRows = Math.max(1, config.rowsPerPage || 6);
  const variant: TraceVariant = config.fontStyle === 'cursive' ? 'dashed' : (config.fontStyle as TraceVariant);
  const vis = Math.max(1, Math.min(10, config.tracingVisibility || 7)) / 10;
  const blankLast = config.difficulty !== 'beginner';
  const showHint = config.showLetterIcons && config.category === 'letters';

  // ── split rows into pages ──
  const pages: RowItem[][] = [];
  let current: RowItem[] = [];
  let y = contentTop;
  const rowHeightMm = (row: RowItem) => {
    const e = rowExtents(row.glyphs, m.stroke);
    return (e.ascent + 100 + e.descent) * m.s;
  };
  for (const row of rows) {
    const h = rowHeightMm(row);
    const fits = y + h <= contentBottom && current.length < maxRows;
    if (!fits && current.length > 0) {
      pages.push(current);
      current = [];
      y = contentTop;
    }
    current.push(row);
    y += h + m.rowGap;
  }
  if (current.length > 0 || pages.length === 0) pages.push(current);

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
    const usedHeight = pageRows.reduce((acc, r) => acc + rowHeightMm(r), 0) + m.rowGap * Math.max(0, pageRows.length - 1);
    const leftover = Math.max(0, contentBottom - contentTop - usedHeight);
    const avgRowH = pageRows.length ? usedHeight / pageRows.length : 0;
    const extraGap = pageRows.length > 1 ? Math.min(leftover / (pageRows.length - 1), avgRowH * 0.8) : 0;
    let ry = contentTop;
    for (const row of pageRows) {
      const e = rowExtents(row.glyphs, m.stroke);
      const baseline = ry + (e.ascent + 100) * m.s;
      const rowH = (e.ascent + 100 + e.descent) * m.s;

      // guide lines: top (cap), middle (x-height, dashed), baseline
      if (config.showGuideLines) {
        ops.push({ t: 'line', x1: contentX, y1: baseline - 100 * m.s, x2: contentX + contentW, y2: baseline - 100 * m.s, stroke: guide, strokeWidth: 0.3 });
        ops.push({ t: 'line', x1: contentX, y1: baseline - 50 * m.s, x2: contentX + contentW, y2: baseline - 50 * m.s, stroke: guide, strokeWidth: 0.25, dash: [1.5, 1.5] });
        ops.push({ t: 'line', x1: contentX, y1: baseline, x2: contentX + contentW, y2: baseline, stroke: guide, strokeWidth: 0.35 });
      }

      const wUnits = itemWidth(row.glyphs);
      const cellUnits = wUnits + CELL_PAD * 2;
      const cellMm = cellUnits * m.s;
      const hint = showHint ? hintFor(row.item, alphabet) : undefined;
      const hintW = hint ? Math.max(16, hint.word.length * 2.2 + 4) : 0;
      const modelW = cellMm + hintW + 3;
      const copies = Math.max(1, Math.floor((contentW - modelW) / cellMm));

      // model letter (solid, with numbers and arrows)
      const modelX = config.leftHandedMode ? contentX + contentW - cellMm : contentX;
      ops.push({
        t: 'group',
        tx: modelX + CELL_PAD * m.s,
        ty: baseline - 100 * m.s,
        scale: m.s,
        ops: itemOps(row.glyphs, {
          color: INK,
          strokeWidth: m.stroke,
          variant: 'solid',
          startDots: config.showStartDots !== false,
          arrows: config.showDirectionalArrows,
          accent: ACCENT,
          dotText: PAPER,
          paper: PAPER,
          minDotRadius: 1.45 / m.s,
        }),
      });

      // hint: emoji + word
      if (hint) {
        const hx = config.leftHandedMode ? modelX - 3 - hintW / 2 : modelX + cellMm + 3 + hintW / 2;
        const cy = baseline - 50 * m.s;
        ops.push({ t: 'text', x: hx, y: cy - 1, text: hint.emoji, size: Math.min(8, 42 * m.s), fill: INK, align: 'center', baseline: 'middle', emoji: true });
        ops.push({ t: 'text', x: hx, y: Math.min(baseline, cy + 6), text: hint.word, size: 3.4, fill: MUTED, align: 'center', weight: 'bold' });
      }

      // traced copies, fading across the row
      const firstCopyX = config.leftHandedMode ? contentX : modelX + modelW;
      const tracedCount = blankLast && copies >= 4 ? copies - 1 : copies;
      for (let k = 0; k < copies; k++) {
        if (k >= tracedCount) break;
        const fade = tracedCount > 1 ? 1 - 0.5 * (k / (tracedCount - 1)) : 1;
        const color = mixColor(INK, PAPER, 1 - vis * 0.85 * fade);
        ops.push({
          t: 'group',
          tx: firstCopyX + k * cellMm + CELL_PAD * m.s,
          ty: baseline - 100 * m.s,
          scale: m.s,
          ops: itemOps(row.glyphs, {
            color,
            strokeWidth: m.stroke,
            variant,
            startDots: false,
            arrows: false,
            accent: ACCENT,
            dotText: PAPER,
            paper: PAPER,
          }),
        });
      }

      ry += rowH + m.rowGap + extraGap;
    }

    // reward box
    if (rewardH) {
      const by = H - margin - footerH - rewardH + 2;
      ops.push({ t: 'rect', x: margin, y: by, w: contentW, h: rewardH - 2, rx: 2.5, fill: '#FFFBEB', stroke: '#FBBF24', strokeWidth: 0.4 });
      ops.push({ t: 'text', x: margin + 5, y: by + 7, text: L.reward, size: 4.4, fill: '#92400E', weight: 'bold' });
      ops.push({ t: 'text', x: margin + 5, y: by + 12.5, text: L.rewardSub, size: 3, fill: '#B45309' });
      for (let i = 0; i < 5; i++) {
        const cx = W - margin - 8 - i * 13;
        ops.push({ t: 'polygon', points: star(cx, by + (rewardH - 2) / 2, 5), stroke: '#D97706', strokeWidth: 0.5, fill: PAPER });
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
