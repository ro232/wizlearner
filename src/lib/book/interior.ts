import type { DrawOp, Glyph, PageOps } from '@/lib/glyphs/types';
import type { Script } from '@/types';
import { cursiveGlyph, cursiveWord } from '@/lib/glyphs/cursive';
import { ALPHABETS, getGlyph, hintFor, normalizeKey, type Alphabet } from '@/lib/glyphs/data';
import { iconOps, ICON_CREDIT, ICON_CREDIT_EN } from '@/lib/hints/icons';
import { renderGlyph, type TraceVariant } from '@/lib/glyphs/render';
import { PATTERN_IDS, PATTERN_LABELS, patternGlyph, type PatternId } from '@/lib/glyphs/patterns';
import {
  INK,
  ACCENT,
  PAPER,
  MUTED,
  buildTraceRow,
  buildPatternRow,
  guideOps,
  itemOps,
  itemWidth,
  rowExtents,
  starPoints,
  CELL_PAD,
  type RowStyle,
} from '@/lib/worksheet/rows';
import { interiorMargins, interiorPageSize, type TrimKey, type PaperKey } from './spec';
import { paragraph, bulletList } from './text';

/**
 * Composes a complete, print-ready workbook interior for Amazon KDP:
 * title page, colophon, parent instructions, pre-writing section, one page
 * per letter, alphabet review, one page per number, numbers review,
 * certificate — with mirrored margins that respect KDP's gutter minimums.
 */

export interface BookConfig {
  title: string;
  subtitle: string;
  author: string;
  year: number;
  trim: TrimKey;
  bleed: boolean;
  paper: PaperKey;
  alphabet: Alphabet;
  variant: TraceVariant;
  includePrewriting: boolean;
  includeLetters: boolean;
  includeNumbers: boolean;
  includeReview: boolean;
  includeCertificate: boolean;
  /** Highest number page (0 … numbersMax). */
  numbersMax: number;
  /** Free tier gets a diagonal preview watermark. */
  watermark: boolean;
  /** Letters in print (default) or joined handwriting ("de mână", first grade). Numbers stay in print. */
  script?: Script;
}

export const DEFAULT_BOOK_CONFIG: BookConfig = {
  title: 'Literele și cifrele',
  subtitle: 'Caiet de scris pentru copii de 4–7 ani · alfabetul românesc complet',
  author: 'Little Learners',
  year: new Date().getFullYear(),
  trim: 'letter',
  bleed: false,
  paper: 'white',
  alphabet: 'ro',
  variant: 'dashed',
  includePrewriting: true,
  includeLetters: true,
  includeNumbers: true,
  includeReview: true,
  includeCertificate: true,
  numbersMax: 10,
  watermark: false,
};

