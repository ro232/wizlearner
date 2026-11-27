import type { DrawOp, PageOps } from '@/lib/glyphs/types';
import { DEFAULT_CONFIG, type LetterMode, type Script, type Tier, type WorksheetConfig } from '@/types';
import type { SchoolLevel } from '@/lib/curriculum/sheet';
import { normalizeKey } from '@/lib/glyphs/data';
import type { PatternId } from '@/lib/glyphs/patterns';
import { iconOps } from '@/lib/hints/icons';
import { textWidthMm } from '@/lib/book/text';
import { madeWith, BRAND_NAME } from '@/lib/brand';
import { themeById } from '@/lib/themes';
import type { MathRange, MathType } from './math';
import { buildWorksheetPages, glyphsForWord, wordInCase } from './layout';
import { cursiveWord } from '@/lib/glyphs/cursive';
import { glyphBounds } from '@/lib/glyphs/render';
import { INK, ACCENT, MUTED, PAPER, itemOps, itemWidth, starPoints } from './rows';

/**
 * „Calendarul de Advent”: a cover with 24 boxes to colour, one per day, then one short sheet
 * for every day from 1 to 24 December (10–15 minutes for a child of 4–7), personalised with the
 * child's name. It is the free lead magnet: every page is free, with the usual free footer.
 *
 * Every day page comes from the existing engines (letters, pre-writing, games, math); only the
 * cover and the Christmas diploma of the 24th are drawn here. Each day page is titled with its
 * date. The class level picks the letters (print capitals, print paired letters, handwriting)
 * and the number ranges; the competence label is added by buildWorksheetPages from
 * `curriculumLevel`, with the existing rules (no rule here).
 */

export type AdventLevel = Extract<SchoolLevel, 'presc' | 'CP' | 'I'>;

export const ADVENT_LEVELS: { id: AdventLevel; label: string; sub: string }[] = [
  { id: 'presc', label: 'Grădiniță', sub: 'litere mari de tipar, numere până la 10' },
  { id: 'CP', label: 'Clasa pregătitoare', sub: 'litere mari și mici de tipar, până la 10' },
  { id: 'I', label: 'Clasa I', sub: 'litere de mână, numere până la 20' },
];

export function isAdventLevel(v: unknown): v is AdventLevel {
  return v === 'presc' || v === 'CP' || v === 'I';
}

/** What the child does on one day. Theme words are looked up in src/lib/themes.ts. */
export type AdventActivity =
  | { kind: 'word'; theme: string; word: string }
  /** The child's name (dashed, or in outline to trace); without a name, the theme word given as fallback. */
  | { kind: 'name'; style?: 'outline'; fallback: { theme: string; word: string } }
  | { kind: 'pattern'; patterns: PatternId[] }
  /** Find the letter: capital in grădiniță, small letter at school. */
  | { kind: 'find'; letter: string }
  | { kind: 'count' }
  | { kind: 'dots'; shape: 'star' | 'tree' }
  /** The n-th math day: the exercise type and range depend on the class (MATH_DAYS). */
  | { kind: 'math'; n: 0 | 1 | 2 }
  | { kind: 'diploma' };

export interface AdventDay {
  day: number;
  activity: AdventActivity;
}

/**
 * The 24 days. Fixed: 1 December (România), 6 December (Moș Nicolae), 24 December (Crăciun,
 * the diploma). The rest alternate so that no two days in a row do the same kind of thing.
 */
