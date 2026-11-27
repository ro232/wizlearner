import type { DrawOp, PageOps } from '@/lib/glyphs/types';
import type { Tier, WorksheetConfig } from '@/types';
import { ACCENT, INK, MUTED, PAPER } from './rows';
import type { KeySection } from './answer-key';
import { BOTTOM, CELL_STROKE, M, SOFT, W, H, adultNote, fitSize, footer, frame } from './page-kit';
import { rulingOps, textW } from './reading-pages';
import { textWidthMm } from '@/lib/book/text';

/**
 * The building blocks of the clasa a III-a and a IV-a sheets (m34-pages.ts for Matematică, r34-pages.ts for Limba și
 * literatura română): a page is a list of numbered tasks („1. Scrie cu cifre.”), each a block of one kind — boxes to
 * fill, words to circle, true / false, events to number, a text to read, writing rows on the school ruling, a table to
 * fill, or a drawing. Every block measures itself, draws itself and gives its answers, so the page, the answers page and
 * the evaluation (evaluation.ts) are made from the very same data.
 *
 * Sizes are those of the older pupils: body text 4.3 mm, writing rows of the tip II notebook (clasa a III-a) or dictando
 * lines 8 mm apart (clasa a IV-a), as in their notebooks.
 */

/** A line with boxes: `text` holds „{}” for a box (a number, a sign, a short word) or „{_}” for a line to write on. */
export interface Fill { text: string; answers: string[] }
/** A sentence with a choice: `text` holds „{}” where the options are printed, one to circle. */
export interface Choice { text: string; options: string[]; answer: number }

/** The rows to write on: tip II (clasa a III-a), dictando lines (clasa a IV-a), or 5 mm squares (math work). */
export type Ruling = 'II' | 'dictando' | 'grid';

/**
 * A token of an expression row: a text („24 + 6 · 3 =”, the dot of the multiplication drawn), a fraction written as on the
 * board, an empty fraction to fill (two boxes over a bar; a fixed denominator when given), a box, a line, or options to
 * circle.
 */
export type Tok = string | { f: [string | number, string | number] } | { fbox: true; den?: number } | { box: number } | { line: number } | { pick: string[] };
/** One exercise of an expression block, and its answer for the key. */
export interface Expr { toks: Tok[]; answer: string; score?: number }

export type Block =
  | { t: 'fill'; heading: string; items: Fill[]; cols?: number; box?: number; size?: number }
  | { t: 'choice'; heading: string; items: Choice[]; cols?: number }
  | { t: 'tf'; heading: string; items: { text: string; answer: boolean }[] }
  | { t: 'order'; heading: string; items: string[]; answer: number[] }
  | { t: 'text'; title: string; paragraphs: string[]; author?: string; size?: number }
  | { t: 'write'; heading?: string; prompts?: string[]; rows: number | 'fill'; ruling: Ruling; answer?: string }
  | { t: 'question'; heading: string; rows: number; ruling: Ruling; answer: string }
  | { t: 'table'; heading: string; bank: string[]; columns: string[]; answers: string[][]; rows: number }
  | { t: 'draw'; heading: string; height: number; draw: (ops: DrawOp[], x: number, y: number, w: number, h: number) => void; answers: string[]; score?: number }
  | { t: 'expr'; heading: string; items: Expr[]; cols?: number; size?: number }
  | { t: 'mc'; heading: string; items: MC[] };

/** A question with options to circle (one right): on one line when they fit, else one under the other. */
export interface MC { q: string; options: string[]; answer: number }

export const BODY = 4.3;
const HEAD = 4.3;
const BOX_H = 7.4;
export const LIGHT = '#94A3B8';
const RULE = '#8DA0B8';
const MARGIN_RED = '#F2A7A7';
/** mm per glyph unit of the tip II rows (body of the small letters 50 units = 4.5 mm). */
const RULE_S = 0.09;
/** One tip II row from the tail line to the top line, plus the gap to the next. */
const ROW_II = 150 * RULE_S + 3.5;
/** Dictando lines. */
const ROW_DICT = 8;

export const letterOf = (i: number) => `${String.fromCharCode(97 + i)})`;

/**
 * The width a text takes, mm: Nunito Bold as measured (reading-pages.ts textW). The texts are printed in the regular
 * weight, a little narrower, so a box placed after them never touches them and the gap stays small.
 */
export const tw = (text: string, size: number) => textW(text, size);
/**
 * The room a text is given where another text follows it on the same line, or where a line must stay inside the page:
 * the measured width or the app's rough estimate (book/text.ts), whichever is larger — the app's layout checks use the
 * estimate, and they must pass too.
 */
export const rw = (text: string, size: number) => Math.max(textW(text, size), textWidthMm(text, size));