const T = {
  ro: {
    belongsTo: 'Acest caiet este al lui / al ei:',
    rights: 'Toate drepturile rezervate. Nicio parte a acestei cărți nu poate fi reprodusă fără acordul autorului.',
    fonts: 'Literele de trasat sunt desenate vectorial. Textul este cules cu fontul Nunito (SIL Open Font License).',
    made: 'Realizat cu WorksheetWiz.',
    howTitle: 'Cum folosim caietul',
    howIntro: 'Fiecare literă are un model mare cu puncte numerotate și săgeți. Copilul urmărește ordinea și direcția liniilor, trasează peste literele punctate, apoi scrie singur în căsuțele goale.',
    howBullets: [
      'Punctul cu cifra 1 arată unde începe prima linie; săgeata arată direcția. Următoarele linii urmează cifrele 2, 3…',
      'Începeți cu exercițiile grafice, apoi literele mari, literele mici și cifrele. Nu săriți paginile de pregătire.',
      'Exersați 10–15 minute pe zi. Creionul se ține relaxat, aproape de vârf, iar caietul stă drept pe masă.',
      'Lăudați efortul, nu doar rezultatul. La sfârșitul fiecărei pagini colorați o stea.',
    ],
    legend1: 'start',
    legend2: 'direcție',
    part1: 'Partea 1',
    part1Title: 'Pregătim mâna',
    part1Sub: 'Linii, valuri și bucle — exerciții grafice înainte de litere',
    part2: 'Partea 2',
    part2Title: 'Literele',
    part2Sub: 'Litere mari și litere mici, pas cu pas',
    part3: 'Partea 3',
    part3Title: (max: number) => (max >= 10 ? 'Cifrele și numerele' : 'Cifrele'),
    part3Sub: (max: number) => `De la 0 la ${max}, cu numărat și scris`,
    traceHint: 'Trasează peste linii, de la punct, în direcția săgeții.',
    alone: 'Acum singur:',
    writeAlone: 'Scrie singur:',
    letterTitle: (u: string, l: string) => `Litera ${u} ${l}`,
    inWord: (u: string) => `${u} se află în cuvânt`,
    reviewTitle: 'Tot alfabetul',
    reviewSub: 'Trasează fiecare pereche de litere.',
    numberTitle: (n: number) => (n < 10 ? `Cifra ${n}` : `Numărul ${n}`),
    count: 'Numără și colorează:',
    numbersReview: (max: number) => (max >= 10 ? 'Toate cifrele și numerele' : 'Toate cifrele'),
    numbersReviewSub: 'Trasează cifrele, apoi scrie-le singur pe rândurile libere.',
    diploma: 'DIPLOMĂ',
    diplomaFor: 'Se acordă lui / ei',
    diplomaText: 'pentru că a învățat să scrie literele și cifrele cu răbdare și bucurie.',
    date: 'Data',
    signature: 'Semnătura',
    notes: 'Pagină pentru exersat',
    starsHint: 'Colorează o stea când ai terminat pagina.',
    preview: 'PREVIEW · WorksheetWiz',
    numberWords: ['zero', 'unu', 'doi', 'trei', 'patru', 'cinci', 'șase', 'șapte', 'opt', 'nouă', 'zece', 'unsprezece', 'doisprezece', 'treisprezece', 'paisprezece', 'cincisprezece', 'șaisprezece', 'șaptesprezece', 'optsprezece', 'nouăsprezece', 'douăzeci'],
  },
  en: {
    belongsTo: 'This book belongs to:',
    rights: 'All rights reserved. No part of this book may be reproduced without permission from the author.',
    fonts: 'The tracing letters are drawn as vector strokes. Text is set in Nunito (SIL Open Font License).',
    made: 'Made with WorksheetWiz.',
    howTitle: 'How to use this book',
    howIntro: 'Every letter has a big model with numbered dots and arrows. Your child follows the order and direction of the strokes, traces the dotted letters, then writes alone in the empty boxes.',
    howBullets: [
      'The dot marked 1 shows where the first stroke starts; the arrow shows its direction. The next strokes follow 2, 3…',
      'Start with the pre-writing exercises, then capital letters, small letters and numbers. Do not skip the warm-up pages.',
      'Practise 10–15 minutes a day. Hold the pencil loosely, close to the tip, and keep the book straight on the table.',
      'Praise the effort, not only the result. Colour a star at the end of every page.',
    ],
    legend1: 'start',
    legend2: 'direction',
    part1: 'Part 1',
    part1Title: 'Getting the hand ready',
    part1Sub: 'Lines, waves and loops — pre-writing practice',
    part2: 'Part 2',
    part2Title: 'The letters',
    part2Sub: 'Capital and small letters, step by step',
    part3: 'Part 3',
    part3Title: () => 'The numbers',
    part3Sub: (max: number) => `From 0 to ${max}, counting and writing`,
    traceHint: 'Trace over the lines, from the dot, in the direction of the arrow.',
    alone: 'Now on your own:',
    writeAlone: 'Write it yourself:',
    letterTitle: (u: string, l: string) => `Letter ${u} ${l}`,
    inWord: (u: string) => `${u} is inside the word`,
    reviewTitle: 'The whole alphabet',
    reviewSub: 'Trace every pair of letters.',
    numberTitle: (n: number) => `Number ${n}`,
    count: 'Count and colour:',
    numbersReview: () => 'All the numbers',
    numbersReviewSub: 'Trace the numbers, then write them yourself on the empty rows.',
    diploma: 'CERTIFICATE',
    diplomaFor: 'Awarded to',
    diplomaText: 'for learning to write the letters and numbers with patience and joy.',
    date: 'Date',
    signature: 'Signature',
    notes: 'Practice page',
    starsHint: 'Colour a star when you finish the page.',
    preview: 'PREVIEW · WorksheetWiz',
    numberWords: ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'],
  },
};

/** Where content may go on one page (mm), after mirrored margins and bleed. */
interface Frame {
  W: number;
  H: number;
  /** Content box. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Trim box origin (differs from 0 when bleed is on). */
  trimX: number;
  trimY: number;
  trimW: number;
  trimH: number;
  recto: boolean;
}

type PageBuilder = (f: Frame, ops: DrawOp[]) => void;

interface RowSpec {
  glyphs: Glyph[];
  style: RowStyle;
  pattern?: PatternId;
  label?: string;
}

interface PagePlan {
  build: PageBuilder;
  /** Front matter pages carry no page number. */
  numbered: boolean;
}

const BLEED = 0.125 * 25.4;