export const ADVENT_PLAN: readonly AdventDay[] = [
  { day: 1, activity: { kind: 'word', theme: '1-decembrie', word: 'ROMÂNIA' } },
  { day: 2, activity: { kind: 'pattern', patterns: ['zigzag', 'waves'] } },
  { day: 3, activity: { kind: 'word', theme: 'iarna', word: 'FULG' } },
  { day: 4, activity: { kind: 'count' } },
  { day: 5, activity: { kind: 'find', letter: 'M' } },
  { day: 6, activity: { kind: 'word', theme: 'mos-nicolae', word: 'GHETE' } },
  { day: 7, activity: { kind: 'math', n: 0 } },
  { day: 8, activity: { kind: 'name', fallback: { theme: 'iarna', word: 'MĂNUȘI' } } },
  { day: 9, activity: { kind: 'dots', shape: 'star' } },
  { day: 10, activity: { kind: 'word', theme: 'iarna', word: 'SANIE' } },
  { day: 11, activity: { kind: 'pattern', patterns: ['cups', 'loops'] } },
  { day: 12, activity: { kind: 'find', letter: 'B' } },
  { day: 13, activity: { kind: 'word', theme: 'craciun', word: 'BRAD' } },
  { day: 14, activity: { kind: 'math', n: 1 } },
  { day: 15, activity: { kind: 'word', theme: 'craciun', word: 'STEA' } },
  { day: 16, activity: { kind: 'pattern', patterns: ['castle', 'circles'] } },
  { day: 17, activity: { kind: 'word', theme: 'mos-nicolae', word: 'CADOU' } },
  { day: 18, activity: { kind: 'dots', shape: 'tree' } },
  { day: 19, activity: { kind: 'find', letter: 'R' } },
  { day: 20, activity: { kind: 'word', theme: 'craciun', word: 'REN' } },
  { day: 21, activity: { kind: 'math', n: 2 } },
  { day: 22, activity: { kind: 'word', theme: 'craciun', word: 'CLOPOȚEL' } },
  { day: 23, activity: { kind: 'name', style: 'outline', fallback: { theme: 'craciun', word: 'MOȘ CRĂCIUN' } } },
  { day: 24, activity: { kind: 'diploma' } },
];

/**
 * Math by class. Kept to what the child surely knows in December: counting-based sheets (series,
 * neighbours, sums with pictures) in grădiniță and CP; in clasa I numbers up to 20, and sums and
 * differences only up to 10 (no passing over ten).
 */
const MATH_DAYS: Record<AdventLevel, [MathType, MathRange][]> = {
  presc: [['seq', 5], ['addpic', 5], ['nbr', 10]],
  CP: [['seq', 10], ['addpic', 10], ['nbr', 10]],
  I: [['nbr', 20], ['seq', 20], ['mix', 10]],
};

interface LevelStyle {
  letterMode: LetterMode;
  script: Script;
  /** Letter case for „find the letter”. */
  find: 'uppercase' | 'lowercase';
  count: 'count:5' | 'count:10';
}

const STYLE: Record<AdventLevel, LevelStyle> = {
  presc: { letterMode: 'uppercase', script: 'print', find: 'uppercase', count: 'count:5' },
  CP: { letterMode: 'paired', script: 'print', find: 'lowercase', count: 'count:10' },
  I: { letterMode: 'paired', script: 'cursive', find: 'lowercase', count: 'count:10' },
};

/** SEASONAL: the home page card for the calendar shows until 26 December 2026 (see src/lib/advent-season.ts). */
export { ADVENT_BANNER_END, adventBannerVisible } from '@/lib/advent-season';

export function adventDateTitle(day: number): string {
  return `${day} decembrie`;
}

const W = 210;
const H = 297;
const M = 12;

export function cleanAdventName(raw: string): string {
  return normalizeKey(raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 28);
}

function base(level: AdventLevel, name: string, title: string, patch: Partial<WorksheetConfig>): WorksheetConfig {
  const st = STYLE[level];
  return {
    ...DEFAULT_CONFIG,
    alphabet: 'ro',
    letterMode: st.letterMode,
    script: st.script,
    selectedItems: [],
    customWords: [],
    childName: name,
    customTitle: title,
    curriculumLevel: level,
    fillPage: true,
    showRewardSection: true,
    ...patch,
  };
}