// ───────────────────────── text helpers ─────────────────────────

/** The lines of a text no wider than `width` (measured generously, so a line never runs out). */
export function wrap(text: string, size: number, width: number, first = width): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    const room = lines.length ? width : first;
    if (line && rw(next, size) > room) {
      lines.push(line);
      line = w;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

/** The parts of a fill line: texts and slots in order. */
type Part = { kind: 'text'; text: string } | { kind: 'box' } | { kind: 'line' };
function fillParts(text: string): Part[] {
  const out: Part[] = [];
  for (const piece of text.split(/(\{\}|\{_\})/)) {
    if (piece === '{}') out.push({ kind: 'box' });
    else if (piece === '{_}') out.push({ kind: 'line' });
    else if (piece) out.push({ kind: 'text', text: piece });
  }
  return out;
}

const fillBoxes = (f: Fill) => (f.text.match(/\{_?\}/g) ?? []).length;

// ───────────────────────── texts with the multiplication dot, expressions ─────────────────────────

export const TIMES = '·';

/** The arrow „→”: Nunito has no glyph for it, so it is drawn. */
export const ARROW = '→';
/** In the printed text, a dot takes the place of one space, an arrow the place of four. */
const GAP_FOR: Record<string, string> = { [TIMES]: ' ', [ARROW]: '    ' };
const printed = (text: string) => text.replace(/[·→]/g, (m) => GAP_FOR[m]);
/** The estimated room of a text with its marks (see rw). */
const rwInk = (text: string, size: number) => Math.max(inkWidth(text, size), rw(printed(text), size));

/** The width of a text at `size`, the multiplication dots and the arrows as they are drawn. */
export function inkWidth(text: string, size: number): number {
  return tw(printed(text), size);
}

/**
 * A text whose „·” are drawn as round dots (the font's middle dot is too small to see on paper) and whose „→” are drawn
 * as arrows (the font has none). The text stays one piece, with spaces where the marks go; the marks are drawn over the
 * spaces, placed by the measured width of what comes before them (digits and signs: the same in both weights of Nunito).
 * Returns its width.
 */
export function inkText(ops: DrawOp[], text: string, x: number, y: number, size: number, fill = INK, weight?: 'bold'): number {
  const out = printed(text);
  if (out.trim()) ops.push({ t: 'text', x, y, text: out, size, fill, ...(weight ? { weight } : {}) });
  let at = 0;
  for (const part of text.split(/([·→])/)) {
    if (part === TIMES) {
      const gw = tw(' ', size);
      ops.push({ t: 'circle', cx: x + at + gw / 2, cy: y - size * 0.3, r: size * 0.1, fill });
      at += gw;
    } else if (part === ARROW) {
      const gw = tw('    ', size);
      const ay = y - size * 0.3, x0 = x + at + gw * 0.12, x1 = x + at + gw * 0.84;
      ops.push({ t: 'line', x1: x0, y1: ay, x2: x1, y2: ay, stroke: fill, strokeWidth: size * 0.07 });
      ops.push({ t: 'polygon', points: [{ x: x1 + size * 0.08, y: ay }, { x: x1 - size * 0.22, y: ay - size * 0.16 }, { x: x1 - size * 0.22, y: ay + size * 0.16 }], fill });
      at += gw;
    } else at += tw(part, size);
  }
  return tw(out, size);
}

const FBOX_W = 9;
function tokWidth(t: Tok, size: number): number {
  if (typeof t === 'string') return inkWidth(t, size);
  if ('f' in t) return Math.max(tw(String(t.f[0]), size), tw(String(t.f[1]), size)) + 3.2;
  if ('fbox' in t) return FBOX_W + 3;
  if ('box' in t) return t.box + 2.4;
  if ('line' in t) return t.line + 2.4;
  return t.pick.reduce((s, o) => s + rw(o, size) + 3.6, 0) + (t.pick.length - 1) * (rw('/', size) + 2.4) + 2;
}

/** The texts a token prints (for the estimate fence of exprPass). */
function tokTexts(t: Tok): string[] {
  if (typeof t === 'string') return [printed(t)];
  if ('f' in t) return [String(t.f[0]), String(t.f[1])];
  if ('fbox' in t && t.den) return [String(t.den)];
  return [];
}

/** Where each token goes, as fillPass: a text never starts before the estimated end of the text before it. */
function exprPass(toks: Tok[], size: number, k: number): { xs: number[]; width: number } {
  let cx = 0;
  let fence = 0;
  const xs: number[] = [];
  for (const t of toks) {
    const own = tokTexts(t);
    const w = tokWidth(t, size);
    if (own.length && typeof t !== 'object') cx = Math.max(cx, fence);
    else if (own.length) cx = Math.max(cx, fence - (w - Math.max(...own.map((x) => rw(x, size)))) / 2);
    xs.push(cx);
    if (own.length) fence = cx + (typeof t === 'string' ? rw(own[0], size) : (w + Math.max(...own.map((x) => rw(x, size)))) / 2) + 0.3;
    cx += w + 1.2 * k;
  }
  return { xs, width: Math.max(cx - 1.2 * k, fence) };
}

export function exprWidth(toks: Tok[], size: number): number {
  return exprPass(toks, size, 1).width;
}

const hasFrac = (toks: Tok[]) => toks.some((t) => typeof t === 'object' && ('f' in t || 'fbox' in t));

/** An expression row, left aligned at x and centred on cy, shrunk to `maxW`. */
export function exprOps(ops: DrawOp[], toks: Tok[], x: number, cy: number, size0: number, maxW: number): void {
  const k = Math.min(1, maxW / exprWidth(toks, size0));
  const size = size0 * k;
  const { xs } = exprPass(toks, size, k);
  toks.forEach((t, i) => {
    const cx = x + xs[i];
    const w = tokWidth(t, size);
    if (typeof t === 'string') inkText(ops, t, cx, cy + size * 0.36, size);
    else if ('f' in t) ops.push(...fractionOps(t.f[0], t.f[1], cx + w / 2, cy - size * 0.15, size));
    else if ('fbox' in t) {
      const bw = FBOX_W * k;
      const bh = (BOX_H - 1) * k;
      const mid = cx + w / 2;
      box(ops, mid - bw / 2, cy - bh - 1.1 * k, bw, bh);
      ops.push({ t: 'line', x1: mid - bw / 2 - 0.8, y1: cy, x2: mid + bw / 2 + 0.8, y2: cy, stroke: INK, strokeWidth: 0.5 });
      if (t.den) ops.push({ t: 'text', x: mid, y: cy + size * 1.05, text: String(t.den), size, fill: INK, weight: 'bold', align: 'center' });
      else box(ops, mid - bw / 2, cy + 1.1 * k, bw, bh);
    } else if ('box' in t) box(ops, cx + 1.2 * k, cy - (BOX_H * k) / 2, t.box * k, BOX_H * k);
    else if ('line' in t) ops.push({ t: 'line', x1: cx + 1.2, y1: cy + size * 0.45, x2: cx + 1.2 + t.line * k, y2: cy + size * 0.45, stroke: INK, strokeWidth: 0.3, dash: [0.8, 0.8] });
    else {
      let px = cx + 1;
      t.pick.forEach((o, j) => {
        if (j) {
          ops.push({ t: 'text', x: px + 1.2, y: cy + size * 0.36, text: '/', size, fill: LIGHT });
          px += rw('/', size) + 2.4;
        }
        px += pill(ops, o, px, cy, size);
      });
    }
  });
}

// ───────────────────────── measuring ─────────────────────────

function rowsOf(n: number, cols: number) {
  return Math.ceil(n / cols);
}

const FILL_ROW = 10.5;
const CHOICE_ROW = 10;

/** The height of a block drawn `w` mm wide (with its heading). `fillTo`: the height a „fill” writing block takes. */
export function blockHeight(b: Block, w: number, fillTo = 0): number {
  const head = 'heading' in b && b.heading ? headingLines(b.heading, w).length * 5.6 + 2.4 : 0;
  switch (b.t) {
    case 'fill':
      return head + rowsOf(b.items.length, b.cols ?? 1) * FILL_ROW * ((b.size ?? BODY) / BODY);
    case 'choice':
      return head + rowsOf(b.items.length, b.cols ?? 1) * CHOICE_ROW;
    case 'tf':
      return head + b.items.reduce((s, it) => s + Math.max(1, wrap(it.text, BODY, w - 40).length) * 6.2 + 3.6, 0);
    case 'order':
      return head + b.items.reduce((s, it) => s + Math.max(1, wrap(it, BODY, w - 16).length) * 6.2 + 3.4, 0);
    case 'text': {
      const size = b.size ?? 4.4;
      const lines = b.paragraphs.reduce((s, p) => s + wrap(p, size, w - 14, w - 22).length, 0);
      return 12 + 6.5 + lines * size * 1.55 + (b.author ? 6 : 0) + 4;
    }
    case 'write': {
      const prompts = (b.prompts ?? []).reduce((s, p) => s + wrap(p, BODY - 0.3, w).length * 5.4, 0);
      if (b.rows === 'fill') return Math.max(head + prompts + 20, fillTo);
      return head + prompts + b.rows * rowPitch(b.ruling) + 3;
    }
    case 'question':
      return head + b.rows * rowPitch(b.ruling) + 3;
    case 'table':
      return head + chipRows(b.bank, w).length * 9 + 2 + 8 + b.rows * 8.5 + 2;
    case 'draw':
      return head + b.height;
    case 'expr': {
      const rowH = b.items.some((it) => hasFrac(it.toks)) ? 18 : FILL_ROW;
      return head + rowsOf(b.items.length, b.cols ?? 1) * rowH * ((b.size ?? BODY) / BODY);
    }
    case 'mc':
      return head + b.items.reduce((s, it) => s + mcHeight(it, w), 0);
  }
}

const MC_LINE = 6.2;
const MC_OPT = 7.4;
function mcOneLine(it: MC, w: number): boolean {
  return it.options.reduce((s, o) => s + rw(o, BODY) + 13, 0) <= w - 8;
}
function mcHeight(it: MC, w: number): number {
  const q = wrap(it.q, BODY, w - 7).length * MC_LINE;
  return q + (mcOneLine(it, w) ? MC_OPT : it.options.length * MC_OPT) + 3.2;
}
const LETTERS3 = ['a', 'b', 'c', 'd'];
function mcOps(ops: DrawOp[], it: MC, i: number, x: number, y: number, w: number): void {
  const lines = wrap(it.q, BODY, w - 7);
  ops.push({ t: 'text', x, y: y + 4.6, text: `${i + 1}.`, size: 3.6, fill: MUTED, weight: 'bold' });
  lines.forEach((l, k) => ops.push({ t: 'text', x: x + 7, y: y + 4.8 + k * MC_LINE, text: l, size: BODY, fill: INK, weight: 'bold' }));
  let oy = y + lines.length * MC_LINE + MC_OPT / 2 + 0.6;
  const one = mcOneLine(it, w);
  let ox = x + 9;
  it.options.forEach((o, k) => {
    ops.push({ t: 'circle', cx: ox + 2.4, cy: oy, r: 2.9, fill: PAPER, stroke: LIGHT, strokeWidth: 0.45 });
    ops.push({ t: 'text', x: ox + 2.4, y: oy + 1.25, text: LETTERS3[k], size: 3.5, fill: INK, weight: 'bold', align: 'center' });
    ops.push({ t: 'text', x: ox + 7.2, y: oy + BODY * 0.36, text: o, size: Math.min(BODY, fitSize(o, BODY, w - 20)), fill: INK });
    if (one) ox += rw(o, BODY) + 13;
    else oy += MC_OPT;
  });
}

function headingLines(text: string, w: number): string[] {
  return wrap(text, HEAD, w - 2, w - 2);
}

function chipRows(bank: string[], w: number): string[][] {
  const rows: string[][] = [[]];
  let used = 0;
  for (const word of bank) {
    const cw = tw(word, BODY) + 8;
    if (used + cw > w && rows[rows.length - 1].length) {
      rows.push([]);
      used = 0;
    }
    rows[rows.length - 1].push(word);
    used += cw + 3;
  }
  return bank.length ? rows : [];
}

// ───────────────────────── drawing ─────────────────────────

function box(ops: DrawOp[], x: number, y: number, w: number, h: number): void {
  ops.push({ t: 'rect', x, y, w, h, rx: 1.4, fill: PAPER, stroke: INK, strokeWidth: 0.45 });
}

function headingOps(ops: DrawOp[], text: string, x: number, y: number, w: number): number {
  const lines = headingLines(text, w);
  lines.forEach((l, k) => ops.push({ t: 'text', x, y: y + 4.6 + k * 5.6, text: l, size: HEAD, fill: INK, weight: 'bold' }));
  return lines.length * 5.6 + 2.4;
}

/**
 * Where each part of a fill line goes (scale `k`): a box right after its text; a text after a box starts no sooner than
 * where the previous text ends by the app's rough estimate (`rw`), so no two texts are ever found on top of each other by
 * the layout checks, which measure with that estimate.
 */
function fillPass(parts: Part[], size: number, boxW: number, lineW: number, k: number): { xs: number[]; width: number } {
  let cx = 0;
  let fence = 0;
  const xs: number[] = [];
  for (const p of parts) {
    if (p.kind === 'text') {
      cx = Math.max(cx, fence);
      xs.push(cx);
      fence = cx + rwInk(p.text, size) + 0.3;
      cx += inkWidth(p.text, size);
    } else {
      xs.push(cx);
      cx += ((p.kind === 'box' ? boxW : lineW) + 2.4) * k;
    }
  }
  return { xs, width: Math.max(cx, fence) };
}

/** The width a fill line takes at `size` with boxes of `boxW`. */
function fillWidth(f: Fill, size: number, boxW: number, lineW: number): number {
  return fillPass(fillParts(f.text), size, boxW, lineW, 1).width;
}

function fillOps(ops: DrawOp[], f: Fill, x: number, cy: number, maxW: number, size0: number, boxW: number): void {
  const parts = fillParts(f.text);
  const lines = parts.filter((p) => p.kind === 'line').length;
  // a line to write on takes the room the text leaves (at least 30 mm)
  const fixed = fillWidth({ ...f, text: f.text.replace(/\{_\}/g, '') }, size0, boxW, 0);
  const lineW = lines ? Math.max(30, (maxW - fixed) / lines - 2.4) : 0;
  const w = fillWidth(f, size0, boxW, lineW);
  const k = Math.min(1, maxW / w);
  const size = size0 * k;
  const { xs } = fillPass(parts, size, boxW, lineW, k);
  parts.forEach((p, i) => {
    const cx = x + xs[i];
    if (p.kind === 'text') inkText(ops, p.text, cx, cy + size * 0.36, size);
    else if (p.kind === 'box') box(ops, cx + 1.2 * k, cy - (BOX_H * k) / 2, boxW * k, BOX_H * k);
    else ops.push({ t: 'line', x1: cx + 1.2, y1: cy + size * 0.45, x2: cx + 1.2 + lineW * k, y2: cy + size * 0.45, stroke: INK, strokeWidth: 0.3, dash: [0.8, 0.8] });
  });
}

function pill(ops: DrawOp[], text: string, x: number, cy: number, size: number): number {
  const w = rw(text, size);
  ops.push({ t: 'rect', x, y: cy - size * 0.78, w: w + 3.6, h: size * 1.56, rx: size * 0.7, fill: PAPER, stroke: LIGHT, strokeWidth: 0.4 });
  ops.push({ t: 'text', x: x + 1.8, y: cy + size * 0.36, text, size, fill: INK, weight: 'bold' });
  return w + 3.6;
}

function choiceWidth(c: Choice, size: number): number {
  const [before, after = ''] = c.text.split('{}');
  const opts = c.options.reduce((s, o) => s + rw(o, size) + 3.6, 0) + (c.options.length - 1) * (rw('/', size) + 2.4);
  return rwInk(before, size) + 1.6 + opts + 1.6 + rwInk(after, size);
}

function choiceOps(ops: DrawOp[], c: Choice, x: number, cy: number, maxW: number): void {
  const size = Math.min(BODY, (BODY * maxW) / choiceWidth(c, BODY));
  const [before, after = ''] = c.text.split('{}');
  let cx = x;
  if (before) {
    inkText(ops, before.trimEnd(), cx, cy + size * 0.36, size);
    cx += rwInk(before, size) + 1.6;
  }
  c.options.forEach((o, k) => {
    if (k) {
      ops.push({ t: 'text', x: cx + 1.2, y: cy + size * 0.36, text: '/', size, fill: LIGHT });
      cx += rw('/', size) + 2.4;
    }
    cx += pill(ops, o, cx, cy, size);
  });
  if (after.trim()) inkText(ops, after.trimStart(), cx + 1.6, cy + size * 0.36, size);
}

const ROW_GRID = 5;
function rowPitch(r: Ruling): number {
  return r === 'II' ? ROW_II : r === 'grid' ? ROW_GRID : ROW_DICT;
}

/** A field of 5 mm squares, as in the math notebook. */
export function gridOps(ops: DrawOp[], x: number, y: number, w: number, h: number): void {
  const cols = Math.floor(w / ROW_GRID), rows = Math.floor(h / ROW_GRID);
  const gw = cols * ROW_GRID, gh = rows * ROW_GRID;
  for (let c = 0; c <= cols; c++) ops.push({ t: 'line', x1: x + c * ROW_GRID, y1: y, x2: x + c * ROW_GRID, y2: y + gh, stroke: '#C9D6E6', strokeWidth: 0.18 });
  for (let r = 0; r <= rows; r++) ops.push({ t: 'line', x1: x, y1: y + r * ROW_GRID, x2: x + gw, y2: y + r * ROW_GRID, stroke: '#C9D6E6', strokeWidth: 0.18 });
}

/** Writing rows from `y`, `rows` of them, on the ruling of the class. */
export function writeRowsOps(ops: DrawOp[], ruling: Ruling, x: number, y: number, w: number, rows: number): void {
  if (ruling === 'grid') {
    gridOps(ops, x, y, w, rows * ROW_GRID);
    return;
  }
  if (ruling === 'II') {
    for (let r = 0; r < rows; r++) ops.push(...rulingOps('II', x, w, y + 100 * RULE_S + r * ROW_II, RULE_S));
    return;
  }
  ops.push({ t: 'line', x1: x + 8, y1: y + 1, x2: x + 8, y2: y + rows * ROW_DICT + 1, stroke: MARGIN_RED, strokeWidth: 0.3 });
  for (let r = 1; r <= rows; r++) ops.push({ t: 'line', x1: x, y1: y + r * ROW_DICT, x2: x + w, y2: y + r * ROW_DICT, stroke: RULE, strokeWidth: 0.25 });
}

export function rowsThatFit(ruling: Ruling, h: number): number {
  return Math.max(1, Math.floor((h - 3) / rowPitch(ruling)));
}

/**
 * Draws a block at (x, y), `w` wide; `h` is the height it was given (≥ its own). Returns nothing: heights come from blockHeight.
 * `from`: the index its first item is lettered or numbered with (an evaluation draws the rows of a block one by one).
 */
export function drawBlock(ops: DrawOp[], b: Block, x: number, y: number, w: number, h: number, withHeading = true, from = 0): void {
  let top = y;
  if (withHeading && 'heading' in b && b.heading) top += headingOps(ops, b.heading, x, y, w);
  switch (b.t) {
    case 'fill': {
      const cols = b.cols ?? 1;
      const colW = w / cols;
      const rows = rowsOf(b.items.length, cols);
      const size = b.size ?? BODY;
      const rowH = (FILL_ROW * size) / BODY;
      b.items.forEach((f, i) => {
        const col = Math.floor(i / rows);
        const row = i % rows;
        const cx = x + col * colW;
        const cy = top + row * rowH + rowH / 2;
        ops.push({ t: 'text', x: cx, y: cy + 1.3, text: letterOf(i + from), size: 3.5, fill: MUTED, weight: 'bold' });
        fillOps(ops, f, cx + 7, cy, colW - 10, size, b.box ?? 15);
      });
      return;
    }
    case 'choice': {
      const cols = b.cols ?? 1;
      const colW = w / cols;
      const rows = rowsOf(b.items.length, cols);
      b.items.forEach((c, i) => {
        const col = Math.floor(i / rows);
        const row = i % rows;
        const cx = x + col * colW;
        const cy = top + row * CHOICE_ROW + CHOICE_ROW / 2;
        ops.push({ t: 'text', x: cx, y: cy + 1.3, text: letterOf(i + from), size: 3.5, fill: MUTED, weight: 'bold' });
        choiceOps(ops, c, cx + 7, cy, colW - 10);
      });
      return;
    }
    case 'tf': {
      let cy = top;
      b.items.forEach((it, i) => {
        const lines = wrap(it.text, BODY, w - 40);
        const lh = Math.max(1, lines.length) * 6.2 + 3.6;
        ops.push({ t: 'text', x, y: cy + 5.2, text: letterOf(i + from), size: 3.5, fill: MUTED, weight: 'bold' });
        lines.forEach((l, k) => inkText(ops, l, x + 7, cy + 5.4 + k * 6.2, BODY));
        ['A', 'F'].forEach((o, k) => {
          const px = x + w - 24 + k * 13;
          ops.push({ t: 'rect', x: px, y: cy + 0.8, w: 10, h: 7, rx: 3.5, fill: PAPER, stroke: INK, strokeWidth: 0.45 });
          ops.push({ t: 'text', x: px + 5, y: cy + 5.8, text: o, size: BODY, fill: INK, weight: 'bold', align: 'center' });
        });
        cy += lh;
      });
      return;
    }
    case 'order': {
      let cy = top;
      b.items.forEach((it) => {
        const lines = wrap(it, BODY, w - 16);
        box(ops, x, cy + 0.6, 9, 7.4);
        lines.forEach((l, k) => ops.push({ t: 'text', x: x + 13, y: cy + 5.6 + k * 6.2, text: l, size: BODY, fill: INK }));
        cy += Math.max(1, lines.length) * 6.2 + 3.4;
      });
      return;
    }
    case 'text': {
      const size = b.size ?? 4.4;
      const lh = size * 1.55;
      ops.push({ t: 'rect', x, y, w, h: h - 2, rx: 3.5, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.6 });
      ops.push({ t: 'text', x: x + w / 2, y: y + 11, text: b.title, size: fitSize(b.title, 5.6, w - 16), fill: INK, weight: 'bold', align: 'center' });
      let ly = y + 11 + 6.5;
      for (const p of b.paragraphs) {
        wrap(p, size, w - 14, w - 22).forEach((l, k) => {
          ly += lh;
          ops.push({ t: 'text', x: x + 7 + (k === 0 ? 8 : 0), y: ly, text: l, size, fill: INK });
        });
      }
      if (b.author) ops.push({ t: 'text', x: x + w - 7, y: ly + 6, text: b.author, size: 3.4, fill: MUTED, align: 'right' });
      return;
    }
    case 'write': {
      let py = top;
      for (const p of b.prompts ?? []) {
        wrap(p, BODY - 0.3, w).forEach((l) => {
          ops.push({ t: 'text', x, y: py + 4.2, text: l, size: BODY - 0.3, fill: '#334155' });
          py += 5.4;
        });
      }
      const rows = b.rows === 'fill' ? rowsThatFit(b.ruling, y + h - py) : b.rows;
      writeRowsOps(ops, b.ruling, x, py + 1, w, rows);
      return;
    }
    case 'question':
      writeRowsOps(ops, b.ruling, x, top + 1, w, b.rows);
      return;
    case 'table': {
      let cy = top;
      for (const row of chipRows(b.bank, w)) {
        let cx = x;
        for (const word of row) {
          const cw = tw(word, BODY) + 8;
          ops.push({ t: 'rect', x: cx, y: cy + 0.8, w: cw, h: 7, rx: 3.5, fill: SOFT, stroke: CELL_STROKE, strokeWidth: 0.45 });
          ops.push({ t: 'text', x: cx + cw / 2, y: cy + 5.6, text: word, size: BODY, fill: INK, align: 'center' });
          cx += cw + 3;
        }
        cy += 9;
      }
      cy += 2;
      const n = b.columns.length;
      const cw = w / n;
      const th = 8 + b.rows * 8.5;
      ops.push({ t: 'rect', x, y: cy, w, h: th, rx: 1.5, fill: PAPER, stroke: INK, strokeWidth: 0.45 });
      ops.push({ t: 'line', x1: x, y1: cy + 8, x2: x + w, y2: cy + 8, stroke: INK, strokeWidth: 0.4 });
      b.columns.forEach((c, k) => {
        if (k) ops.push({ t: 'line', x1: x + k * cw, y1: cy, x2: x + k * cw, y2: cy + th, stroke: INK, strokeWidth: 0.35 });
        ops.push({ t: 'text', x: x + k * cw + cw / 2, y: cy + 5.6, text: c, size: fitSize(c, BODY, cw - 3), fill: INK, weight: 'bold', align: 'center' });
      });
      for (let r = 1; r < b.rows; r++) ops.push({ t: 'line', x1: x, y1: cy + 8 + r * 8.5, x2: x + w, y2: cy + 8 + r * 8.5, stroke: CELL_STROKE, strokeWidth: 0.3 });
      return;
    }
    case 'draw':
      b.draw(ops, x, top, w, y + h - top);
      return;
    case 'mc': {
      let cy = top;
      b.items.forEach((it, i) => {
        mcOps(ops, it, i + from, x, cy, w);
        cy += mcHeight(it, w);
      });
      return;
    }
    case 'expr': {
      const cols = b.cols ?? 1;
      const colW = w / cols;
      const rows = rowsOf(b.items.length, cols);
      const size = b.size ?? BODY;
      const rowH = ((b.items.some((it) => hasFrac(it.toks)) ? 18 : FILL_ROW) * size) / BODY;
      b.items.forEach((it, i) => {
        const col = Math.floor(i / rows);
        const row = i % rows;
        const cx = x + col * colW;
        const cy = top + row * rowH + rowH / 2;
        ops.push({ t: 'text', x: cx, y: cy + 1.3, text: letterOf(i + from), size: 3.5, fill: MUTED, weight: 'bold' });
        exprOps(ops, it.toks, cx + 7, cy, size, colW - 10);
      });
      return;
    }
  }
}

// ───────────────────────── answers ─────────────────────────

/** The answers of one block, each a short text (labelled „a)” where the block has several items). */
export function blockAnswers(b: Block): string[] {
  switch (b.t) {
    case 'fill':
      return b.items.map((f, i) => `${letterOf(i)} ${fillBoxes(f) > 1 ? f.answers.join('; ') : f.answers[0]}`);
    case 'choice':
      return b.items.map((c, i) => `${letterOf(i)} ${c.options[c.answer]}`);
    case 'tf':
      return b.items.map((it, i) => `${letterOf(i)} ${it.answer ? 'A' : 'F'}`);
    case 'order':
      return [`De sus în jos: ${b.answer.join(', ')}`];
    case 'text':
      return [];
    case 'write':
      return b.answer ? [b.answer] : [];
    case 'question':
      return [b.answer];
    case 'table':
      return b.columns.map((c, k) => `${c}: ${b.answers[k].join(', ')}`);
    case 'draw':
      return b.answers;
    case 'expr':
      return b.items.map((it, i) => `${letterOf(i)} ${it.answer}`);
    case 'mc':
      return b.items.map((it, i) => `${i + 1}) ${LETTERS3[it.answer]}) ${it.options[it.answer]}`);
  }
}

/** How many answers a block asks for (what an evaluation's calificative count). */
export function blockScore(b: Block): number {
  switch (b.t) {
    case 'fill':
      return b.items.reduce((s, f) => s + fillBoxes(f), 0);
    case 'choice':
    case 'tf':
      return b.items.length;
    case 'order':
      return b.items.length;
    case 'table':
      return b.answers.reduce((s, a) => s + a.length, 0);
    case 'draw':
      return b.score ?? b.answers.length;
    case 'expr':
      return b.items.reduce((s, it) => s + (it.score ?? 1), 0);
    case 'mc':
      return b.items.length;
    case 'question':
      return 1;
    default:
      return 0;
  }
}

/** The answers page section of a sheet made of blocks: the task numbers as on the page („2. b) 4300”). */
export function blocksKeySection(title: string, blocks: Block[]): KeySection | null {
  const entries: string[] = [];
  let n = 0;
  for (const b of blocks) {
    if (b.t === 'text') continue;
    n++;
    const answers = blockAnswers(b);
    answers.forEach((a) => entries.push(`${n}. ${a}`));
  }
  if (!entries.length) return null;
  const longest = Math.max(...entries.map((e) => e.length));
  return { title, entries, perLine: longest > 44 ? 1 : longest > 26 ? 2 : longest > 16 ? 3 : 4 };
}

// ───────────────────────── page ─────────────────────────

export interface BlocksPage {
  title: string;
  instruction: string;
  help?: string;
  blocks: Block[];
  /** One line for the adult under the activity. */
  note?: string;
}

const GAP = 5;

/** The tasks of a page, numbered, from `top` to BOTTOM: the extra room between them, the rest to a „fill” writing block. */
export function layoutBlocks(blocks: Block[], top: number, bottom = BOTTOM, x = M, w = W - 2 * M): { y: number; h: number }[] {
  const fixed = blocks.map((b) => (b.t === 'write' && b.rows === 'fill' ? blockHeight({ ...b, rows: 1 }, w) : blockHeight(b, w)));
  const used = fixed.reduce((s, h) => s + h, 0) + GAP * (blocks.length - 1);
  const spare = Math.max(0, bottom - top - used);
  const filler = blocks.findIndex((b) => b.t === 'write' && b.rows === 'fill');
  const gap = filler >= 0 ? GAP : GAP + Math.min(6, spare / Math.max(1, blocks.length));
  const out: { y: number; h: number }[] = [];
  let y = top;
  blocks.forEach((b, i) => {
    const h = i === filler ? fixed[i] + spare : fixed[i];
    out.push({ y, h });
    y += h + gap;
  });
  void x;
  return out;
}

/** Numbers the headings of the tasks („1. …”); a text to read keeps its title. */
export function numbered(blocks: Block[]): Block[] {
  let n = 0;
  return blocks.map((b) => {
    if (!('heading' in b) || !b.heading) return b;
    n++;
    return { ...b, heading: `${n}. ${b.heading}` } as Block;
  });
}

export function buildBlocksPage(config: WorksheetConfig, tier: Tier, page: BlocksPage): PageOps {
  const ops: DrawOp[] = [];
  const top = frame(ops, config, page.title, page.instruction, page.help);
  const blocks = numbered(page.blocks);
  const lay = layoutBlocks(blocks, top + 1);
  blocks.forEach((b, i) => {
    if (i) ops.push({ t: 'line', x1: M, y1: lay[i].y - 2.6, x2: W - M, y2: lay[i].y - 2.6, stroke: CELL_STROKE, strokeWidth: 0.35 });
    drawBlock(ops, b, M, lay[i].y, W - 2 * M, lay[i].h);
  });
  if (page.note) adultNote(ops, page.note);
  footer(ops, tier);
  return { width: W, height: H, ops };
}

/** A fraction written as on the board: the numerator over the bar over the denominator, centred on (cx, cy). */
export function fractionOps(num: string | number, den: string | number, cx: number, cy: number, size: number, fill = INK): DrawOp[] {
  const a = String(num), b = String(den);
  const bw = Math.max(tw(a, size), tw(b, size)) + 1.6;
  return [
    { t: 'text', x: cx, y: cy - size * 0.28, text: a, size, fill, weight: 'bold', align: 'center' },
    { t: 'line', x1: cx - bw / 2, y1: cy + size * 0.06, x2: cx + bw / 2, y2: cy + size * 0.06, stroke: fill, strokeWidth: size * 0.08 },
    { t: 'text', x: cx, y: cy + size * 0.98, text: b, size, fill, weight: 'bold', align: 'center' },
  ];
}

export { ACCENT };