export function buildBookPages(config: BookConfig): PageOps[] {
  const L = T[config.alphabet];
  const letters = ALPHABETS[config.alphabet];
  const plan: PagePlan[] = [];
  const add = (build: PageBuilder, numbered = true) => plan.push({ build, numbered });

  // ── front matter ──
  add((f, ops) => titlePage(f, ops, config), false);
  add((f, ops) => colophonPage(f, ops, config), false);
  add((f, ops) => instructionsPage(f, ops, config), false);

  // ── part 1: pre-writing ──
  if (config.includePrewriting) {
    add((f, ops) => dividerPage(f, ops, config, L.part1, L.part1Title, L.part1Sub, 'waves'));
    for (const id of PATTERN_IDS) add((f, ops) => patternPage(f, ops, config, id));
  }

  // ── part 2: letters ──
  if (config.includeLetters) {
    add((f, ops) => dividerPage(f, ops, config, L.part2, L.part2Title, L.part2Sub, 'letters'));
    for (const letter of letters) add((f, ops) => letterPage(f, ops, config, letter));
    if (config.includeReview) add((f, ops) => alphabetReviewPage(f, ops, config));
  }

  // ── part 3: numbers ──
  if (config.includeNumbers) {
    add((f, ops) => dividerPage(f, ops, config, L.part3, L.part3Title(config.numbersMax), L.part3Sub(config.numbersMax), 'numbers'));
    for (let n = 0; n <= config.numbersMax; n++) add((f, ops) => numberPage(f, ops, config, n));
    if (config.includeReview) add((f, ops) => numbersReviewPage(f, ops, config));
  }

  if (config.includeCertificate) add((f, ops) => certificatePage(f, ops, config), false);

  // KDP prints in spreads: keep an even page count (and at least 24 pages).
  while (plan.length % 2 === 1 || plan.length < 24) add((f, ops) => notesPage(f, ops, config));

  const total = plan.length;
  const size = interiorPageSize(config.trim, config.bleed);
  const margins = interiorMargins(total, config.bleed);
  const trim = { w: size.width - (config.bleed ? BLEED : 0), h: size.height - (config.bleed ? BLEED * 2 : 0) };

  return plan.map((p, i) => {
    const pageNo = i + 1;
    const recto = pageNo % 2 === 1; // right-hand page: gutter on the left
    const trimX = config.bleed && !recto ? BLEED : 0;
    const trimY = config.bleed ? BLEED : 0;
    const left = recto ? margins.inside : margins.outside;
    const right = recto ? margins.outside : margins.inside;
    const f: Frame = {
      W: size.width,
      H: size.height,
      x: trimX + left,
      y: trimY + margins.top,
      w: trim.w - left - right,
      h: trim.h - margins.top - margins.bottom,
      trimX,
      trimY,
      trimW: trim.w,
      trimH: trim.h,
      recto,
    };
    const ops: DrawOp[] = [];
    p.build(f, ops);
    if (p.numbered) {
      ops.push({ t: 'text', x: f.trimX + f.trimW / 2, y: f.trimY + f.trimH - margins.bottom / 2 + 1, text: String(pageNo), size: 3.4, fill: MUTED, align: 'center' });
    }
    if (config.watermark) {
      ops.push({ t: 'text', x: f.W / 2, y: f.H / 2, text: L.preview, size: 16, fill: '#e2e8f0', weight: 'bold', align: 'center', baseline: 'middle', rotate: 35 });
    }
    return { width: size.width, height: size.height, ops };
  });
}

export function countBookPages(config: BookConfig): number {
  return buildBookPages(config).length;
}

// ───────────────────────── shared pieces ─────────────────────────

function bigModel(ops: DrawOp[], glyphs: Glyph[], x: number, capLineY: number, s: number, dots = true, arrows = true, strokeWidth = 10): number {
  ops.push({
    t: 'group',
    tx: x,
    ty: capLineY,
    scale: s,
    ops: itemOps(glyphs, {
      color: INK,
      strokeWidth,
      variant: 'solid',
      startDots: dots,
      arrows,
      accent: ACCENT,
      dotText: PAPER,
      paper: PAPER,
      minDotRadius: 1.6 / s,
    }),
  });
  return itemWidth(glyphs) * s;
}

function outlineRow(ops: DrawOp[], glyphs: Glyph[], cx: number, capLineY: number, s: number, color = '#94a3b8'): void {
  const w = itemWidth(glyphs) * s;
  ops.push({
    t: 'group',
    tx: cx - w / 2,
    ty: capLineY,
    scale: s,
    ops: itemOps(glyphs, { color, strokeWidth: 10, variant: 'outline', startDots: false, arrows: false, accent: ACCENT, dotText: PAPER, paper: PAPER }),
  });
}

function pageTitle(ops: DrawOp[], f: Frame, title: string, subtitle?: string): number {
  ops.push({ t: 'text', x: f.x, y: f.y + 7, text: title, size: 8, fill: INK, weight: 'bold' });
  let y = f.y + 11;
  if (subtitle) {
    ops.push({ t: 'text', x: f.x, y: f.y + 14, text: subtitle, size: 3.6, fill: MUTED });
    y = f.y + 17;
  }
  ops.push({ t: 'line', x1: f.x, y1: y + 1, x2: f.x + f.w, y2: y + 1, stroke: ACCENT, strokeWidth: 0.5 });
  return y + 5;
}