function wordConfig(level: AdventLevel, name: string, title: string, theme: string, word: string): WorksheetConfig {
  const emoji = themeById(theme)?.words.find((w) => w.word === word)?.emoji;
  return base(level, name, title, {
    category: 'letters',
    customWords: [word],
    ...(emoji ? { wordPictures: { [word]: emoji } } : {}),
    showLetterIcons: false,
    rowsPerPage: 6,
  });
}

function dayConfig(level: AdventLevel, name: string, d: AdventDay): WorksheetConfig | null {
  const title = adventDateTitle(d.day);
  const a = d.activity;
  const st = STYLE[level];
  switch (a.kind) {
    case 'word':
      return wordConfig(level, name, title, a.theme, a.word);
    case 'name':
      if (!name) return wordConfig(level, name, title, a.fallback.theme, a.fallback.word);
      // like the free name sheet on /nume: the whole name, row after row
      return base(level, name, title, { category: 'letters', customWords: [name], showLetterIcons: false, rowsPerPage: 7, ...(a.style ? { fontStyle: a.style } : {}) });
    case 'pattern':
      return base(level, name, title, { category: 'prewrite', selectedItems: a.patterns, repetitionsPerItem: 3, rowsPerPage: 6, showLetterIcons: false });
    case 'find':
      return base(level, name, title, { category: 'games', letterMode: st.find, selectedItems: [`find:${a.letter}`] });
    case 'count':
      return base(level, name, title, { category: 'games', selectedItems: [st.count] });
    case 'dots':
      return base(level, name, title, { category: 'games', selectedItems: [`dots:${a.shape}`] });
    case 'math': {
      const [type, range] = MATH_DAYS[level][a.n];
      return base(level, name, title, { category: 'math', selectedItems: [type], mathRange: range, mathSeed: d.day, mathAnswers: false });
    }
    case 'diploma':
      return null;
  }
}

/** The page header's title is the date (games and math draw their own title: it is replaced). */
function retitle(page: PageOps, title: string): PageOps {
  let done = false;
  const ops = page.ops.map((op) => {
    if (done || op.t !== 'text' || op.weight !== 'bold' || op.x !== M || Math.abs(op.y - (M + 6.5)) > 0.01) return op;
    done = true;
    return { ...op, text: title, size: 6.5 };
  });
  // a small star after the date: the calendar's mark on every day
  const x = M + textWidthMm(title, 6.5) + 6;
  ops.push({ t: 'polygon', points: starPoints(x, M + 4.3, 3.2), stroke: '#D97706', strokeWidth: 0.45, fill: '#FDE68A' });
  return { ...page, ops };
}

function freeFooter(page: PageOps): PageOps {
  return { ...page, ops: [...page.ops, { t: 'text', x: page.width - M, y: page.height - M + 2, text: madeWith('ro'), size: 2.6, fill: '#94a3b8', align: 'right' }] };
}

function frameOps(ops: DrawOp[], color: string): void {
  ops.push({ t: 'rect', x: 14, y: 14, w: W - 28, h: H - 28, rx: 6, stroke: color, strokeWidth: 1.3 });
  ops.push({ t: 'rect', x: 18.5, y: 18.5, w: W - 37, h: H - 37, rx: 4, stroke: '#16A34A', strokeWidth: 0.45 });
}

/**
 * A word drawn large and centred on cx, its highest ink (accent, capital loop) at `top`;
 * returns the y of its lowest ink (comma of Ș, tail of f/g), so the next line never touches it.
 */
function bigWord(ops: DrawOp[], text: string, cx: number, top: number, maxW: number, maxCap: number, variant: 'solid' | 'outline', script: Script): number {
  const joined = script === 'cursive' ? cursiveWord(text) : undefined;
  const glyphs = joined ? [joined] : glyphsForWord(text);
  if (!glyphs.length) return top;
  const stroke = joined ? 7 : 10;
  const units = itemWidth(glyphs);
  const s = Math.min(maxCap / 100, maxW / units);
  const minY = Math.min(0, ...glyphs.map((g) => glyphBounds(g, stroke).minY));
  const maxY = Math.max(100, ...glyphs.map((g) => glyphBounds(g, stroke).maxY));
  ops.push({
    t: 'group',
    tx: cx - (units * s) / 2,
    ty: top - minY * s,
    scale: s,
    ops: itemOps(glyphs, { color: INK, strokeWidth: stroke, variant, startDots: false, arrows: false, accent: ACCENT, dotText: PAPER, paper: PAPER }),
  });
  return top + (maxY - minY) * s;
}