function rewardStars(ops: DrawOp[], f: Frame, hint: string): void {
  const y = f.y + 5;
  for (let i = 0; i < 3; i++) {
    const cx = f.x + f.w - 5 - i * 11;
    ops.push({ t: 'polygon', points: starPoints(cx, y, 4.2), stroke: '#D97706', strokeWidth: 0.45, fill: PAPER });
  }
  ops.push({ t: 'text', x: f.x + f.w, y: y + 9.5, text: hint, size: 2.6, fill: '#B45309', align: 'right' });
}

function glyphsOf(text: string, cursive = false): Glyph[] {
  const out: Glyph[] = [];
  for (const ch of text) {
    const g = cursive ? cursiveGlyph(ch) : getGlyph(ch);
    if (g) out.push(g);
  }
  return out;
}

const isCursive = (config: BookConfig) => config.script === 'cursive';

function baseStyle(config: BookConfig, s: number, letters = false): RowStyle {
  const cursive = letters && isCursive(config);
  return {
    s,
    stroke: cursive ? 6 : 10,
    cursive,
    variant: config.variant,
    vis: 0.85,
    fadeTo: 0.55,
    showModel: true,
    modelDots: true,
    modelArrows: true,
    blankCells: 0,
    maxCopies: 0,
    leftHanded: false,
    guideColor: '#cbd5e1',
    hint: null,
  };
}

/**
 * Stack rows from `top`. When `bottom` is given, leftover space is spread
 * evenly between the rows (capped) so pages are not top-heavy.
 */
function stackRows(ops: DrawOp[], f: Frame, top: number, rows: RowSpec[], gap: number, bottom?: number): number {
  const rawHeights = rows.map((r) => {
    const e = rowExtents(r.glyphs, 10, r.style.cursive);
    return (e.ascent + 100 + e.descent) * r.style.s;
  });
  // Short trims (8.5 × 8.5 in) cannot hold every row at full size: shrink the rows to fit
  // rather than letting them run off the page.
  let k = 1;
  if (bottom !== undefined) {
    const room = bottom - top - gap * Math.max(0, rows.length - 1);
    const need = rawHeights.reduce((a, b) => a + b, 0);
    if (need > room && need > 0) k = Math.max(0.5, room / need);
  }
  const fitted = rows.map((r) => (k === 1 ? r : { ...r, style: { ...r.style, s: r.style.s * k } }));
  const heights = rawHeights.map((h) => h * k);
  let extra = 0;
  if (bottom !== undefined && fitted.length > 1) {
    const used = heights.reduce((a, b) => a + b, 0) + gap * (fitted.length - 1);
    extra = Math.min(Math.max(0, (bottom - top - used) / (fitted.length - 1)), 9);
  }
  let y = top;
  fitted.forEach((r, i) => {
    const e = rowExtents(r.glyphs, 10, r.style.cursive);
    const s = r.style.s;
    if (r.label) {
      ops.push({ t: 'text', x: f.x, y: y + e.ascent * s - 1.5, text: r.label, size: 3, fill: MUTED, weight: 'bold' });
    }
    const baseline = y + (e.ascent + 100) * s;
    const geom = { x: f.x, width: f.w, baseline };
    if (r.pattern) buildPatternRow(ops, r.pattern, geom, r.style);
    else buildTraceRow(ops, r.glyphs, geom, r.style);
    y += heights[i] + gap + extra;
  });
  return y;
}

// ───────────────────────── pages ─────────────────────────

function titlePage(f: Frame, ops: DrawOp[], config: BookConfig): void {
  const L = T[config.alphabet];
  const cx = f.x + f.w / 2;
  let y = f.y + f.h * 0.2;
  y = paragraph(ops, config.title, { x: f.x, y, width: f.w, size: 15, fill: INK, weight: 'bold', align: 'center', lineHeight: 1.2 });
  y = paragraph(ops, config.subtitle, { x: f.x + 10, y: y + 4, width: f.w - 20, size: 5, fill: MUTED, align: 'center' });
  // decorative letters
  const capY = y + 18;
  if (isCursive(config)) {
    // A handwriting book opens with a joined word in the school script.
    const word = cursiveWord(config.alphabet === 'ro' ? 'Abc' : 'Abc')!;
    const s = 0.5;
    const w = (word.bbox.maxX - word.bbox.minX) * s;
    bigModel(ops, [word], cx - w / 2 - word.bbox.minX * s, capY, s, false, false, 6);
  } else {
    const show = config.alphabet === 'ro' ? 'AăȘ3' : 'AbC3';
    const s = 0.42;
    const glyphs = glyphsOf(show);
    const w = itemWidth(glyphs) * s;
    bigModel(ops, glyphs, cx - w / 2, capY, s);
  }
  // ownership line
  const oy = f.y + f.h * 0.78;
  ops.push({ t: 'text', x: cx, y: oy, text: L.belongsTo, size: 4.2, fill: INK, weight: 'bold', align: 'center' });
  ops.push({ t: 'line', x1: f.x + f.w * 0.2, y1: oy + 12, x2: f.x + f.w * 0.8, y2: oy + 12, stroke: '#94a3b8', strokeWidth: 0.4 });
  ops.push({ t: 'text', x: cx, y: f.y + f.h - 2, text: config.author, size: 4, fill: MUTED, align: 'center', weight: 'bold' });
}