const COVER_ICONS: Record<number, string> = { 1: '🇷🇴', 6: '🥾', 24: '🎄' };

/** The cover: the child's name and 24 boxes, one coloured in after each day's sheet. */
export function adventCover(name: string, level: AdventLevel): PageOps {
  const { script, letterMode } = STYLE[level];
  const ops: DrawOp[] = [];
  frameOps(ops, ACCENT);
  for (let i = 0; i < 5; i++) ops.push({ t: 'polygon', points: starPoints(W / 2 - 40 + i * 20, 32, i === 2 ? 6 : 4.2), stroke: '#D97706', strokeWidth: 0.55, fill: '#FDE68A' });
  let y: number;
  if (name) {
    ops.push({ t: 'text', x: W / 2, y: 52, text: 'Calendarul de Advent', size: 10, fill: INK, weight: 'bold', align: 'center' });
    ops.push({ t: 'text', x: W / 2, y: 61, text: 'al lui / al ei', size: 4.4, fill: MUTED, align: 'center' });
    // the name in outline letters, to colour in (in handwriting for clasa I)
    y = bigWord(ops, wordInCase(name, letterMode), W / 2, 66, W - 60, script === 'cursive' ? 19 : 22, 'outline', script);
    y = Math.max(y + 2, 98);
  } else {
    ops.push({ t: 'text', x: W / 2, y: 58, text: 'Calendarul meu de Advent', size: 10, fill: INK, weight: 'bold', align: 'center' });
    ['⛄', '🎄', '🎁'].forEach((e, i) => ops.push(...iconOps(e, W / 2 - 24 + i * 24, 80, 16)));
    y = 98;
  }
  ops.push({ t: 'text', x: W / 2, y: y + 8, text: 'După fișa fiecărei zile, colorează căsuța cu data de azi.', size: 4.2, fill: INK, weight: 'bold', align: 'center' });

  // 4 × 6 boxes
  const cols = 4;
  const rows = 6;
  const gx = 25;
  const gw = W - 2 * gx;
  const top = y + 13;
  const bottom = H - 30;
  const gap = 3;
  const cw = (gw - gap * (cols - 1)) / cols;
  const ch = (bottom - top - gap * (rows - 1)) / rows;
  for (let i = 0; i < 24; i++) {
    const day = i + 1;
    const c = i % cols;
    const r = Math.floor(i / cols);
    const x = gx + c * (cw + gap);
    const by = top + r * (ch + gap);
    ops.push({ t: 'rect', x, y: by, w: cw, h: ch, rx: 3, fill: PAPER, stroke: day === 24 ? ACCENT : INK, strokeWidth: day === 24 ? 0.9 : 0.5 });
    const glyphs = glyphsForWord(String(day));
    const s = Math.min((ch - 7) / 100, (cw * 0.62) / itemWidth(glyphs));
    const w = itemWidth(glyphs) * s;
    ops.push({
      t: 'group',
      tx: x + (cw - w) / 2,
      ty: by + (ch - 100 * s) / 2,
      scale: s,
      ops: itemOps(glyphs, { color: INK, strokeWidth: 10, variant: 'outline', startDots: false, arrows: false, accent: ACCENT, dotText: PAPER, paper: PAPER }),
    });
    const icon = COVER_ICONS[day];
    if (icon) ops.push(...iconOps(icon, x + cw - 5, by + 5, 6));
  }
  ops.push({ t: 'text', x: W / 2, y: H - 21, text: BRAND_NAME, size: 3.2, fill: MUTED, weight: 'bold', align: 'center' });
  return { width: W, height: H, ops };
}