function colophonPage(f: Frame, ops: DrawOp[], config: BookConfig): void {
  const L = T[config.alphabet];
  let y = f.y + f.h - 48;
  ops.push({ t: 'text', x: f.x, y, text: `${config.title}`, size: 4, fill: INK, weight: 'bold' });
  y += 7;
  ops.push({ t: 'text', x: f.x, y, text: `© ${config.year} ${config.author}`, size: 3.4, fill: '#334155' });
  y += 6;
  y = paragraph(ops, L.rights, { x: f.x, y, width: f.w, size: 3.1, fill: MUTED });
  y = paragraph(ops, L.fonts, { x: f.x, y: y + 1, width: f.w, size: 3.1, fill: MUTED });
  y = paragraph(ops, config.alphabet === 'ro' ? ICON_CREDIT : ICON_CREDIT_EN, { x: f.x, y: y + 1, width: f.w, size: 3.1, fill: MUTED });
  paragraph(ops, L.made, { x: f.x, y: y + 1, width: f.w, size: 3.1, fill: MUTED });
}

function instructionsPage(f: Frame, ops: DrawOp[], config: BookConfig): void {
  const L = T[config.alphabet];
  let y = pageTitle(ops, f, L.howTitle);
  y = paragraph(ops, L.howIntro, { x: f.x, y: y + 6, width: f.w, size: 4, fill: '#334155' });
  // legend: a big A with callouts
  const s = 0.4;
  const legendY = y + 8;
  const g = glyphsOf('A');
  const gw = bigModel(ops, g, f.x + 6, legendY, s);
  const lx = f.x + gw + 16;
  ops.push({ t: 'circle', cx: lx + 2, cy: legendY + 3, r: 2.2, fill: ACCENT });
  ops.push({ t: 'text', x: lx + 2, y: legendY + 3.2, text: '1', size: 3, fill: PAPER, weight: 'bold', align: 'center', baseline: 'middle' });
  ops.push({ t: 'text', x: lx + 7, y: legendY + 4.3, text: L.legend1, size: 3.6, fill: ACCENT, weight: 'bold' });
  ops.push({ t: 'polygon', points: [{ x: lx + 5, y: legendY + 11 }, { x: lx - 1, y: legendY + 8.2 }, { x: lx - 1, y: legendY + 13.8 }], fill: ACCENT });
  ops.push({ t: 'text', x: lx + 7, y: legendY + 12.3, text: L.legend2, size: 3.6, fill: ACCENT, weight: 'bold' });
  // dashed copy + empty cell as example
  const exS = 0.22;
  const exY = legendY + 100 * s - 100 * exS;
  ops.push({
    t: 'group',
    tx: f.x + gw + 48,
    ty: exY,
    scale: exS,
    ops: itemOps(g, { color: '#94a3b8', strokeWidth: 10, variant: config.variant, startDots: false, arrows: false, accent: ACCENT, dotText: PAPER, paper: PAPER }),
  });
  y = legendY + 100 * s + 14;
  y = bulletList(ops, L.howBullets, { x: f.x, y, width: f.w, size: 3.9, fill: '#334155', gap: 3 });
  rewardStars(ops, f, L.starsHint);
}

function dividerPage(f: Frame, ops: DrawOp[], config: BookConfig, part: string, title: string, sub: string, deco: 'waves' | 'letters' | 'numbers'): void {
  const cx = f.x + f.w / 2;
  const y0 = f.y + f.h * 0.3;
  ops.push({ t: 'text', x: cx, y: y0, text: part.toUpperCase(), size: 5, fill: ACCENT, weight: 'bold', align: 'center' });
  ops.push({ t: 'text', x: cx, y: y0 + 16, text: title, size: 13, fill: INK, weight: 'bold', align: 'center' });
  paragraph(ops, sub, { x: f.x + 15, y: y0 + 26, width: f.w - 30, size: 4.4, fill: MUTED, align: 'center' });
  const decoY = y0 + 48;
  if (deco === 'waves') {
    const s = 0.2;
    const periods = Math.floor((f.w - 20) / (60 * s));
    const g = patternGlyph('waves', periods);
    ops.push({
      t: 'group',
      tx: cx - (g.width * s) / 2,
      ty: decoY,
      scale: s,
      ops: renderGlyph(g, { color: '#94a3b8', strokeWidth: 10, variant: 'dashed', startDots: false, arrows: false, accent: ACCENT, dotText: PAPER, paper: PAPER }),
    });
  } else {
    const text = deco === 'letters' ? (config.alphabet === 'ro' ? 'AaBbȘș' : 'AaBbCc') : '12345';
    outlineRow(ops, glyphsOf(text), cx, decoY, 0.28);
  }
}

function patternPage(f: Frame, ops: DrawOp[], config: BookConfig, id: PatternId): void {
  const L = T[config.alphabet];
  const top = pageTitle(ops, f, PATTERN_LABELS[config.alphabet][id], L.traceHint);
  rewardStars(ops, f, L.starsHint);
  const s = 0.17;
  const gap = 4;
  const rows: RowSpec[] = [];
  for (let i = 0; i < 7; i++) {
    const vis = 0.9 - i * 0.09;
    rows.push({ glyphs: [], pattern: id, style: { ...baseStyle(config, s), vis, fadeTo: 1 } });
  }
  rows.push({ glyphs: [], style: { ...baseStyle(config, s), showModel: false }, label: L.alone });
  stackRows(ops, f, top + 4, rows, gap, f.y + f.h - 4);
}

function letterPage(f: Frame, ops: DrawOp[], config: BookConfig, upper: string): void {
  const L = T[config.alphabet];
  const lower = upper.toLowerCase();
  const top = pageTitle(ops, f, L.letterTitle(upper, lower));
  rewardStars(ops, f, L.starsHint);

  // header: big models + hint word
  const cursive = isCursive(config);
  const bigS = 0.34;
  const gU = glyphsOf(upper, cursive);
  const gL = glyphsOf(lower, cursive);
  const capY = top + 12;
  let x = f.x + 2;
  const pen = cursive ? 6 : 10;
  const wU = bigModel(ops, gU, x + (cursive ? 5 - gU[0].bbox.minX * bigS : 0), capY, bigS, true, true, pen);
  x += Math.max(wU, 12) + 12;
  const wL = bigModel(ops, gL, x + (cursive ? 5 - gL[0].bbox.minX * bigS : 0), capY, bigS, true, true, pen);
  x += Math.max(wL, 12) + 14;
  const hint = hintFor(upper, config.alphabet);
  if (hint) {
    const cardX = Math.max(x, f.x + f.w * 0.5);
    const cardW = f.x + f.w - cardX;
    const cy = capY + 100 * bigS * 0.5;
    ops.push({ t: 'rect', x: cardX, y: capY - 4, w: cardW, h: 100 * bigS + 8, rx: 4, fill: '#F8FAFC', stroke: '#e2e8f0', strokeWidth: 0.4 });
    const pic = Math.min(26, 100 * bigS);
    ops.push(...iconOps(hint.emoji, cardX + 6 + pic / 2, cy, pic));
    const wordX = cardX + 6 + pic + (cardW - 6 - pic) / 2;
    const startsWith = normalizeKey(hint.word)[0]?.toUpperCase() === upper;
    ops.push({ t: 'text', x: wordX, y: startsWith ? cy : cy - 2.5, text: hint.word, size: 7.5, fill: INK, weight: 'bold', align: 'center', baseline: 'middle' });
    // Ă and Â never start a word: say where the letter is instead of implying it is the first sound.
    if (!startsWith) ops.push({ t: 'text', x: wordX, y: cy + 5.5, text: L.inWord(upper), size: 3.4, fill: MUTED, align: 'center', baseline: 'middle' });
  }

  // rows
  const s = cursive ? 0.19 : 0.16;
  const st = baseStyle(config, s, true);
  const rowsTop = capY + 100 * bigS + 16;
  const joined = hint && cursive ? cursiveWord(hint.word) : undefined;
  const word = hint ? (joined ? [joined] : glyphsOf(hint.word)) : [];
  // Handwriting: one row of the capital, two of the small letter (it is the one joined in words).
  const rows: RowSpec[] = [
    { glyphs: gU, style: { ...st, vis: 0.85, fadeTo: 0.6 } },
    ...(cursive ? [] : [{ glyphs: gU, style: { ...st, vis: 0.6, fadeTo: 0.45, blankCells: 2 } }]),
    { glyphs: gL, style: { ...st, vis: 0.85, fadeTo: 0.6 } },
    { glyphs: gL, style: { ...st, vis: 0.6, fadeTo: 0.45, blankCells: 2 } },
  ];
  if (word.length) rows.push({ glyphs: word, style: { ...st, vis: 0.75, fadeTo: 0.6, modelDots: false, modelArrows: false, maxCopies: 3 } });
  rows.push({ glyphs: [], style: { ...st, showModel: false }, label: L.writeAlone });
  // Handwriting rows draw a line for the tails at the very bottom of the row: keep it off the trim edge.
  stackRows(ops, f, rowsTop, rows, 4.5, f.y + f.h - (cursive ? 10 : 4));
}