/** 24 December: a Christmas diploma with the child's name (or a line to write it on). */
export function adventDiploma(name: string, level: AdventLevel): PageOps {
  const { script, letterMode } = STYLE[level];
  const ops: DrawOp[] = [];
  frameOps(ops, ACCENT);
  ops.push({ t: 'text', x: W / 2, y: 32, text: adventDateTitle(24), size: 6.5, fill: INK, weight: 'bold', align: 'center' });
  ops.push(...iconOps('🎄', W / 2, 54, 26));
  for (let i = 0; i < 2; i++) ops.push({ t: 'polygon', points: starPoints(W / 2 + (i ? 26 : -26), 58, 5), stroke: '#D97706', strokeWidth: 0.5, fill: '#FDE68A' });
  ops.push({ t: 'text', x: W / 2, y: 92, text: 'DIPLOMĂ', size: 16, fill: INK, weight: 'bold', align: 'center' });
  ops.push({ t: 'text', x: W / 2, y: 108, text: 'Se acordă lui / ei', size: 5, fill: MUTED, align: 'center' });
  let y: number;
  if (name) {
    y = bigWord(ops, wordInCase(name, letterMode), W / 2, 116, W - 70, script === 'cursive' ? 16 : 22, 'solid', script) + 8;
  } else {
    ops.push({ t: 'line', x1: 45, y1: 130, x2: W - 45, y2: 130, stroke: INK, strokeWidth: 0.4, dash: [1.2, 1.2] });
    y = 140;
  }
  y = Math.max(y, 150);
  ops.push({ t: 'text', x: W / 2, y, text: 'pentru că a lucrat cu drag în fiecare zi', size: 5, fill: '#334155', align: 'center' });
  ops.push({ t: 'text', x: W / 2, y: y + 8, text: 'a Calendarului de Advent.', size: 5, fill: '#334155', align: 'center' });
  ops.push({ t: 'text', x: W / 2, y: y + 26, text: 'Crăciun fericit!', size: 10, fill: '#B91C1C', weight: 'bold', align: 'center' });
  // stars to colour, one for each week of Advent… and one for Christmas Eve
  for (let i = 0; i < 5; i++) ops.push({ t: 'polygon', points: starPoints(W / 2 - 40 + i * 20, y + 46, i === 2 ? 7 : 5.5), stroke: '#D97706', strokeWidth: 0.6, fill: PAPER });
  ops.push({ t: 'text', x: W / 2, y: y + 62, text: 'Colorează stelele și arată diploma celor dragi!', size: 4.2, fill: INK, weight: 'bold', align: 'center' });
  ops.push({ t: 'text', x: 34, y: H - 40, text: 'Data: 24 decembrie', size: 4, fill: '#334155' });
  ops.push({ t: 'text', x: W - 34, y: H - 40, text: 'Semnătura: _______________', size: 4, fill: '#334155', align: 'right' });
  return { width: W, height: H, ops };
}

/** One day's page (the date as title). */
export function buildAdventDay(level: AdventLevel, rawName: string, d: AdventDay): PageOps {
  const name = cleanAdventName(rawName);
  const config = dayConfig(level, name, d);
  if (!config) return adventDiploma(name, level);
  const page = buildWorksheetPages(config, 'full')[0];
  return retitle(page, adventDateTitle(d.day));
}

/**
 * The whole calendar: cover + 24 days. Every page is free; the free tier gets the usual footer
 * („Creat cu …”) on each page. Content is always built at the full level, so a free download is
 * the whole calendar, words, numbers and all.
 */
export function buildAdventPages(level: AdventLevel, rawName: string, tier: Tier): PageOps[] {
  const name = cleanAdventName(rawName);
  const pages = [adventCover(name, level), ...ADVENT_PLAN.map((d) => buildAdventDay(level, name, d))];
  return tier === 'free' ? pages.map(freeFooter) : pages;
}