function alphabetReviewPage(f: Frame, ops: DrawOp[], config: BookConfig): void {
  const L = T[config.alphabet];
  const top = pageTitle(ops, f, L.reviewTitle, L.reviewSub);
  rewardStars(ops, f, L.starsHint);
  const letters = ALPHABETS[config.alphabet];
  const cursive = isCursive(config);
  const pairs = letters.map((u) => glyphsOf(`${u}${u.toLowerCase()}`, cursive));
  const avail = f.y + f.h - 4 - (top + 6);
  // Largest letter size (≤ 0.16) at which every pair fits on the page, up to 6 per line.
  let s = 0.16;
  let cellW = 0, cols = 1, nRows = 1, rowH = 0;
  for (; s > 0.08; s -= 0.005) {
    cellW = (Math.max(...pairs.map(itemWidth)) + CELL_PAD * 2) * s;
    cols = Math.max(1, Math.min(6, Math.floor(f.w / cellW)));
    nRows = Math.ceil(pairs.length / cols);
    rowH = (48 + 100 + (cursive ? 62 : 48)) * s;
    if (nRows * rowH + (nRows - 1) * 3 <= avail) break;
  }
  const gridW = cols * cellW;
  const x0 = f.x + (f.w - gridW) / 2;
  const rowGap = Math.min(14, Math.max(3, (avail - nRows * rowH) / Math.max(1, nRows - 1)));
  let y = top + 6;
  for (let r = 0; r < nRows; r++) {
    const baseline = y + 148 * s;
    ops.push(...guideOps({ x: f.x, width: f.w, baseline }, s, '#cbd5e1', cursive));
    for (let c = 0; c < cols; c++) {
      const pair = pairs[r * cols + c];
      if (!pair) break;
      ops.push({
        t: 'group',
        tx: x0 + c * cellW + CELL_PAD * s,
        ty: baseline - 100 * s,
        scale: s,
        ops: itemOps(pair, { color: '#64748b', strokeWidth: cursive ? 6 : 10, variant: config.variant, startDots: false, arrows: false, accent: ACCENT, dotText: PAPER, paper: PAPER, ...(cursive ? { dash: [1.6, 1.4] as [number, number] } : {}) }),
      });
    }
    y += rowH + rowGap;
  }
}

function numberPage(f: Frame, ops: DrawOp[], config: BookConfig, n: number): void {
  const L = T[config.alphabet];
  const top = pageTitle(ops, f, L.numberTitle(n));
  rewardStars(ops, f, L.starsHint);
  const digits = glyphsOf(String(n));
  const bigS = 0.34;
  const capY = top + 12;
  const wD = bigModel(ops, digits, f.x + 2, capY, bigS);
  // counting stars
  const cx0 = f.x + wD + 22;
  ops.push({ t: 'text', x: cx0, y: capY + 3, text: L.count, size: 3.6, fill: MUTED, weight: 'bold' });
  const perLine = 5;
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / perLine);
    const col = i % perLine;
    const cx = cx0 + 7 + col * 15;
    const cy = capY + 14 + row * 15;
    ops.push({ t: 'polygon', points: starPoints(cx, cy, 6), stroke: '#D97706', strokeWidth: 0.5, fill: PAPER });
  }
  if (n === 0) {
    ops.push({ t: 'rect', x: cx0, y: capY + 8, w: 40, h: 22, rx: 2, stroke: '#cbd5e1', strokeWidth: 0.4, dash: [1.5, 1.5] });
  }
  const word = L.numberWords[n] ?? '';
  ops.push({ t: 'text', x: f.x + f.w, y: capY + 100 * bigS - 2, text: word, size: 7, fill: INK, weight: 'bold', align: 'right' });

  const s = 0.16;
  const st = baseStyle(config, s);
  const rowsTop = capY + 100 * bigS + 16;
  const wordGlyphs = glyphsOf(word);
  const rows: RowSpec[] = [
    { glyphs: digits, style: { ...st, vis: 0.85, fadeTo: 0.6 } },
    { glyphs: digits, style: { ...st, vis: 0.65, fadeTo: 0.5, blankCells: 1 } },
    { glyphs: digits, style: { ...st, vis: 0.5, fadeTo: 0.4, blankCells: 3 } },
  ];
  if (wordGlyphs.length) rows.push({ glyphs: wordGlyphs, style: { ...st, vis: 0.75, fadeTo: 0.6, modelDots: false, modelArrows: false, maxCopies: 3 } });
  rows.push({ glyphs: [], style: { ...st, showModel: false }, label: L.writeAlone });
  rows.push({ glyphs: [], style: { ...st, showModel: false } });
  stackRows(ops, f, rowsTop, rows, 5, f.y + f.h - 4);
}

function numbersReviewPage(f: Frame, ops: DrawOp[], config: BookConfig): void {
  const L = T[config.alphabet];
  const top = pageTitle(ops, f, L.numbersReview(config.numbersMax), L.numbersReviewSub);
  rewardStars(ops, f, L.starsHint);
  const digits = Array.from({ length: config.numbersMax + 1 }, (_, i) => glyphsOf(String(i)));
  const variants: TraceVariant[] = [config.variant, 'dotted', 'outline'];
  const avail = f.y + f.h - 4 - (top + 6) - 30; // keep room for at least two "write alone" lines
  // Largest size (≤ 0.15) at which the three passes over 0…N fit, balanced over as few lines as possible.
  let s = 0.15;
  let cellW = 0, lines: Glyph[][][] = [], rowH = 0;
  for (; s > 0.07; s -= 0.005) {
    cellW = (Math.max(...digits.map(itemWidth)) + CELL_PAD * 2) * s;
    const maxPerLine = Math.max(1, Math.floor(f.w / cellW));
    const perLine = Math.ceil(digits.length / Math.ceil(digits.length / maxPerLine));
    lines = [];
    for (let i = 0; i < digits.length; i += perLine) lines.push(digits.slice(i, i + perLine));
    rowH = (8 + 100 + 8) * s;
    if (variants.length * (lines.length * (rowH + 4) + 2) <= avail) break;
  }
  let y = top + 6;
  for (let r = 0; r < variants.length; r++) {
    for (const line of lines) {
      const baseline = y + 108 * s;
      const x0 = f.x + Math.max(0, (f.w - line.length * cellW) / 2);
      ops.push(...guideOps({ x: f.x, width: f.w, baseline }, s, '#cbd5e1'));
      line.forEach((d, i) => {
        ops.push({
          t: 'group',
          tx: x0 + i * cellW + CELL_PAD * s,
          ty: baseline - 100 * s,
          scale: s,
          ops: itemOps(d, { color: '#64748b', strokeWidth: 10, variant: variants[r], startDots: false, arrows: false, accent: ACCENT, dotText: PAPER, paper: PAPER }),
        });
      });
      y += rowH + 4;
    }
    y += 2;
  }
  const writeS = 0.15;
  const writeH = (8 + 100 + 8) * writeS;
  ops.push({ t: 'text', x: f.x, y: y + 4, text: L.writeAlone, size: 3, fill: MUTED, weight: 'bold' });
  y += 8;
  while (y + writeH < f.y + f.h - 4) {
    ops.push(...guideOps({ x: f.x, width: f.w, baseline: y + 108 * writeS }, writeS, '#cbd5e1'));
    y += writeH + 6;
  }
}

function certificatePage(f: Frame, ops: DrawOp[], config: BookConfig): void {
  const L = T[config.alphabet];
  const cx = f.x + f.w / 2;
  ops.push({ t: 'rect', x: f.x, y: f.y, w: f.w, h: f.h, rx: 6, stroke: ACCENT, strokeWidth: 1.2 });
  ops.push({ t: 'rect', x: f.x + 4, y: f.y + 4, w: f.w - 8, h: f.h - 8, rx: 4, stroke: '#FBBF24', strokeWidth: 0.4 });
  for (let i = 0; i < 5; i++) {
    const sx = cx - 28 + i * 14;
    ops.push({ t: 'polygon', points: starPoints(sx, f.y + f.h * 0.14, i === 2 ? 6 : 4.5), stroke: '#D97706', strokeWidth: 0.5, fill: '#FDE68A' });
  }
  ops.push({ t: 'text', x: cx, y: f.y + f.h * 0.27, text: L.diploma, size: 15, fill: INK, weight: 'bold', align: 'center' });
  ops.push({ t: 'text', x: cx, y: f.y + f.h * 0.38, text: L.diplomaFor, size: 5, fill: MUTED, align: 'center' });
  ops.push({ t: 'line', x1: f.x + f.w * 0.2, y1: f.y + f.h * 0.47, x2: f.x + f.w * 0.8, y2: f.y + f.h * 0.47, stroke: '#94a3b8', strokeWidth: 0.5 });
  paragraph(ops, L.diplomaText, { x: f.x + 20, y: f.y + f.h * 0.55, width: f.w - 40, size: 4.6, fill: '#334155', align: 'center' });
  outlineRow(ops, glyphsOf(config.alphabet === 'ro' ? 'AăBbȘș' : 'AaBbCc'), cx, f.y + f.h * 0.63, 0.2);
  const ly = f.y + f.h * 0.86;
  ops.push({ t: 'text', x: f.x + 20, y: ly, text: `${L.date}: _______________`, size: 4, fill: '#334155' });
  ops.push({ t: 'text', x: f.x + f.w - 20, y: ly, text: `${L.signature}: _______________`, size: 4, fill: '#334155', align: 'right' });
}

function notesPage(f: Frame, ops: DrawOp[], config: BookConfig): void {
  const L = T[config.alphabet];
  const top = pageTitle(ops, f, L.notes);
  const s = 0.15;
  const rowH = (8 + 100 + 8) * s;
  let y = top + 6;
  while (y + rowH < f.y + f.h - 4) {
    ops.push(...guideOps({ x: f.x, width: f.w, baseline: y + 108 * s }, s, '#cbd5e1'));
    y += rowH + 7;
  }
}
